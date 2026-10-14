import { useEffect } from 'react';
import type { SimulationEngine } from '@/engine/SimulationEngine';
import { appStore } from '@/store/appStore';
import { TIME_SCALE_OPTIONS } from '@/store/settings';

/** 矢印キー1回あたりの増速量 (m/s) */
export const ARROW_KEY_DELTA_V = 0.001;

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    return (
        target.closest(
            'input, textarea, select, button, a, [role="slider"], [role="combobox"], [role="switch"], [role="menuitem"]',
        ) !== null
    );
}

function stepTimeScale(direction: 1 | -1): void {
    const store = appStore.getState();
    const values = TIME_SCALE_OPTIONS.map((o) => o.value);
    const index = values.indexOf(store.simulation.timeScale);
    const next = values[Math.min(values.length - 1, Math.max(0, (index < 0 ? 0 : index) + direction))];
    store.setSimulation({ timeScale: next });
}

/**
 * グローバルなキーボードショートカット。
 * 一覧は features/help/shortcuts.ts を参照。
 */
export function useKeyboardShortcuts(engine: SimulationEngine | null): void {
    useEffect(() => {
        if (!engine) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (isEditableTarget(e.target)) return;
            const store = appStore.getState();
            // モーダル表示中はショートカットを無効化
            if (store.ui.formationOpen || store.ui.helpOpen) return;
            const hasSelection = store.selected !== null;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    engine.togglePause();
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
                    stepTimeScale(1);
                    break;
                case '-':
                case '_':
                    stepTimeScale(-1);
                    break;
                case 'h':
                case '?':
                    store.setUI({ helpOpen: true });
                    break;
                case 'f':
                    store.setUI({ formationOpen: true });
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
                    engine.applyDeltaV(e.shiftKey ? { w: ARROW_KEY_DELTA_V } : { s: ARROW_KEY_DELTA_V });
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    engine.applyDeltaV(e.shiftKey ? { w: -ARROW_KEY_DELTA_V } : { s: -ARROW_KEY_DELTA_V });
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    engine.applyDeltaV({ r: -ARROW_KEY_DELTA_V });
                    break;
                case 'arrowright':
                    e.preventDefault();
                    engine.applyDeltaV({ r: ARROW_KEY_DELTA_V });
                    break;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [engine]);
}
