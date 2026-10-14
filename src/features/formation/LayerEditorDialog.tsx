import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ALL_PATTERNS, type FormationLayer, type PlacementMode, type ShapeType } from '@/formation/FormationTypes';
import {
    PATTERN_LABELS,
    PLACEMENT_MODE_LABELS,
    SHAPE_LABELS,
    computeEccentricity,
    formToLayerUpdates,
    getLayerFieldVisibility,
    getSizeLabel,
    layerToForm,
    type LayerFormValues,
} from '@/formation/layerForm';
import { UnitLabel } from '@/features/settings/SettingRow';

/** レイヤー編集で選べる形状（3Dファイルはモデル読み込みUIが無いため除外） */
const EDITABLE_SHAPES: ShapeType[] = ['sphere', 'cube', 'box'];

type TextKey = { [K in keyof LayerFormValues]: LayerFormValues[K] extends string ? K : never }[keyof LayerFormValues];

interface LayerEditorDialogProps {
    layer: FormationLayer | null;
    onClose: () => void;
    onSave: (updates: Partial<FormationLayer>) => void;
}

export function LayerEditorDialog({ layer, onClose, onSave }: LayerEditorDialogProps) {
    const [values, setValues] = useState<LayerFormValues | null>(null);

    useEffect(() => {
        setValues(layer ? layerToForm(layer) : null);
    }, [layer]);

    return (
        <Dialog open={layer !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="flex max-h-[min(44rem,calc(100dvh-2rem))] flex-col gap-0 p-0 sm:max-w-xl">
                <DialogHeader className="border-b p-4">
                    <DialogTitle>レイヤー編集</DialogTitle>
                    <DialogDescription className="sr-only">
                        配置パターン・衛星の形状・色を設定します。
                    </DialogDescription>
                </DialogHeader>
                {values && (
                    <form
                        className="flex min-h-0 flex-1 flex-col"
                        onSubmit={(e) => {
                            e.preventDefault();
                            onSave(formToLayerUpdates(values));
                        }}
                    >
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <LayerFormFields
                                values={values}
                                onChange={(patch) => setValues((v) => (v ? { ...v, ...patch } : v))}
                            />
                        </div>
                        <DialogFooter className="m-0 border-t p-4">
                            <Button type="button" variant="ghost" onClick={onClose}>
                                キャンセル
                            </Button>
                            <Button type="submit">保存して適用</Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

function LayerFormFields({
    values,
    onChange,
}: {
    values: LayerFormValues;
    onChange: (patch: Partial<LayerFormValues>) => void;
}) {
    const visible = getLayerFieldVisibility(values);

    const text = (key: TextKey, label: ReactNode, props: React.ComponentProps<typeof Input> = {}) => (
        <Field>
            <FieldLabel htmlFor={`layer-${key}`}>{label}</FieldLabel>
            <Input
                id={`layer-${key}`}
                type="number"
                inputMode="decimal"
                value={values[key]}
                onChange={(e) => onChange({ [key]: e.target.value })}
                {...props}
            />
        </Field>
    );

    return (
        <FieldGroup className="p-4">
            <Field>
                <FieldLabel htmlFor="layer-name">レイヤー名</FieldLabel>
                <Input id="layer-name" value={values.name} onChange={(e) => onChange({ name: e.target.value })} />
            </Field>

            <FieldSet>
                <FieldLegend>配置</FieldLegend>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field className={visible.placementMode ? undefined : 'sm:col-span-2'}>
                        <FieldLabel htmlFor="layer-pattern">配置パターン</FieldLabel>
                        <Select
                            value={values.pattern}
                            onValueChange={(pattern) => onChange({ pattern: pattern as LayerFormValues['pattern'] })}
                        >
                            <SelectTrigger id="layer-pattern" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ALL_PATTERNS.map((p) => (
                                    <SelectItem key={p} value={p}>
                                        {PATTERN_LABELS[p]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    {visible.placementMode && (
                        <Field>
                            <FieldLabel htmlFor="layer-placement">配置方式</FieldLabel>
                            <Select
                                value={values.placementMode}
                                onValueChange={(mode) => onChange({ placementMode: mode as PlacementMode })}
                            >
                                <SelectTrigger id="layer-placement" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(PLACEMENT_MODE_LABELS) as PlacementMode[]).map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {PLACEMENT_MODE_LABELS[m]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    )}
                    {visible.radius &&
                        text('radius', <UnitLabel unit="m">範囲</UnitLabel>, { min: 0.1, max: 10000, step: 0.1 })}
                    {visible.spacing &&
                        text('spacing', <UnitLabel unit="m">衛星間距離</UnitLabel>, {
                            min: 0.01,
                            max: 1000,
                            step: 0.01,
                        })}
                    {visible.satelliteCount &&
                        text('satelliteCount', '衛星数', { min: 1, max: 100000, step: 1, inputMode: 'numeric' })}
                </div>

                {(visible.originOffset || visible.axisOffset) && (
                    <div className="space-y-2">
                        <FieldDescription>
                            {visible.originOffset ? '初期位置' : '配置全体のオフセット'}（RSW座標, m）
                        </FieldDescription>
                        <div className="grid grid-cols-3 gap-2">
                            {text('offsetR', 'Radial (R)', { step: 0.1 })}
                            {text('offsetS', 'Along-track (S)', { step: 0.1 })}
                            {text('offsetW', 'Cross-track (W)', { step: 0.1 })}
                        </div>
                    </div>
                )}

                {visible.zAmplitude && text('zAmplitude', 'Z振幅倍率', { min: -3, max: 3, step: 0.1 })}

                {visible.periodicParams && (
                    <div className="space-y-2">
                        <div className="flex items-baseline justify-between">
                            <FieldDescription>楕円軌道パラメータ（A = 範囲 に対する比）</FieldDescription>
                            <span className="text-xs text-muted-foreground">
                                離心率{' '}
                                <span className="font-mono text-foreground tabular-nums">
                                    {computeEccentricity(values).toFixed(4)}
                                </span>
                            </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {text('ratioB', 'B/A', { min: -3, max: 3, step: 0.1 })}
                            {text('ratioD', 'D/A', { min: -3, max: 3, step: 0.1 })}
                            {text('ratioE', 'E/A', { min: -3, max: 3, step: 0.1 })}
                            {text('ratioF', 'F/A', { min: -3, max: 3, step: 0.1 })}
                        </div>
                    </div>
                )}

                {visible.positiveZ && (
                    <Field orientation="horizontal">
                        <FieldLabel htmlFor="layer-positivez">+Z方向に回転</FieldLabel>
                        <Switch
                            id="layer-positivez"
                            checked={values.positiveZ}
                            onCheckedChange={(positiveZ) => onChange({ positiveZ })}
                        />
                    </Field>
                )}
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
                <FieldLegend>衛星の見た目</FieldLegend>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                        <FieldLabel htmlFor="layer-shape">形状</FieldLabel>
                        <Select value={values.shape} onValueChange={(shape) => onChange({ shape: shape as ShapeType })}>
                            <SelectTrigger id="layer-shape" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(EDITABLE_SHAPES.includes(values.shape)
                                    ? EDITABLE_SHAPES
                                    : [...EDITABLE_SHAPES, values.shape]
                                ).map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {SHAPE_LABELS[s]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    {text('size', <UnitLabel unit="m">{getSizeLabel(values.shape)}</UnitLabel>, {
                        min: 0.01,
                        max: 100,
                        step: 0.01,
                    })}
                </div>

                {visible.boxRatios && (
                    <div className="space-y-2">
                        <FieldDescription>直方体の比率 (X:Y:Z)</FieldDescription>
                        <div className="grid grid-cols-3 gap-2">
                            {text('boxX', 'X', { min: 0.1, max: 10, step: 0.1 })}
                            {text('boxY', 'Y', { min: 0.1, max: 10, step: 0.1 })}
                            {text('boxZ', 'Z', { min: 0.1, max: 10, step: 0.1 })}
                        </div>
                    </div>
                )}

                {visible.rotation && (
                    <div className="grid grid-cols-2 gap-2">
                        {text('rotationR', <UnitLabel unit="°">R軸まわり回転</UnitLabel>, {
                            min: -180,
                            max: 180,
                            step: 5,
                        })}
                        {text('rotationS', <UnitLabel unit="°">S軸まわり回転</UnitLabel>, {
                            min: -180,
                            max: 180,
                            step: 5,
                        })}
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                        <FieldLabel htmlFor="layer-color-mode">色</FieldLabel>
                        <Select
                            value={values.colorMode}
                            onValueChange={(colorMode) =>
                                onChange({ colorMode: colorMode as LayerFormValues['colorMode'] })
                            }
                        >
                            <SelectTrigger id="layer-color-mode" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="uniform">統一色</SelectItem>
                                <SelectItem value="random">ランダム</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    {visible.color && (
                        <Field>
                            <FieldLabel htmlFor="layer-color">カラー</FieldLabel>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    aria-label="カラーピッカー"
                                    className="h-8 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
                                    value={/^#[0-9a-fA-F]{6}$/.test(values.color) ? values.color : '#ffffff'}
                                    onChange={(e) => onChange({ color: e.target.value })}
                                />
                                <Input
                                    id="layer-color"
                                    className="font-mono"
                                    pattern="^#[0-9a-fA-F]{6}$"
                                    value={values.color}
                                    onChange={(e) => onChange({ color: e.target.value })}
                                />
                            </div>
                        </Field>
                    )}
                </div>
            </FieldSet>
        </FieldGroup>
    );
}
