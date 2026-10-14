import { useRef, useState } from 'react';
import { Download, EllipsisVertical, Plus, RotateCcw, Satellite, Undo2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { PanelSection } from '@/components/panel-section';
import { useEngine } from '@/engine/EngineContext';
import {
    addLayer,
    countSatellites,
    parseFormation,
    serializeFormation,
    updateLayer,
} from '@/formation/formationConfig';
import { appStore, useAppStore } from '@/store/appStore';
import { LayerCard } from './LayerCard';
import { LayerEditorDialog } from './LayerEditorDialog';

function downloadText(fileName: string, text: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * フォーメーション（衛星の初期配置）をレイヤー単位で編集する。
 * 編集内容は「この配置で再配置」を押すまでシミュレーションに反映しない。
 */
export function FormationSection() {
    const engine = useEngine();
    const config = useAppStore((s) => s.formation);
    const applied = useAppStore((s) => s.appliedFormation);
    const updateFormation = useAppStore((s) => s.updateFormation);
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const importRef = useRef<HTMLInputElement>(null);

    const dirty = config !== applied;
    const editingLayer = config.layers.find((l) => l.id === editingLayerId) ?? null;

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

    const discardChanges = () => {
        const current = appStore.getState().appliedFormation;
        if (current) updateFormation(() => current);
    };

    return (
        <PanelSection
            title="フォーメーション"
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
                                JSON に保存
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
            <div className="flex items-baseline justify-between text-xs text-fg-muted">
                <span className="truncate">{config.name}</span>
                <span className="shrink-0">
                    合計 <span className="num text-fg">{countSatellites(config) + 1}</span> 機（基準衛星を含む）
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
                        setEditingLayerId(next.layers[next.layers.length - 1].id);
                    }}
                >
                    <Plus />
                    レイヤーを追加
                </Button>
            </div>

            {dirty ? (
                <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => engine.resetPositions()}>
                        <RotateCcw />
                        この配置で再配置
                    </Button>
                    <Button variant="ghost" onClick={discardChanges}>
                        変更を破棄
                    </Button>
                </div>
            ) : (
                <Button variant="secondary" className="w-full" onClick={() => engine.resetPositions()}>
                    <RotateCcw />
                    初期位置に戻す
                    <Kbd className="ml-auto">R</Kbd>
                </Button>
            )}

            <LayerEditorDialog
                layer={editingLayer}
                onClose={() => setEditingLayerId(null)}
                onSave={(updates) => {
                    if (!editingLayerId) return;
                    updateFormation((c) => updateLayer(c, editingLayerId, updates));
                    engine.resetPositions();
                    setEditingLayerId(null);
                }}
            />
        </PanelSection>
    );
}
