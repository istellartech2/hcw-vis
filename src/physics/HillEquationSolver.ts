import { Satellite } from '../models/Satellite.js';

export interface HillState {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
}

export interface HillDerivatives {
    dx: number;
    dy: number;
    dz: number;
    dvx: number;
    dvy: number;
    dvz: number;
}

export class HillEquationSolver {
    private n: number; // 平均運動（軌道角速度）
    
    constructor(n: number) {
        this.n = n;
    }
    
    updateMeanMotion(n: number): void {
        this.n = n;
    }
    
    // Hill方程式の微分方程式（右辺）
    computeDerivatives(state: HillState): HillDerivatives {
        const { x, y, z, vx, vy, vz } = state;
        const n = this.n;
        
        // Hill方程式の加速度項
        // ẍ = 2nẏ + 3n²x
        // ÿ = -2nẋ
        // z̈ = -n²z
        const ax = 2 * n * vy + 3 * n * n * x;
        const ay = -2 * n * vx;
        const az = -n * n * z;
        
        return {
            dx: vx,
            dy: vy,
            dz: vz,
            dvx: ax,
            dvy: ay,
            dvz: az
        };
    }
    
    // 4次ルンゲクッタ法による数値積分
    rungeKutta4Step(sat: Satellite, dt: number): void {
        // 現在の状態
        const state0: HillState = {
            x: sat.x,
            y: sat.y,
            z: sat.z,
            vx: sat.vx,
            vy: sat.vy,
            vz: sat.vz
        };
        
        // k1
        const k1 = this.computeDerivatives(state0);
        
        // k2
        const state1: HillState = {
            x: state0.x + 0.5 * dt * k1.dx,
            y: state0.y + 0.5 * dt * k1.dy,
            z: state0.z + 0.5 * dt * k1.dz,
            vx: state0.vx + 0.5 * dt * k1.dvx,
            vy: state0.vy + 0.5 * dt * k1.dvy,
            vz: state0.vz + 0.5 * dt * k1.dvz
        };
        const k2 = this.computeDerivatives(state1);
        
        // k3
        const state2: HillState = {
            x: state0.x + 0.5 * dt * k2.dx,
            y: state0.y + 0.5 * dt * k2.dy,
            z: state0.z + 0.5 * dt * k2.dz,
            vx: state0.vx + 0.5 * dt * k2.dvx,
            vy: state0.vy + 0.5 * dt * k2.dvy,
            vz: state0.vz + 0.5 * dt * k2.dvz
        };
        const k3 = this.computeDerivatives(state2);
        
        // k4
        const state3: HillState = {
            x: state0.x + dt * k3.dx,
            y: state0.y + dt * k3.dy,
            z: state0.z + dt * k3.dz,
            vx: state0.vx + dt * k3.dvx,
            vy: state0.vy + dt * k3.dvy,
            vz: state0.vz + dt * k3.dvz
        };
        const k4 = this.computeDerivatives(state3);
        
        // 状態を更新（4次ルンゲクッタ法の公式）
        sat.x += dt * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx) / 6;
        sat.y += dt * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy) / 6;
        sat.z += dt * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz) / 6;
        sat.vx += dt * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx) / 6;
        sat.vy += dt * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy) / 6;
        sat.vz += dt * (k1.dvz + 2 * k2.dvz + 2 * k3.dvz + k4.dvz) / 6;
    }
}