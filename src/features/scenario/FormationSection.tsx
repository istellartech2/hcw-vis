import { useRef, useState } from 'react';
import { Download, EllipsisVertical, Plus, Satellite, Undo2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PanelSection } from '@/components/panel-section';
import { useEngine } from '@/engine/EngineContext';
import { addLayer, countSatellites, parseFormation, serializeFormation } from '@/formation/formationConfig';
import { appStore, useAppStore } from '@/store/appStore';
import { LayerCard } from './LayerCard';
import { LayerEditor } from './LayerEditor';

function downloadText(fileName: string, text: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 衛星配置（フォーメーション）。基準衛星のまわりに置く衛星を「衛星グループ」単位で組み合わせる。
 * 変更はすべてすぐにシミュレーションへ反映する（時刻は t = 0 に戻る）。
 * グループの編集はパネル内のサブ画面（LayerEditor）で行い、3D ビューを隠さない。
 */
export function FormationSection() {
    const engine = useEngine();
    const config = useAppStore((s) => s.formation);
    const updateFormation = useAppStore((s) => s.updateFormation);
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const importRef = useRef<HTMLInputElement>(null);

    const editingLayer = config.layers.find((l) => l.id === editingLayerId) ?? null;
    if (editingLayer) {
        return <LayerEditor key={editingLayer.id} layer={editingLayer} onClose={() => setEditingLayerId(null)} />;
    }

    const importJSON = async (file: File) => {
        const result = parseFormation(await file.text());
        if (result.ok) {
            updateFormation(() => result.config);
            engine.resetPositions();
            toast.success(`「${result.config.name}」を読み込みました`);
        } else {
            toast.error('読み込みに失敗しました', { description: result.errors.join('\n') });
        }
    };

    return (
        <PanelSection
            title="衛星配置"
            icon={<Satellite />}
            action={
                <>
                    <input
                        ref={importRef}
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void importJSON(file);
                            e.target.value = '';
                        }}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-fg-muted" aria-label="ファイル操作">
                                <EllipsisVertical />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                                onSelect={() =>
                                    downloadText(`${config.name}_formation.json`, serializeFormation(config))
                                }
                            >
                                <Download />
                                配置を JSON に保存
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => importRef.current?.click()}>
                                <Upload />
                                JSON から読み込む
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => engine.resetFormation()}>
                                <Undo2 />
                                既定の配置に戻す
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            }
        >
            <p className="text-xs leading-relaxed text-fg-muted">
                原点の基準衛星のまわりに、衛星を<span className="text-fg">グループ</span>
                ごとに配置します。グループをクリックすると配置パターンや数を変更できます。
            </p>

            <div className="flex items-baseline justify-between gap-2 text-xs text-fg-muted">
                <span className="truncate">{config.name}</span>
                <span className="shrink-0">
                    合計{' '}
                    <span className="num font-medium text-fg">{(countSatellites(config) + 1).toLocaleString()}</span>{' '}
                    機（基準衛星を含む）
                </span>
            </div>

            <div className="space-y-1.5">
                {config.layers.map((layer, index) => (
                    <LayerCard
                        key={layer.id}
                        layer={layer}
                        isFirst={index === 0}
                        isLast={index === config.layers.length - 1}
                        onEdit={() => setEditingLayerId(layer.id)}
                    />
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed text-fg-muted"
                    onClick={() => {
                        const next = addLayer(appStore.getState().formation);
                        updateFormation(() => next);
                        engine.resetPositions();
                        setEditingLayerId(next.layers[next.layers.length - 1].id);
                    }}
                >
                    <Plus />
                    衛星グループを追加
                </Button>
            </div>
        </PanelSection>
    );
}
