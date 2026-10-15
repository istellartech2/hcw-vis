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

    it('格子は R-S 面だけに並び、R = 0 の行は動かない', () => {
        const [grid] = satellitesOf('grid-drift');
        expect(grid).toHaveLength(24);
        expect(grid.every((s) => s.z === 0)).toBe(true);
        const still = grid.filter((s) => s.x === 0);
        const before = still.map((s) => s.y);
        propagate(grid, period);
        expect(still.map((s) => [s.x, s.y])).toEqual(before.map((y) => [0, y]));
    });

    it('ドリフト消失条件の 3 機は 1 周回で元の位置に戻る', () => {
        const yellow = satellitesOf('drift-free').slice(3).flat();
        const start = yellow.map((s) => [s.x, s.y]);
        expect(start.map(([x]) => x)).toEqual([10, 5, -10]);
        propagate(yellow, period);
        yellow.forEach((s, i) => {
            expect(s.x).toBeCloseTo(start[i][0], 3);
            expect(s.y).toBeCloseTo(start[i][1], 3);
        });
    });

    it('±S に押すと 1 周回で約 94 m ドリフトし、±R に押すと出発点に戻る', () => {
        const [front, back, up, down] = satellitesOf('delta-v').flat();
        propagate([front, back, up, down], period);
        expect(front.y).toBeCloseTo(-6 * Math.PI * 5, 0);
        expect(back.y).toBeCloseTo(6 * Math.PI * 5, 0);
        for (const s of [up, down]) expect(Math.hypot(s.x, s.y, s.z)).toBeLessThan(1e-3);
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
});
