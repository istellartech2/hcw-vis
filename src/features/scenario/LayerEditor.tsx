import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, CircleAlert, Plus } from 'lucide-react';
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
import { useEngine } from '@/engine/EngineContext';
import type {
    FormationConfig,
    FormationLayer,
    PatternType,
    PlacementMode,
    ShapeType,
} from '@/formation/FormationTypes';
import { layerSatelliteCount, updateLayer } from '@/formation/formationConfig';
import {
    PATTERN_DESCRIPTIONS,
    PATTERN_GROUPS,
    PATTERN_LABELS,
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
    /** キャンセル時に戻す配置。省略時は編集を開いた時点の配置（追加直後なら追加前の配置を渡す） */
    restoreOnCancel?: FormationConfig;
    onClose: () => void;
}

/**
 * 衛星グループ（FormationLayer）の編集画面。パネル内に表示し、3D ビューを隠さない。
 * 入力は少し待ってから自動で 3D に反映する（時刻は t = 0 に戻る）。
 * 「キャンセル」で開いたときの配置に戻す。
 */
export function LayerEditor({ layer, restoreOnCancel, onClose }: LayerEditorProps) {
    const engine = useEngine();
    const updateFormation = useAppStore((s) => s.updateFormation);
    const [values, setValues] = useState(() => layerToForm(layer));
    const [snapshot] = useState(() => restoreOnCancel ?? appStore.getState().formation);
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

    // 追加直後のグループは、何も変えずに閉じても残す（キャンセルしたときだけ取り消す）
    const cancel = () => {
        updateFormation(() => snapshot);
        engine.resetPositions();
        onClose();
    };

    const count = Number(values.satelliteCount);
    const total = getLayerFieldVisibility(values).satelliteCount
        ? Number.isInteger(count) && count > 0
            ? layerSatelliteCount({ ...values, satelliteCount: count })
            : null
        : 1;

    return (
        <div className="flex min-h-full flex-col">
            <div className="mb-3 flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" aria-label="一覧に戻る" onClick={done}>
                    <ArrowLeft />
                </Button>
                <Input
                    value={values.name}
                    aria-label="グループ名"
                    placeholder="グループ名"
                    className="h-8 min-w-0 flex-1 border-transparent bg-transparent px-1.5 text-[13px] font-semibold shadow-none hover:border-line focus-visible:border-line-strong dark:bg-transparent"
                    onChange={(e) => change({ name: e.target.value })}
                />
            </div>

            <form
                className="flex-1 space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    done();
                }}
            >
                <PatternGroup values={values} onChange={change} />
                <PlacementGroup values={values} onChange={change} />
                <AppearanceGroup values={values} onChange={change} />
                <button type="submit" hidden />
            </form>

            <div className="sticky bottom-0 -mx-3 mt-4 border-t border-line bg-surface-solid px-3 pt-2.5 pb-1">
                {problem && (
                    <p role="alert" className="mb-2 flex items-start gap-1.5 text-xs text-danger">
                        <CircleAlert className="mt-px size-3.5 shrink-0" />
                        {problem}
                    </p>
                )}
                <div className="flex items-center gap-2">
                    <span
                        className="mr-auto text-xs text-fg-muted"
                        title="変更はすぐ 3D に反映されます（時刻は t = 0 に戻ります）"
                    >
                        {total !== null && (
                            <>
                                合計 <span className="num font-medium text-fg">{total.toLocaleString()}</span> 機
                            </>
                        )}
                    </span>
                    <Button variant="ghost" size="sm" onClick={cancel}>
                        キャンセル
                    </Button>
                    <Button size="sm" className="px-5" disabled={problem !== null} onClick={done}>
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

/** 編集画面内の小見出し付きグループ（PanelSection より軽い区切り） */
function Group({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="space-y-2">
            <div className="flex min-h-6 items-center justify-between gap-2">
                <h3 className="text-xs font-medium text-fg-muted">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    );
}

/** R/S/W や X/Y/Z の 3 成分を 1 行で入力する */
function Vec3Input<K extends TextKey>({
    label,
    keys,
    axes,
    values,
    onChange,
    step = 0.1,
    min,
}: SectionProps & {
    label: string;
    keys: readonly [K, K, K];
    axes: readonly [string, string, string];
    step?: number;
    min?: number;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-fg-muted">{label}</span>
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5">
                {keys.map((key, i) => (
                    <span key={key} className="relative block min-w-0">
                        <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[11px] font-medium text-fg-subtle">
                            {axes[i]}
                        </span>
                        <Input
                            type="number"
                            inputMode="decimal"
                            step={step}
                            min={min}
                            aria-label={`${label} ${axes[i]}`}
                            value={values[key]}
                            className={cn(COMPACT_INPUT_CLASS, 'pr-1.5 pl-6')}
                            onChange={(e) => onChange({ [key]: e.target.value })}
                        />
                    </span>
                ))}
            </div>
        </div>
    );
}

function PatternGroup({ values, onChange }: SectionProps) {
    return (
        <Group title="配置パターン">
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
            <p className="text-[11px] leading-relaxed text-fg-subtle">{PATTERN_DESCRIPTIONS[values.pattern]}</p>
        </Group>
    );
}

function PlacementGroup({ values, onChange }: SectionProps) {
    const visible = getLayerFieldVisibility(values);
    const [showOffset, setShowOffset] = useState(() =>
        [values.offsetR, values.offsetS, values.offsetW].some((v) => parseFloat(v) !== 0),
    );

    return (
        <Group
            title={visible.originOffset ? '位置' : '数と大きさ'}
            action={
                visible.placementMode && (
                    <div className="w-40">
                        <SegmentedControl<PlacementMode>
                            ariaLabel="大きさの指定方法"
                            value={values.placementMode}
                            options={[
                                { value: 'spacing', label: '間隔' },
                                { value: 'radius', label: '全体' },
                            ]}
                            onChange={(placementMode) => onChange({ placementMode })}
                        />
                    </div>
                )
            }
        >
            {(visible.satelliteCount || visible.radius || visible.spacing) && (
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
            )}

            {visible.positiveZ && (
                <div className="flex items-center gap-2">
                    <span className="inline-flex w-16 shrink-0 items-center gap-0.5 text-xs text-fg-muted">
                        傾き
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

            {visible.originOffset && (
                <Vec3Input
                    label="基準から (m)"
                    keys={['offsetR', 'offsetS', 'offsetW']}
                    axes={['R', 'S', 'W']}
                    values={values}
                    onChange={onChange}
                />
            )}
            {visible.axisOffset &&
                (showOffset ? (
                    <Vec3Input
                        label="ずらす (m)"
                        keys={['offsetR', 'offsetS', 'offsetW']}
                        axes={['R', 'S', 'W']}
                        values={values}
                        onChange={onChange}
                    />
                ) : (
                    <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-fg-muted transition-colors hover:text-fg"
                        onClick={() => setShowOffset(true)}
                    >
                        <Plus className="size-3" />
                        全体の位置をずらす
                    </button>
                ))}

            {/* zAmplitude は periodicParams が無い古い JSON 用のフォールバックでしか使われないので編集欄は出さない */}
            {visible.periodicParams && (
                <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="inline-flex items-center gap-0.5 text-xs text-fg-muted">
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
                            <span key={key} className="relative block min-w-0">
                                <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[11px] font-medium text-fg-subtle">
                                    {key.slice(-1)}
                                </span>
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    step={0.1}
                                    aria-label={`${key.slice(-1)}/A`}
                                    value={values[key]}
                                    className={cn(COMPACT_INPUT_CLASS, 'pr-1.5 pl-5')}
                                    onChange={(e) => onChange({ [key]: e.target.value })}
                                />
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </Group>
    );
}

function AppearanceGroup({ values, onChange }: SectionProps) {
    const visible = getLayerFieldVisibility(values);
    const shapes = EDITABLE_SHAPES.includes(values.shape) ? EDITABLE_SHAPES : [...EDITABLE_SHAPES, values.shape];

    return (
        <Group title="見た目">
            <SegmentedControl<ShapeType>
                ariaLabel="形状"
                value={values.shape}
                options={shapes.map((s) => ({ value: s, label: SHAPE_LABELS[s] }))}
                onChange={(shape) => onChange({ shape })}
            />
            <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs text-fg-muted">{getSizeLabel(values.shape)}</span>
                <WithUnit unit="m">
                    <Input
                        type="number"
                        inputMode="decimal"
                        min={0.01}
                        step={0.1}
                        aria-label={getSizeLabel(values.shape)}
                        value={values.size}
                        className={COMPACT_INPUT_CLASS}
                        onChange={(e) => onChange({ size: e.target.value })}
                    />
                </WithUnit>
            </div>
            {visible.boxRatios && (
                <Vec3Input
                    label="比率"
                    keys={['boxX', 'boxY', 'boxZ']}
                    axes={['X', 'Y', 'Z']}
                    min={0.1}
                    values={values}
                    onChange={onChange}
                />
            )}
            {visible.rotation && (
                <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-xs text-fg-muted">回転 (°)</span>
                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
                        {(['rotationR', 'rotationS'] as const).map((key) => (
                            <span key={key} className="relative block min-w-0">
                                <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[11px] font-medium text-fg-subtle">
                                    {key.slice(-1)} 軸
                                </span>
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    step={5}
                                    aria-label={`${key.slice(-1)} 軸まわりの回転`}
                                    value={values[key]}
                                    className={cn(COMPACT_INPUT_CLASS, 'pr-1.5 pl-9')}
                                    onChange={(e) => onChange({ [key]: e.target.value })}
                                />
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs text-fg-muted">色</span>
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
                        className="h-7 w-9 shrink-0 cursor-pointer rounded-md border border-line-strong bg-sunken p-0.5"
                        value={/^#[0-9a-fA-F]{6}$/.test(values.color) ? values.color : '#ffffff'}
                        onChange={(e) => onChange({ color: e.target.value })}
                    />
                )}
            </div>
        </Group>
    );
}
