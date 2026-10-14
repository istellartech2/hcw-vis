import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/store/appStore';
import { moveLayer, removeLayer, toggleLayer } from '@/formation/formationConfig';
import type { FormationLayer } from '@/formation/FormationTypes';
import { PATTERN_LABELS, SHAPE_LABELS } from '@/formation/layerForm';
import { cn } from '@/lib/utils';

interface LayerCardProps {
    layer: FormationLayer;
    isFirst: boolean;
    isLast: boolean;
    onEdit: () => void;
}

export function LayerCard({ layer, isFirst, isLast, onEdit }: LayerCardProps) {
    const updateFormation = useAppStore((s) => s.updateFormation);
    const placement = layer.placementMode === 'radius' ? `範囲 ${layer.radius} m` : `間隔 ${layer.spacing} m`;
    const details = [
        PATTERN_LABELS[layer.pattern],
        layer.pattern === 'origin' ? null : placement,
        `${layer.satelliteCount}機`,
        `${SHAPE_LABELS[layer.shape]} ${layer.size} m`,
        layer.shape === 'box' && layer.boxRatios
            ? `比率 ${layer.boxRatios.x}:${layer.boxRatios.y}:${layer.boxRatios.z}`
            : null,
    ].filter(Boolean);

    return (
        <div
            className={cn(
                'group flex items-center gap-3 rounded-lg border bg-card/50 p-3 transition-colors hover:bg-accent/50',
                !layer.enabled && 'opacity-60',
            )}
        >
            <Switch
                checked={layer.enabled}
                onCheckedChange={() => updateFormation((c) => toggleLayer(c, layer.id))}
                aria-label={`${layer.name} を有効化`}
            />
            <button type="button" className="min-w-0 flex-1 text-left" onClick={onEdit}>
                <div className="flex items-center gap-2">
                    <span
                        className="size-3 shrink-0 rounded-full border border-white/30"
                        style={{
                            background:
                                layer.colorMode === 'random'
                                    ? 'conic-gradient(#ff6b6b, #f7b731, #4ecdc4, #54a0ff, #5f27cd, #ff6b6b)'
                                    : layer.color,
                        }}
                    />
                    <span className="truncate text-sm font-medium">{layer.name}</span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{details.join(' · ')}</p>
            </button>
            <div className="flex items-center">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="上へ"
                    disabled={isFirst}
                    onClick={() => updateFormation((c) => moveLayer(c, layer.id, -1))}
                >
                    <ChevronUp />
                </Button>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="下へ"
                    disabled={isLast}
                    onClick={() => updateFormation((c) => moveLayer(c, layer.id, 1))}
                >
                    <ChevronDown />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="削除">
                            <Trash2 />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle>レイヤーを削除しますか？</AlertDialogTitle>
                            <AlertDialogDescription>
                                「{layer.name}」を削除します。この操作は取り消せません。
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction
                                variant="destructive"
                                onClick={() => updateFormation((c) => removeLayer(c, layer.id))}
                            >
                                削除
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
