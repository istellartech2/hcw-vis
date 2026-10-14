/**
 * アプリケーション設定の型定義と既定値。
 * UI とシミュレーションエンジンの両方がこの定義を共有する。
 */

export type SatelliteShape = 'sphere' | 'cube' | '3dfile';

export interface DisplaySettings {
    showGrid: boolean;
    showAxes: boolean;
    showLatLongGrid: boolean;
    showEarth: boolean;
    showTrails: boolean;
    trailLength: number;
    earthTexture: string;
    // フォーメーションのメタデータが無い衛星（CSV再生など）に使う既定の見た目
    satelliteShape: SatelliteShape;
    satelliteSize: number;
    uniformSatelliteColor: boolean;
    satelliteColor: string;
    cubeRotationR: number;
    cubeRotationS: number;
    file3dRotationR: number;
    file3dRotationS: number;
}

export interface SimulationSettings {
    timeScale: number;
    j2Perturbation: boolean;
    j2StableArrangement: boolean;
    perturbationAmount: number;
    collisionEnabled: boolean;
    satelliteMass: number;
}

/** 基準軌道の入力値（離心率は0固定） */
export interface OrbitInputs {
    altitudeKm: number;
    inclination: number;
    raan: number;
    argOfPerigee: number;
    meanAnomaly: number;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
    showGrid: true,
    showAxes: true,
    showLatLongGrid: true,
    showEarth: true,
    showTrails: true,
    trailLength: 200,
    earthTexture: 'earth00.webp',
    satelliteShape: 'sphere',
    satelliteSize: 1.0,
    uniformSatelliteColor: false,
    satelliteColor: '#ffffff',
    cubeRotationR: 0,
    cubeRotationS: 0,
    file3dRotationR: 0,
    file3dRotationS: 0,
};

export const DEFAULT_SIMULATION_SETTINGS: SimulationSettings = {
    timeScale: 180,
    j2Perturbation: false,
    j2StableArrangement: false,
    perturbationAmount: 0.02,
    collisionEnabled: false,
    satelliteMass: 1.0,
};

export const DEFAULT_ORBIT_INPUTS: OrbitInputs = {
    altitudeKm: 500,
    inclination: 51.6,
    raan: 0,
    argOfPerigee: 0,
    meanAnomaly: 0,
};

export const TIME_SCALE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
    { value: 1, label: '1x (1秒/秒)' },
    { value: 10, label: '10x (10秒/秒)' },
    { value: 60, label: '60x (1分/秒)' },
    { value: 180, label: '180x (3分/秒)' },
    { value: 300, label: '300x (5分/秒)' },
    { value: 600, label: '600x (10分/秒)' },
    { value: 1800, label: '1800x (30分/秒)' },
    { value: 3600, label: '3600x (1時間/秒)' },
    { value: 7200, label: '7200x (2時間/秒)' },
];

export const EARTH_TEXTURE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'earth00.webp', label: 'シンプル' },
    { value: 'earth01.webp', label: '標準' },
    { value: 'earth03.webp', label: '淡白' },
    { value: 'earth04.webp', label: 'ブルーマーブル' },
    { value: 'earth05_highres.webp', label: '高解像度' },
];

export const CSV_SAMPLES: ReadonlyArray<{ path: string; label: string }> = [
    { path: 'samples/single_satellite_6dof.csv', label: '衛星1機 (6DOF)' },
    { path: 'samples/three_satellite_6dof.csv', label: '衛星3機 (6DOF)' },
];

/** 非統一色モードで衛星に割り当てるパレット */
export const SATELLITE_PALETTE = [
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
    '#f7b731',
    '#5f27cd',
    '#00d2d3',
    '#ff9ff3',
    '#54a0ff',
] as const;
