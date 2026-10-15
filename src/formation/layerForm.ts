/**
 * レイヤー編集フォームの値と FormationLayer の相互変換、および表示制御ロジック。
 * UI フレームワークに依存しない純粋関数として実装する。
 */

import {
    isHexColor,
    type FormationLayer,
    type GridPlane,
    type PatternType,
    type PlacementMode,
    type ShapeType,
} from './FormationTypes';
import { MAX_GENERATED_SATELLITES, layerSatelliteCount } from './formationConfig';

export const PATTERN_LABELS: Record<PatternType, string> = {
    origin: '単独（1 機）',
    axis: '軸上',
    grid: '格子',
    random_position: 'ランダム位置',
    random_position_velocity: 'ランダム位置・速度',
    random_periodic: 'ランダム周期軌道',
    periodic_orbit: '楕円軌道（係数指定）',
    circular_orbit: '円軌道',
    hexagonal_disk: '円盤（六角格子）',
    square_lattice_disk: '円盤（正方格子）',
    concentric_disk: '円盤（同心リング）',
    vbar_approach: 'V-bar 接近',
    rbar_approach: 'R-bar 接近',
};

/** パターン選択時に表示する 1 行説明 */
export const PATTERN_DESCRIPTIONS: Record<PatternType, string> = {
    origin: '指定した位置に 1 機だけ置きます。初速度も指定できます。',
    axis: 'R・S・W の 3 軸上に、原点の両側へ等間隔に並べます。',
    grid: '原点を中心とした格子点に並べます。立方格子のほか、R-S・R-W・S-W の面だけにも並べられます。',
    random_position: '±範囲の立方体の中にランダムに置きます。',
    random_position_velocity: '位置も速度もランダム。多くはドリフトして離れていきます。',
    random_periodic: 'ランダムな位置・速度のうち、ドリフトしない条件を満たすものを置きます。',
    periodic_orbit: 'HCW 周期解の係数 A, B, D, E, F を指定し、同じ楕円上に等間隔で並べます。',
    circular_orbit: '基準衛星から一定距離（半径）を保って回る円軌道上に等間隔で並べます。軌道面は傾いています。',
    hexagonal_disk: '基準衛星のまわりを回る円盤状の配置。六角格子に並べます。',
    square_lattice_disk: '基準衛星のまわりを回る円盤状の配置。正方格子に並べます。',
    concentric_disk: '基準衛星のまわりを回る円盤状の配置。同心円のリングに並べます。',
    vbar_approach: '進行方向の後方（−S）に一列に並べ、基準衛星へ向かう速度を与えます。',
    rbar_approach: '地球側（−R）に一列に並べ、基準衛星へ向かう速度を与えます。',
};

/** パターンの分類。選択メニューの見出しに使う */
export const PATTERN_GROUPS: ReadonlyArray<{ label: string; note: string; patterns: PatternType[] }> = [
    {
        label: '周期軌道',
        note: 'ドリフトせず、基準衛星のまわりを回り続けます',
        patterns: [
            'circular_orbit',
            'hexagonal_disk',
            'square_lattice_disk',
            'concentric_disk',
            'periodic_orbit',
            'random_periodic',
        ],
    },
    {
        label: '静止配置',
        note: '初速度 0。時間とともにドリフトして離れていきます',
        patterns: ['axis', 'grid', 'random_position', 'origin'],
    },
    {
        label: '接近・その他',
        note: '',
        patterns: ['vbar_approach', 'rbar_approach', 'random_position_velocity'],
    },
];

export const SHAPE_LABELS: Record<ShapeType, string> = {
    sphere: '球体',
    cube: '立方体',
    box: '直方体',
    '3dfile': '3Dファイル',
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
    velocityR: string;
    velocityS: string;
    velocityW: string;
    /** 格子を並べる面。'3d' は立方格子 */
    gridPlane: GridPlane | '3d';
}

export function layerToForm(layer: FormationLayer): LayerFormValues {
    const A = layer.periodicParams?.A ?? 0;
    const ratio = (value: number | undefined, fallback: number) =>
        String(layer.periodicParams && A !== 0 ? (value ?? 0) / A : fallback);

    return {
        name: layer.name,
        pattern: layer.pattern,
        placementMode: layer.placementMode,
        radius: String((layer.radius || 10) * (layer.pattern === 'circular_orbit' ? CIRCULAR_RADIUS_FACTOR : 1)),
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
        velocityR: String(layer.rswVelocity?.r ?? 0),
        velocityS: String(layer.rswVelocity?.s ?? 0),
        velocityW: String(layer.rswVelocity?.w ?? 0),
        gridPlane: layer.gridPlane ?? '3d',
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
    /** 原点配置: 初期位置としてのオフセットと初速度 */
    originOffset: boolean;
    gridPlane: boolean;
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
        gridPlane: pattern === 'grid',
    };
}

export function getSizeLabel(shape: ShapeType): string {
    switch (shape) {
        case 'sphere':
            return '直径';
        case 'cube':
            return '一辺';
        case 'box':
            return '基準寸法';
        default:
            return 'サイズ';
    }
}

/**
 * 円軌道パターンの radius は x 方向の振幅で、基準衛星からの距離（円の半径）はその 2 倍になる。
 * フォームでは分かりやすさのため実際の半径を入力させ、保存時に radius へ戻す。
 */
export const CIRCULAR_RADIUS_FACTOR = 2;

/** 「範囲」入力欄のラベル。パターンによって意味が違う */
export function getRadiusLabel(pattern: PatternType): string {
    switch (pattern) {
        case 'random_position':
        case 'random_position_velocity':
        case 'random_periodic':
            return '範囲（±）';
        case 'circular_orbit':
            return '半径';
        case 'periodic_orbit':
            return '振幅 A（R 方向）';
        case 'hexagonal_disk':
        case 'square_lattice_disk':
        case 'concentric_disk':
            return '円盤の半径';
        default:
            return '最も遠い衛星までの距離';
    }
}

/** 「衛星数」入力欄のラベル。軸上・格子は入力値と実際の機数が違う */
export function getCountLabel(pattern: PatternType): string {
    switch (pattern) {
        case 'axis':
            return '各軸・片側の機数';
        case 'grid':
            return '片側の格子数';
        default:
            return '衛星数';
    }
}

/** フォームの内容で生成される衛星数（count は検証済みの「衛星数」欄の値） */
export function formSatelliteCount(values: LayerFormValues, count: number): number {
    const gridPlane = values.gridPlane === '3d' ? undefined : values.gridPlane;
    return layerSatelliteCount({ pattern: values.pattern, satelliteCount: count, gridPlane });
}

/**
 * フォームの入力内容をチェックし、問題があれば利用者向けのメッセージを返す。
 * 問題がなければ null（このときだけシミュレーションに反映する）。
 */
export function checkLayerForm(values: LayerFormValues): string | null {
    const visible = getLayerFieldVisibility(values);
    const positive = (value: string) => {
        const n = parseFloat(value);
        return Number.isFinite(n) && n > 0;
    };
    const finite = (value: string) => Number.isFinite(parseFloat(value));

    if (visible.satelliteCount) {
        const count = Number(values.satelliteCount);
        if (!Number.isInteger(count) || count < 1)
            return `${getCountLabel(values.pattern)}は 1 以上の整数で入力してください`;
        const generated = formSatelliteCount(values, count);
        if (generated > MAX_GENERATED_SATELLITES) {
            return `衛星が ${generated.toLocaleString()} 機になります（上限 ${MAX_GENERATED_SATELLITES.toLocaleString()} 機）`;
        }
    }
    if (visible.radius && !positive(values.radius))
        return `${getRadiusLabel(values.pattern)}は正の数で入力してください`;
    if (visible.spacing && !positive(values.spacing)) return '衛星の間隔は正の数で入力してください';
    if (!positive(values.size)) return 'サイズは正の数で入力してください';
    if (visible.boxRatios && ![values.boxX, values.boxY, values.boxZ].every(positive)) {
        return '直方体の比率は正の数で入力してください';
    }
    if (visible.color && !isHexColor(values.color)) return '色は #RRGGBB の形式で入力してください';
    const numericKeys: Array<keyof LayerFormValues> = [];
    if (visible.originOffset || visible.axisOffset) numericKeys.push('offsetR', 'offsetS', 'offsetW');
    if (visible.originOffset) numericKeys.push('velocityR', 'velocityS', 'velocityW');
    if (visible.periodicParams) numericKeys.push('ratioB', 'ratioD', 'ratioE', 'ratioF', 'zAmplitude');
    if (visible.rotation) numericKeys.push('rotationR', 'rotationS');
    if (numericKeys.some((key) => !finite(values[key] as string))) return '数値を入力してください';
    return null;
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

    updates.boxRatios =
        shape === 'box'
            ? { x: num(values.boxX, 1) || 1, y: num(values.boxY, 1) || 1, z: num(values.boxZ, 1) || 1 }
            : undefined;

    updates.rotation =
        shape === 'cube' || shape === 'box' ? { r: num(values.rotationR, 0), s: num(values.rotationS, 0) } : undefined;

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
        updates.radius = (num(values.radius, 20) || 20) / CIRCULAR_RADIUS_FACTOR;
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

    if (pattern === 'origin') {
        const velocity = { r: num(values.velocityR, 0), s: num(values.velocityS, 0), w: num(values.velocityW, 0) };
        // 初速度 0 は項目ごと省いて、保存する JSON を以前と同じ形に保つ
        updates.rswVelocity = velocity.r || velocity.s || velocity.w ? velocity : undefined;
    } else {
        updates.rswVelocity = undefined;
    }

    updates.gridPlane = pattern === 'grid' && values.gridPlane !== '3d' ? values.gridPlane : undefined;

    return updates;
}
