import { describe, expect, it } from 'vite-plus/test';
import {
    addLayer,
    countSatellites,
    createDefaultFormation,
    layerSatelliteCount,
    moveLayer,
    parseFormation,
    removeLayer,
    serializeFormation,
    toggleLayer,
    updateLayer,
} from './formationConfig';
import { OrbitInitializer } from '@/simulation/OrbitInitializer';

describe('formationConfig', () => {
    it('レイヤー操作は元の設定を変更しない', () => {
        const base = createDefaultFormation();
        const snapshot = structuredClone(base);
        const added = addLayer(base, 'B');
        updateLayer(added, added.layers[1].id, { satelliteCount: 10 });
        toggleLayer(added, added.layers[0].id);
        moveLayer(added, added.layers[1].id, -1);
        removeLayer(added, added.layers[0].id);
        expect(base).toEqual(snapshot);
        expect(added.layers).toHaveLength(2);
    });

    it('有効なレイヤーの衛星数だけを数える', () => {
        let config = addLayer(createDefaultFormation());
        const [a, b] = config.layers;
        config = updateLayer(config, a.id, { pattern: 'circular_orbit', satelliteCount: 4 });
        config = updateLayer(config, b.id, { pattern: 'circular_orbit', satelliteCount: 6 });
        expect(countSatellites(config)).toBe(10);
        expect(countSatellites(toggleLayer(config, b.id))).toBe(4);
    });

    it('衛星数はパターンが実際に生成する機数で数える', () => {
        const initializer = new OrbitInitializer(0.001);
        const cases = [
            { pattern: 'origin', satelliteCount: 5 },
            { pattern: 'axis', satelliteCount: 3 },
            { pattern: 'grid', satelliteCount: 2 },
            { pattern: 'hexagonal_disk', satelliteCount: 19 },
            { pattern: 'random_position', satelliteCount: 7 },
        ] as const;
        for (const layer of cases) {
            const generated = initializer.generatePositions(layer.pattern, layer.satelliteCount, 10, 0);
            expect(layerSatelliteCount(layer), layer.pattern).toBe(generated.length);
        }
    });

    it('生成される機数が上限を超える JSON は読み込まない', () => {
        const config = createDefaultFormation();
        config.layers[0] = { ...config.layers[0], pattern: 'grid', satelliteCount: 100 };
        const result = parseFormation(serializeFormation(config));
        expect(result.ok).toBe(false);
    });

    it('moveLayer は範囲外への移動を無視する', () => {
        const config = addLayer(createDefaultFormation(), 'B');
        const [a, b] = config.layers;
        expect(moveLayer(config, a.id, -1)).toBe(config);
        expect(moveLayer(config, b.id, 1)).toBe(config);
        expect(moveLayer(config, b.id, -1).layers.map((l) => l.id)).toEqual([b.id, a.id]);
    });

    it('updateLayer は ID を書き換えない', () => {
        const config = createDefaultFormation();
        const id = config.layers[0].id;
        expect(updateLayer(config, id, { id: 'other', name: 'X' }).layers[0]).toMatchObject({ id, name: 'X' });
    });

    it('シリアライズした設定を読み戻せる', () => {
        const config = addLayer(createDefaultFormation(), 'B');
        const result = parseFormation(serializeFormation(config));
        expect(result).toEqual({ ok: true, config });
    });

    it('不正な JSON と不正なレイヤーをエラーにする', () => {
        expect(parseFormation('{').ok).toBe(false);

        const config = createDefaultFormation();
        config.layers[0].satelliteCount = 0;
        config.layers[0].color = 'red';
        const result = parseFormation(JSON.stringify(config));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors).toHaveLength(2);
    });
});
