import { useRef, useState, type ReactNode } from 'react';
import { Download, FileJson, FolderOpen, Plus, RotateCcw, Satellite } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpTip } from '@/components/controls';
import { PanelSection } from '@/components/panel-section';
import { useEngine } from '@/engine/EngineContext';
import type { FormationConfig } from '@/formation/FormationTypes';
import {
    addLayer,
    countSatellites,
    createDefaultFormation,
    formationFileName,
    parseFormation,
    serializeFormation,
} from '@/formation/formationConfig';
import { appStore, useAppStore, type AppState } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { LayerCard } from './LayerCard';
import { LayerEditor } from './LayerEditor';

function downloadText(fileName: string, text: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    // 直後に revoke すると Safari / Firefox でダウンロードが失敗することがある
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** ツールチップ付きの小さなアイコンボタン */
function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xs" className="text-fg-muted" aria-label={label} onClick={onClick}>
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

/**
 * 衛星配置（フォーメーション）。基準衛星のまわりに置く衛星を「衛星グループ」単位で組み合わせる。
 * 変更はすべてすぐにシミュレーションへ反映する（時刻は t = 0 に戻る）。
 * グループの編集はパネル内のサブ画面（LayerEditor）で行い、3D ビューを隠さない。
 */
export function FormationSection() {
    const engine = useEngine();
    const config = useAppStore((s) => s.formation);
    const formationFile = useAppStore((s) => s.formationFile);
    const updateFormation = useAppStore((s) => s.updateFormation);
    const [editing, setEditing] = useState<{ layerId: string; before?: FormationConfig } | null>(null);
    const importRef = useRef<HTMLInputElement>(null);

    const editingLayer = config.layers.find((l) => l.id === editing?.layerId) ?? null;
    if (editingLayer) {
        return (
            <LayerEditor
                key={editingLayer.id}
                layer={editingLayer}
                restoreOnCancel={editing?.before}
                onClose={() => setEditing(null)}
            />
        );
    }

    /** 配置とファイル情報をまとめて差し替え、「元に戻す」用に直前の状態を返す */
    const replaceFormation = (next: FormationConfig, file: AppState['formationFile']) => {
        const { formation: prevFormation, formationFile: prevFile } = appStore.getState();
        updateFormation(() => next);
        appStore.getState().patch({ formationFile: file });
        engine.resetPositions();
        return () => replaceFormation(prevFormation, prevFile);
    };

    const openFile = async (file: File) => {
        const result = parseFormation(await file.text(), file.name.replace(/\.json$/i, ''));
        if (!result.ok) {
            toast.error(`${file.name} を読み込めませんでした`, {
                description: (
                    <ul className="list-disc space-y-0.5 pl-4">
                        {result.errors.slice(0, 5).map((e) => (
                            <li key={e}>{e}</li>
                        ))}
                        {result.errors.length > 5 && <li>ほか {result.errors.length - 5} 件</li>}
                    </ul>
                ),
            });
            return;
        }
        const undo = replaceFormation(result.config, { name: file.name, config: result.config });
        toast.success(`${file.name} を読み込みました`, { action: { label: '元に戻す', onClick: undo } });
    };

    const saveFile = () => {
        const fileName = formationFile?.name ?? formationFileName(config);
        downloadText(fileName, serializeFormation(config));
        appStore.getState().patch({ formationFile: { name: fileName, config } });
        toast.success(`${fileName} を保存しました`, { description: 'ブラウザのダウンロード先に保存されます' });
    };

    const resetToDefault = () => {
        const undo = replaceFormation(createDefaultFormation(), null);
        toast('既定の配置に戻しました', { action: { label: '元に戻す', onClick: undo } });
    };

    const modified = formationFile !== null && formationFile.config !== config;

    const fileName = formationFile?.name ?? formationFileName(config);
    const fileStatus = formationFile === null ? '未保存' : modified ? '変更あり（未保存）' : 'ファイルと同じ内容';

    return (
        <PanelSection
            title="衛星配置"
            icon={<Satellite />}
            action={
                <div className="flex items-center gap-1">
                    <span className="text-xs text-fg-muted" title="基準衛星を含む">
                        <span className="num font-medium text-fg">
                            {(countSatellites(config) + 1).toLocaleString()}
                        </span>{' '}
                        機
                    </span>
                    <HelpTip>
                        原点の基準衛星のまわりに、衛星をグループごとに配置します。グループをクリックすると配置パターンや数を変更できます。機数は基準衛星を含みます。
                    </HelpTip>
                    <IconAction label="既定の配置に戻す" onClick={resetToDefault}>
                        <RotateCcw />
                    </IconAction>
                </div>
            }
        >
            <div className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-sunken pr-0.5 pl-2">
                <FileJson className="size-3.5 shrink-0 text-fg-subtle" />
                <span
                    className={cn('min-w-0 flex-1 truncate text-xs', formationFile ? 'text-fg' : 'text-fg-muted')}
                    title={`${fileName}（${fileStatus}）`}
                >
                    {fileName}
                </span>
                {modified && (
                    <span
                        className="size-1.5 shrink-0 rounded-full bg-warning"
                        role="img"
                        aria-label="未保存の変更あり"
                    />
                )}
                <input
                    ref={importRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void openFile(file);
                        e.target.value = '';
                    }}
                />
                <IconAction label="JSON を開く" onClick={() => importRef.current?.click()}>
                    <FolderOpen />
                </IconAction>
                <IconAction label={`${fileName} として保存`} onClick={saveFile}>
                    <Download />
                </IconAction>
            </div>

            <div className="space-y-1.5">
                {config.layers.map((layer, index) => (
                    <LayerCard
                        key={layer.id}
                        layer={layer}
                        isFirst={index === 0}
                        isLast={index === config.layers.length - 1}
                        onEdit={() => setEditing({ layerId: layer.id })}
                    />
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed text-fg-muted"
                    onClick={() => {
                        const before = appStore.getState().formation;
                        const next = addLayer(before);
                        updateFormation(() => next);
                        engine.resetPositions();
                        setEditing({ layerId: next.layers[next.layers.length - 1].id, before });
                    }}
                >
                    <Plus />
                    衛星グループを追加
                </Button>
            </div>
        </PanelSection>
    );
}
