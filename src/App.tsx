import { useState } from 'react';
import { EngineContext } from '@/engine/EngineContext';
import type { SimulationEngine } from '@/engine/SimulationEngine';
import { useKeyboardShortcuts } from '@/features/help/shortcuts';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Viewport } from '@/features/viewport/Viewport';
import { SidePanel } from '@/features/panel/SidePanel';
import { PlaybackBar } from '@/features/hud/PlaybackBar';
import { SelectedSatelliteCard } from '@/features/hud/SelectedSatelliteCard';
import { ViewControls } from '@/features/hud/ViewControls';
import { MiniMap } from '@/features/hud/MiniMap';
import { AxesLegend } from '@/features/hud/AxesLegend';
import { LoadingOverlay } from '@/features/hud/LoadingOverlay';
import { ShortcutsDialog } from '@/features/help/ShortcutsDialog';

/**
 * 画面構成（constellation-vis と共通のレイアウト）:
 *   - 全面に 3D ビュー
 *   - 左上のメニューボタン → 左サイドパネル（モード切替 + タブ）。スマホではボトムシート
 *   - 下中央に再生バー、左下に選択中の衛星、右上に学習シナリオと視点操作、その下にミニマップ（地上軌跡）、右下に座標軸の凡例
 * デザイン変更は features/ 以下のコンポーネントだけで完結する。
 */
export function App() {
    const [engine, setEngine] = useState<SimulationEngine | null>(null);
    useKeyboardShortcuts(engine);

    return (
        <TooltipProvider delayDuration={300}>
            <div className="relative h-dvh w-screen overflow-hidden bg-[var(--app-bg)] text-fg">
                <Viewport onEngineChange={setEngine} />

                {engine && (
                    <EngineContext.Provider value={engine}>
                        <SidePanel />
                        <ViewControls />
                        <MiniMap />
                        <PlaybackBar />
                        <SelectedSatelliteCard />
                        <AxesLegend />
                        <ShortcutsDialog />
                    </EngineContext.Provider>
                )}

                <LoadingOverlay />
                <Toaster position="top-center" />
            </div>
        </TooltipProvider>
    );
}
