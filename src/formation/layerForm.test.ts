import { describe, expect, it } from 'vite-plus/test';
import { ALL_PATTERNS, DEFAULT_LAYER } from './FormationTypes';
import { PATTERN_GROUPS, checkLayerForm, formToLayerUpdates, layerToForm } from './layerForm';

const baseForm = () => layerToForm({ ...structuredClone(DEFAULT_LAYER), id: 'a', name: 'A' });

describe('layerForm', () => {
    it('すべてのパターンがちょうど 1 つの分類に属する', () => {
        const grouped = PATTERN_GROUPS.flatMap((g) => g.patterns);
        expect([...grouped].sort()).toEqual([...ALL_PATTERNS].sort());
    });

    it('既定のレイヤーは問題なし', () => {
        expect(checkLayerForm(baseForm())).toBeNull();
    });

    it('衛星数・間隔・サイズの不正を検出する', () => {
        expect(checkLayerForm({ ...baseForm(), satelliteCount: '0' })).toMatch('1 以上');
        expect(checkLayerForm({ ...baseForm(), satelliteCount: '2.5' })).toMatch('1 以上');
        expect(checkLayerForm({ ...baseForm(), spacing: '' })).toMatch('間隔');
        expect(checkLayerForm({ ...baseForm(), size: '-1' })).toMatch('サイズ');
    });

    it('生成される機数が上限を超えると止める', () => {
        // 格子 片側 20 → (41)^3 - 1 = 68920 機
        expect(checkLayerForm({ ...baseForm(), pattern: 'grid', satelliteCount: '20' })).toMatch('68,920');
        expect(checkLayerForm({ ...baseForm(), pattern: 'grid', satelliteCount: '5' })).toBeNull();
    });

    it('非表示の欄は検証しない', () => {
        expect(checkLayerForm({ ...baseForm(), pattern: 'origin', satelliteCount: '' })).toBeNull();
        expect(checkLayerForm({ ...baseForm(), colorMode: 'random', color: 'x' })).toBeNull();
    });

    it('円軌道はフォーム上で実際の半径（radius の 2 倍）を扱う', () => {
        const layer = {
            ...structuredClone(DEFAULT_LAYER),
            id: 'a',
            name: 'A',
            pattern: 'circular_orbit' as const,
            radius: 5,
        };
        const form = layerToForm(layer);
        expect(form.radius).toBe('10');
        expect(formToLayerUpdates({ ...form, radius: '30' }).radius).toBe(15);
    });

    it('単独配置の初速度と格子の面をフォームで保持する', () => {
        const origin = { ...structuredClone(DEFAULT_LAYER), id: 'o', name: 'O', pattern: 'origin' as const };
        const velocity = { r: 0.01, s: -0.02, w: 0 };
        const form = layerToForm({ ...origin, rswVelocity: velocity });
        expect(formToLayerUpdates(form).rswVelocity).toEqual(velocity);
        expect(formToLayerUpdates({ ...form, velocityR: '0', velocityS: '0' }).rswVelocity).toBeUndefined();
        expect(checkLayerForm({ ...form, velocityS: '' })).toMatch('数値');

        const grid = layerToForm({ ...origin, pattern: 'grid', gridPlane: 'rs' });
        expect(grid.gridPlane).toBe('rs');
        expect(formToLayerUpdates(grid).gridPlane).toBe('rs');
        expect(formToLayerUpdates({ ...grid, gridPlane: '3d' }).gridPlane).toBeUndefined();
        expect(formToLayerUpdates({ ...grid, pattern: 'axis' }).gridPlane).toBeUndefined();
        // 平面格子は (2n+1)² − 1 機なので、立方格子では上限を超える数でも通る
        expect(checkLayerForm({ ...grid, satelliteCount: '20' })).toBeNull();
    });
});
