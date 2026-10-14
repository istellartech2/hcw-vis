import type { Satellite } from './Satellite.js';
import { EARTH_RADIUS } from './OrbitElements.js';

/** 地球の J2 項（扁平率に関する係数） */
const J2 = 1.08262668e-3;

/**
 * HCW（Hill）方程式の数値積分。J2 摂動を考慮するときは Schweighart-Sedwick 方程式
 *   ẍ = 2ncẏ + (5c²-2)n²x,  ÿ = -2ncẋ,  z̈ = -(3c²-2)n²z
 * を使う。J2 なしは c = 1 で、古典的な HCW 方程式（ẍ = 2nẏ + 3n²x, ÿ = -2nẋ, z̈ = -n²z）と一致する。
 */
export class HillEquationSolver {
    /** 平均運動 (rad/s) */
    private n: number;
    private useJ2Perturbation = false;
    /** Schweighart-Sedwick 係数 c（J2 なしは 1） */
    private c = 1;
    /** 基準軌道半径 (m) */
    private r0 = 0;
    /** 軌道傾斜角 (rad) */
    private inclination = 0;

    constructor(n: number) {
        this.n = n;
    }

    updateMeanMotion(n: number): void {
        this.n = n;
    }

    setJ2Perturbation(enabled: boolean): void {
        this.useJ2Perturbation = enabled;
        this.updateSSCoefficient();
    }

    setOrbitParameters(r0: number, inclination: number): void {
        this.r0 = r0;
        this.inclination = inclination;
        this.updateSSCoefficient();
    }

    private updateSSCoefficient(): void {
        if (!this.useJ2Perturbation || this.r0 === 0) {
            this.c = 1;
            return;
        }
        const s = ((3 * J2 * EARTH_RADIUS ** 2) / (8 * this.r0 ** 2)) * (1 + 3 * Math.cos(this.inclination) ** 2);
        this.c = Math.sqrt(1 + s);
    }

    getSSCoefficientC(): number {
        return this.c;
    }

    /** ドリフト項が消える（J2 安定配置の）初期速度 vy0 = -2nc·x0 */
    computeStableVy0(x0: number): number {
        return -2 * this.n * this.c * x0;
    }

    /** ドリフト定数 K = vy + 2nc·x（K = 0 がドリフト消失条件） */
    computeDriftConstant(x: number, vy: number): number {
        return vy + 2 * this.n * this.c * x;
    }

    /** 方程式の右辺のうち加速度 [ax, ay, az]（y は現れない） */
    private computeDerivatives(x: number, z: number, vx: number, vy: number): [number, number, number] {
        const { n, c } = this;
        return [2 * n * c * vy + (5 * c * c - 2) * n * n * x, -2 * n * c * vx, -(3 * c * c - 2) * n * n * z];
    }

    /** 4 次ルンゲクッタ法で dt 秒進める */
    rungeKutta4Step(sat: Satellite, dt: number): void {
        const { x, z, vx, vy, vz } = sat;
        const h = dt / 2;

        const [ax1, ay1, az1] = this.computeDerivatives(x, z, vx, vy);
        const vx1 = vx + h * ax1,
            vy1 = vy + h * ay1,
            vz1 = vz + h * az1;
        const [ax2, ay2, az2] = this.computeDerivatives(x + h * vx, z + h * vz, vx1, vy1);
        const vx2 = vx + h * ax2,
            vy2 = vy + h * ay2,
            vz2 = vz + h * az2;
        const [ax3, ay3, az3] = this.computeDerivatives(x + h * vx1, z + h * vz1, vx2, vy2);
        const vx3 = vx + dt * ax3,
            vy3 = vy + dt * ay3,
            vz3 = vz + dt * az3;
        const [ax4, ay4, az4] = this.computeDerivatives(x + dt * vx2, z + dt * vz2, vx3, vy3);

        sat.x += (dt * (vx + 2 * vx1 + 2 * vx2 + vx3)) / 6;
        sat.y += (dt * (vy + 2 * vy1 + 2 * vy2 + vy3)) / 6;
        sat.z += (dt * (vz + 2 * vz1 + 2 * vz2 + vz3)) / 6;
        sat.vx += (dt * (ax1 + 2 * ax2 + 2 * ax3 + ax4)) / 6;
        sat.vy += (dt * (ay1 + 2 * ay2 + 2 * ay3 + ay4)) / 6;
        sat.vz += (dt * (az1 + 2 * az2 + 2 * az3 + az4)) / 6;
    }
}
