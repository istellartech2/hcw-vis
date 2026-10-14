import * as THREE from 'three';
import { describe, it, expect } from 'vite-plus/test';
import { Satellite } from '../simulation/Satellite.js';
import {
    COLLISION_FLASH_MS,
    consumeCollisionFlash,
    setAttitudeFromRsw,
    setHillPosition,
    setHillRotation,
    setSatelliteAttitude,
} from './satelliteFrame.js';

function expectQuatClose(a: THREE.Quaternion, b: THREE.Quaternion): void {
    expect(a.x).toBeCloseTo(b.x, 12);
    expect(a.y).toBeCloseTo(b.y, 12);
    expect(a.z).toBeCloseTo(b.z, 12);
    expect(a.w).toBeCloseTo(b.w, 12);
}

describe('setHillPosition', () => {
    it('maps Hill (R, S, W) to Three.js (X=W, Y=R, Z=S)', () => {
        const v = setHillPosition(new THREE.Vector3(), { x: 1, y: 2, z: 3 });
        expect(v.toArray()).toEqual([3, 1, 2]);
    });
});

describe('setAttitudeFromRsw', () => {
    it('maps RSW quaternion axes to Three.js axes', () => {
        const q = setAttitudeFromRsw(new THREE.Quaternion(), { w: 0.1, x: 0.2, y: 0.3, z: 0.4 });
        expect([q.x, q.y, q.z, q.w]).toEqual([0.4, 0.2, 0.3, 0.1]);
    });

    it('rotates a body R axis the same way the RSW quaternion does', () => {
        // RSW で W 軸まわり 90°: R 軸 → S 軸
        const half = Math.SQRT1_2;
        const q = setAttitudeFromRsw(new THREE.Quaternion(), { w: half, x: 0, y: 0, z: half });
        const r = setHillPosition(new THREE.Vector3(), { x: 1, y: 0, z: 0 }).applyQuaternion(q);
        const s = setHillPosition(new THREE.Vector3(), { x: 0, y: 1, z: 0 });
        expect(r.distanceTo(s)).toBeLessThan(1e-12);
    });
});

describe('setHillRotation', () => {
    const cases: [number, number][] = [
        [0, 0],
        [0.3, 0],
        [0, -1.2],
        [0.7, 1.9],
        [Math.PI, Math.PI / 4],
    ];

    it.each(cases)('matches rotateOnAxis(R) then rotateOnAxis(S) for (%f, %f)', (rotR, rotS) => {
        const obj = new THREE.Object3D();
        obj.rotation.set(0, 0, 0);
        obj.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotR);
        obj.rotateOnAxis(new THREE.Vector3(0, 0, 1), rotS);
        expectQuatClose(setHillRotation(new THREE.Quaternion(), rotR, rotS), obj.quaternion);
    });

    it.each(cases)('matches the RotY * RotZ matrix composition for (%f, %f)', (rotR, rotS) => {
        const m = new THREE.Matrix4()
            .multiply(new THREE.Matrix4().makeRotationY(rotR))
            .multiply(new THREE.Matrix4().makeRotationZ(rotS));
        const expected = new THREE.Quaternion().setFromRotationMatrix(m);
        expectQuatClose(setHillRotation(new THREE.Quaternion(), rotR, rotS), expected);
    });

    it('keeps Object3D.rotation in sync when written to its quaternion', () => {
        const obj = new THREE.Object3D();
        setHillRotation(obj.quaternion, 0.4, 0);
        expect(obj.rotation.y).toBeCloseTo(0.4, 12);
    });
});

describe('setSatelliteAttitude', () => {
    it('prefers the CSV quaternion over the R/S rotation', () => {
        const sat = new Satellite(0, 0, 0, 0, 0, 0, '#ffffff');
        sat.quaternion = { w: 1, x: 0, y: 0, z: 0 };
        const q = setSatelliteAttitude(new THREE.Quaternion(), sat, 1, 1);
        expect([q.x, q.y, q.z, q.w]).toEqual([0, 0, 0, 1]);
    });

    it('falls back to the R/S rotation without a quaternion', () => {
        const sat = new Satellite(0, 0, 0, 0, 0, 0, '#ffffff');
        const q = setSatelliteAttitude(new THREE.Quaternion(), sat, 0.5, 0.2);
        expectQuatClose(q, setHillRotation(new THREE.Quaternion(), 0.5, 0.2));
    });
});

describe('consumeCollisionFlash', () => {
    it('is false when the satellite has not collided', () => {
        const sat = new Satellite(0, 0, 0, 0, 0, 0, '#ffffff');
        expect(consumeCollisionFlash(sat, 1000)).toBe(false);
    });

    it('flashes within the window and clears the flag afterwards', () => {
        const sat = new Satellite(0, 0, 0, 0, 0, 0, '#ffffff');
        sat.collided = true;
        sat.collisionTime = 10_000;

        expect(consumeCollisionFlash(sat, 10_000 + COLLISION_FLASH_MS - 1)).toBe(true);
        expect(sat.collided).toBe(true);

        expect(consumeCollisionFlash(sat, 10_000 + COLLISION_FLASH_MS)).toBe(false);
        expect(sat.collided).toBe(false);
        expect(consumeCollisionFlash(sat, 10_000)).toBe(false);
    });
});
