import { createContext, useContext } from 'react';
import type { SimulationEngine } from './SimulationEngine';

export const EngineContext = createContext<SimulationEngine | null>(null);

/** シミュレーションエンジン（UI から呼び出すコマンド群）を取得する */
export function useEngine(): SimulationEngine {
    const engine = useContext(EngineContext);
    if (!engine) {
        throw new Error('useEngine must be used inside <EngineContext.Provider>');
    }
    return engine;
}
