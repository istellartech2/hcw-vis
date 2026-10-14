import { useState } from 'react';
import { Crosshair, Move3d, Rocket, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { SegmentedControl } from '@/components/controls';
import { useEngine } from '@/engine/EngineContext';
import type { RswAxis, RswVector } from '@/engine/SimulationEngine';
import { appStore, useAppStore, type ActiveDialog } from '@/store/appStore';

const AXES: RswAxis[] = ['r', 's', 'w'];

const MANEUVERS = {
    thrust: { unit: 'm/s', step: '0.0001', initial: '0.001', description: '各軸の増速量' },
    position: { unit: 'm', step: '0.1', initial: '0', description: '各軸の移動量（瞬間移動）' },
} as const;

function ManeuverForm({ kind, onClose }: { kind: 'thrust' | 'position'; onClose: () => void }) {
    const engine = useEngine();
    const config = MANEUVERS[kind];
    const [values, setValues] = useState<Record<RswAxis, string>>({ r: '0', s: config.initial, w: '0' });

    const apply = () => {
        const vector = Object.fromEntries(AXES.map((axis) => [axis, parseFloat(values[axis])])) as RswVector;
        if (kind === 'thrust') engine.applyDeltaV(vector);
        else engine.applyPositionChange(vector);
        onClose();
    };

    return (
        <form
            className="space-y-2 rounded-lg border border-line bg-sunken p-2"
            onSubmit={(e) => {
                e.preventDefault();
                apply();
            }}
        >
            <p className="text-[11px] text-fg-muted">
                {config.description}（{config.unit}）
            </p>
            <div className="grid grid-cols-3 gap-1.5">
                {AXES.map((axis, i) => (
                    <label key={axis} className="flex flex-col gap-0.5">
                        <span className="num text-[10px] text-fg-subtle uppercase">{axis}</span>
                        <Input
                            type="number"
                            inputMode="decimal"
                            step={config.step}
                            autoFocus={i === 1}
                            className="num h-7 px-2 text-xs md:text-xs"
                            value={values[axis]}
                            onChange={(e) => setValues((v) => ({ ...v, [axis]: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') onClose();
                            }}
                        />
                    </label>
                ))}
            </div>
            <div className="flex justify-end gap-1.5">
                <Button type="button" size="xs" variant="ghost" onClick={onClose}>
                    キャンセル
                </Button>
                <Button type="submit" size="xs">
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
        <div className="grid grid-cols-[2.25rem_repeat(3,minmax(0,1fr))_2rem] items-baseline gap-x-1.5">
            <span className="text-fg-muted">{label}</span>
            {AXES.map((axis) => (
                <span key={axis} className="num text-right text-fg">
                    <span className="mr-1 text-[10px] text-fg-subtle uppercase">{axis}</span>
                    {vector[axis].toFixed(digits)}
                </span>
            ))}
            <span className="text-[10px] text-fg-subtle">{unit}</span>
        </div>
    );
}

/** 選択中の衛星の状態と操作（左下） */
export function SelectedSatelliteCard() {
    const engine = useEngine();
    const selected = useAppStore((s) => s.selected);
    const activeDialog = useAppStore((s) => s.ui.activeDialog);
    if (!selected) return null;

    const setDialog = (dialog: ActiveDialog) => appStore.getState().setUI({ activeDialog: dialog });

    return (
        <section
            aria-label="選択中の衛星"
            className="hud-bottom-left glass flex w-[min(21rem,calc(100vw-24px))] flex-col gap-2.5 rounded-[14px] px-3.5 py-3 text-xs"
        >
            <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
                    <Crosshair className="size-3.5 text-brand-text" />
                    {selected.index === 0 ? '基準衛星' : `衛星 #${selected.index}`}
                </h2>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-fg-muted"
                    aria-label="選択解除 (Esc)"
                    onClick={() => engine.clearSelection()}
                >
                    <X />
                </Button>
            </div>

            <div className="space-y-1">
                <VectorRow label="位置" vector={selected.position} unit="m" digits={1} />
                <VectorRow label="速度" vector={selected.velocity} unit="m/s" digits={3} />
                <div className="flex justify-between pt-0.5 text-fg-muted">
                    <span>
                        基準からの距離 <span className="num text-fg">{selected.distance.toFixed(1)}</span> m
                    </span>
                    <span>
                        相対速さ <span className="num text-fg">{selected.speed.toFixed(3)}</span> m/s
                    </span>
                </div>
            </div>

            {selected.index !== 0 && (
                <>
                    <SegmentedControl<'thrust' | 'position' | 'none'>
                        ariaLabel="操作"
                        value={activeDialog ?? 'none'}
                        options={[
                            {
                                value: 'thrust',
                                label: (
                                    <>
                                        <Rocket /> 推力 <Kbd>T</Kbd>
                                    </>
                                ),
                            },
                            {
                                value: 'position',
                                label: (
                                    <>
                                        <Move3d /> 位置 <Kbd>P</Kbd>
                                    </>
                                ),
                            },
                        ]}
                        onChange={(value) => setDialog(value === activeDialog || value === 'none' ? null : value)}
                    />
                    {activeDialog && (
                        <ManeuverForm
                            key={`${activeDialog}-${selected.index}`}
                            kind={activeDialog}
                            onClose={() => setDialog(null)}
                        />
                    )}
                </>
            )}
        </section>
    );
}
