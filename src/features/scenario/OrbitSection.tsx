import { useState } from 'react';
import { Orbit } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COMPACT_INPUT_CLASS, InfoGrid, WithUnit } from '@/components/controls';
import { PanelSection } from '@/components/panel-section';
import { useEngine } from '@/engine/EngineContext';
import { formatPeriod } from '@/lib/format';
import { useAppStore } from '@/store/appStore';
import type { OrbitInputs } from '@/store/settings';
import { cn } from '@/lib/utils';

const FIELDS: ReadonlyArray<{
    key: keyof OrbitInputs;
    label: string;
    unit: string;
    min: number;
    max: number;
    step: number;
}> = [
    { key: 'altitudeKm', label: '高度', unit: 'km', min: 200, max: 36000, step: 50 },
    { key: 'inclination', label: '軌道傾斜角', unit: '°', min: 0, max: 180, step: 0.1 },
    { key: 'raan', label: '昇交点赤経', unit: '°', min: 0, max: 360, step: 1 },
    { key: 'argOfPerigee', label: '近地点引数', unit: '°', min: 0, max: 360, step: 1 },
    { key: 'meanAnomaly', label: '平均近点角', unit: '°', min: 0, max: 360, step: 1 },
];

type Draft = Record<keyof OrbitInputs, string>;

const toDraft = (orbit: OrbitInputs): Draft =>
    Object.fromEntries(FIELDS.map(({ key }) => [key, String(orbit[key])])) as Draft;

/** 基準衛星の円軌道。「軌道を反映」を押すまでシミュレーションには適用しない */
export function OrbitSection() {
    const engine = useEngine();
    const orbit = useAppStore((s) => s.orbit);
    const info = useAppStore((s) => s.referenceInfo);
    const [draft, setDraft] = useState<Draft>(() => toDraft(orbit));
    const [invalid, setInvalid] = useState<ReadonlySet<keyof OrbitInputs>>(new Set());

    const pending = FIELDS.some(({ key }) => parseFloat(draft[key]) !== orbit[key]);

    const apply = () => {
        const parsed = Object.fromEntries(
            FIELDS.map(({ key }) => [key, parseFloat(draft[key])]),
        ) as unknown as OrbitInputs;
        const nanKeys = FIELDS.filter(({ key }) => !Number.isFinite(parsed[key])).map(({ key }) => key);
        setInvalid(new Set(nanKeys));
        if (nanKeys.length > 0) {
            toast.error('数値を入力してください');
            return;
        }
        const errors = engine.applyOrbit(parsed);
        if (errors.length > 0) {
            toast.error('軌道要素の入力エラー', { description: errors.join('\n') });
            return;
        }
        toast.success('基準軌道を更新しました');
    };

    return (
        <PanelSection title="基準軌道" icon={<Orbit />}>
            <form
                className="space-y-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    apply();
                }}
            >
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    {FIELDS.map(({ key, label, unit, min, max, step }) => (
                        <label key={key} className="flex flex-col gap-0.5">
                            <span className="text-xs text-fg-muted">{label}</span>
                            <WithUnit unit={unit}>
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    min={min}
                                    max={max}
                                    step={step}
                                    value={draft[key]}
                                    aria-invalid={invalid.has(key) || undefined}
                                    className={COMPACT_INPUT_CLASS}
                                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                                />
                            </WithUnit>
                        </label>
                    ))}
                    <div className="flex items-end">
                        <span className="pb-1.5 text-[11px] text-fg-subtle">離心率 0（円軌道）</span>
                    </div>
                </div>

                <div className={cn('flex gap-2', !pending && 'hidden')}>
                    <Button type="submit" size="sm" className="flex-1">
                        軌道を反映
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            setDraft(toDraft(orbit));
                            setInvalid(new Set());
                        }}
                    >
                        元に戻す
                    </Button>
                </div>
            </form>

            {info && (
                <div className="rounded-lg border border-line bg-sunken px-2.5 py-2">
                    <InfoGrid
                        rows={[
                            ['軌道周期', formatPeriod(info.orbit.periodMinutes)],
                            ...(info.geodetic
                                ? ([
                                      [
                                          '現在位置',
                                          `${formatLatitude(info.geodetic.latitude)} ${formatLongitude(info.geodetic.longitude)}`,
                                      ],
                                  ] as const)
                                : []),
                        ]}
                    />
                </div>
            )}
        </PanelSection>
    );
}

function formatLatitude(deg: number): string {
    return `${Math.abs(deg).toFixed(1)}°${deg >= 0 ? 'N' : 'S'}`;
}

function formatLongitude(deg: number): string {
    return `${Math.abs(deg).toFixed(1)}°${deg >= 0 ? 'E' : 'W'}`;
}
