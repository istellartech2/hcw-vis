import * as THREE from 'three';
import type { Satellite } from '../simulation/Satellite.js';
import { SATELLITE_PALETTE, type DisplaySettings } from '@/store/settings';

/**
 * 衛星メッシュの生成（形状ごと）と、マテリアル・破棄の共通処理。
 */

type BoxRatios = { x: number; y: number; z: number };

/** 1 機の見た目。フォーメーションのメタデータがあればそれを、なければ表示設定を使う */
export interface SatelliteAppearance {
    shape: string;
    size: number;
    boxRatios: BoxRatios;
}

/** 基準衛星（index 0）の色 */
export const REFERENCE_COLOR = 0xffffff;
/** 通常時の発光強度（基準衛星・一般衛星共通） */
export const BASE_EMISSIVE_INTENSITY = 0.08;
/** 選択中・衝突フラッシュ中の発光強度 */
export const SELECTED_EMISSIVE_INTENSITY = 0.7;

const UNIT_BOX: BoxRatios = { x: 1, y: 1, z: 1 };

function parseHexColor(color: string): number {
    return parseInt(color.replace('#', ''), 16);
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
    if (display.uniformSatelliteColor) return parseHexColor(display.satelliteColor);
    return parseHexColor(SATELLITE_PALETTE[(index - 1) % SATELLITE_PALETTE.length]);
}

/**
 * 形状に応じたジオメトリ。size はどの形状でも「差し渡しの長さ」（球は直径、立方体は一辺）なので、
 * 同じ値なら同じ大きさに見える。直方体は一辺 size の立方体を各軸の比率で伸縮する。
 * 未知の形状（保存形式に残る '3dfile' など）は球になる。
 */
function createGeometry({ shape, size, boxRatios }: SatelliteAppearance): THREE.BufferGeometry {
    switch (shape) {
        case 'cube':
            return new THREE.BoxGeometry(size, size, size);
        case 'box':
            return new THREE.BoxGeometry(size * boxRatios.x, size * boxRatios.y, size * boxRatios.z);
        default:
            return new THREE.SphereGeometry(size / 2, 32, 32);
    }
}

/** 衛星メッシュ。マテリアルは少し艶のあるサテン調で、発光は選択ハイライト用に弱く残す */
export function createSatelliteMesh(
    appearance: SatelliteAppearance,
    color: number,
): THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
    const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: BASE_EMISSIVE_INTENSITY,
        roughness: 0.4,
        metalness: 0.1,
    });
    return new THREE.Mesh(createGeometry(appearance), material);
}

/** object とその子孫のジオメトリ・マテリアルをすべて破棄する（テクスチャは対象外） */
export function disposeObject3D(object: THREE.Object3D): void {
    object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
    });
}
