import { Satellite } from './Satellite.js';

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

// 地球定数
const R_EARTH = 6378137.0;       // [m] 地球赤道半径
const J2 = 1.08262668e-3;        // [-] 地球のJ2項（扁平率に関する係数）

export class HillEquationSolver {
    // 平均運動 (rad/s)
    private n: number; // 平均運動（軌道角速度）
    private useJ2Perturbation: boolean = false; // J2摂動を使用するかどうか
    private ssCoefficient: { s: number; c: number } = { s: 0, c: 1 }; // Schweighart-Sedwick係数
    private r0: number = 0; // 基準軌道半径 [m]
    private inclination: number = 0; // 軌道傾斜角 [rad]
    
    constructor(n: number) {
        this.n = n;
    }
    
    updateMeanMotion(n: number): void {
        this.n = n;
        this.updateSSCoefficient();
    }
    
    // J2摂動の有効/無効を設定
    setJ2Perturbation(enabled: boolean): void {
        this.useJ2Perturbation = enabled;
        this.updateSSCoefficient();
    }
    
    // 基準軌道パラメータを設定
    setOrbitParameters(r0: number, inclination: number): void {
        this.r0 = r0;
        this.inclination = inclination;
        this.updateSSCoefficient();
    }
    
    // Schweighart-Sedwick係数を計算
    private updateSSCoefficient(): void {
        if (!this.useJ2Perturbation || this.r0 === 0) {
            this.ssCoefficient = { s: 0, c: 1 };
            return;
        }

        const s = (3 * J2 * (R_EARTH ** 2) / (8 * this.r0 ** 2)) *
                  (1 + 3 * Math.cos(this.inclination) ** 2);
        const c = Math.sqrt(1 + s);
        this.ssCoefficient = { s, c };
    }

    // SS係数を取得（外部から参照用）
    getSSCoefficient(): { s: number; c: number } {
        return { ...this.ssCoefficient };
    }

    // SS係数cのみを取得（便利メソッド）
    getSSCoefficientC(): number {
        return this.ssCoefficient.c;
    }

    // J2安定配置の初期速度を計算
    // ドリフト項が消える条件: vy0 = -2nc·x0
    computeStableVy0(x0: number): number {
        return -2 * this.n * this.ssCoefficient.c * x0;
    }

    // J2安定配置の初期速度を検証
    // 許容誤差内で vy0 = -2nc·x0 を満たすか確認
    verifyStableInitialVelocity(x0: number, vy0: number, tolerance: number = 1e-6): boolean {
        const expectedVy0 = this.computeStableVy0(x0);
        const error = Math.abs(vy0 - expectedVy0);
        return error < tolerance;
    }

    // ドリフト定数 K = vy + 2nc·x を計算
    // K = 0 がドリフト消失条件
    computeDriftConstant(x: number, vy: number): number {
        return vy + 2 * this.n * this.ssCoefficient.c * x;
    }
    
    // Hill方程式の微分方程式（右辺）
    computeDerivatives(state: HillState): HillDerivatives {
        // state values: position (m), velocity (m/s)
        const { x, z, vx, vy, vz } = state;  // y is not used in Hill equations
        const n = this.n;
        const c = this.ssCoefficient.c;
        
        let ax: number, ay: number, az: number;
        
        if (this.useJ2Perturbation) {
            // J2を考慮したSchweighart-Sedwick方程式
            // ẍ = 2ncẏ + (5c²-2)n²x
            // ÿ = -2ncẋ
            // z̈ = -(3c²-2)n²z
            ax = 2 * n * c * vy + (5 * c * c - 2) * n * n * x;
            ay = -2 * n * c * vx;
            az = -(3 * c * c - 2) * n * n * z;
        } else {
            // 古典的なHill方程式
            // ẍ = 2nẏ + 3n²x
            // ÿ = -2nẋ
            // z̈ = -n²z
            ax = 2 * n * vy + 3 * n * n * x;
            ay = -2 * n * vx;
            az = -n * n * z;
        }
        
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
    // dt: integration step (seconds)
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