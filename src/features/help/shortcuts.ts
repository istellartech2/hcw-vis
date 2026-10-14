import { useEffect } from 'react';
import type { SimulationEngine } from '@/engine/SimulationEngine';
import { appStore, isCsvModeWithoutFile } from '@/store/appStore';
import { stepTimeScale } from '@/store/settings';

/**
 * グローバルなキーボードショートカット。ヘルプの一覧（SHORTCUT_GROUPS）と処理（useKeyboardShortcuts）を
 * 同じファイルに置いて、片方だけ変えることがないようにする。
 */

/** 矢印キー1回あたりの増速量 (m/s) */
const ARROW_KEY_DELTA_V = 0.001;

export const SHORTCUT_GROUPS: ReadonlyArray<{ title: string; items: Array<{ keys: string[]; label: string }> }> = [
    {
        title: 'シミュレーション',
        items: [
            { keys: ['Space'], label: '一時停止 / 再開' },
            { keys: ['R'], label: 't = 0 に戻す（衛星を初期配置へ）' },
            { keys: ['+'], label: '時間倍率を上げる' },
            { keys: ['-'], label: '時間倍率を下げる' },
            { keys: ['F'], label: '衛星配置を開く' },
        ],
    },
    {
        title: '表示',
        items: [
            { keys: ['V'], label: '視点をリセット' },
            { keys: ['G'], label: 'グリッド表示の切り替え' },
            { keys: ['E'], label: '地球表示の切り替え' },
            { keys: ['H'], label: 'このヘルプを表示' },
        ],
    },
    {
        title: '衛星選択時',
        items: [
            { keys: ['T'], label: '推力付加' },
            { keys: ['P'], label: '位置変更' },
            { keys: ['↑', '↓'], label: `S軸方向に ±${ARROW_KEY_DELTA_V} m/s` },
            { keys: ['←', '→'], label: `R軸方向に ±${ARROW_KEY_DELTA_V} m/s` },
            { keys: ['Shift', '↑ / ↓'], label: `W軸方向に ±${ARROW_KEY_DELTA_V} m/s` },
            { keys: ['Esc'], label: '選択解除' },
        ],
    },
    {
        title: 'マウス',
        items: [
            { keys: ['クリック'], label: '衛星を選択' },
            { keys: ['ドラッグ'], label: 'カメラ回転' },
            { keys: ['スクロール'], label: 'ズーム' },
        ],
    },
];

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    return (
        target.closest(
            'input, textarea, select, button, a, [role="slider"], [role="combobox"], [role="switch"], [role="menuitem"]',
        ) !== null
    );
}

export function useKeyboardShortcuts(engine: SimulationEngine | null): void {
    useEffect(() => {
        if (!engine) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (isEditableTarget(e.target)) return;
            const store = appStore.getState();
            // モーダル表示中はショートカットを無効化
            if (store.ui.helpOpen) return;
            const hasSelection = store.selected !== null;
            const deltaV = ARROW_KEY_DELTA_V;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    engine.togglePlay();
                    break;
                case 'r':
                    engine.resetPositions();
                    break;
                case 'v':
                    engine.resetView();
                    break;
                case 'g':
                    store.setDisplay({ showGrid: !store.display.showGrid });
                    break;
                case 'e':
                    store.setDisplay({ showEarth: !store.display.showEarth });
                    break;
                case '+':
                case '=':
                    store.setSimulation({ timeScale: stepTimeScale(store.simulation.timeScale, 1) });
                    break;
                case '-':
                case '_':
                    store.setSimulation({ timeScale: stepTimeScale(store.simulation.timeScale, -1) });
                    break;
                case 'h':
                case '?':
                    store.setUI({ helpOpen: true });
                    break;
                case 'f':
                    // CSV 再生中は衛星配置を使わないので何もしない
                    if (store.playback.active) break;
                    if (isCsvModeWithoutFile(store)) engine.setMode('simulation');
                    store.setUI({ panelOpen: true, panelTab: 'formation' });
                    break;
                case 'escape':
                    if (store.ui.activeDialog) store.setUI({ activeDialog: null });
                    else engine.clearSelection();
                    break;
                case 't':
                    if (hasSelection) store.setUI({ activeDialog: 'thrust' });
                    break;
                case 'p':
                    if (hasSelection) store.setUI({ activeDialog: 'position' });
                    break;
                case 'arrowup':
                    e.preventDefault();
                    engine.applyDeltaV(e.shiftKey ? { w: deltaV } : { s: deltaV });
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    engine.applyDeltaV(e.shiftKey ? { w: -deltaV } : { s: -deltaV });
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    engine.applyDeltaV({ r: -deltaV });
                    break;
                case 'arrowright':
                    e.preventDefault();
                    engine.applyDeltaV({ r: deltaV });
                    break;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [engine]);
}
