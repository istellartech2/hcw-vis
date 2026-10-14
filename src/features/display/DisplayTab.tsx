import { BookOpen, Box, Globe2, Monitor, Satellite } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SegmentedControl, SliderRow, ToggleRow } from '@/components/controls';
import { PanelSection } from '@/components/panel-section';
import { useUiTheme, type UiTheme } from '@/lib/uiTheme';
import { appStore, useAppStore } from '@/store/appStore';
import { EARTH_TEXTURE_OPTIONS } from '@/store/settings';

const README_URL = 'https://github.com/istellartech2/hcw-vis/blob/main/README.md';

/** 表示: 3D シーンと UI の見た目 */
export function DisplayTab() {
    return (
        <div>
            <SceneSection />
            <EarthSection />
            <SatelliteAppearanceSection />
            <ScreenSection />
        </div>
    );
}

function SceneSection() {
    const display = useAppStore((s) => s.display);
    const setDisplay = appStore.getState().setDisplay;

    return (
        <PanelSection title="3D 空間" icon={<Box />}>
            <ToggleRow
                label={
                    <>
                        RSW グリッド <Kbd className="ml-1">G</Kbd>
                    </>
                }
                checked={display.showGrid}
                onCheckedChange={(showGrid) => setDisplay({ showGrid })}
            />
            <ToggleRow
                label="座標軸"
                checked={display.showAxes}
                onCheckedChange={(showAxes) => setDisplay({ showAxes })}
            />
            <ToggleRow
                label="軌跡"
                checked={display.showTrails}
                onCheckedChange={(showTrails) => setDisplay({ showTrails })}
            />
            <SliderRow
                label="軌跡の長さ"
                min={50}
                max={500}
                step={50}
                value={display.trailLength}
                disabled={!display.showTrails}
                onChange={(trailLength) => setDisplay({ trailLength })}
            />
        </PanelSection>
    );
}

function EarthSection() {
    const display = useAppStore((s) => s.display);
    const setDisplay = appStore.getState().setDisplay;

    return (
        <PanelSection title="地球" icon={<Globe2 />}>
            <ToggleRow
                label={
                    <>
                        地球を表示 <Kbd className="ml-1">E</Kbd>
                    </>
                }
                checked={display.showEarth}
                onCheckedChange={(showEarth) => setDisplay({ showEarth })}
            />
            <ToggleRow
                label="緯度経度線"
                checked={display.showLatLongGrid}
                disabled={!display.showEarth}
                onCheckedChange={(showLatLongGrid) => setDisplay({ showLatLongGrid })}
            />
            <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-fg-muted">テクスチャ</span>
                <Select value={display.earthTexture} onValueChange={(earthTexture) => setDisplay({ earthTexture })}>
                    <SelectTrigger
                        size="sm"
                        className="min-w-0 flex-1 bg-sunken text-xs dark:bg-sunken"
                        aria-label="地球テクスチャ"
                    >
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
            </div>
        </PanelSection>
    );
}

function SatelliteAppearanceSection() {
    const display = useAppStore((s) => s.display);
    const setDisplay = appStore.getState().setDisplay;

    return (
        <PanelSection title="衛星の色" icon={<Satellite />}>
            <ToggleRow
                label="すべて同じ色にする"
                help="オフのときは衛星グループごとに設定した色で表示します。"
                checked={display.uniformSatelliteColor}
                onCheckedChange={(uniformSatelliteColor) => setDisplay({ uniformSatelliteColor })}
            />
            {display.uniformSatelliteColor && (
                <label className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs text-fg-muted">色</span>
                    <input
                        type="color"
                        value={display.satelliteColor}
                        onChange={(e) => setDisplay({ satelliteColor: e.target.value })}
                        className="h-7 w-12 cursor-pointer rounded-md border border-line-strong bg-sunken p-0.5"
                    />
                    <span className="num text-xs text-fg-muted">{display.satelliteColor}</span>
                </label>
            )}
        </PanelSection>
    );
}

function ScreenSection() {
    const [theme, setTheme] = useUiTheme();

    return (
        <PanelSection title="画面" icon={<Monitor />}>
            <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-fg-muted">UI テーマ</span>
                <SegmentedControl<UiTheme>
                    ariaLabel="UI テーマ"
                    value={theme}
                    options={[
                        { value: 'dark', label: 'ダーク' },
                        { value: 'light', label: 'ライト' },
                    ]}
                    onChange={setTheme}
                />
            </div>
            <Button variant="link" size="sm" className="h-auto px-0 text-fg-muted" asChild>
                <a href={README_URL} target="_blank" rel="noopener noreferrer">
                    <BookOpen />
                    ドキュメント（理論・座標系）
                </a>
            </Button>
        </PanelSection>
    );
}
