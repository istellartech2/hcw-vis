import * as THREE from 'three';
import { Satellite } from '../simulation/Satellite.js';

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
        trailMax: number
    ): void {
        // 軌跡を5フレームに1回だけ更新（メモリと計算負荷軽減）
        sat.frameCounter++;
        if (sat.frameCounter % 5 === 0) {
            // 軌跡も座標変換を適用
            if (sat.trail.length === 0 || sat.frameCounter % 10 === 0) {
                // 10フレームに1回だけVector3を新規作成
                // position.x = R (Radial), position.y = S (Along-track), position.z = W (Cross-track)
                // Three.js: X = W (Cross-track), Y = R (Radial), Z = S (Along-track)
                sat.trail.push(new THREE.Vector3(
                    position.z * scale, 
                    position.x * scale, 
                    position.y * scale
                ));
                if (sat.trail.length > trailMax) {
                    sat.trail.shift();
                }
            }
            
            if (sat.trail.length > 1) {
                // 初回のみgeometry/materialを作成、以降は使い回し
                if (!sat.trailGeometry) {
                    sat.trailGeometry = new THREE.BufferGeometry();
                    sat.trailMaterial = new THREE.LineBasicMaterial({ 
                        color: color,
                        opacity: 0.5,
                        transparent: true
                    });
                    sat.trailLine = new THREE.Line(sat.trailGeometry, sat.trailMaterial);
                    this.scene.add(sat.trailLine);
                }
                
                // 頂点データのみ更新（新規オブジェクト作成なし）
                sat.trailGeometry.setFromPoints(sat.trail);
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