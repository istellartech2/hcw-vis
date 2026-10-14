import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { appStore, useAppStore } from '@/store/appStore';
import { EARTH_TEXTURE_OPTIONS, type DisplaySettings } from '@/store/settings';
import { SwitchRow } from './SettingRow';

const VISIBILITY_TOGGLES: Array<{ key: keyof DisplaySettings; label: string }> = [
    { key: 'showGrid', label: 'グリッド' },
    { key: 'showAxes', label: '座標軸' },
    { key: 'showEarth', label: '地球' },
    { key: 'showLatLongGrid', label: '緯度経度線' },
    { key: 'showTrails', label: '軌跡' },
];

export function DisplayTab() {
    const display = useAppStore((s) => s.display);
    const setDisplay = appStore.getState().setDisplay;

    return (
        <FieldGroup>
            <FieldSet>
                <FieldLegend>3D空間</FieldLegend>
                <FieldGroup className="gap-4">
                    {VISIBILITY_TOGGLES.map(({ key, label }) => (
                        <SwitchRow
                            key={key}
                            id={`display-${key}`}
                            label={label}
                            checked={display[key] as boolean}
                            onCheckedChange={(checked) => setDisplay({ [key]: checked })}
                        />
                    ))}
                    <Field data-disabled={!display.showTrails || undefined}>
                        <div className="flex items-center justify-between">
                            <FieldLabel htmlFor="trail-length">軌跡の長さ</FieldLabel>
                            <span className="text-sm text-muted-foreground tabular-nums">{display.trailLength}</span>
                        </div>
                        <Slider
                            id="trail-length"
                            min={50}
                            max={500}
                            step={50}
                            disabled={!display.showTrails}
                            value={[display.trailLength]}
                            onValueChange={([trailLength]) => setDisplay({ trailLength })}
                        />
                    </Field>
                </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            <FieldSet>
                <FieldLegend>地球</FieldLegend>
                <Field>
                    <FieldLabel htmlFor="earth-texture">テクスチャ</FieldLabel>
                    <Select value={display.earthTexture} onValueChange={(earthTexture) => setDisplay({ earthTexture })}>
                        <SelectTrigger id="earth-texture" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {EARTH_TEXTURE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            </FieldSet>
        </FieldGroup>
    );
}
