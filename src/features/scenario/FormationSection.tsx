import { useRef, useState } from 'react';
import { Download, FileJson, FolderOpen, Plus, RotateCcw, Satellite } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

    return (
        <PanelSection
            title="衛星配置"
            icon={<Satellite />}
            action={
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-fg-muted"
                            aria-label="既定の配置に戻す"
                            onClick={resetToDefault}
                        >
                            <RotateCcw />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>既定の配置に戻す</TooltipContent>
                </Tooltip>
            }
        >
            <div className="rounded-lg border border-line bg-sunken p-2">
                <div className="flex items-center gap-2 px-0.5">
                    <FileJson className="size-4 shrink-0 text-fg-subtle" />
                    <div className="min-w-0 flex-1">
                        <div
                            className="truncate text-[13px] font-medium text-fg"
                            title={formationFile?.name ?? formationFileName(config)}
                        >
                            {formationFile?.name ?? formationFileName(config)}
                        </div>
                        <div className={cn('text-[11px]', modified ? 'text-warning' : 'text-fg-subtle')}>
                            {formationFile === null
                                ? 'まだファイルに保存していません'
                                : modified
                                  ? '● 変更あり（未保存）'
                                  : 'ファイルと同じ内容です'}
                        </div>
                    </div>
                </div>
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
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
                        <FolderOpen />
                        JSON を開く
                    </Button>
                    <Button variant="outline" size="sm" onClick={saveFile}>
                        <Download />
                        JSON に保存
                    </Button>
                </div>
            </div>

            <p className="text-xs leading-relaxed text-fg-muted">
                原点の基準衛星のまわりに、衛星を<span className="text-fg">グループ</span>
                ごとに配置します。グループをクリックすると配置パターンや数を変更できます。
            </p>

            <div className="text-right text-xs text-fg-muted">
                合計 <span className="num font-medium text-fg">
                    {(countSatellites(config) + 1).toLocaleString()}
                </span>{' '}
                機（基準衛星を含む）
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
