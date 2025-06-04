import * as THREE from 'three';

export interface SatelliteData {
    x0: number;
    y0: number;
    z0: number;
    vx0: number;
    vy0: number;
    vz0: number;
    color: string;
    trail: THREE.Vector3[];
    trailLine: THREE.Line | null;
}

export class Satellite {
    // 初期位置・速度
    x0: number;
    y0: number;
    z0: number;
    vx0: number;
    vy0: number;
    vz0: number;
    
    // 現在の状態（数値積分用）
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    
    color: string;
    trail: THREE.Vector3[];
    trailLine: THREE.Line | null;
    trailGeometry: THREE.BufferGeometry | null;
    trailMaterial: THREE.LineBasicMaterial | null;
    frameCounter: number;  // 軌跡更新の間引き用
    
    constructor(x0: number, y0: number, z0: number, vx0: number, vy0: number, vz0: number, color: string) {
        this.x0 = x0;
        this.y0 = y0;
        this.z0 = z0;
        this.vx0 = vx0;
        this.vy0 = vy0;
        this.vz0 = vz0;
        
        // 現在の状態を初期化
        this.x = x0;
        this.y = y0;
        this.z = z0;
        this.vx = vx0;
        this.vy = vy0;
        this.vz = vz0;
        
        this.color = color;
        this.trail = [];
        this.trailLine = null;
        this.trailGeometry = null;
        this.trailMaterial = null;
        this.frameCounter = 0;
    }
    
    getPosition(): { x: number; y: number; z: number } {
        // 数値積分による現在位置を返す
        return { x: this.x, y: this.y, z: this.z };
    }
    
    getVelocity(): { vx: number; vy: number; vz: number } {
        // 現在の速度を返す
        return { vx: this.vx, vy: this.vy, vz: this.vz };
    }
    
    reset() {
        // 初期状態にリセット
        this.x = this.x0;
        this.y = this.y0;
        this.z = this.z0;
        this.vx = this.vx0;
        this.vy = this.vy0;
        this.vz = this.vz0;
        this.trail = [];
        this.frameCounter = 0;
        
        // THREE.jsオブジェクトの適切な解放
        if (this.trailGeometry) {
            this.trailGeometry.dispose();
            this.trailGeometry = null;
        }
        if (this.trailMaterial) {
            this.trailMaterial.dispose();
            this.trailMaterial = null;
        }
        this.trailLine = null;
    }
    
    dispose() {
        // メモリ解放用
        if (this.trailGeometry) {
            this.trailGeometry.dispose();
        }
        if (this.trailMaterial) {
            this.trailMaterial.dispose();
        }
    }
}