import type { Satellite } from '../simulation/Satellite.js';
import type { CollisionPair } from './CollisionTypes.js';

/**
 * 衝突検出クラス（総当たり法）
 * 少数（<1,000個）の衛星に最適化
 */
export class CollisionDetector {
    private enabled: boolean = false;
    private collisionRadius: number = 1.0; // 衛星の半径（メートル単位）

    /**
     * @param collisionRadius 衛星の半径（メートル単位）
     */
    constructor(collisionRadius: number) {
        this.collisionRadius = collisionRadius;
    }

    /**
     * 衝突検出を有効化
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * 衝突検出が有効かどうか
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * 衝突半径を設定
     * @param radius 衛星の半径（メートル単位）
     */
    setCollisionRadius(radius: number): void {
        this.collisionRadius = radius;
    }

    /**
     * 衝突半径を取得
     */
    getCollisionRadius(): number {
        return this.collisionRadius;
    }

    /**
     * 総当たり法による衝突検出
     * 時間計算量: O(n^2)
     *
     * @param satellites 衛星配列
     * @returns 検出された衝突ペアの配列
     */
    private detectBruteForce(satellites: Satellite[]): CollisionPair[] {
        const pairs: CollisionPair[] = [];
        const n = satellites.length;
        const threshold = this.collisionRadius * 2; // 2つの衛星の半径の和

        // 基準衛星（インデックス0）は除外し、i=1から開始
        for (let i = 1; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const si = satellites[i];
                const sj = satellites[j];

                // 距離計算
                const dx = si.x - sj.x;
                const dy = si.y - sj.y;
                const dz = si.z - sj.z;

                // 早期リターン最適化（AABB的な事前判定）
                if (Math.abs(dx) > threshold) continue;
                if (Math.abs(dy) > threshold) continue;
                if (Math.abs(dz) > threshold) continue;

                const distSquared = dx * dx + dy * dy + dz * dz;
                const thresholdSquared = threshold * threshold;

                if (distSquared < thresholdSquared) {
                    const dist = Math.sqrt(distSquared);

                    // 完全に重なっている場合の処理（ゼロ除算回避）
                    const normal = dist > 1e-6 ? {
                        x: dx / dist,
                        y: dy / dist,
                        z: dz / dist
                    } : {
                        x: 1,
                        y: 0,
                        z: 0
                    };

                    pairs.push({
                        i,
                        j,
                        distance: dist,
                        normal
                    });
                }
            }
        }

        return pairs;
    }

    /**
     * 衝突検出の実行
     *
     * @param satellites 衛星配列
     * @returns 検出された衝突ペアの配列（無効時は空配列）
     */
    detect(satellites: Satellite[]): CollisionPair[] {
        if (!this.enabled) {
            return [];
        }

        return this.detectBruteForce(satellites);
    }
}
