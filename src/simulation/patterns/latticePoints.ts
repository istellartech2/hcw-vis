import { MinHeap } from './MinHeap';
import type { DiskLatticePoint, HexLatticePoint } from './types';

/** 半径の昇順、同半径なら角度の昇順 */
function compareByRadiusThenTheta(a: DiskLatticePoint, b: DiskLatticePoint): number {
    if (a.radiusEuclid !== b.radiusEuclid) {
        return a.radiusEuclid - b.radiusEuclid;
    }
    return a.theta - b.theta;
}

/**
 * 六角格子点を原点から近い順に count 個返す
 */
export function generateHexLatticePoints(count: number): HexLatticePoint[] {
    const candidates: HexLatticePoint[] = [];

    if (count <= 0) {
        return candidates;
    }

    const requiredRings = computeRequiredHexRings(count) + 1; // 余剰リングを追加して円形クリッピングに余裕を持たせる

    for (let ring = 0; ring <= requiredRings; ring++) {
        candidates.push(...enumerateHexRing(ring));
    }

    candidates.sort(compareByRadiusThenTheta);

    return candidates.slice(0, count);
}

/**
 * 正方格子点を原点から近い順に count 個返す（最小ヒープによる幅優先展開）
 */
export function generateSquareLatticePoints(count: number): DiskLatticePoint[] {
    if (count <= 0) {
        return [];
    }

    const result: DiskLatticePoint[] = [];
    const visited = new Set<string>();
    const minHeap = new MinHeap<DiskLatticePoint>(compareByRadiusThenTheta);

    const enqueue = (x: number, y: number) => {
        const key = `${x},${y}`;
        if (visited.has(key)) {
            return;
        }
        visited.add(key);
        minHeap.push(createSquareLatticePoint(x, y));
    };

    enqueue(0, 0);

    const neighborOffsets: Array<[number, number]> = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ];

    while (result.length < count && !minHeap.isEmpty()) {
        const point = minHeap.pop();
        if (!point) {
            break;
        }
        result.push(point);

        for (const [dx, dy] of neighborOffsets) {
            enqueue(point.x + dx, point.y + dy);
        }
    }

    return result.slice(0, count);
}

function enumerateHexRing(ring: number): HexLatticePoint[] {
    const ringPoints: HexLatticePoint[] = [];

    if (ring === 0) {
        ringPoints.push(createHexLatticePoint(0, 0));
        return ringPoints;
    }

    let q = ring;
    let r = 0;
    const directions = [
        { dq: -1, dr: 1 },
        { dq: -1, dr: 0 },
        { dq: 0, dr: -1 },
        { dq: 1, dr: -1 },
        { dq: 1, dr: 0 },
        { dq: 0, dr: 1 },
    ];

    for (const dir of directions) {
        for (let step = 0; step < ring; step++) {
            ringPoints.push(createHexLatticePoint(q, r));
            q += dir.dq;
            r += dir.dr;
        }
    }

    return ringPoints;
}

function createHexLatticePoint(q: number, r: number): HexLatticePoint {
    const x = q + 0.5 * r;
    const y = (Math.sqrt(3) / 2) * r;
    const radiusEuclid = Math.hypot(x, y);
    const theta = radiusEuclid === 0 ? 0 : Math.atan2(y, x);

    return { q, r, x, y, theta, radiusEuclid };
}

function computeRequiredHexRings(count: number): number {
    if (count <= 1) {
        return 0;
    }

    const safeCount = Math.max(1, count);
    const discriminant = Math.max(0, 12 * safeCount - 3);
    const rings = Math.ceil((-3 + Math.sqrt(discriminant)) / 6);
    return Math.max(0, rings);
}

function createSquareLatticePoint(x: number, y: number): DiskLatticePoint {
    const radiusEuclid = Math.hypot(x, y);
    const theta = radiusEuclid === 0 ? 0 : Math.atan2(y, x);
    return { x, y, theta, radiusEuclid };
}
