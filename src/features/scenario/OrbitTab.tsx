import { useState } from 'react';
import { Atom, Orbit, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PanelSection } from '@/components/panel-section';
import { COMPACT_INPUT_CLASS, HelpTip, NumberField, ToggleRow, WithUnit } from '@/components/controls';
import { useEngine } from '@/engine/EngineContext';
import { orbitPeriodMinutes } from '@/simulation/OrbitElements';
import { appStore, useAppStore } from '@/store/appStore';
import type { OrbitInputs } from '@/store/settings';
import { cn } from '@/lib/utils';

/** 軌道・力学: 基準軌道、力学モデル、外乱と衝突 */
export function OrbitTab() {
    return (
        <div>
            <OrbitSection />
            <DynamicsSection />
            <DisturbanceSection />
        </div>
    );
}

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
function OrbitSection() {
    const engine = useEngine();
    const orbit = useAppStore((s) => s.orbit);
    // 文字列で購読して、表示が変わらない更新では再描画しない
    const position = useAppStore(
        (s) =>
            s.referenceInfo &&
            `${formatLatitude(s.referenceInfo.latitude)} ${formatLongitude(s.referenceInfo.longitude)}`,
    );
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
        <PanelSection
            title="基準軌道"
            icon={<Orbit />}
            action={
                <HelpTip>
                    基準衛星の円軌道（離心率 0）です。値を変えたら「軌道を反映」で適用します。
                    {position && ` 現在位置: ${position}`}
                </HelpTip>
            }
        >
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
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-fg-muted">軌道周期</span>
                        <span className="num flex h-7 items-center text-xs text-fg">
                            {formatPeriod(orbitPeriodMinutes(orbit.altitudeKm))}
                        </span>
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
        </PanelSection>
    );
}

function formatLatitude(deg: number): string {
    return `${Math.abs(deg).toFixed(1)}°${deg >= 0 ? 'N' : 'S'}`;
}

function formatLongitude(deg: number): string {
    return `${Math.abs(deg).toFixed(1)}°${deg >= 0 ? 'E' : 'W'}`;
}

/** 軌道周期（分）を表示用に整形する */
function formatPeriod(periodMinutes: number): string {
    const hours = Math.floor(periodMinutes / 60);
    if (hours > 0) return `${hours}時間${(periodMinutes % 60).toFixed(1)}分`;
    return `${periodMinutes.toFixed(1)}分`;
}

function DynamicsSection() {
    const simulation = useAppStore((s) => s.simulation);
    const setSimulation = appStore.getState().setSimulation;

    return (
        <PanelSection title="力学モデル" icon={<Atom />}>
            <ToggleRow
                label="J2 摂動"
                help="地球の扁平（J2 項）による摂動を Schweighart-Sedwick 方程式で考慮します。"
                checked={simulation.j2Perturbation}
                onCheckedChange={(j2Perturbation) => setSimulation({ j2Perturbation })}
            />
            <ToggleRow
                label="J2 安定配置で初期化"
                help="J2 摂動下でドリフトしない初期速度で衛星を配置します。切り替えると再配置されます。"
                checked={simulation.j2StableArrangement}
                onCheckedChange={(j2StableArrangement) => setSimulation({ j2StableArrangement })}
            />
        </PanelSection>
    );
}

function DisturbanceSection() {
    const engine = useEngine();
    const simulation = useAppStore((s) => s.simulation);
    const collisionAvailable = useAppStore((s) => s.display.satelliteShape === 'sphere');
    const setSimulation = appStore.getState().setSimulation;

    return (
        <PanelSection title="外乱と衝突" icon={<Sparkles />} collapsible defaultOpen={false}>
            <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-fg-muted">摂動量</span>
                <WithUnit unit="m/s">
                    <NumberField
                        min={0.001}
                        max={0.1}
                        step={0.001}
                        value={simulation.perturbationAmount}
                        onValueChange={(perturbationAmount) => setSimulation({ perturbationAmount })}
                        className={COMPACT_INPUT_CLASS}
                        aria-label="摂動量"
                    />
                </WithUnit>
                <Button size="sm" variant="secondary" onClick={() => engine.addPerturbation()}>
                    加える
                </Button>
            </div>
            <ToggleRow
                label="衝突検出"
                help={
                    collisionAvailable ? '衛星同士の衝突を検出して弾性衝突させます。' : '球体形状のときだけ使えます。'
                }
                checked={simulation.collisionEnabled}
                disabled={!collisionAvailable}
                onCheckedChange={(collisionEnabled) => setSimulation({ collisionEnabled })}
            />
            {simulation.collisionEnabled && collisionAvailable && (
                <div className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs text-fg-muted">衛星質量</span>
                    <WithUnit unit="kg">
                        <NumberField
                            min={0.1}
                            max={1000}
                            step={0.1}
                            value={simulation.satelliteMass}
                            onValueChange={(satelliteMass) => setSimulation({ satelliteMass })}
                            className={COMPACT_INPUT_CLASS}
                            aria-label="衛星質量"
                        />
                    </WithUnit>
                </div>
            )}
        </PanelSection>
    );
}
