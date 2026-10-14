import type { Satellite } from './Satellite.js';

/** 衝突した衛星の組と、衝突方向の単位法線ベクトル（i → j 方向） */
export interface CollisionPair {
    i: number;
    j: number;
    normal: { x: number; y: number; z: number };
}

/**
 * 総当たり O(n²) の衝突検出（基準衛星 index 0 は除く）。衛星数が少ない（〜1,000 機）前提。
 * @param radius 衛星の半径 (m)。中心間距離が 2·radius 未満なら衝突
 */
export function detectCollisions(satellites: Satellite[], radius: number): CollisionPair[] {
    const pairs: CollisionPair[] = [];
    const threshold = radius * 2;

    for (let i = 1; i < satellites.length; i++) {
        for (let j = i + 1; j < satellites.length; j++) {
            const dx = satellites[i].x - satellites[j].x;
            const dy = satellites[i].y - satellites[j].y;
            const dz = satellites[i].z - satellites[j].z;
            // 軸ごとの事前判定で大半の組を早期に除外する
            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold || Math.abs(dz) > threshold) continue;

            const distSquared = dx * dx + dy * dy + dz * dz;
            if (distSquared >= threshold * threshold) continue;

            const dist = Math.sqrt(distSquared);
            // 完全に重なっている場合はゼロ除算を避けて任意の向きにする
            const normal = dist > 1e-6 ? { x: dx / dist, y: dy / dist, z: dz / dist } : { x: 1, y: 0, z: 0 };
            pairs.push({ i, j, normal });
        }
    }
    return pairs;
}

/**
 * 完全弾性衝突（反発係数 1）。運動量とエネルギーを保存するよう、法線方向のインパルス
 * j = -2·vn / (1/m1 + 1/m2) で速度を更新し、視覚フィードバック用に衝突時刻を記録する。
 */
export function applyElasticCollisions(satellites: Satellite[], pairs: CollisionPair[]): void {
    const now = Date.now();
    for (const { i, j, normal } of pairs) {
        const si = satellites[i];
        const sj = satellites[j];
        si.collided = sj.collided = true;
        si.collisionTime = sj.collisionTime = now;

        // 法線方向の相対速度。既に離れつつあれば（vn >= 0）何もしない
        const vn = (si.vx - sj.vx) * normal.x + (si.vy - sj.vy) * normal.y + (si.vz - sj.vz) * normal.z;
        if (vn >= 0) continue;

        const impulse = (-2 * vn) / (1 / si.mass + 1 / sj.mass);
        si.vx += (impulse * normal.x) / si.mass;
        si.vy += (impulse * normal.y) / si.mass;
        si.vz += (impulse * normal.z) / si.mass;
        sj.vx -= (impulse * normal.x) / sj.mass;
        sj.vy -= (impulse * normal.y) / sj.mass;
        sj.vz -= (impulse * normal.z) / sj.mass;
    }
}
