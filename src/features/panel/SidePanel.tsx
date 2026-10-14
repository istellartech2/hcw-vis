import { useEffect, type CSSProperties } from 'react';
import { Atom, FileSpreadsheet, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEngine } from '@/engine/EngineContext';
import { CsvTab } from '@/features/csv/CsvTab';
import { DisplayTab } from '@/features/display/DisplayTab';
import { FormationSection } from '@/features/scenario/FormationSection';
import { OrbitTab } from '@/features/scenario/OrbitTab';
import { appStore, useAppMode, useAppStore, type AppMode, type PanelTab } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { useSheetDrag } from './useSheetDrag';

const PANEL_WIDTH_PX = 360;
const WIDE_QUERY = '(min-width: 769px)';

const MODE_LABELS: Record<AppMode, string> = {
    simulation: 'シミュレーション',
    csv: 'CSV 再生',
};

const MODE_ICONS: Record<AppMode, typeof Atom> = {
    simulation: Atom,
    csv: FileSpreadsheet,
};

const TABS: Record<AppMode, ReadonlyArray<{ value: PanelTab; label: string }>> = {
    simulation: [
        { value: 'formation', label: '衛星配置' },
        { value: 'orbit', label: '軌道・力学' },
        { value: 'display', label: '表示' },
    ],
    csv: [
        { value: 'csv', label: 'CSV データ' },
        { value: 'display', label: '表示' },
    ],
};

/** パネル最上部のモード切り替え。モードによって下のタブ構成が変わる */
function ModeSwitch({ mode }: { mode: AppMode }) {
    const engine = useEngine();
    const setUI = appStore.getState().setUI;

    const change = (next: AppMode) => {
        if (next === mode) return;
        if (next === 'simulation') {
            if (appStore.getState().playback.active) engine.exitPlayback();
            setUI({ mode: 'simulation', panelTab: 'formation' });
            appStore.getState().patch({ paused: false });
        } else {
            // ファイルを読み込むまでシミュレーションは止めておく（裏で動いていると CSV 再生と紛らわしい）
            setUI({ mode: 'csv', panelTab: 'csv' });
            appStore.getState().patch({ paused: true });
        }
    };

    return (
        <div
            role="radiogroup"
            aria-label="モード"
            className="grid flex-1 grid-cols-2 gap-1 rounded-lg bg-sunken p-[3px]"
        >
            {(Object.keys(MODE_LABELS) as AppMode[]).map((value) => {
                const Icon = MODE_ICONS[value];
                const selected = value === mode;
                return (
                    <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => change(value)}
                        className={cn(
                            'inline-flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand',
                            selected ? 'bg-brand text-brand-fg shadow-sm' : 'text-fg-muted hover:text-fg',
                        )}
                    >
                        <Icon className="size-3.5" />
                        {MODE_LABELS[value]}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * 左上のメニューボタンから開くサイドパネル（スマホではボトムシート）。
 * 最上部でモード（シミュレーション / CSV 再生）を選び、その下のタブで設定する。
 * 開いている間は下部 HUD をパネルの右側へずらす。
 */
export function SidePanel() {
    const open = useAppStore((s) => s.ui.panelOpen);
    const storedTab = useAppStore((s) => s.ui.panelTab);
    const mode = useAppMode();
    const setUI = appStore.getState().setUI;
    const sheet = useSheetDrag(() => setUI({ panelOpen: false }));

    const tabs = TABS[mode];
    const tab = tabs.some((t) => t.value === storedTab) ? storedTab : tabs[0].value;
    const ModeIcon = MODE_ICONS[mode];

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
                    aria-label={`メニューを開く（${MODE_LABELS[mode]}モード）`}
                    className="glass fixed top-[calc(12px+env(safe-area-inset-top,0px))] left-3 z-30 h-10 gap-2 rounded-[10px] pr-3.5 pl-2.5 text-fg hover:bg-raised-hover hover:text-brand-text"
                    onClick={() => setUI({ panelOpen: true })}
                >
                    <Menu className="size-5" />
                    <span className="flex items-center gap-1 text-[13px] font-medium">
                        <ModeIcon className={cn('size-3.5', mode === 'csv' ? 'text-brand-text' : 'text-fg-subtle')} />
                        {MODE_LABELS[mode]}
                    </span>
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
                    <div className="side-panel-header flex-col items-stretch! gap-2!" {...sheet.handleProps}>
                        <div className="flex items-center gap-1.5">
                            <ModeSwitch mode={mode} />
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
                        <TabsList variant="line" className="h-8! w-full justify-start border-b border-line px-0">
                            {tabs.map((t) => (
                                <TabsTrigger
                                    key={t.value}
                                    value={t.value}
                                    className="flex-none px-2.5 text-[13px] text-fg-muted after:bg-brand data-active:text-fg"
                                >
                                    {t.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    <div className="side-panel-content">
                        <TabsContent value="formation">
                            <FormationSection />
                        </TabsContent>
                        <TabsContent value="orbit">
                            <OrbitTab />
                        </TabsContent>
                        <TabsContent value="csv">
                            <CsvTab />
                        </TabsContent>
                        <TabsContent value="display">
                            <DisplayTab />
                        </TabsContent>
                    </div>
                </Tabs>
            </aside>
        </>
    );
}
