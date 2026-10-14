import * as THREE from 'three';
import type { AttitudeQuaternion, Satellite } from '../simulation/Satellite.js';

/**
 * 衛星 1 機ぶんの毎フレーム更新（位置・姿勢・衝突フラッシュ）。
 * InstancedMesh 方式と個別メッシュ方式の両方から使う。結果は target に書き込み、毎フレームの確保を避ける。
 */

/** 衝突時に赤く光らせる時間 [ms] */
export const COLLISION_FLASH_MS = 500;

const AXIS_R = new THREE.Vector3(0, 1, 0); // Hill R 軸 → Three.js Y
const AXIS_S = new THREE.Vector3(0, 0, 1); // Hill S 軸 → Three.js Z
const tempQuaternion = new THREE.Quaternion();

/** Hill 座標 (R, S, W) → Three.js 座標 (X=W, Y=R, Z=S) */
export function setHillPosition(
    target: THREE.Vector3,
    pos: { x: number; y: number; z: number },
    scale = 1,
): THREE.Vector3 {
    return target.set(pos.z * scale, pos.x * scale, pos.y * scale);
}

/** CSV の姿勢クォータニオン（機体 → RSW）を Three.js 座標系へ: RSW(x,y,z) → Three.js(z,x,y) */
export function setAttitudeFromRsw(target: THREE.Quaternion, q: AttitudeQuaternion): THREE.Quaternion {
    return target.set(q.z, q.x, q.y, q.w);
}

/** R 軸まわり → S 軸まわりの順に回転（ラジアン）。rotateOnAxis(R)・rotateOnAxis(S) と同じ結果 */
export function setHillRotation(target: THREE.Quaternion, rotR: number, rotS: number): THREE.Quaternion {
    return target.setFromAxisAngle(AXIS_R, rotR).multiply(tempQuaternion.setFromAxisAngle(AXIS_S, rotS));
}

/** CSV 姿勢があればそれを、なければ R/S 回転を target に設定する */
export function setSatelliteAttitude(
    target: THREE.Quaternion,
    sat: Satellite,
    rotR: number,
    rotS: number,
): THREE.Quaternion {
    return sat.quaternion ? setAttitudeFromRsw(target, sat.quaternion) : setHillRotation(target, rotR, rotS);
}

/**
 * 衝突フラッシュ中なら true。表示時間を過ぎていれば sat.collided を下ろす。
 */
export function consumeCollisionFlash(sat: Satellite, now: number = Date.now()): boolean {
    if (!sat.collided || !sat.collisionTime) return false;
    if (now - sat.collisionTime < COLLISION_FLASH_MS) return true;
    sat.collided = false;
    return false;
}
