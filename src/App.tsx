import { useState } from 'react';
import { EngineContext } from '@/engine/EngineContext';
import type { SimulationEngine } from '@/engine/SimulationEngine';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Viewport } from '@/features/viewport/Viewport';
import { TopToolbar } from '@/features/toolbar/TopToolbar';
import { SettingsSheet } from '@/features/settings/SettingsSheet';
import { ReferenceSatellitePanel } from '@/features/hud/ReferenceSatellitePanel';
import { SelectedSatellitePanel } from '@/features/hud/SelectedSatellitePanel';
import { AxesLegend } from '@/features/hud/AxesLegend';
import { TimeControls } from '@/features/hud/TimeControls';
import { LoadingOverlay } from '@/features/hud/LoadingOverlay';
import { FormationDesigner } from '@/features/formation/FormationDesigner';
import { ShortcutsDialog } from '@/features/help/ShortcutsDialog';

/**
 * 画面構成:
 *   Viewport（3D 描画）の上に、各 feature の HUD を絶対配置で重ねる。
 *   デザイン変更は features/ 以下のコンポーネントだけで完結する。
 */
export function App() {
    const [engine, setEngine] = useState<SimulationEngine | null>(null);
    useKeyboardShortcuts(engine);

    return (
        <TooltipProvider delayDuration={300}>
            <div className="relative h-dvh w-screen overflow-hidden bg-black text-foreground">
                <Viewport onEngineChange={setEngine} />

                {engine && (
                    <EngineContext.Provider value={engine}>
                        <div className="pointer-events-none absolute inset-0 p-3 sm:p-4">
                            <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                                <TopToolbar />
                            </div>
                            <div className="absolute top-16 right-3 sm:top-4 sm:right-4">
                                <ReferenceSatellitePanel />
                            </div>
                            <div className="absolute bottom-20 left-3 sm:bottom-4 sm:left-4">
                                <SelectedSatellitePanel />
                            </div>
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 sm:bottom-4">
                                <TimeControls />
                            </div>
                            <div className="absolute right-4 bottom-4 hidden lg:block">
                                <AxesLegend />
                            </div>
                        </div>
                        <SettingsSheet />
                        <FormationDesigner />
                        <ShortcutsDialog />
                    </EngineContext.Provider>
                )}

                <LoadingOverlay />
                <Toaster position="top-center" theme="dark" />
            </div>
        </TooltipProvider>
    );
}
