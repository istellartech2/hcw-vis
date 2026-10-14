/**
 * レイヤー編集フォームの値と FormationLayer の相互変換、および表示制御ロジック。
 * UI フレームワークに依存しない純粋関数として実装する。
 */

import type { FormationLayer, PatternType, PlacementMode, ShapeType } from './FormationTypes';

export const PATTERN_LABELS: Record<PatternType, string> = {
    origin: '原点配置',
    axis: '軸上-速度0',
    grid: '格子-速度0',
    random_position: 'ランダム-速度0',
    random_position_velocity: 'ランダム',
    random_periodic: 'ランダム-周期解',
    periodic_orbit: '楕円軌道',
    circular_orbit: '円軌道',
    hexagonal_disk: '円盤軌道（六角格子）',
    square_lattice_disk: '円盤軌道（正方格子）',
    concentric_disk: '円盤軌道（同心リング）',
    vbar_approach: 'V-bar軌道',
    rbar_approach: 'R-bar軌道',
};

export const SHAPE_LABELS: Record<ShapeType, string> = {
    sphere: '球体',
    cube: '立方体',
    box: '直方体',
    '3dfile': '3Dファイル',
};

export const PLACEMENT_MODE_LABELS: Record<PlacementMode, string> = {
    radius: '範囲指定',
    spacing: '衛星間距離',
};

/** フォームの入力値。数値入力は編集途中の文字列を保持できるよう string で持つ */
export interface LayerFormValues {
    name: string;
    pattern: PatternType;
    placementMode: PlacementMode;
    radius: string;
    spacing: string;
    satelliteCount: string;
    shape: ShapeType;
    size: string;
    boxX: string;
    boxY: string;
    boxZ: string;
    rotationR: string;
    rotationS: string;
    colorMode: 'uniform' | 'random';
    color: string;
    zAmplitude: string;
    ratioB: string;
    ratioD: string;
    ratioE: string;
    ratioF: string;
    positiveZ: boolean;
    offsetR: string;
    offsetS: string;
    offsetW: string;
}

export function layerToForm(layer: FormationLayer): LayerFormValues {
    const A = layer.periodicParams?.A ?? 0;
    const ratio = (value: number | undefined, fallback: number) =>
        String(layer.periodicParams && A !== 0 ? (value ?? 0) / A : fallback);

    return {
        name: layer.name,
        pattern: layer.pattern,
        placementMode: layer.placementMode,
        radius: String(layer.radius || 10),
        spacing: String(layer.spacing || 1),
        satelliteCount: String(layer.satelliteCount),
        shape: layer.shape,
        size: String(layer.size),
        boxX: String(layer.boxRatios?.x ?? 1),
        boxY: String(layer.boxRatios?.y ?? 1),
        boxZ: String(layer.boxRatios?.z ?? 1),
        rotationR: String(layer.rotation?.r ?? 0),
        rotationS: String(layer.rotation?.s ?? 0),
        colorMode: layer.colorMode || 'uniform',
        color: layer.color,
        zAmplitude: String(layer.zAmplitude ?? 0),
        ratioB: ratio(layer.periodicParams?.B, 1),
        ratioD: ratio(layer.periodicParams?.D, 0),
        ratioE: ratio(layer.periodicParams?.E, 0),
        ratioF: ratio(layer.periodicParams?.F, 0),
        positiveZ: layer.positiveZ ?? true,
        offsetR: String(layer.rswOffset?.r ?? 0),
        offsetS: String(layer.rswOffset?.s ?? 0),
        offsetW: String(layer.rswOffset?.w ?? 0),
    };
}

const RANDOM_PATTERNS: PatternType[] = ['random_position', 'random_position_velocity', 'random_periodic'];
const ORBIT_PATTERNS: PatternType[] = ['periodic_orbit', 'circular_orbit'];

export interface LayerFieldVisibility {
    placementMode: boolean;
    radius: boolean;
    spacing: boolean;
    satelliteCount: boolean;
    boxRatios: boolean;
    rotation: boolean;
    color: boolean;
    zAmplitude: boolean;
    periodicParams: boolean;
    positiveZ: boolean;
    /** 軸上パターン: 折りたたみ表示のオフセット */
    axisOffset: boolean;
    /** 原点配置: 初期位置としてのオフセット */
    originOffset: boolean;
}

export function getLayerFieldVisibility(values: LayerFormValues): LayerFieldVisibility {
    const { pattern, placementMode, shape } = values;
    const isOrigin = pattern === 'origin';
    const usesOnlyRadius = RANDOM_PATTERNS.includes(pattern) || ORBIT_PATTERNS.includes(pattern);
    const showsPlacementMode = !isOrigin && !usesOnlyRadius;

    return {
        placementMode: showsPlacementMode,
        radius: usesOnlyRadius || (showsPlacementMode && placementMode === 'radius'),
        spacing: showsPlacementMode && placementMode === 'spacing',
        satelliteCount: !isOrigin,
        boxRatios: shape === 'box',
        rotation: shape === 'box' || shape === 'cube',
        color: values.colorMode === 'uniform',
        zAmplitude: pattern === 'periodic_orbit',
        periodicParams: pattern === 'periodic_orbit',
        positiveZ: pattern === 'circular_orbit',
        axisOffset: pattern === 'axis',
        originOffset: isOrigin,
    };
}

export function getSizeLabel(shape: ShapeType): string {
    switch (shape) {
        case 'sphere': return '直径';
        case 'cube': return '一辺';
        case 'box': return '基準寸法';
        default: return 'サイズ';
    }
}

/** 楕円軌道パラメータの離心率 e = sqrt((D-2)^2 + E^2) / 2 */
export function computeEccentricity(values: LayerFormValues): number {
    const D = parseFloat(values.ratioD) || 0;
    const E = parseFloat(values.ratioE) || 0;
    return Math.sqrt((D - 2) ** 2 + E ** 2) / 2;
}

/** フォーム値をレイヤー更新内容に変換する */
export function formToLayerUpdates(values: LayerFormValues): Partial<FormationLayer> {
    const { pattern, placementMode, shape } = values;
    const num = (value: string, fallback: number) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    const updates: Partial<FormationLayer> = {
        name: values.name,
        pattern,
        placementMode,
        satelliteCount: parseInt(values.satelliteCount, 10),
        shape,
        size: parseFloat(values.size),
        colorMode: values.colorMode,
        color: values.color,
    };

    if (RANDOM_PATTERNS.includes(pattern)) {
        updates.radius = parseFloat(values.radius);
        updates.spacing = undefined;
        updates.placementMode = 'radius';
    } else if (placementMode === 'radius') {
        updates.radius = parseFloat(values.radius);
        updates.spacing = undefined;
    } else {
        updates.spacing = parseFloat(values.spacing);
        updates.radius = undefined;
    }

    updates.boxRatios = shape === 'box'
        ? { x: num(values.boxX, 1) || 1, y: num(values.boxY, 1) || 1, z: num(values.boxZ, 1) || 1 }
        : undefined;

    updates.rotation = shape === 'cube' || shape === 'box'
        ? { r: num(values.rotationR, 0), s: num(values.rotationS, 0) }
        : undefined;

    if (pattern === 'periodic_orbit') {
        const A = num(values.radius, 10) || 10;
        updates.radius = A;
        updates.spacing = undefined;
        updates.placementMode = 'radius';
        updates.zAmplitude = num(values.zAmplitude, 0);
        // B, D, E, F は A に対する比率として入力されるので実値に戻す
        updates.periodicParams = {
            A,
            B: A * (num(values.ratioB, 1) || 1),
            D: A * num(values.ratioD, 0),
            E: A * num(values.ratioE, 0),
            F: A * num(values.ratioF, 0),
        };
        updates.positiveZ = undefined;
    } else if (pattern === 'circular_orbit') {
        updates.radius = num(values.radius, 10) || 10;
        updates.spacing = undefined;
        updates.placementMode = 'radius';
        updates.positiveZ = values.positiveZ;
        updates.zAmplitude = undefined;
        updates.periodicParams = undefined;
    } else {
        updates.zAmplitude = undefined;
        updates.periodicParams = undefined;
        updates.positiveZ = undefined;
    }

    if (pattern === 'axis' || pattern === 'origin') {
        updates.rswOffset = {
            r: num(values.offsetR, 0),
            s: num(values.offsetS, 0),
            w: num(values.offsetW, 0),
        };
        if (pattern === 'origin') updates.satelliteCount = 1;
    } else {
        updates.rswOffset = undefined;
    }

    return updates;
}
