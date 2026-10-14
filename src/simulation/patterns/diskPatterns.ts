import { generateHexLatticePoints, generateSquareLatticePoints } from './latticePoints';
import type { DiskLatticePoint, InitialCondition } from './types';

/**
 * ディスク系パターンの共通パラメータ
 * - n: 平均運動 (rad/s)
 * - ssCoefficient: SS係数c（J2安定配置を使わない場合は 1.0）
 */
export interface DiskPatternOptions {
    n: number;
    ssCoefficient: number;
}

export function generateHexagonalDisk(
    count: number,
    radius: number,
    spacing: number | undefined,
    options: DiskPatternOptions,
): InitialCondition[] {
    const hexPoints = generateHexLatticePoints(count);
    return createDiskInitialConditions(hexPoints, radius, spacing, options);
}

export function generateSquareLatticeDisk(
    count: number,
    radius: number,
    spacing: number | undefined,
    options: DiskPatternOptions,
): InitialCondition[] {
    const squarePoints = generateSquareLatticePoints(count);
    return createDiskInitialConditions(squarePoints, radius, spacing, options);
}

function createDiskInitialConditions(
    points: DiskLatticePoint[],
    radius: number,
    spacing: number | undefined,
    { n, ssCoefficient: c }: DiskPatternOptions,
): InitialCondition[] {
    const positions: InitialCondition[] = [];

    if (points.length === 0) {
        return positions;
    }

    const sqrt5 = Math.sqrt(5);
    const sqrt3 = Math.sqrt(3);

    const hasSpacing = spacing !== undefined && Number.isFinite(spacing) && spacing > 0;
    const maxEuclidRadius = points.reduce((max, point) => Math.max(max, point.radiusEuclid), 0);

    let radialScale: number;
    if (hasSpacing) {
        radialScale = spacing;
    } else if (maxEuclidRadius > 0 && radius > 0) {
        radialScale = radius / maxEuclidRadius;
    } else if (maxEuclidRadius > 0) {
        // radius未指定時の安全な正規化
        radialScale = 1 / maxEuclidRadius;
    } else {
        radialScale = 0;
    }

    for (const point of points) {
        const rPhysical = point.radiusEuclid * radialScale;
        const theta = point.theta;

        const x0 = (rPhysical / sqrt5) * Math.cos(theta);
        const y0 = ((2 * rPhysical) / sqrt5) * Math.sin(theta);
        const z0 = ((sqrt3 * rPhysical) / sqrt5) * Math.cos(theta);

        const vx0 = ((rPhysical * n) / sqrt5) * Math.sin(theta);

        // J2安定配置: vy0 = -2nc·x0 を満たす初期速度
        // 通常: vy0 = -2n·x0
        const vy0 = -((2 * rPhysical * n * c) / sqrt5) * Math.cos(theta);

        const vz0 = ((sqrt3 * rPhysical * n) / sqrt5) * Math.sin(theta);

        positions.push({
            x0,
            y0,
            z0,
            vx0,
            vy0,
            vz0,
        });
    }

    return positions;
}

export function generateConcentricDisk(
    count: number,
    radius: number,
    spacing: number | undefined,
    { n, ssCoefficient: c }: DiskPatternOptions,
): InitialCondition[] {
    const positions: InitialCondition[] = [];

    if (count <= 0) {
        return positions;
    }

    const sqrt5 = Math.sqrt(5);
    const sqrt3 = Math.sqrt(3);

    // スペーシングを決定
    // spacing指定の場合: ユーザー指定の衛星間距離を使用
    // radius指定の場合: 衛星数から自動計算
    let ringSpacing: number;
    let maxRadius: number;

    if (spacing !== undefined && spacing > 0) {
        // 衛星間距離ベース
        ringSpacing = spacing;
        // 最大半径は制限なし（必要なリング数から自動決定）
        maxRadius = Infinity;
    } else {
        // 範囲ベース（従来の方法）
        if (radius <= 0) {
            for (let i = 0; i < count; i++) {
                positions.push({ x0: 0, y0: 0, z0: 0, vx0: 0, vy0: 0, vz0: 0 });
            }
            return positions;
        }
        const normalizedCount = Math.max(1, count);
        ringSpacing = Math.max(radius / Math.ceil(Math.sqrt(normalizedCount)), radius / normalizedCount, 1e-6);
        maxRadius = radius;
    }

    interface RingConfig {
        radius: number;
        nodes: number;
    }

    const rings: RingConfig[] = [];
    let remaining = count;
    let level = 0;

    while (remaining > 0 && level < 1000) {
        if (level === 0) {
            rings.push({ radius: 0, nodes: 1 });
            remaining -= 1;
        } else {
            const rawRadius = level * ringSpacing;
            const r = Math.min(rawRadius, maxRadius);
            const circumference = 2 * Math.PI * Math.max(r, ringSpacing);
            const estimatedNodes = Math.round(circumference / ringSpacing);
            let nodes = Math.max(6, estimatedNodes);
            nodes = Math.max(1, Math.min(nodes, remaining));
            rings.push({ radius: r, nodes });
            remaining -= nodes;
        }
        level += 1;
    }

    for (let ringIndex = 0; ringIndex < rings.length && positions.length < count; ringIndex++) {
        const { radius: ringRadius, nodes } = rings[ringIndex];
        if (nodes <= 0) {
            continue;
        }

        const deltaTheta = (2 * Math.PI) / nodes;
        const offset = ringIndex % 2 === 0 ? 0 : deltaTheta / 2;

        for (let node = 0; node < nodes && positions.length < count; node++) {
            const theta = offset + node * deltaTheta;
            const cosTheta = Math.cos(theta);
            const sinTheta = Math.sin(theta);

            const x0 = (ringRadius / sqrt5) * cosTheta;
            const y0 = ((2 * ringRadius) / sqrt5) * sinTheta;
            const z0 = ((sqrt3 * ringRadius) / sqrt5) * cosTheta;

            const vx0 = ((ringRadius * n) / sqrt5) * sinTheta;

            // J2安定配置: vy0 = -2nc·x0 を満たす初期速度
            // 通常: vy0 = -2n·x0
            const vy0 = -((2 * ringRadius * n * c) / sqrt5) * cosTheta;

            const vz0 = ((sqrt3 * ringRadius * n) / sqrt5) * sinTheta;

            positions.push({ x0, y0, z0, vx0, vy0, vz0 });
        }
    }

    while (positions.length < count) {
        positions.push({ x0: 0, y0: 0, z0: 0, vx0: 0, vy0: 0, vz0: 0 });
    }

    return positions;
}
