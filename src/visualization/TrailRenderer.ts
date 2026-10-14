import * as THREE from 'three';
import type { Satellite } from '../simulation/Satellite.js';
import { setHillPosition } from './satelliteFrame.js';

/** 軌跡の先端（最新点）の不透明度 */
const TRAIL_OPACITY = 0.7;
/** 何フレームごとに軌跡へ点を追加するか */
const TRAIL_INTERVAL_FRAMES = 10;

interface Trail {
    points: THREE.Vector3[];
    line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null;
    frame: number;
}

/** 衛星ごとの軌跡（古い点ほど透明な線）。状態は衛星をキーに保持する */
export class TrailRenderer {
    private scene: THREE.Scene;
    private trails = new Map<Satellite, Trail>();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    updateTrail(sat: Satellite, position: { x: number; y: number; z: number }, color: THREE.Color, max: number): void {
        let trail = this.trails.get(sat);
        if (!trail) {
            trail = { points: [], line: null, frame: 0 };
            this.trails.set(sat, trail);
        }
        if (trail.frame++ % TRAIL_INTERVAL_FRAMES !== 0) return;

        trail.points.push(setHillPosition(new THREE.Vector3(), position));
        // 長さの設定を短くしたときも、すぐ新しい長さに縮める
        if (trail.points.length > max) trail.points.splice(0, trail.points.length - max);
        if (trail.points.length < 2) return;

        if (!trail.line) {
            trail.line = new THREE.Line(
                new THREE.BufferGeometry(),
                new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }),
            );
            this.scene.add(trail.line);
        }

        // 古い点ほど透明にして、衛星の後ろへ尾を引くように見せる
        const count = trail.points.length;
        const colors = new Float32Array(count * 4);
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            colors[i * 4] = color.r;
            colors[i * 4 + 1] = color.g;
            colors[i * 4 + 2] = color.b;
            colors[i * 4 + 3] = TRAIL_OPACITY * t * t;
        }
        // 属性を差し替える前に破棄して、古い GPU バッファを解放する
        const geometry = trail.line.geometry;
        geometry.dispose();
        geometry.setFromPoints(trail.points);
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    }

    clearTrail(sat: Satellite): void {
        const line = this.trails.get(sat)?.line;
        if (line) {
            this.scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        }
        this.trails.delete(sat);
    }
}
