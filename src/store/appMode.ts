import type { SimulationEngine } from '@/engine/SimulationEngine';
import { appStore, type AppMode } from './appStore';

/**
 * モードを切り替える（パネルのモード切替とショートカットの共通処理）。
 * - CSV へ: ファイルを読み込むまでシミュレーションは一時停止しておく（裏で動くと CSV 再生と紛らわしい）
 * - シミュレーションへ: CSV 再生中なら終了し、一時停止を解除する
 */
export function switchMode(engine: SimulationEngine, next: AppMode): void {
    const store = appStore.getState();
    if (next === 'simulation') {
        if (store.playback.active) engine.exitPlayback();
        store.setUI({ mode: 'simulation', panelTab: 'formation' });
        store.patch({ paused: false });
    } else {
        store.setUI({ mode: 'csv', panelTab: 'csv' });
        store.patch({ paused: true });
    }
}

/** CSV 再生モードを選んだが、まだファイルを読み込んでいない状態か */
export function isCsvModeWithoutFile(): boolean {
    const { playback, ui } = appStore.getState();
    return !playback.active && ui.mode === 'csv';
}
