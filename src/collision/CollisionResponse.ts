import type { Satellite } from '../simulation/Satellite.js';
import type { CollisionPair } from './CollisionTypes.js';

/**
 * 衝突応答クラス（完全弾性衝突）
 */
export class CollisionResponse {
    /**
     * 完全弾性衝突の応答を適用
     * 運動量保存則とエネルギー保存則に基づく速度更新
     *
     * @param satellites 衛星配列
     * @param pairs 衝突ペア配列
     */
    applyResponse(satellites: Satellite[], pairs: CollisionPair[]): void {
        for (const pair of pairs) {
            this.applyElasticCollision(satellites[pair.i], satellites[pair.j], pair.normal);

            // Mark satellites as collided for visual feedback
            (satellites[pair.i] as any).collided = true;
            (satellites[pair.j] as any).collided = true;
            (satellites[pair.i] as any).collisionTime = Date.now();
            (satellites[pair.j] as any).collisionTime = Date.now();
        }
    }

    /**
     * 完全弾性衝突の物理計算と速度更新
     *
     * 物理モデル:
     * - 反発係数 e = 1.0 (完全弾性)
     * - 各衛星の質量を考慮
     * - 運動量とエネルギーを保存
     *
     * @param si 衛星1
     * @param sj 衛星2
     * @param normal 衝突方向の単位法線ベクトル (i -> j 方向)
     */
    private applyElasticCollision(si: Satellite, sj: Satellite, normal: { x: number; y: number; z: number }): void {
        const m1 = si.mass;
        const m2 = sj.mass;

        // 相対速度
        const dvx = si.vx - sj.vx;
        const dvy = si.vy - sj.vy;
        const dvz = si.vz - sj.vz;

        // 法線方向の相対速度成分
        const vn = dvx * normal.x + dvy * normal.y + dvz * normal.z;

        // 既に離れている場合はスキップ（vn >= 0の場合）
        if (vn >= 0) {
            return;
        }

        // 完全弾性衝突のインパルス (反発係数 e = 1.0)
        // j = -(1 + e) * vn / (1/m1 + 1/m2)
        const restitution = 1.0; // 完全弾性
        const impulse = (-(1 + restitution) * vn) / (1 / m1 + 1 / m2);

        // 速度更新
        // v1' = v1 + (j * n) / m1
        // v2' = v2 - (j * n) / m2
        si.vx += (impulse * normal.x) / m1;
        si.vy += (impulse * normal.y) / m1;
        si.vz += (impulse * normal.z) / m1;

        sj.vx -= (impulse * normal.x) / m2;
        sj.vy -= (impulse * normal.y) / m2;
        sj.vz -= (impulse * normal.z) / m2;
    }
}
