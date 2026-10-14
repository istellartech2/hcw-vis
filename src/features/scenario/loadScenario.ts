import { toast } from 'sonner';
import type { SimulationEngine } from '@/engine/SimulationEngine';
import type { FormationScenario } from '@/formation/scenarios';
import { appStore } from '@/store/appStore';

/**
 * 学習用シナリオを読み込んで再生を始める。トーストの「元に戻す」で直前の配置に戻せる。
 * 一時停止したまま読み込むと t = 0 で止まって見えるので、再生を始めて動きを見せる。
 */
export function loadScenario(engine: SimulationEngine, scenario: FormationScenario): void {
    const { formation, formationFile, loadedScenario } = appStore.getState();
    const config = scenario.build();
    appStore.getState().patch({
        formation: config,
        formationFile: null,
        loadedScenario: { id: scenario.id, config },
        paused: false,
    });
    engine.resetPositions();

    const undo = () => {
        appStore.getState().patch({ formation, formationFile, loadedScenario });
        engine.resetPositions();
    };
    toast(`「${scenario.title}」を読み込みました`, { action: { label: '元に戻す', onClick: undo } });
}
