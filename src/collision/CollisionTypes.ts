/**
 * 衝突ペアの情報
 */
export interface CollisionPair {
    /** 衛星1のインデックス */
    i: number;
    /** 衛星2のインデックス */
    j: number;
    /** 衝突時の距離 (m) */
    distance: number;
    /** 衝突方向の単位法線ベクトル (i -> j 方向) */
    normal: {
        x: number;
        y: number;
        z: number;
    };
}

/**
 * 衝突検出設定
 */
export interface CollisionDetectionSettings {
    /** 衝突検出の有効/無効 */
    enabled: boolean;
    /** 衝突判定の半径 (m) */
    collisionRadius: number;
}
