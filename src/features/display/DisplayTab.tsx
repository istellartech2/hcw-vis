import { BookOpen, Box, Globe2, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpTip, SegmentedControl, SliderRow, ToggleRow } from '@/components/controls';
import { Switch } from '@/components/ui/switch';
import { PanelSection } from '@/components/panel-section';
import { useUiTheme, type UiTheme } from '@/lib/uiTheme';
import { appStore, useAppStore } from '@/store/appStore';
import { EARTH_BRIGHTNESS_OPTIONS, EARTH_TEXTURE_OPTIONS } from '@/store/settings';

const README_URL = 'https://github.com/istellartech2/hcw-vis/blob/main/README.md';

/** 表示: 3D シーンと UI の見た目 */
export function DisplayTab() {
    return (
        <div>
            <SceneSection />
            <EarthSection />
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
            {/* ミニマップはスマホでは出さないので、切り替えも隠す */}
            <div className="max-md:hidden">
                <ToggleRow
                    label={
                        <>
                            ミニマップ <Kbd className="ml-1">M</Kbd>
                        </>
                    }
                    checked={display.showMiniMap}
                    onCheckedChange={(showMiniMap) => setDisplay({ showMiniMap })}
                />
            </div>
            <ToggleRow
                label="軌跡"
                checked={display.showTrails}
                onCheckedChange={(showTrails) => setDisplay({ showTrails })}
            />
            {display.showTrails && (
                <SliderRow
                    label="軌跡の長さ"
                    min={50}
                    max={500}
                    step={50}
                    value={display.trailLength}
                    onChange={(trailLength) => setDisplay({ trailLength })}
                />
            )}
            <div className="flex min-h-7 items-center justify-between gap-3">
                <span className="inline-flex items-center gap-0.5 text-[13px] text-fg">
                    <label htmlFor="uniform-satellite-color">衛星を単色で表示</label>
                    <HelpTip>オフのときは衛星グループごとに設定した色で表示します。</HelpTip>
                </span>
                <span className="flex items-center gap-2">
                    {display.uniformSatelliteColor && (
                        <input
                            type="color"
                            aria-label="衛星の色"
                            value={display.satelliteColor}
                            onChange={(e) => setDisplay({ satelliteColor: e.target.value })}
                            className="size-5 cursor-pointer rounded border border-line-strong bg-sunken p-0"
                        />
                    )}
                    <Switch
                        id="uniform-satellite-color"
                        size="sm"
                        checked={display.uniformSatelliteColor}
                        onCheckedChange={(uniformSatelliteColor) => setDisplay({ uniformSatelliteColor })}
                    />
                </span>
            </div>
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
            {display.showEarth && (
                <>
                    <ToggleRow
                        label="緯度経度線"
                        checked={display.showLatLongGrid}
                        onCheckedChange={(showLatLongGrid) => setDisplay({ showLatLongGrid })}
                    />
                    <div className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-xs text-fg-muted">テクスチャ</span>
                        <Select
                            value={display.earthTexture}
                            onValueChange={(earthTexture) => setDisplay({ earthTexture })}
                        >
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
                    <div className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-xs text-fg-muted">明るさ</span>
                        <SegmentedControl
                            ariaLabel="地球の明るさ"
                            value={display.earthBrightness}
                            options={EARTH_BRIGHTNESS_OPTIONS}
                            onChange={(earthBrightness) => setDisplay({ earthBrightness })}
                        />
                    </div>
                </>
            )}
        </PanelSection>
    );
}

function ScreenSection() {
    const [theme, setTheme] = useUiTheme();

    return (
        <PanelSection
            title="画面"
            icon={<Monitor />}
            action={
                <Button variant="link" size="xs" className="h-auto px-0 text-fg-muted" asChild>
                    <a href={README_URL} target="_blank" rel="noopener noreferrer">
                        <BookOpen />
                        ドキュメント
                    </a>
                </Button>
            }
        >
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
        </PanelSection>
    );
}
