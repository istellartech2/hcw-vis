import * as THREE from 'three';
import { describe, it, expect } from 'vite-plus/test';
import { Satellite } from '../simulation/Satellite.js';
import { DEFAULT_DISPLAY_SETTINGS } from '@/store/settings';
import {
    createSatelliteObject,
    displayColor,
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

describe('createSatelliteObject', () => {
    it('builds a cube with side 2 * size', () => {
        expect(boundingSize(createSatelliteObject(appearance('cube'), 0xff0000, 0.2, null))).toEqual([1, 1, 1]);
    });

    it('builds a box scaled by its ratios', () => {
        const box = createSatelliteObject(appearance('box', { x: 1, y: 2, z: 3 }), 0xff0000, 0.2, null);
        expect(boundingSize(box)).toEqual([1, 2, 3]);
    });

    it('builds a sphere with diameter = size', () => {
        const [x] = boundingSize(createSatelliteObject(appearance('sphere'), 0xff0000, 0.2, null));
        expect(x).toBeCloseTo(0.5, 6);
    });

    it('falls back to a sphere when no 3D model is loaded', () => {
        const mesh = createSatelliteObject(appearance('3dfile'), 0xff0000, 0.2, null) as THREE.Mesh;
        expect(mesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
    });

    it('clones a loaded model with a colored material and scale', () => {
        const model = new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
        const object = createSatelliteObject(appearance('3dfile'), 0x00ff00, 0.2, model);
        expect(object).not.toBe(model);
        expect(object.scale.x).toBe(0.5);
        const material = (object.children[0] as THREE.Mesh).material as THREE.MeshPhongMaterial;
        expect(material.color.getHex()).toBe(0x00ff00);
        expect(material.emissiveIntensity).toBe(0.2);
    });
});

describe('appearance and color resolution', () => {
    it('uses formation metadata over display settings', () => {
        const sat = new Satellite(0, 0, 0, 0, 0, 0, '#ffffff');
        sat.metadata = {
            layerId: 'l',
            layerName: 'L',
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
        expect(resolveSatelliteColor(sat, 1, palette)).toBe(displayColor(palette, 0));
        expect(resolveSatelliteColor(sat, 9, palette)).toBe(displayColor(palette, 0));

        const uniform = { ...DEFAULT_DISPLAY_SETTINGS, uniformSatelliteColor: true, satelliteColor: '#abcdef' };
        expect(resolveSatelliteColor(sat, 3, uniform)).toBe(0xabcdef);
    });
});
