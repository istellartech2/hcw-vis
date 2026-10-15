import { describe, expect, it } from 'vite-plus/test';
import {
    addLayer,
    moveLayer,
    parseFormation,
    removeLayer,
    toggleLayer,
    updateLayer,
    serializeFormation,
    validateFormation,
} from './formationConfig';
import { FormationGenerator } from './FormationGenerator';
import { FORMATION_SCENARIOS } from './scenarios';
import { HillEquationSolver } from '../simulation/HillEquationSolver';
import { circularMeanMotion } from '../simulation/OrbitElements';
import type { Satellite } from '../simulation/Satellite';

const n = circularMeanMotion(500);
const period = (2 * Math.PI) / n;

function scenario(id: string) {
    const found = FORMATION_SCENARIOS.find((s) => s.id === id);
    if (!found) throw new Error(`シナリオ ${id} がありません`);
    return found;
}

/** シナリオの衛星（基準衛星を除く）を生成し、レイヤーごとの衛星を返す */
function satellitesOf(id: string): Satellite[][] {
    const generator = new FormationGenerator(n);
    return scenario(id)
        .build(n)
        .layers.map((layer) => generator.generateSatellites({ ...scenario(id).build(n), layers: [layer] }).slice(1));
}

/** 衛星を duration 秒進め、各ステップで visit を呼ぶ */
function propagate(sats: Satellite[], duration: number, visit?: () => void): void {
    const solver = new HillEquationSolver(n);
    const steps = 2000;
    for (let i = 0; i < steps; i++) {
        for (const sat of sats) solver.rungeKutta4Step(sat, duration / steps);
        visit?.();
    }
}

/** 保存した JSON は undefined のキーを持たない */
const withoutUndefined = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('FORMATION_SCENARIOS', () => {
    it('id が重複しない', () => {
        const ids = FORMATION_SCENARIOS.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(FORMATION_SCENARIOS.map((s) => [s.id, s] as const))('%s は有効な設定で、保存して読み直せる', (_, s) => {
        const config = s.build(n);
        expect(validateFormation(config)).toEqual([]);
        expect(config.description).toBeTruthy();
        const parsed = parseFormation(serializeFormation(config));
        expect(parsed.ok && parsed.config.layers).toEqual(withoutUndefined(config.layers));
    });

    it('呼ぶたびに新しいレイヤー id を作る', () => {
        const [a, b] = [FORMATION_SCENARIOS[0].build(n), FORMATION_SCENARIOS[0].build(n)];
        expect(a.layers[0].id).not.toBe(b.layers[0].id);
    });

    it('配置を編集すると説明が消える', () => {
        const config = FORMATION_SCENARIOS[0].build(n);
        const id = config.layers[0].id;
        const edits = [
            addLayer(config),
            removeLayer(config, id),
            updateLayer(config, id, { size: 2 }),
            toggleLayer(config, id),
            moveLayer(config, id, 1),
        ];
        for (const edited of edits) expect(edited.description).toBeUndefined();
        expect(config.description).toBeTruthy();
    });
});

describe('学習シナリオは説明どおりに動く', () => {
    it('初速度 0 で R = 10 m に置くと、1 周回で約 380 m 後方へドリフトする', () => {
        const [sat] = satellitesOf('zero-velocity')[0];
        propagate([sat], period);
        expect(sat.y).toBeCloseTo(-12 * Math.PI * 10, 0);
        expect(sat.y).toBeCloseTo(-377, -1);
    });

    it('立方格子は R = 0 の層だけ前後にずれない', () => {
        const [grid] = satellitesOf('grid-drift');
        expect(grid).toHaveLength(26);
        const layer0 = grid.filter((s) => s.x === 0);
        const before = layer0.map((s) => s.y);
        propagate(grid, period);
        layer0.forEach((s, i) => expect(s.y).toBeCloseTo(before[i], 6));
        for (const s of grid.filter((s) => s.x !== 0)) expect(Math.abs(s.y)).toBeGreaterThan(300);
    });

    it('ドリフト消失条件の黄色と、W 軸上の青は 1 周回で元の位置に戻る', () => {
        const layers = satellitesOf('drift-free');
        const returning = [...layers.slice(3, 6), ...layers.slice(6)].flat();
        const start = returning.map((s) => [s.x, s.y, s.z]);
        expect(start.map(([x, , z]) => x + z)).toEqual([10, 5, -10, 10, 5, -10]);
        propagate(returning, period);
        returning.forEach((s, i) => {
            expect(s.x).toBeCloseTo(start[i][0], 3);
            expect(s.y).toBeCloseTo(start[i][1], 3);
            expect(s.z).toBeCloseTo(start[i][2], 3);
        });
    });

    it('±S に押すと 1 周回で約 94 m ドリフトし、±R・±W に押すと出発点に戻る', () => {
        const sats = satellitesOf('delta-v').flat();
        const [front, back, ...returning] = sats;
        expect(sats).toHaveLength(6);
        propagate(sats, period);
        expect(front.y).toBeCloseTo(-6 * Math.PI * 5, 0);
        expect(back.y).toBeCloseTo(6 * Math.PI * 5, 0);
        for (const s of returning) expect(Math.hypot(s.x, s.y, s.z)).toBeLessThan(1e-3);
    });

    it('同じ形の楕円の 6 機は、どの 2 機も 12 m 以上離れている', () => {
        const sats = satellitesOf('phase-and-center').flat();
        let min = Infinity;
        propagate(sats, period, () => {
            for (let i = 0; i < sats.length; i++)
                for (let j = i + 1; j < sats.length; j++)
                    min = Math.min(
                        min,
                        Math.hypot(sats[i].x - sats[j].x, sats[i].y - sats[j].y, sats[i].z - sats[j].z),
                    );
        });
        expect(min).toBeGreaterThan(12);
        expect(min).toBeLessThan(14);
    });

    it('真上から見て円の軌道は S-W 面で半径 20 m、距離一定の円は 3 次元で 20 m', () => {
        const [circular, projected] = satellitesOf('projected-circular');
        propagate([...circular, ...projected], period / 7, () => {
            for (const s of circular) expect(Math.hypot(s.x, s.y, s.z)).toBeCloseTo(20, 3);
            for (const s of projected) expect(Math.hypot(s.y, s.z)).toBeCloseTo(20, 3);
        });
    });

    it('W を同じ位相で足すと基準衛星を通り抜け、90° ずらすと 10 m 以上離れる', () => {
        const [[inPhase], [quadrature]] = satellitesOf('passive-safety');
        let [minIn, minQuad] = [Infinity, Infinity];
        propagate([inPhase, quadrature], period, () => {
            minIn = Math.min(minIn, Math.hypot(inPhase.x, inPhase.y, inPhase.z));
            minQuad = Math.min(minQuad, Math.hypot(quadrature.x, quadrature.y, quadrature.z));
        });
        expect(minIn).toBeLessThan(0.5);
        expect(minQuad).toBeGreaterThanOrEqual(10 - 1e-6);
    });

    it('V-bar 上の待機点はとどまり、R-bar 上は前方へ離れていく', () => {
        const sats = satellitesOf('hold-points').flat();
        const [vbar, rbar] = [sats.slice(0, 3), sats.slice(3)];
        propagate(sats, period);
        expect(vbar.map((s) => s.y)).toEqual([-5, -10, -15]);
        for (const s of rbar) expect(s.y).toBeGreaterThan(100);
    });

    it('R 方向のホップは半周回で、S 方向のホップは 1 周回で次の待機点に着く', () => {
        const [, , [radial], [along]] = satellitesOf('vbar-hops');
        propagate([radial, along], period / 2);
        expect(radial.x).toBeCloseTo(0, 3);
        expect(radial.y).toBeCloseTo(-5, 0);
        propagate([radial, along], period / 2);
        // R 方向のホップは到着時の噴射をしないと元の待機点へ戻り、S 方向のホップは前へ進み続ける
        expect(radial.y).toBeCloseTo(-20, 3);
        expect(along.x).toBeCloseTo(0, 3);
        expect(along.y).toBeCloseTo(-5, 0);
        propagate([radial, along], period);
        expect(radial.y).toBeCloseTo(-20, 3);
        expect(along.y).toBeCloseTo(10, 0);
    });
});
