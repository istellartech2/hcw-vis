/**
 * フォーメーション設計システムの型定義
 */

export type ShapeType = 'sphere' | 'cube' | 'box' | '3dfile';
export type PatternType =
    | 'axis'
    | 'grid'
    | 'random_position'
    | 'random_position_velocity'
    | 'random_periodic'
    | 'periodic_orbit'
    | 'circular_orbit'
    | 'hexagonal_disk'
    | 'concentric_disk'
    | 'vbar_approach'
    | 'rbar_approach';
export type PlacementMode = 'radius' | 'spacing';

/**
 * 直方体の3辺の比率
 */
export interface BoxRatios {
    x: number;
    y: number;
    z: number;
}

/**
 * 回転角度（度単位）
 */
export interface Rotation {
    r: number;  // R軸（Radial）周りの回転
    s: number;  // S軸（Along-track）周りの回転
}

/**
 * 楕円軌道パラメータ
 */
export interface PeriodicParams {
    A: number;  // 基準振幅
    B: number;  // B/A比
    D: number;  // D/A比
    E: number;  // E/A比
    F: number;  // F/A比
}

/**
 * フォーメーションレイヤーの設定
 */
export interface FormationLayer {
    id: string;
    name: string;
    enabled: boolean;
    pattern: PatternType;
    placementMode: PlacementMode;
    radius?: number;        // 範囲モード時 (m)
    spacing?: number;       // 衛星間距離モード時 (m)
    satelliteCount: number;
    shape: ShapeType;
    size: number;           // 球体:直径、立方体:一辺、直方体:基準サイズ (m)
    boxRatios?: BoxRatios;  // 直方体の3辺比率
    rotation?: Rotation;    // 回転角度
    colorMode: 'uniform' | 'random';  // 色の設定方法
    color: string;          // 色（16進数カラーコード、uniformモード時）
    model3dFile?: string;   // 3Dファイルのパス（実際のFileオブジェクトは別管理）

    // パターン別の追加パラメータ
    zAmplitude?: number;        // Z方向の振幅倍率（periodic_orbitなど）
    periodicParams?: PeriodicParams;  // 楕円軌道パラメータ
    positiveZ?: boolean;        // 円軌道で+Z方向に回転するか
}

/**
 * フォーメーション全体の設定
 */
export interface FormationConfig {
    version: string;
    name: string;
    description?: string;
    createdAt: string;      // ISO 8601形式
    layers: FormationLayer[];
}

/**
 * レイヤーのデフォルト設定
 */
export const DEFAULT_LAYER: Omit<FormationLayer, 'id' | 'name'> = {
    enabled: true,
    pattern: 'axis',
    placementMode: 'spacing',
    radius: 10.0,
    spacing: 1.0,
    satelliteCount: 3,
    shape: 'sphere',
    size: 0.3,
    rotation: { r: 0, s: 0 },
    colorMode: 'random',
    color: '#4ecdc4'
};

/**
 * フォーメーション設定のバリデーション結果
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * デフォルトのフォーメーション設定
 * アプリ起動時に使用される初期フォーメーション
 */
export const DEFAULT_FORMATION_CONFIG: FormationConfig = {
    version: '1.0',
    name: 'デフォルトフォーメーション',
    description: '',
    createdAt: new Date().toISOString(),
    layers: [
        {
            id: crypto.randomUUID(),
            name: 'デフォルトレイヤー',
            enabled: true,
            pattern: 'axis',
            placementMode: 'spacing',
            spacing: 2.0,
            satelliteCount: 5,
            shape: 'sphere',
            size: 0.5,
            rotation: { r: 0, s: 0 },
            colorMode: 'random',
            color: '#4ecdc4'
        }
    ]
};
