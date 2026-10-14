/** フォーメーション生成時に付与される見た目の情報 */
export interface SatelliteMetadata {
    shape: string;
    size: number;
    color: string;
    boxRatios?: { x: number; y: number; z: number };
    rotation?: { r: number; s: number };
}

/** 機体座標系 → RSW 座標系の回転（CSV 再生の 6DOF データ） */
export interface AttitudeQuaternion {
    w: number;
    x: number;
    y: number;
    z: number;
}

/** Hill 座標系での 1 機の状態（位置 m・速度 m/s）と表示用の付帯情報 */
export class Satellite {
    /** フォーメーション由来の衛星のみ持つ */
    metadata: SatelliteMetadata | null = null;
    /** CSV 再生時の姿勢 */
    quaternion: AttitudeQuaternion | null = null;
    /** 衝突の視覚フィードバック用 */
    collided = false;
    collisionTime: number | null = null;

    constructor(
        public x: number,
        public y: number,
        public z: number,
        public vx: number,
        public vy: number,
        public vz: number,
        public color: string,
        public mass = 1.0,
    ) {}

    getPosition(): { x: number; y: number; z: number } {
        return { x: this.x, y: this.y, z: this.z };
    }

    getVelocity(): { x: number; y: number; z: number } {
        return { x: this.vx, y: this.vy, z: this.vz };
    }
}
