import * as THREE from 'three';
import type { Satellite } from '../simulation/Satellite.js';
import { SATELLITE_PALETTE, type DisplaySettings } from '@/store/settings';

/**
 * 個別メッシュ方式の衛星メッシュ生成（形状ごと）と、マテリアル・破棄の共通処理。
 */

export type SatelliteObject = THREE.Mesh | THREE.Group;

type BoxRatios = { x: number; y: number; z: number };

/** 1 機の見た目。フォーメーションのメタデータがあればそれを、なければ表示設定を使う */
export interface SatelliteAppearance {
    shape: string;
    size: number;
    boxRatios: BoxRatios;
}

/** 基準衛星（index 0）の色と発光強度 */
export const REFERENCE_COLOR = 0xffffff;
export const REFERENCE_EMISSIVE_INTENSITY = 0.3;
export const SATELLITE_EMISSIVE_INTENSITY = 0.2;

const UNIT_BOX: BoxRatios = { x: 1, y: 1, z: 1 };

export function parseHexColor(color: string): number {
    return parseInt(color.replace('#', ''), 16);
}

/** パレットの k 番目の色（循環） */
export function paletteColor(k: number): number {
    return parseHexColor(SATELLITE_PALETTE[k % SATELLITE_PALETTE.length]);
}

/** 統一色モードなら指定色、そうでなければパレットの k 番目 */
export function displayColor(display: DisplaySettings, k: number): number {
    return display.uniformSatelliteColor ? parseHexColor(display.satelliteColor) : paletteColor(k);
}

export function resolveAppearance(sat: Satellite, display: DisplaySettings): SatelliteAppearance {
    const metadata = sat.metadata;
    return {
        shape: metadata?.shape || display.satelliteShape,
        size: metadata?.size || display.satelliteSize,
        boxRatios: metadata?.boxRatios || UNIT_BOX,
    };
}

/** 一般衛星（index >= 1）の色: メタデータ → 統一色 → パレット */
export function resolveSatelliteColor(sat: Satellite, index: number, display: DisplaySettings): number {
    if (sat.metadata?.color) return parseHexColor(sat.metadata.color);
    return displayColor(display, index - 1);
}

export function createPhongMaterial(color: number, emissiveIntensity: number): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity });
}

/** 立方体: size は半辺長 */
export function createCubeGeometry(size: number): THREE.BufferGeometry {
    return new THREE.BoxGeometry(size * 2, size * 2, size * 2);
}

/** 直方体: 立方体を各軸の比率で伸縮 */
export function createBoxGeometry(size: number, ratios: BoxRatios): THREE.BufferGeometry {
    return new THREE.BoxGeometry(size * 2 * ratios.x, size * 2 * ratios.y, size * 2 * ratios.z);
}

/** 球: size は直径 */
export function createSphereGeometry(size: number): THREE.BufferGeometry {
    return new THREE.SphereGeometry(size / 2, 32, 32);
}

export function createPrimitiveGeometry(appearance: SatelliteAppearance): THREE.BufferGeometry {
    switch (appearance.shape) {
        case 'cube':
            return createCubeGeometry(appearance.size);
        case 'box':
            return createBoxGeometry(appearance.size, appearance.boxRatios);
        default:
            return createSphereGeometry(appearance.size);
    }
}

/** 読み込み済み 3D モデルを複製し、全メッシュに単色マテリアルを割り当てる */
export function createModelObject(
    model: SatelliteObject,
    size: number,
    color: number,
    emissiveIntensity: number,
): SatelliteObject {
    const object = model.clone();
    object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).material = createPhongMaterial(color, emissiveIntensity);
        }
    });
    object.scale.setScalar(size);
    return object;
}

/** 形状に応じて衛星メッシュを作る。'3dfile' でモデル未読み込みなら球になる */
export function createSatelliteObject(
    appearance: SatelliteAppearance,
    color: number,
    emissiveIntensity: number,
    loadedModel: SatelliteObject | null,
): SatelliteObject {
    if (appearance.shape === '3dfile' && loadedModel) {
        return createModelObject(loadedModel, appearance.size, color, emissiveIntensity);
    }
    return new THREE.Mesh(createPrimitiveGeometry(appearance), createPhongMaterial(color, emissiveIntensity));
}

/** object 自身とその子孫の全メッシュのマテリアルに fn を適用（Mesh 単体・Group どちらも可） */
export function forEachMaterial(object: THREE.Object3D, fn: (material: THREE.Material) => void): void {
    object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(fn);
        } else {
            fn(mesh.material);
        }
    });
}

/** Phong 系（emissive を持つ）マテリアルにだけ fn を適用 */
export function forEachPhongMaterial(object: THREE.Object3D, fn: (material: THREE.MeshPhongMaterial) => void): void {
    object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        const material = mesh.material as THREE.MeshPhongMaterial;
        if (material.emissiveIntensity !== undefined) fn(material);
    });
}

export function disposeSatelliteObject(object: THREE.Object3D): void {
    object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
    });
    forEachMaterial(object, (material) => material.dispose());
}
