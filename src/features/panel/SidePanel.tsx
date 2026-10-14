import { useEffect, type CSSProperties } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DisplayTab } from '@/features/display/DisplayTab';
import { PlaybackTab } from '@/features/playback/PlaybackTab';
import { ScenarioTab } from '@/features/scenario/ScenarioTab';
import { appStore, useAppStore, type PanelTab } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { useSheetDrag } from './useSheetDrag';

const PANEL_WIDTH_PX = 360;
const WIDE_QUERY = '(min-width: 769px)';

const TABS: ReadonlyArray<{ value: PanelTab; label: string }> = [
    { value: 'scenario', label: 'シナリオ' },
    { value: 'display', label: '表示' },
    { value: 'playback', label: '再生' },
];

/**
 * 左上のメニューボタンから開くサイドパネル（スマホではボトムシート）。
 * 開いている間は下部 HUD をパネルの右側へずらす。
 */
export function SidePanel() {
    const open = useAppStore((s) => s.ui.panelOpen);
    const tab = useAppStore((s) => s.ui.panelTab);
    const setUI = appStore.getState().setUI;
    const sheet = useSheetDrag(() => setUI({ panelOpen: false }));

    useEffect(() => {
        const root = document.documentElement;
        const update = () => {
            const wide = window.matchMedia(WIDE_QUERY).matches;
            root.style.setProperty('--panel-offset', open && wide ? `${PANEL_WIDTH_PX}px` : '0px');
            if (open && !wide) root.dataset.sheetOpen = '';
            else delete root.dataset.sheetOpen;
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [open]);

    return (
        <>
            {!open && (
                <Button
                    variant="ghost"
                    aria-label="メニューを開く"
                    className="glass fixed top-[calc(12px+env(safe-area-inset-top,0px))] left-3 z-30 size-10 rounded-[10px] text-fg hover:bg-raised-hover hover:text-brand-text"
                    onClick={() => setUI({ panelOpen: true })}
                >
                    <Menu className="size-5" />
                </Button>
            )}

            <aside
                aria-label="設定パネル"
                aria-hidden={!open}
                inert={!open}
                className={cn(
                    'side-panel',
                    !open && 'closed',
                    sheet.snap === 'full' && 'sheet-full',
                    sheet.dragOffset !== null && 'sheet-dragging',
                )}
                style={
                    sheet.dragOffset !== null
                        ? ({ '--sheet-drag': `${sheet.dragOffset}px` } as CSSProperties)
                        : undefined
                }
            >
                <Tabs
                    value={tab}
                    onValueChange={(value) => setUI({ panelTab: value as PanelTab })}
                    className="flex min-h-0 flex-1 flex-col gap-0"
                >
                    <div className="sheet-handle" {...sheet.handleProps}>
                        <button
                            type="button"
                            className="sheet-grabber"
                            aria-label={sheet.snap === 'full' ? 'パネルを縮める' : 'パネルを広げる'}
                            onClick={() => sheet.setSnap(sheet.snap === 'full' ? 'half' : 'full')}
                        />
                    </div>
                    <div className="side-panel-header" {...sheet.handleProps}>
                        <TabsList className="grid h-9! w-full flex-1 grid-cols-3 border border-line bg-sunken">
                            {TABS.map((t) => (
                                <TabsTrigger
                                    key={t.value}
                                    value={t.value}
                                    className="text-[13px] text-fg-muted data-active:bg-seg-active dark:data-active:border-transparent dark:data-active:bg-seg-active"
                                >
                                    {t.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <Button
                            variant="ghost"
                            size="icon-lg"
                            className="shrink-0 text-fg-muted"
                            aria-label="閉じる"
                            onClick={() => setUI({ panelOpen: false })}
                        >
                            <X />
                        </Button>
                    </div>
                    <div className="side-panel-content">
                        <TabsContent value="scenario">
                            <ScenarioTab />
                        </TabsContent>
                        <TabsContent value="display">
                            <DisplayTab />
                        </TabsContent>
                        <TabsContent value="playback">
                            <PlaybackTab />
                        </TabsContent>
                    </div>
                </Tabs>
            </aside>
        </>
    );
}
