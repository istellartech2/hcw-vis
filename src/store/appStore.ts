/**
 * アプリ全体の状態ストア。
 *
 * - settings 系（display / simulation / orbit）は UI が書き込み、エンジンが購読して反映する
 * - telemetry 系（simTime, referenceInfo, selected, playback, formation）はエンジンが書き込み、UI が描画する
 * - ui 系はパネルやダイアログの開閉状態で、React 側だけが使う
 *
 * zustand の vanilla store なので React 以外（エンジン）からも利用できる。
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { FormationConfig } from '@/formation/FormationTypes';
import { createDefaultFormation } from '@/formation/formationConfig';
import {
    DEFAULT_DISPLAY_SETTINGS,
    DEFAULT_ORBIT_INPUTS,
    DEFAULT_SIMULATION_SETTINGS,
    type DisplaySettings,
    type OrbitInputs,
    type SimulationSettings,
} from './settings';

export interface ReferenceSatelliteInfo {
    geodetic: { latitude: number; longitude: number; altitudeKm: number } | null;
    eciKm: { x: number; y: number; z: number } | null;
    orbit: {
        altitudeKm: number;
        periodMinutes: number;
        inclination: number;
        eccentricity: number;
        raan: number;
        argOfPerigee: number;
    };
}

export interface SelectedSatelliteInfo {
    index: number;
    position: { r: number; s: number; w: number };
    velocity: { r: number; s: number; w: number };
    speed: number;
    distance: number;
}

export type FileStatus = { kind: 'loading' | 'success' | 'error'; message: string };

export interface PlaybackStatus {
    /** CSV 再生モードが有効か */
    active: boolean;
    fileStatus: FileStatus | null;
    isPlaying: boolean;
    currentTime: number;
    progress: number;
    speed: number;
    loop: boolean;
    timeRange: { min: number; max: number } | null;
    satelliteCount: number;
    dataPoints: number;
}

export interface LoadingState {
    title: string;
    message: string;
    /** 0..1。undefined なら不定プログレス */
    progress?: number;
    fileSize?: number;
}

export type ActiveDialog = 'thrust' | 'position' | null;

/** 左パネルのタブ */
export type PanelTab = 'scenario' | 'display' | 'playback';

export interface AppState {
    display: DisplaySettings;
    simulation: SimulationSettings;
    /** 現在シミュレーションに反映されている基準軌道 */
    orbit: OrbitInputs;

    simTime: number;
    paused: boolean;
    referenceInfo: ReferenceSatelliteInfo | null;
    selected: SelectedSatelliteInfo | null;
    playback: PlaybackStatus;
    /** 編集中のフォーメーション設定（唯一の正）。エンジンは再配置時にこれを読む */
    formation: FormationConfig;
    /** 現在シミュレーションに反映されているフォーメーション設定（エンジンが書く） */
    appliedFormation: FormationConfig | null;
    loading: LoadingState | null;

    ui: {
        panelOpen: boolean;
        panelTab: PanelTab;
        helpOpen: boolean;
        activeDialog: ActiveDialog;
    };
}

export interface AppActions {
    setDisplay: (patch: Partial<DisplaySettings>) => void;
    setSimulation: (patch: Partial<SimulationSettings>) => void;
    setUI: (patch: Partial<AppState['ui']>) => void;
    /** フォーメーション設定を更新する（衛星の再配置は engine.resetPositions() で行う） */
    updateFormation: (update: (config: FormationConfig) => FormationConfig) => void;
    /** エンジンからの状態反映用 */
    patch: (patch: Partial<AppState>) => void;
    patchPlayback: (patch: Partial<PlaybackStatus>) => void;
}

export type AppStore = AppState & AppActions;

export const INITIAL_PLAYBACK: PlaybackStatus = {
    active: false,
    fileStatus: null,
    isPlaying: false,
    currentTime: 0,
    progress: 0,
    speed: 180,
    loop: true,
    timeRange: null,
    satelliteCount: 0,
    dataPoints: 0,
};

export const appStore = createStore<AppStore>()((set) => ({
    display: { ...DEFAULT_DISPLAY_SETTINGS },
    simulation: { ...DEFAULT_SIMULATION_SETTINGS },
    orbit: { ...DEFAULT_ORBIT_INPUTS },

    simTime: 0,
    paused: false,
    referenceInfo: null,
    selected: null,
    playback: { ...INITIAL_PLAYBACK },
    formation: createDefaultFormation(),
    appliedFormation: null,
    loading: null,

    ui: {
        panelOpen: false,
        panelTab: 'scenario',
        helpOpen: false,
        activeDialog: null,
    },

    setDisplay: (patch) => set((s) => ({ display: { ...s.display, ...patch } })),
    setSimulation: (patch) => set((s) => ({ simulation: { ...s.simulation, ...patch } })),
    setUI: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),
    updateFormation: (update) => set((s) => ({ formation: update(s.formation) })),
    patch: (patch) => set(patch),
    patchPlayback: (patch) => set((s) => ({ playback: { ...s.playback, ...patch } })),
}));

/** React コンポーネントからストアを購読するフック */
export function useAppStore<T>(selector: (state: AppStore) => T): T {
    return useStore(appStore, selector);
}
