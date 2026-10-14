import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, CircleAlert, Palette, Ruler, Shapes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { COMPACT_INPUT_CLASS, HelpTip, SegmentedControl, WithUnit } from '@/components/controls';
import { PanelSection } from '@/components/panel-section';
import { useEngine } from '@/engine/EngineContext';
import type { FormationLayer, PatternType, PlacementMode, ShapeType } from '@/formation/FormationTypes';
import { layerSatelliteCount, updateLayer } from '@/formation/formationConfig';
import {
    PATTERN_DESCRIPTIONS,
    PATTERN_GROUPS,
    PATTERN_LABELS,
    PLACEMENT_MODE_LABELS,
    SHAPE_LABELS,
    checkLayerForm,
    computeEccentricity,
    formToLayerUpdates,
    getCountLabel,
    getLayerFieldVisibility,
    getRadiusLabel,
    getSizeLabel,
    layerToForm,
    type LayerFormValues,
} from '@/formation/layerForm';
import { appStore, useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

/** 編集で選べる形状（3D ファイルはモデル読み込み UI が無いため除外） */
const EDITABLE_SHAPES: ShapeType[] = ['sphere', 'cube', 'box'];

/** 入力が止まってから 3D に反映するまでの待ち時間 */
const APPLY_DELAY_MS = 250;

type TextKey = { [K in keyof LayerFormValues]: LayerFormValues[K] extends string ? K : never }[keyof LayerFormValues];

interface LayerEditorProps {
    layer: FormationLayer;
    onClose: () => void;
}

/**
 * 衛星グループ（FormationLayer）の編集画面。パネル内に表示し、3D ビューを隠さない。
 * 入力は少し待ってから自動で 3D に反映する（時刻は t = 0 に戻る）。
 * 「キャンセル」で開いたときの配置に戻す。
 */
export function LayerEditor({ layer, onClose }: LayerEditorProps) {
    const engine = useEngine();
    const updateFormation = useAppStore((s) => s.updateFormation);
    const [values, setValues] = useState(() => layerToForm(layer));
    const [snapshot] = useState(() => appStore.getState().formation);
    const touched = useRef(false);
    const problem = checkLayerForm(values);

    const apply = useCallback(
        (next: LayerFormValues) => {
            updateFormation((c) => updateLayer(c, layer.id, formToLayerUpdates(next)));
            engine.resetPositions();
        },
        [engine, layer.id, updateFormation],
    );

    useEffect(() => {
        if (!touched.current || problem) return;
        const timer = setTimeout(() => apply(values), APPLY_DELAY_MS);
        return () => clearTimeout(timer);
    }, [apply, values, problem]);

    const change = (patch: Partial<LayerFormValues>) => {
        touched.current = true;
        setValues((v) => ({ ...v, ...patch }));
    };

    const done = () => {
        if (touched.current && !problem) apply(values);
        onClose();
    };

    const cancel = () => {
        updateFormation(() => snapshot);
        engine.resetPositions();
        onClose();
    };

    return (
        <div className="flex min-h-full flex-col">
            <div className="mb-2 flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" aria-label="一覧に戻る" onClick={done}>
                    <ArrowLeft />
                </Button>
                <span className="text-[13px] font-semibold text-fg">衛星グループを編集</span>
            </div>
            <p className="mb-3 text-xs text-fg-muted">変更はすぐ 3D に反映されます（時刻は t = 0 に戻ります）。</p>

            <form
                className="flex-1"
                onSubmit={(e) => {
                    e.preventDefault();
                    done();
                }}
            >
                <label className="mb-3 flex flex-col gap-1">
                    <span className="text-xs text-fg-muted">名前</span>
                    <Input
                        value={values.name}
                        className="h-8 bg-sunken text-[13px] dark:bg-sunken"
                        onChange={(e) => change({ name: e.target.value })}
                    />
                </label>
                <PatternSection values={values} onChange={change} />
                <SizeSection values={values} onChange={change} />
                <AppearanceSection values={values} onChange={change} />
                <button type="submit" hidden />
            </form>

            <div className="sticky bottom-0 -mx-3 mt-2 border-t border-line bg-surface-solid px-3 pt-2.5 pb-1">
                {problem && (
                    <p role="alert" className="mb-2 flex items-start gap-1.5 text-xs text-danger">
                        <CircleAlert className="mt-px size-3.5 shrink-0" />
                        {problem}
                    </p>
                )}
                <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={cancel}>
                        キャンセル
                    </Button>
                    <Button className="flex-1" disabled={problem !== null} onClick={done}>
                        完了
                    </Button>
                </div>
            </div>
        </div>
    );
}

type SectionProps = { values: LayerFormValues; onChange: (patch: Partial<LayerFormValues>) => void };

/** ラベル付きの数値入力 */
function NumberInput({
    label,
    unit,
    value,
    help,
    onChange,
    ...props
}: {
    label: ReactNode;
    unit?: string;
    value: string;
    help?: ReactNode;
    onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) {
    const input = (
        <Input
            type="number"
            inputMode="decimal"
            value={value}
            className={cn(COMPACT_INPUT_CLASS, !unit && 'pr-2')}
            onChange={(e) => onChange(e.target.value)}
            {...props}
        />
    );
    return (
        <label className="flex min-w-0 flex-col gap-0.5">
            <span className="inline-flex items-center gap-0.5 text-xs text-fg-muted">
                {label}
                {help && <HelpTip>{help}</HelpTip>}
            </span>
            {unit ? <WithUnit unit={unit}>{input}</WithUnit> : input}
        </label>
    );
}

function PatternSection({ values, onChange }: SectionProps) {
    return (
        <PanelSection title="配置パターン" icon={<Shapes />}>
            <Select value={values.pattern} onValueChange={(pattern) => onChange({ pattern: pattern as PatternType })}>
                <SelectTrigger className="h-8! w-full bg-sunken text-[13px] dark:bg-sunken" aria-label="配置パターン">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent
                    position="popper"
                    className="max-h-[min(28rem,var(--radix-select-content-available-height))]"
                >
                    {PATTERN_GROUPS.map((group, i) => (
                        <SelectGroup key={group.label}>
                            {i > 0 && <SelectSeparator />}
                            <SelectLabel className="flex flex-col items-start gap-0">
                                <span className="font-semibold text-fg">{group.label}</span>
                                {group.note && <span className="text-[11px] text-fg-subtle">{group.note}</span>}
                            </SelectLabel>
                            {group.patterns.map((p) => (
                                <SelectItem key={p} value={p}>
                                    {PATTERN_LABELS[p]}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    ))}
                </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-fg-muted">{PATTERN_DESCRIPTIONS[values.pattern]}</p>
        </PanelSection>
    );
}

function SizeSection({ values, onChange }: SectionProps) {
    const visible = getLayerFieldVisibility(values);
    const count = Number(values.satelliteCount);
    const generated =
        Number.isInteger(count) && count > 0 ? layerSatelliteCount({ ...values, satelliteCount: count }) : null;

    return (
        <PanelSection title="数と大きさ" icon={<Ruler />}>
            {visible.placementMode && (
                <SegmentedControl<PlacementMode>
                    ariaLabel="大きさの指定方法"
                    value={values.placementMode}
                    options={(Object.keys(PLACEMENT_MODE_LABELS) as PlacementMode[]).map((m) => ({
                        value: m,
                        label: PLACEMENT_MODE_LABELS[m],
                    }))}
                    onChange={(placementMode) => onChange({ placementMode })}
                />
            )}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                {visible.satelliteCount && (
                    <NumberInput
                        label={getCountLabel(values.pattern)}
                        unit="機"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={values.satelliteCount}
                        onChange={(satelliteCount) => onChange({ satelliteCount })}
                    />
                )}
                {visible.radius && (
                    <NumberInput
                        label={getRadiusLabel(values.pattern)}
                        unit="m"
                        min={0.1}
                        step={0.1}
                        value={values.radius}
                        onChange={(radius) => onChange({ radius })}
                    />
                )}
                {visible.spacing && (
                    <NumberInput
                        label="衛星の間隔"
                        unit="m"
                        min={0.01}
                        step={0.1}
                        value={values.spacing}
                        onChange={(spacing) => onChange({ spacing })}
                    />
                )}
            </div>
            {visible.satelliteCount && generated !== null && generated !== count && (
                <p className="text-xs text-fg-muted">
                    {values.pattern === 'axis' ? '3 軸 × 両側で ' : '原点を除く格子点で '}
                    合計 <span className="num font-medium text-fg">{generated.toLocaleString()}</span> 機になります
                </p>
            )}

            {visible.positiveZ && (
                <div className="flex items-center gap-2">
                    <span className="inline-flex w-24 shrink-0 items-center gap-0.5 text-xs text-fg-muted">
                        傾きの向き
                        <HelpTip>軌道面を W 軸の正・負どちら側へ傾けるか。</HelpTip>
                    </span>
                    <SegmentedControl<'plus' | 'minus'>
                        ariaLabel="傾きの向き"
                        value={values.positiveZ ? 'plus' : 'minus'}
                        options={[
                            { value: 'plus', label: '+W 側' },
                            { value: 'minus', label: '−W 側' },
                        ]}
                        onChange={(v) => onChange({ positiveZ: v === 'plus' })}
                    />
                </div>
            )}

            {(visible.originOffset || visible.axisOffset) && (
                <div className="space-y-1">
                    <span className="text-xs text-fg-muted">
                        {visible.originOffset ? '置く位置' : '全体をずらす量'}（基準衛星から, m）
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                        <NumberInput
                            label="R 動径"
                            step={0.1}
                            value={values.offsetR}
                            onChange={(offsetR) => onChange({ offsetR })}
                        />
                        <NumberInput
                            label="S 進行"
                            step={0.1}
                            value={values.offsetS}
                            onChange={(offsetS) => onChange({ offsetS })}
                        />
                        <NumberInput
                            label="W 面外"
                            step={0.1}
                            value={values.offsetW}
                            onChange={(offsetW) => onChange({ offsetW })}
                        />
                    </div>
                </div>
            )}

            {visible.periodicParams && (
                <div className="space-y-1.5 rounded-lg border border-line bg-sunken/50 p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-fg">
                            楕円の係数（A に対する比）
                            <HelpTip>
                                R = A cos nt + B sin nt,　S = −2A sin nt + 2B cos nt + D,　W = E cos nt + F sin nt
                            </HelpTip>
                        </span>
                        <span className="num shrink-0 text-[11px] text-fg-subtle">
                            e = {computeEccentricity(values).toFixed(3)}
                        </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                        {(['ratioB', 'ratioD', 'ratioE', 'ratioF'] as const satisfies readonly TextKey[]).map((key) => (
                            <NumberInput
                                key={key}
                                label={`${key.slice(-1)}/A`}
                                step={0.1}
                                value={values[key]}
                                onChange={(v) => onChange({ [key]: v })}
                            />
                        ))}
                    </div>
                </div>
            )}
        </PanelSection>
    );
}

function AppearanceSection({ values, onChange }: SectionProps) {
    const visible = getLayerFieldVisibility(values);
    const shapes = EDITABLE_SHAPES.includes(values.shape) ? EDITABLE_SHAPES : [...EDITABLE_SHAPES, values.shape];

    return (
        <PanelSection title="見た目" icon={<Palette />}>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                <label className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-xs text-fg-muted">形状</span>
                    <Select value={values.shape} onValueChange={(shape) => onChange({ shape: shape as ShapeType })}>
                        <SelectTrigger size="sm" className="h-7! w-full bg-sunken text-xs dark:bg-sunken">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {shapes.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {SHAPE_LABELS[s]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>
                <NumberInput
                    label={getSizeLabel(values.shape)}
                    unit="m"
                    min={0.01}
                    step={0.1}
                    value={values.size}
                    onChange={(size) => onChange({ size })}
                />
            </div>

            {visible.boxRatios && (
                <div className="grid grid-cols-3 gap-1.5">
                    <NumberInput
                        label="比率 X"
                        min={0.1}
                        step={0.1}
                        value={values.boxX}
                        onChange={(boxX) => onChange({ boxX })}
                    />
                    <NumberInput
                        label="比率 Y"
                        min={0.1}
                        step={0.1}
                        value={values.boxY}
                        onChange={(boxY) => onChange({ boxY })}
                    />
                    <NumberInput
                        label="比率 Z"
                        min={0.1}
                        step={0.1}
                        value={values.boxZ}
                        onChange={(boxZ) => onChange({ boxZ })}
                    />
                </div>
            )}
            {visible.rotation && (
                <div className="grid grid-cols-2 gap-x-2">
                    <NumberInput
                        label="R 軸まわりの回転"
                        unit="°"
                        step={5}
                        value={values.rotationR}
                        onChange={(rotationR) => onChange({ rotationR })}
                    />
                    <NumberInput
                        label="S 軸まわりの回転"
                        unit="°"
                        step={5}
                        value={values.rotationS}
                        onChange={(rotationS) => onChange({ rotationS })}
                    />
                </div>
            )}

            <div className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-xs text-fg-muted">色</span>
                <SegmentedControl<LayerFormValues['colorMode']>
                    ariaLabel="色の付け方"
                    value={values.colorMode}
                    options={[
                        { value: 'uniform', label: '1 色' },
                        { value: 'random', label: 'ランダム' },
                    ]}
                    onChange={(colorMode) => onChange({ colorMode })}
                />
                {visible.color && (
                    <input
                        type="color"
                        aria-label="色"
                        className="h-7 w-10 shrink-0 cursor-pointer rounded-md border border-line-strong bg-sunken p-0.5"
                        value={/^#[0-9a-fA-F]{6}$/.test(values.color) ? values.color : '#ffffff'}
                        onChange={(e) => onChange({ color: e.target.value })}
                    />
                )}
            </div>
        </PanelSection>
    );
}
