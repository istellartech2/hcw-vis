import * as THREE from 'three';
import { Satellite } from '../simulation/Satellite.js';

/** 軌跡の先端（最新点）の不透明度 */
const TRAIL_OPACITY = 0.7;

export class TrailRenderer {
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    updateTrail(
        sat: Satellite,
        position: { x: number; y: number; z: number },
        scale: number,
        color: THREE.Color,
        trailMax: number,
    ): void {
        // 軌跡を5フレームに1回だけ更新（メモリと計算負荷軽減）
        sat.frameCounter++;
        if (sat.frameCounter % 5 === 0) {
            // 軌跡も座標変換を適用
            if (sat.trail.length === 0 || sat.frameCounter % 10 === 0) {
                // 10フレームに1回だけVector3を新規作成
                // position.x = R (Radial), position.y = S (Along-track), position.z = W (Cross-track)
                // Three.js: X = W (Cross-track), Y = R (Radial), Z = S (Along-track)
                sat.trail.push(new THREE.Vector3(position.z * scale, position.x * scale, position.y * scale));
                if (sat.trail.length > trailMax) {
                    sat.trail.shift();
                }
            }

            if (sat.trail.length > 1) {
                // 初回のみgeometry/materialを作成、以降は使い回し
                if (!sat.trailGeometry) {
                    sat.trailGeometry = new THREE.BufferGeometry();
                    sat.trailMaterial = new THREE.LineBasicMaterial({
                        vertexColors: true,
                        transparent: true,
                        depthWrite: false,
                    });
                    sat.trailLine = new THREE.Line(sat.trailGeometry, sat.trailMaterial);
                    this.scene.add(sat.trailLine);
                }

                // 古い点ほど透明にして、衛星の後ろへ尾を引くように見せる
                sat.trailGeometry.setFromPoints(sat.trail);
                const count = sat.trail.length;
                const colors = new Float32Array(count * 4);
                for (let i = 0; i < count; i++) {
                    const t = i / (count - 1);
                    colors.set([color.r, color.g, color.b, TRAIL_OPACITY * t * t], i * 4);
                }
                sat.trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
            }
        }
    }

    clearTrail(sat: Satellite): void {
        if (sat.trailLine) {
            this.scene.remove(sat.trailLine);
            sat.trailLine = null;
        }
        if (sat.trailGeometry) {
            sat.trailGeometry.dispose();
            sat.trailGeometry = null;
        }
        if (sat.trailMaterial) {
            sat.trailMaterial.dispose();
            sat.trailMaterial = null;
        }
        sat.trail = [];
        sat.frameCounter = 0;
    }
}
