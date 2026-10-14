import { useState } from 'react';
import { Crosshair, Move3d, Rocket, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { HudPanel } from '@/components/hud-panel';
import { useEngine } from '@/engine/EngineContext';
import type { RswAxis, RswVector } from '@/engine/SimulationEngine';
import { appStore, useAppStore, type ActiveDialog } from '@/store/appStore';

const AXES: RswAxis[] = ['r', 's', 'w'];

const DIALOGS = {
    thrust: { title: '推力付加', unit: 'm/s', step: '0.0001', initial: '0.001', description: '各軸の増速量' },
    position: { title: '位置変更', unit: 'm', step: '0.1', initial: '0', description: '各軸の移動量（瞬間移動）' },
} as const;

function RswInputForm({ kind, onClose }: { kind: 'thrust' | 'position'; onClose: () => void }) {
    const engine = useEngine();
    const config = DIALOGS[kind];
    const [values, setValues] = useState<Record<RswAxis, string>>({ r: '0', s: config.initial, w: '0' });

    const apply = () => {
        const vector = Object.fromEntries(AXES.map((axis) => [axis, parseFloat(values[axis])])) as RswVector;
        if (kind === 'thrust') engine.applyDeltaV(vector);
        else engine.applyPositionChange(vector);
        onClose();
    };

    return (
        <form
            className="space-y-2 border-t pt-3"
            onSubmit={(e) => {
                e.preventDefault();
                apply();
            }}
        >
            <p className="text-xs text-muted-foreground">
                {config.description} ({config.unit})
            </p>
            <div className="grid grid-cols-3 gap-2">
                {AXES.map((axis, i) => (
                    <label key={axis} className="space-y-1">
                        <span className="font-mono text-xs uppercase text-muted-foreground">{axis}</span>
                        <Input
                            type="number"
                            inputMode="decimal"
                            step={config.step}
                            autoFocus={i === 1}
                            className="h-7 px-2 font-mono text-xs"
                            value={values[axis]}
                            onChange={(e) => setValues((v) => ({ ...v, [axis]: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') onClose();
                            }}
                        />
                    </label>
                ))}
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={onClose}>
                    キャンセル
                </Button>
                <Button type="submit" size="sm">
                    適用
                </Button>
            </div>
        </form>
    );
}

function VectorRow({
    label,
    vector,
    unit,
    digits,
}: {
    label: string;
    vector: RswVector;
    unit: string;
    digits: number;
}) {
    return (
        <div className="grid grid-cols-[3rem_repeat(3,minmax(0,1fr))] items-baseline gap-x-2">
            <span className="text-muted-foreground">{label}</span>
            {AXES.map((axis) => (
                <span key={axis} className="text-right font-mono tabular-nums">
                    <span className="mr-1 text-[10px] uppercase text-muted-foreground">{axis}</span>
                    {vector[axis].toFixed(digits)}
                </span>
            ))}
            <span className="col-start-2 col-end-5 -mt-0.5 text-right text-[10px] text-muted-foreground">{unit}</span>
        </div>
    );
}

/** 選択中の衛星の状態と操作（左下） */
export function SelectedSatellitePanel() {
    const engine = useEngine();
    const selected = useAppStore((s) => s.selected);
    const activeDialog = useAppStore((s) => s.ui.activeDialog);
    if (!selected) return null;

    const setDialog = (dialog: ActiveDialog) => appStore.getState().setUI({ activeDialog: dialog });

    return (
        <HudPanel className="w-[min(20rem,calc(100vw-1.5rem))] space-y-3 p-3 text-xs">
            <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-medium">
                    <Crosshair className="size-4" />
                    {selected.index === 0 ? '基準衛星' : `衛星 ${selected.index}`}
                </h2>
                <Button variant="ghost" size="icon-xs" aria-label="選択解除" onClick={() => engine.clearSelection()}>
                    <X />
                </Button>
            </div>

            <div className="space-y-1">
                <VectorRow label="位置" vector={selected.position} unit="m" digits={1} />
                <VectorRow label="速度" vector={selected.velocity} unit="m/s" digits={3} />
                <div className="flex justify-between text-muted-foreground">
                    <span>
                        距離{' '}
                        <span className="font-mono text-foreground tabular-nums">{selected.distance.toFixed(1)}</span> m
                    </span>
                    <span>
                        速さ <span className="font-mono text-foreground tabular-nums">{selected.speed.toFixed(3)}</span>{' '}
                        m/s
                    </span>
                </div>
            </div>

            <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                className="w-full"
                value={activeDialog ?? ''}
                onValueChange={(value) => setDialog((value || null) as ActiveDialog)}
            >
                <ToggleGroupItem value="thrust" className="flex-1">
                    <Rocket />
                    推力 <Kbd>T</Kbd>
                </ToggleGroupItem>
                <ToggleGroupItem value="position" className="flex-1">
                    <Move3d />
                    位置 <Kbd>P</Kbd>
                </ToggleGroupItem>
            </ToggleGroup>

            {activeDialog && (
                <RswInputForm
                    key={`${activeDialog}-${selected.index}`}
                    kind={activeDialog}
                    onClose={() => setDialog(null)}
                />
            )}
        </HudPanel>
    );
}
