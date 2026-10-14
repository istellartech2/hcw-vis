import { useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HudPanel } from '@/components/hud-panel';
import { formatPeriod } from '@/lib/format';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

function InfoSection({ title, rows }: { title: string; rows: Array<[string, string]> }) {
    return (
        <section className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs">
                {rows.map(([label, value]) => (
                    <div key={label} className="contents">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="text-right font-mono tabular-nums">{value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

/** 基準衛星の位置・軌道要素（右上） */
export function ReferenceSatellitePanel() {
    const [open, setOpen] = useState(false);
    const info = useAppStore((s) => s.referenceInfo);

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <HudPanel className="w-60 overflow-hidden">
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between rounded-none px-3">
                        <span className="flex items-center gap-1.5">
                            <MapPin />
                            基準衛星
                        </span>
                        <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    {info ? (
                        <div className="space-y-3 border-t px-3 py-3">
                            {info.geodetic && (
                                <InfoSection
                                    title="位置"
                                    rows={[
                                        ['緯度', `${info.geodetic.latitude.toFixed(1)}°`],
                                        ['経度', `${info.geodetic.longitude.toFixed(1)}°`],
                                        ['高度', `${info.geodetic.altitudeKm.toFixed(0)} km`],
                                    ]}
                                />
                            )}
                            {info.eciKm && (
                                <InfoSection
                                    title="ECI座標系"
                                    rows={[
                                        ['X', `${info.eciKm.x.toFixed(1)} km`],
                                        ['Y', `${info.eciKm.y.toFixed(1)} km`],
                                        ['Z', `${info.eciKm.z.toFixed(1)} km`],
                                    ]}
                                />
                            )}
                            <InfoSection
                                title="軌道要素"
                                rows={[
                                    ['高度', `${info.orbit.altitudeKm.toFixed(1)} km`],
                                    ['周期', formatPeriod(info.orbit.periodMinutes)],
                                    ['傾斜角', `${info.orbit.inclination.toFixed(1)}°`],
                                    ['離心率', info.orbit.eccentricity.toFixed(4)],
                                    ['昇交点赤経', `${info.orbit.raan.toFixed(1)}°`],
                                    ['近地点引数', `${info.orbit.argOfPerigee.toFixed(1)}°`],
                                ]}
                            />
                        </div>
                    ) : (
                        <p className="border-t px-3 py-3 text-xs text-muted-foreground">計算中...</p>
                    )}
                </CollapsibleContent>
            </HudPanel>
        </Collapsible>
    );
}
