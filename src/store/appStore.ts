/**
 * アプリ全体の状態ストア。
 *
 * - settings 系（display / simulation）と formation は UI が書き込み、エンジンが購読して反映する
 * - telemetry 系（simTime, referenceInfo, groundTrack, selected, playback, orbit）はエンジンが書き込み、UI が描画する
 * - ui 系はパネルやダイアログの開閉状態で、React 側だけが使う
 *
 * zustand の vanilla store なので React 以外（エンジン）からも利用できる。
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { FormationConfig } from '@/formation/FormationTypes';
import { createDefaultFormation } from '@/formation/formationConfig';
import type { GroundTrack } from '@/simulation/groundTrack';
import {
    DEFAULT_DISPLAY_SETTINGS,
    DEFAULT_ORBIT_INPUTS,
    DEFAULT_SIMULATION_SETTINGS,
    type DisplaySettings,
    type OrbitInputs,
    type SimulationSettings,
} from './settings';

/** 基準衛星の現在の緯度経度（度） */
export interface ReferenceSatelliteInfo {
    latitude: number;
    longitude: number;
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
}

export type ActiveDialog = 'thrust' | 'position' | null;

/**
 * アプリのモード。
 * - simulation: フォーメーションを HCW 方程式で積分する（既定）
 * - csv: 事前計算した CSV の時系列を再生する
 * 実際に CSV を再生しているかは `playback.active` が正。`ui.mode` は利用者が選んだモードで、
 * CSV を選んだがまだファイルを読み込んでいない状態を表すために使う（`useAppMode` 参照）。
 */
export type AppMode = 'simulation' | 'csv';

/** 左パネルのタブ。モードごとに表示するタブが変わる */
export type PanelTab = 'formation' | 'orbit' | 'csv' | 'display';

export interface AppState {
    display: DisplaySettings;
    simulation: SimulationSettings;
    /** 現在シミュレーションに反映されている基準軌道 */
    orbit: OrbitInputs;

    simTime: number;
    paused: boolean;
    referenceInfo: ReferenceSatelliteInfo | null;
    /** 基準衛星の前後 1 周ずつの地上軌跡（ミニマップ用。時刻が進むと間隔をおいて更新する） */
    groundTrack: GroundTrack | null;
    selected: SelectedSatelliteInfo | null;
    playback: PlaybackStatus;
    /** フォーメーション設定（唯一の正）。layers が変わるとエンジンが衛星を再配置する（時刻は t = 0 に戻る） */
    formation: FormationConfig;
    /**
     * 最後に読み込んだ／保存した JSON ファイル。`config` がその時点の formation と同じ参照なら未変更。
     * 既定の配置のまま、または「既定の配置に戻す」の後は null
     */
    formationFile: { name: string; config: FormationConfig } | null;
    /** 最後に読み込んだ学習用シナリオ。`config` が formation と同じ参照なら、編集されずにそのシナリオのまま */
    loadedScenario: { id: string; config: FormationConfig } | null;
    loading: LoadingState | null;

    ui: {
        panelOpen: boolean;
        mode: AppMode;
        panelTab: PanelTab;
        helpOpen: boolean;
        activeDialog: ActiveDialog;
    };
}

export interface AppActions {
    setDisplay: (patch: Partial<DisplaySettings>) => void;
    setSimulation: (patch: Partial<SimulationSettings>) => void;
    setUI: (patch: Partial<AppState['ui']>) => void;
    updateFormation: (update: (config: FormationConfig) => FormationConfig) => void;
    /** 配置（とファイル・シナリオの情報）を差し替え、差し替え前に戻す関数を返す（「元に戻す」用） */
    replaceFormation: (
        next: Pick<AppState, 'formation'> & Partial<Pick<AppState, 'formationFile' | 'loadedScenario' | 'paused'>>,
    ) => () => void;
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

export const appStore = createStore<AppStore>()((set, get) => ({
    display: { ...DEFAULT_DISPLAY_SETTINGS },
    simulation: { ...DEFAULT_SIMULATION_SETTINGS },
    orbit: { ...DEFAULT_ORBIT_INPUTS },

    simTime: 0,
    paused: false,
    referenceInfo: null,
    groundTrack: null,
    selected: null,
    playback: { ...INITIAL_PLAYBACK },
    formation: createDefaultFormation(),
    formationFile: null,
    loadedScenario: null,
    loading: null,

    ui: {
        panelOpen: false,
        mode: 'simulation',
        panelTab: 'formation',
        helpOpen: false,
        activeDialog: null,
    },

    setDisplay: (patch) => set((s) => ({ display: { ...s.display, ...patch } })),
    setSimulation: (patch) => set((s) => ({ simulation: { ...s.simulation, ...patch } })),
    setUI: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),
    updateFormation: (update) => set((s) => ({ formation: update(s.formation) })),
    replaceFormation: (next) => {
        const { formation, formationFile, loadedScenario } = get();
        set(next);
        return () => set({ formation, formationFile, loadedScenario });
    },
    patch: (patch) => set(patch),
    patchPlayback: (patch) => set((s) => ({ playback: { ...s.playback, ...patch } })),
}));

/** 読み込んだ学習シナリオを編集せずに使っている間はその id、それ以外は null */
export function selectCurrentScenarioId(state: AppState): string | null {
    return state.loadedScenario && state.loadedScenario.config === state.formation ? state.loadedScenario.id : null;
}

/** CSV 再生モードを選んだが、まだファイルを読み込んでいない状態か */
export function isCsvModeWithoutFile(state: AppState = appStore.getState()): boolean {
    return !state.playback.active && state.ui.mode === 'csv';
}

/** 現在のモード。CSV 再生中なら常に csv */
export function useAppMode(): AppMode {
    return useStore(appStore, (s) => (s.playback.active ? 'csv' : s.ui.mode));
}

/** React コンポーネントからストアを購読するフック */
export function useAppStore<T>(selector: (state: AppStore) => T): T {
    return useStore(appStore, selector);
}
