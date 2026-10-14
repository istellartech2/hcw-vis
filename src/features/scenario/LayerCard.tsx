import { ChevronDown, ChevronUp, EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FormationLayer } from '@/formation/FormationTypes';
import { layerSatelliteCount, moveLayer, removeLayer, toggleLayer } from '@/formation/formationConfig';
import { CIRCULAR_RADIUS_FACTOR, PATTERN_LABELS, SHAPE_LABELS } from '@/formation/layerForm';
import { appStore, useAppStore } from '@/store/appStore';
import { SATELLITE_PALETTE } from '@/store/settings';
import { cn } from '@/lib/utils';

/** 「ランダム」色のグループに表示する、パレットを一周するスウォッチ */
const RANDOM_COLOR_SWATCH = `conic-gradient(${[...SATELLITE_PALETTE, SATELLITE_PALETTE[0]].join(', ')})`;

interface LayerCardProps {
    layer: FormationLayer;
    isFirst: boolean;
    isLast: boolean;
    onEdit: () => void;
}

/** 衛星グループ（FormationLayer）1 つ分のカード。クリックで編集画面を開く。操作はすぐ 3D に反映する */
export function LayerCard({ layer, isFirst, isLast, onEdit }: LayerCardProps) {
    const updateFormation = useAppStore((s) => s.updateFormation);
    const placement =
        layer.pattern === 'origin'
            ? null
            : layer.placementMode === 'radius'
              ? layer.pattern === 'circular_orbit'
                  ? `半径 ${(layer.radius ?? 10) * CIRCULAR_RADIUS_FACTOR} m`
                  : `大きさ ${layer.radius} m`
              : `間隔 ${layer.spacing} m`;
    const remove = () => {
        const { formation, replaceFormation } = appStore.getState();
        const undo = replaceFormation({ formation: removeLayer(formation, layer.id) });
        toast(`「${layer.name}」を削除しました`, { action: { label: '元に戻す', onClick: undo } });
    };
    const details = [placement, `${SHAPE_LABELS[layer.shape]} ${layer.size} m`].filter(Boolean);

    return (
        <div
            className={cn(
                'group flex items-center gap-2.5 rounded-lg border border-line bg-raised py-2 pr-1 pl-2.5 transition-colors hover:border-line-strong',
                !layer.enabled && 'opacity-55',
            )}
        >
            <Switch
                size="sm"
                checked={layer.enabled}
                onCheckedChange={() => updateFormation((c) => toggleLayer(c, layer.id))}
                aria-label={`${layer.name} を表示`}
            />
            <button type="button" className="min-w-0 flex-1 text-left" onClick={onEdit}>
                <span className="flex items-center gap-1.5">
                    <span
                        className="size-2.5 shrink-0 rounded-full ring-1 ring-line-strong"
                        style={{ background: layer.colorMode === 'random' ? RANDOM_COLOR_SWATCH : layer.color }}
                    />
                    <span className="truncate text-[13px] font-medium text-fg">{layer.name}</span>
                    <span className="num ml-auto shrink-0 text-xs text-fg-muted">{layerSatelliteCount(layer)}機</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-fg-subtle">
                    {PATTERN_LABELS[layer.pattern]}
                    {details.length > 0 && ` · ${details.join(' · ')}`}
                </span>
            </button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="text-fg-subtle" aria-label="グループの操作">
                        <EllipsisVertical />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onSelect={onEdit}>
                        <Pencil />
                        編集
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={isFirst}
                        onSelect={() => updateFormation((c) => moveLayer(c, layer.id, -1))}
                    >
                        <ChevronUp />
                        上へ移動
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={isLast}
                        onSelect={() => updateFormation((c) => moveLayer(c, layer.id, 1))}
                    >
                        <ChevronDown />
                        下へ移動
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={remove}>
                        <Trash2 />
                        削除
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
