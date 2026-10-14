import { describe, expect, it } from 'vite-plus/test';
import { HillEquationSolver } from './HillEquationSolver';
import { EARTH_MU, EARTH_RADIUS } from './OrbitElements';
import { OrbitInitializer } from './OrbitInitializer';
import { Satellite } from './Satellite';

const r0 = EARTH_RADIUS + 400000; // 高度 400 km
const inclination = (51.6 * Math.PI) / 180;
const n = Math.sqrt(EARTH_MU / r0 ** 3);
const T = (2 * Math.PI) / n;

function createSolver(j2: boolean): HillEquationSolver {
    const solver = new HillEquationSolver(n);
    solver.setOrbitParameters(r0, inclination);
    solver.setJ2Perturbation(j2);
    return solver;
}

function propagate(solver: HillEquationSolver, sat: Satellite, duration: number, steps: number): void {
    const dt = duration / steps;
    for (let i = 0; i < steps; i++) solver.rungeKutta4Step(sat, dt);
}

/** HCW 方程式の解析解（x: Radial, y: Along-track, z: Cross-track） */
function hcwAnalytic(s0: { x: number; y: number; z: number; vx: number; vy: number; vz: number }, t: number) {
    const nt = n * t;
    const sin = Math.sin(nt);
    const cos = Math.cos(nt);
    return {
        x: (4 - 3 * cos) * s0.x + (sin / n) * s0.vx + (2 / n) * (1 - cos) * s0.vy,
        y: 6 * (sin - nt) * s0.x + s0.y - (2 / n) * (1 - cos) * s0.vx + ((4 * sin - 3 * nt) / n) * s0.vy,
        z: s0.z * cos + (s0.vz / n) * sin,
    };
}

describe('HillEquationSolver (HCW)', () => {
    it('RK4 積分が HCW 解析解と一致する', () => {
        const s0 = { x: 10, y: -20, z: 5, vx: 0.01, vy: -0.02, vz: 0.005 };
        const sat = new Satellite(s0.x, s0.y, s0.z, s0.vx, s0.vy, s0.vz, '#ffffff');
        const t = 1.5 * T;
        propagate(createSolver(false), sat, t, 2000);

        const expected = hcwAnalytic(s0, t);
        expect(sat.x).toBeCloseTo(expected.x, 4);
        expect(sat.y).toBeCloseTo(expected.y, 4);
        expect(sat.z).toBeCloseTo(expected.z, 4);
    });

    it('vy0 = -2n·x0 の初期条件は 1 周期後に元の位置へ戻る', () => {
        const solver = createSolver(false);
        const x0 = 100;
        const vy0 = solver.computeStableVy0(x0);
        expect(vy0).toBeCloseTo(-2 * n * x0, 12);

        const sat = new Satellite(x0, 0, 0, 0, vy0, 0, '#ffffff');
        propagate(solver, sat, T, 1000);
        expect(sat.x).toBeCloseTo(x0, 4);
        expect(sat.y).toBeCloseTo(0, 4);
    });
});

describe('HillEquationSolver (J2 / Schweighart-Sedwick)', () => {
    it('SS 係数 c は 1 よりわずかに大きい', () => {
        const c = createSolver(true).getSSCoefficientC();
        expect(c).toBeGreaterThan(1);
        expect(c).toBeLessThan(1.01);
    });

    it('安定初期速度でドリフト定数が 0 になる', () => {
        const solver = createSolver(true);
        const x0 = 50;
        const vy0 = solver.computeStableVy0(x0);
        expect(Math.abs(solver.computeDriftConstant(x0, vy0))).toBeLessThan(1e-9);
    });

    it('J2 ありの安定速度は J2 なしの c 倍', () => {
        const x0 = 100;
        const withJ2 = createSolver(true);
        const ratio = withJ2.computeStableVy0(x0) / createSolver(false).computeStableVy0(x0);
        expect(ratio).toBeCloseTo(withJ2.getSSCoefficientC(), 6);
    });

    it('J2 安定配置の六角格子は 5 周期後もドリフトが半径の 1% 未満', () => {
        const solver = createSolver(true);
        const initializer = new OrbitInitializer(n);
        initializer.setJ2StableArrangement(true, solver.getSSCoefficientC());
        const radius = 100;
        const positions = initializer.generatePositions('hexagonal_disk', 7, radius);

        for (const p of positions) {
            expect(Math.abs(solver.computeDriftConstant(p.x0, p.vy0))).toBeLessThan(1e-6);
        }

        const p = positions[1];
        const sat = new Satellite(p.x0, p.y0, p.z0, p.vx0, p.vy0, p.vz0, '#ffffff');
        propagate(solver, sat, 5 * T, 500);
        expect(Math.abs(sat.x - p.x0)).toBeLessThan(radius * 0.01);
        expect(Math.abs(sat.y - p.y0)).toBeLessThan(radius * 0.01);
    });
});
