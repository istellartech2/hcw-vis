import * as THREE from 'three';
import { describe, it, expect } from 'vite-plus/test';
import { Satellite } from '../simulation/Satellite.js';
import { DEFAULT_DISPLAY_SETTINGS } from '@/store/settings';
import {
    createSatelliteMesh,
    resolveAppearance,
    resolveSatelliteColor,
    type SatelliteAppearance,
} from './satelliteMeshFactory.js';

function boundingSize(object: THREE.Object3D): number[] {
    return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()).toArray();
}

const appearance = (shape: string, boxRatios = { x: 1, y: 1, z: 1 }): SatelliteAppearance => ({
    shape,
    size: 0.5,
    boxRatios,
});

describe('createSatelliteMesh', () => {
    it('builds a cube with side = size, as wide as a sphere of the same size', () => {
        expect(boundingSize(createSatelliteMesh(appearance('cube'), 0xff0000))).toEqual([0.5, 0.5, 0.5]);
    });

    it('builds a box scaled by its ratios', () => {
        const box = createSatelliteMesh(appearance('box', { x: 1, y: 2, z: 3 }), 0xff0000);
        expect(boundingSize(box)).toEqual([0.5, 1, 1.5]);
    });

    it('builds a sphere with diameter = size', () => {
        const [x] = boundingSize(createSatelliteMesh(appearance('sphere'), 0xff0000));
        expect(x).toBeCloseTo(0.5, 6);
    });

    it('falls back to a sphere for unknown shapes such as 3dfile', () => {
        expect(createSatelliteMesh(appearance('3dfile'), 0xff0000).geometry).toBeInstanceOf(THREE.SphereGeometry);
    });

    it('uses the color for both the base and the emissive color', () => {
        const { material } = createSatelliteMesh(appearance('sphere'), 0x00ff00);
        expect(material.color.getHex()).toBe(0x00ff00);
        expect(material.emissive.getHex()).toBe(0x00ff00);
    });
});

describe('appearance and color resolution', () => {
    it('uses formation metadata over display settings', () => {
        const sat = new Satellite(0, 0, 0, 0, 0, 0, '#ffffff');
        sat.metadata = {
            shape: 'box',
            size: 2,
            color: '#123456',
            boxRatios: { x: 1, y: 2, z: 3 },
        };
        expect(resolveAppearance(sat, DEFAULT_DISPLAY_SETTINGS)).toEqual({
            shape: 'box',
            size: 2,
            boxRatios: { x: 1, y: 2, z: 3 },
        });
        expect(resolveSatelliteColor(sat, 1, DEFAULT_DISPLAY_SETTINGS)).toBe(0x123456);
    });

    it('uses the palette or the uniform color without metadata', () => {
        const sat = new Satellite(0, 0, 0, 0, 0, 0, '#ffffff');
        const palette = { ...DEFAULT_DISPLAY_SETTINGS, uniformSatelliteColor: false };
        // パレットは 8 色で循環する（index 1 と 9 は同じ色）
        expect(resolveSatelliteColor(sat, 1, palette)).toBe(0xff6b6b);
        expect(resolveSatelliteColor(sat, 9, palette)).toBe(0xff6b6b);

        const uniform = { ...DEFAULT_DISPLAY_SETTINGS, uniformSatelliteColor: true, satelliteColor: '#abcdef' };
        expect(resolveSatelliteColor(sat, 3, uniform)).toBe(0xabcdef);
    });
});
