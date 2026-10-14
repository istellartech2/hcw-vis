import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { ALL_PATTERNS } from '../formation/FormationTypes';
import { EARTH_MU, EARTH_RADIUS } from './OrbitElements';
import { type InitialCondition, OrbitInitializer } from './OrbitInitializer';

const r0 = EARTH_RADIUS + 400000; // 高度 400 km
const n = Math.sqrt(EARTH_MU / r0 ** 3);
const SS_C = 0.9987; // J2 安定配置のテスト用 SS 係数

const periodicParams = { A: 30, B: -20, D: 15, E: 40, F: 10 };

/** 決定論的な Math.random（線形合同法） */
function seedRandom(seed: number): void {
    let state = seed >>> 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 2 ** 32;
    });
}

function create(j2 = false): OrbitInitializer {
    const initializer = new OrbitInitializer(n);
    if (j2) initializer.setJ2StableArrangement(true, SS_C);
    return initializer;
}

const radialDistance = (p: InitialCondition) => Math.hypot(p.x0, p.y0, p.z0);

/** vy0 = -2nc·x0（ドリフト消失条件） */
function expectDriftFree(positions: InitialCondition[], c = 1): void {
    for (const p of positions) {
        expect(p.vy0).toBeCloseTo(-2 * n * c * p.x0, 12);
    }
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('OrbitInitializer スナップショット', () => {
    // 決定論的パターン × (半径モード / 間隔モード)
    const deterministicCases: Array<[string, number, number, number | undefined]> = [
        ['origin', 1, 100, undefined],
        ['axis', 2, 100, undefined],
        ['axis', 2, 100, 25],
        ['grid', 1, 100, undefined],
        ['grid', 1, 100, 30],
        ['periodic_orbit', 4, 100, undefined],
        ['circular_orbit', 4, 100, undefined],
        ['vbar_approach', 3, 90, undefined],
        ['vbar_approach', 3, 90, 20],
        ['rbar_approach', 3, 90, undefined],
        ['rbar_approach', 3, 90, 20],
        ['hexagonal_disk', 7, 100, undefined],
        ['hexagonal_disk', 12, 100, 20],
        ['square_lattice_disk', 9, 100, undefined],
        ['square_lattice_disk', 13, 100, 20],
        ['concentric_disk', 10, 100, undefined],
        ['concentric_disk', 10, 100, 20],
    ];

    it.each(deterministicCases)('%s (count=%i, radius=%d, spacing=%s)', (pattern, count, radius, spacing) => {
        const positions = create().generatePositions(pattern, count, radius, { spacing });
        expect(positions).toMatchSnapshot();
    });

    it('origin / axis は RSW オフセットを反映する', () => {
        const offset = { r: 1, s: -2, w: 3 };
        expect(create().generatePositions('origin', 1, 100, { rswOffset: offset })).toMatchSnapshot();
        expect(create().generatePositions('axis', 1, 100, { spacing: 10, rswOffset: offset })).toMatchSnapshot();
    });

    it('periodic_orbit: periodicParams / zAmplitudeMultiplier', () => {
        expect(create().generatePositions('periodic_orbit', 4, 100, { periodicParams })).toMatchSnapshot();
        expect(create().generatePositions('periodic_orbit', 3, 100, { zAmplitude: 0.5 })).toMatchSnapshot();
    });

    it('circular_orbit: positiveZ=false', () => {
        expect(create().generatePositions('circular_orbit', 3, 100, { positiveZ: false })).toMatchSnapshot();
    });

    it.each(['hexagonal_disk', 'square_lattice_disk', 'concentric_disk'])('%s: J2 安定配置', (pattern) => {
        expect(create(true).generatePositions(pattern, 7, 100)).toMatchSnapshot();
    });

    it.each(['random_position', 'random_position_velocity', 'random_periodic'])('%s (seeded)', (pattern) => {
        seedRandom(42);
        expect(create().generatePositions(pattern, 4, 100)).toMatchSnapshot();
    });

    it('未知のパターンは axis（半径モード）にフォールバックする', () => {
        expect(create().generatePositions('unknown', 2, 100)).toEqual(create().generatePositions('axis', 2, 100));
    });
});

describe('OrbitInitializer 性質', () => {
    it('ALL_PATTERNS の全パターンが有限値の初期条件を返す', () => {
        seedRandom(1);
        for (const pattern of ALL_PATTERNS) {
            const positions = create().generatePositions(pattern, 5, 100);
            expect(positions.length, pattern).toBeGreaterThan(0);
            for (const p of positions) {
                for (const v of Object.values(p)) expect(Number.isFinite(v), pattern).toBe(true);
            }
        }
    });

    it.each([1, 3, 10])('衛星数: axis は 6·count、grid は (2·count+1)^3 - 1 (count=%i)', (count) => {
        expect(create().generatePositions('axis', count, 100)).toHaveLength(6 * count);
        expect(create().generatePositions('grid', count, 100)).toHaveLength((2 * count + 1) ** 3 - 1);
    });

    it.each([
        'random_position',
        'random_position_velocity',
        'random_periodic',
        'periodic_orbit',
        'circular_orbit',
        'vbar_approach',
        'rbar_approach',
        'hexagonal_disk',
        'square_lattice_disk',
        'concentric_disk',
    ])('%s は count 個を返す', (pattern) => {
        for (const count of [1, 7, 20, 50]) {
            expect(create().generatePositions(pattern, count, 100)).toHaveLength(count);
        }
    });

    it.each(['hexagonal_disk', 'square_lattice_disk', 'concentric_disk'])('%s: count<=0 は空配列', (pattern) => {
        expect(create().generatePositions(pattern, 0, 100)).toEqual([]);
    });

    it('axis / grid / approach の外周は radius に一致し、spacing モードは等間隔', () => {
        const axis = create().generatePositions('axis', 4, 100);
        expect(Math.max(...axis.map(radialDistance))).toBeCloseTo(100, 9);

        const grid = create().generatePositions('grid', 2, 100);
        expect(Math.max(...grid.map((p) => Math.abs(p.x0)))).toBeCloseTo(100, 9);
        expect(grid.some((p) => p.x0 === 0 && p.y0 === 0 && p.z0 === 0)).toBe(false);

        const vbar = create().generatePositions('vbar_approach', 5, 100);
        expect(vbar.map((p) => -p.y0)).toEqual([20, 40, 60, 80, 100]);
        const rbar = create().generatePositions('rbar_approach', 4, 100, { spacing: 15 });
        expect(rbar.map((p) => -p.x0)).toEqual([15, 30, 45, 60]);
    });

    it('hexagonal / square_lattice disk は外周の衛星までの距離が radius、z0 = √3·x0', () => {
        for (const pattern of ['hexagonal_disk', 'square_lattice_disk']) {
            const positions = create().generatePositions(pattern, 19, 100);
            const distances = positions.map((p) => Math.hypot(p.x0, p.y0, p.z0));
            expect(Math.max(...distances), pattern).toBeCloseTo(100, 9);
            for (const p of positions) expect(p.z0).toBeCloseTo(Math.sqrt(3) * p.x0, 9);
        }
    });

    it('concentric_disk は衛星までの距離が radius 以内、spacing 指定時はリング間隔が spacing', () => {
        const byRadius = create().generatePositions('concentric_disk', 19, 100);
        for (const p of byRadius) expect(Math.hypot(p.x0, p.y0, p.z0)).toBeLessThanOrEqual(100 + 1e-9);
        const bySpacing = create().generatePositions('concentric_disk', 19, 100, { spacing: 20 });
        const rings = new Set(bySpacing.map((p) => Math.round(Math.hypot(p.x0, p.y0, p.z0) * 1e6) / 1e6));
        expect([...rings].sort((a, b) => a - b)).toEqual([0, 20, 40]);
    });

    it('hexagonal_disk (spacing) は最近接の衛星間隔が spacing', () => {
        const positions = create().generatePositions('hexagonal_disk', 7, 100, { spacing: 20 });
        const [center, ...ring] = positions;
        expect(Math.hypot(center.x0, center.y0, center.z0)).toBe(0);
        for (const p of ring) expect(Math.hypot(p.x0, p.y0, p.z0)).toBeCloseTo(20, 9);
        // 隣り合うリング上の衛星どうしも 3 次元空間で spacing だけ離れる
        for (const p of ring) {
            const nearest = Math.min(
                ...ring.filter((q) => q !== p).map((q) => Math.hypot(p.x0 - q.x0, p.y0 - q.y0, p.z0 - q.z0)),
            );
            expect(nearest).toBeCloseTo(20, 9);
        }
    });

    it.each([
        'random_periodic',
        'circular_orbit',
        'rbar_approach',
        'hexagonal_disk',
        'square_lattice_disk',
        'concentric_disk',
    ])('%s は vy0 = -2n·x0 を満たす', (pattern) => {
        seedRandom(7);
        expectDriftFree(create().generatePositions(pattern, 20, 100));
    });

    it('periodic_orbit（periodicParams 有無とも）は vy0 = -2n·x0 を満たす', () => {
        expectDriftFree(create().generatePositions('periodic_orbit', 12, 100, { zAmplitude: 0.7 }));
        expectDriftFree(create().generatePositions('periodic_orbit', 12, 100, { periodicParams }));
    });

    it.each(['hexagonal_disk', 'square_lattice_disk', 'concentric_disk'])(
        '%s: J2 安定配置では vy0 = -2nc·x0、他成分は変わらない',
        (pattern) => {
            const plain = create().generatePositions(pattern, 20, 100);
            const j2 = create(true).generatePositions(pattern, 20, 100);
            expectDriftFree(j2, SS_C);
            const withoutVy0 = (ps: InitialCondition[]) => ps.map((p) => [p.x0, p.y0, p.z0, p.vx0, p.vz0]);
            expect(withoutVy0(j2)).toEqual(withoutVy0(plain));
        },
    );

    it('J2 安定配置は disk 以外のパターンに影響しない', () => {
        for (const pattern of ['circular_orbit', 'periodic_orbit', 'rbar_approach']) {
            expect(create(true).generatePositions(pattern, 6, 100)).toEqual(
                create().generatePositions(pattern, 6, 100),
            );
        }
    });
});
