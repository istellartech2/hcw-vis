import type { InitialCondition } from './OrbitInitializer';

/**
 * ディスク系パターン（六角格子・正方格子・同心円）の初期条件。
 * どれも各衛星を基準衛星まわりの HCW 円軌道に乗せ、配置の形を保ったまま回転させる。
 */

/**
 * ディスク系パターンの共通パラメータ
 * - n: 平均運動 (rad/s)
 * - ssCoefficient: SS係数c（J2安定配置を使わない場合は 1.0）
 */
interface DiskPatternOptions {
    n: number;
    ssCoefficient: number;
}

/** 格子点（格子間隔 1）。theta は極角、radiusEuclid は原点からの距離 */
interface LatticePoint {
    x: number;
    y: number;
    theta: number;
    radiusEuclid: number;
}

const ZERO_STATE: InitialCondition = { x0: 0, y0: 0, z0: 0, vx0: 0, vy0: 0, vz0: 0 };

/**
 * 基準衛星から距離 r を保って回る HCW 円軌道解の初期状態（位相 theta）。
 * x0 = r/2·cosθ, y0 = r·sinθ, z0 = √3/2·r·cosθ で、常に x² + y² + z² = r²。
 * J2 安定配置では vy0 = -2nc·x0（c = 1 で古典的な周期条件 vy0 = -2n·x0）。
 */
function circularOrbitInitialCondition(r: number, theta: number, n: number, c: number): InitialCondition {
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const halfSqrt3 = Math.sqrt(3) / 2;
    return {
        x0: (r / 2) * cosTheta,
        y0: r * sinTheta,
        z0: halfSqrt3 * r * cosTheta,
        vx0: ((r * n) / 2) * sinTheta,
        vy0: -r * n * c * cosTheta,
        vz0: halfSqrt3 * r * n * sinTheta,
    };
}

// ------------------------------------------------------------------
// 格子点
// ------------------------------------------------------------------

function latticePoint(x: number, y: number): LatticePoint {
    const radiusEuclid = Math.hypot(x, y);
    const theta = radiusEuclid === 0 ? 0 : Math.atan2(y, x);
    return { x, y, theta, radiusEuclid };
}

/** 原点から近い順（同じ距離なら角度の昇順）に count 個 */
function nearest(candidates: LatticePoint[], count: number): LatticePoint[] {
    candidates.sort((a, b) => a.radiusEuclid - b.radiusEuclid || a.theta - b.theta);
    return candidates.slice(0, count);
}

/** 六角格子（軸座標 q, r）の第 ring リング上の点 */
function enumerateHexRing(ring: number): LatticePoint[] {
    const hexPoint = (q: number, r: number) => latticePoint(q + 0.5 * r, (Math.sqrt(3) / 2) * r);
    if (ring === 0) return [hexPoint(0, 0)];

    const points: LatticePoint[] = [];
    let q = ring;
    let r = 0;
    const directions = [
        [-1, 1],
        [-1, 0],
        [0, -1],
        [1, -1],
        [1, 0],
        [0, 1],
    ];
    for (const [dq, dr] of directions) {
        for (let step = 0; step < ring; step++) {
            points.push(hexPoint(q, r));
            q += dq;
            r += dr;
        }
    }
    return points;
}

/** 六角格子点を原点から近い順に count 個返す */
function generateHexLatticePoints(count: number): LatticePoint[] {
    if (count <= 0) return [];
    // count 個を収めるのに必要なリング数 + 余剰 1 リング（円形クリッピングの余裕）
    const rings = count <= 1 ? 1 : Math.ceil((-3 + Math.sqrt(12 * count - 3)) / 6) + 1;
    const candidates: LatticePoint[] = [];
    for (let ring = 0; ring <= rings; ring++) candidates.push(...enumerateHexRing(ring));
    return nearest(candidates, count);
}

/**
 * 正方格子点を原点から近い順に count 個返す。
 * 半径 ceil(√count) の円内には常に count 個以上の格子点があるので、その外接正方形を列挙すれば足りる
 */
function generateSquareLatticePoints(count: number): LatticePoint[] {
    if (count <= 0) return [];
    const half = Math.ceil(Math.sqrt(count));
    const candidates: LatticePoint[] = [];
    for (let x = -half; x <= half; x++) {
        for (let y = -half; y <= half; y++) candidates.push(latticePoint(x, y));
    }
    return nearest(candidates, count);
}

// ------------------------------------------------------------------
// 初期条件
// ------------------------------------------------------------------

/** 格子点を spacing（なければ最外点が radius になる倍率）で拡大し、円軌道に乗せる */
function latticeInitialConditions(
    points: LatticePoint[],
    radius: number,
    spacing: number | undefined,
    { n, ssCoefficient: c }: DiskPatternOptions,
): InitialCondition[] {
    const maxEuclidRadius = points.reduce((max, point) => Math.max(max, point.radiusEuclid), 0);

    let radialScale = 0;
    if (spacing !== undefined && Number.isFinite(spacing) && spacing > 0) {
        radialScale = spacing;
    } else if (maxEuclidRadius > 0) {
        // radius 未指定時は最外点を 1 に正規化
        radialScale = (radius > 0 ? radius : 1) / maxEuclidRadius;
    }

    return points.map((point) => circularOrbitInitialCondition(point.radiusEuclid * radialScale, point.theta, n, c));
}

export function generateHexagonalDisk(
    count: number,
    radius: number,
    spacing: number | undefined,
    options: DiskPatternOptions,
): InitialCondition[] {
    return latticeInitialConditions(generateHexLatticePoints(count), radius, spacing, options);
}

export function generateSquareLatticeDisk(
    count: number,
    radius: number,
    spacing: number | undefined,
    options: DiskPatternOptions,
): InitialCondition[] {
    return latticeInitialConditions(generateSquareLatticePoints(count), radius, spacing, options);
}

/** 中心 1 機 + 同心リング。リングごとに半ステップずらして並べる */
export function generateConcentricDisk(
    count: number,
    radius: number,
    spacing: number | undefined,
    { n, ssCoefficient: c }: DiskPatternOptions,
): InitialCondition[] {
    if (count <= 0) return [];

    // spacing 指定: 衛星間距離を使い、最大半径は必要なリング数から決まる
    // radius 指定: 衛星数からリング間隔を自動計算する
    let ringSpacing: number;
    let maxRadius: number;
    if (spacing !== undefined && spacing > 0) {
        ringSpacing = spacing;
        maxRadius = Infinity;
    } else {
        if (radius <= 0) return Array.from({ length: count }, () => ({ ...ZERO_STATE }));
        ringSpacing = Math.max(radius / Math.ceil(Math.sqrt(count)), radius / count, 1e-6);
        maxRadius = radius;
    }

    const rings: Array<{ radius: number; nodes: number }> = [{ radius: 0, nodes: 1 }];
    let remaining = count - 1;
    for (let level = 1; remaining > 0 && level < 1000; level++) {
        const r = Math.min(level * ringSpacing, maxRadius);
        const estimatedNodes = Math.round((2 * Math.PI * Math.max(r, ringSpacing)) / ringSpacing);
        const nodes = Math.max(1, Math.min(Math.max(6, estimatedNodes), remaining));
        rings.push({ radius: r, nodes });
        remaining -= nodes;
    }

    const positions: InitialCondition[] = [];
    rings.forEach(({ radius: ringRadius, nodes }, ringIndex) => {
        const deltaTheta = (2 * Math.PI) / nodes;
        const offset = ringIndex % 2 === 0 ? 0 : deltaTheta / 2;
        for (let node = 0; node < nodes; node++) {
            positions.push(circularOrbitInitialCondition(ringRadius, offset + node * deltaTheta, n, c));
        }
    });
    while (positions.length < count) positions.push({ ...ZERO_STATE });
    return positions;
}
