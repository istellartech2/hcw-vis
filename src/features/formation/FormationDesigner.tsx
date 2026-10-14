import { useRef, useState } from 'react';
import { Check, Download, EllipsisVertical, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useEngine } from '@/engine/EngineContext';
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

export function FormationDesigner() {
    const engine = useEngine();
    const manager = engine.formation;
    const open = useAppStore((s) => s.ui.formationOpen);
    const config = useAppStore((s) => s.formation);
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const importRef = useRef<HTMLInputElement>(null);

    const setOpen = (formationOpen: boolean) => appStore.getState().setUI({ formationOpen });
    // +1 は基準衛星
    const total = config.layers.filter((l) => l.enabled).reduce((sum, l) => sum + l.satelliteCount, 0) + 1;
    const editingLayer = config.layers.find((l) => l.id === editingLayerId) ?? null;

    const importJSON = async (file: File) => {
        const result = manager.importFromJSON(await file.text());
        if (result.valid) toast.success('フォーメーションを読み込みました');
        else toast.error('読み込みに失敗しました', { description: result.errors.join('\n') });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="flex max-h-[min(48rem,calc(100dvh-2rem))] flex-col gap-0 p-0 sm:max-w-3xl">
                    <DialogHeader className="border-b p-4 pr-12">
                        <div className="flex items-center gap-2">
                            <DialogTitle>フォーメーション設計</DialogTitle>
                            <Badge variant="secondary" className="tabular-nums">合計 {total} 機</Badge>
                        </div>
                        <DialogDescription>衛星配置をレイヤー単位で追加・編集します。</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_2fr]">
                        <Field>
                            <FieldLabel htmlFor="formation-name">名前</FieldLabel>
                            <Input id="formation-name" value={config.name} onChange={(e) => manager.setName(e.target.value)} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="formation-description">説明</FieldLabel>
                            <Input
                                id="formation-description"
                                placeholder="任意"
                                value={config.description ?? ''}
                                onChange={(e) => manager.setDescription(e.target.value)}
                            />
                        </Field>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="space-y-2 p-4">
                            {config.layers.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">レイヤーを追加してください</p>
                            ) : (
                                config.layers.map((layer, index) => (
                                    <LayerCard
                                        key={layer.id}
                                        layer={layer}
                                        isFirst={index === 0}
                                        isLast={index === config.layers.length - 1}
                                        onEdit={() => setEditingLayerId(layer.id)}
                                    />
                                ))
                            )}
                            <Button variant="outline" className="w-full border-dashed" onClick={() => manager.addLayer()}>
                                <Plus />
                                レイヤーを追加
                            </Button>
                        </div>
                    </div>

                    <DialogFooter className="m-0 flex-row items-center justify-between border-t p-4 sm:justify-between">
                        <input
                            ref={importRef}
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void importJSON(file);
                                e.target.value = '';
                            }}
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <EllipsisVertical />
                                    JSON
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" side="top">
                                <DropdownMenuItem onSelect={() => downloadText(`${config.name}_formation.json`, manager.exportToJSON())}>
                                    <Download />
                                    JSONに保存
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => importRef.current?.click()}>
                                    <Upload />
                                    JSONから読み込む
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setOpen(false)}>閉じる</Button>
                            <Button
                                onClick={() => {
                                    engine.applyFormationConfig();
                                    setOpen(false);
                                }}
                            >
                                <Check />
                                この配置で開始
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <LayerEditorDialog
                layer={editingLayer}
                onClose={() => setEditingLayerId(null)}
                onSave={(updates) => {
                    if (!editingLayerId) return;
                    manager.updateLayer(editingLayerId, updates);
                    engine.applyFormationConfig();
                    setEditingLayerId(null);
                }}
            />
        </>
    );
}
