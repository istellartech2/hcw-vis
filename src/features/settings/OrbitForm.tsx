import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useEngine } from '@/engine/EngineContext';
import { useAppStore } from '@/store/appStore';
import type { OrbitInputs } from '@/store/settings';
import { UnitLabel } from './SettingRow';

const FIELDS: Array<{ key: keyof OrbitInputs; label: string; unit: string; min: number; max: number; step: number }> = [
    { key: 'altitudeKm', label: '高度', unit: 'km', min: 200, max: 36000, step: 50 },
    { key: 'inclination', label: '軌道傾斜角', unit: '°', min: 0, max: 180, step: 0.1 },
    { key: 'raan', label: '昇交点赤経', unit: '°', min: 0, max: 360, step: 1 },
    { key: 'argOfPerigee', label: '近地点引数', unit: '°', min: 0, max: 360, step: 1 },
    { key: 'meanAnomaly', label: '平均近点角', unit: '°', min: 0, max: 360, step: 1 },
];

type Draft = Record<keyof OrbitInputs, string>;

const toDraft = (orbit: OrbitInputs): Draft =>
    Object.fromEntries(FIELDS.map(({ key }) => [key, String(orbit[key])])) as Draft;

/** 基準軌道の入力。「反映」を押すまでシミュレーションには適用しない */
export function OrbitForm() {
    const engine = useEngine();
    const orbit = useAppStore((s) => s.orbit);
    const [draft, setDraft] = useState<Draft>(() => toDraft(orbit));
    const [invalid, setInvalid] = useState<Set<keyof OrbitInputs>>(new Set());

    const pending = FIELDS.some(({ key }) => parseFloat(draft[key]) !== orbit[key]);

    const apply = () => {
        const parsed = Object.fromEntries(FIELDS.map(({ key }) => [key, parseFloat(draft[key])])) as unknown as OrbitInputs;
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
        <form
            className="grid grid-cols-2 gap-3"
            onSubmit={(e) => {
                e.preventDefault();
                apply();
            }}
        >
            {FIELDS.map(({ key, label, unit, min, max, step }) => (
                <Field key={key} data-invalid={invalid.has(key) || undefined}>
                    <FieldLabel htmlFor={`orbit-${key}`}><UnitLabel unit={unit}>{label}</UnitLabel></FieldLabel>
                    <Input
                        id={`orbit-${key}`}
                        type="number"
                        inputMode="decimal"
                        min={min}
                        max={max}
                        step={step}
                        value={draft[key]}
                        aria-invalid={invalid.has(key) || undefined}
                        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    />
                </Field>
            ))}
            <div className="col-span-2 flex justify-end gap-2">
                {pending && (
                    <Button type="button" variant="ghost" onClick={() => { setDraft(toDraft(orbit)); setInvalid(new Set()); }}>
                        元に戻す
                    </Button>
                )}
                <Button type="submit" disabled={!pending}>
                    {pending ? '軌道を反映' : '反映済み'}
                </Button>
            </div>
        </form>
    );
}
