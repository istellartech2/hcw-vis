import { describe, expect, it } from 'vite-plus/test';
import { createDefaultFormation, formationFileName, parseFormation, serializeFormation } from './formationConfig';

const layerJson = (overrides: Record<string, unknown>) =>
    JSON.stringify({
        version: '1.0',
        name: 'test',
        layers: [{ id: 'a', name: 'A', pattern: 'axis', satelliteCount: 3, spacing: 1, ...overrides }],
    });

describe('formation JSON の読み込み', () => {
    it('数値の欄に文字列が入っていたらエラーにする（型の強制変換をしない）', () => {
        const result = parseFormation(layerJson({ satelliteCount: '5' }));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors[0]).toMatch('satelliteCount は数値');
    });

    it('列挙値・真偽値・入れ子オブジェクトの型を検査する', () => {
        for (const bad of [
            { shape: 'cone' },
            { enabled: 'yes' },
            { colorMode: 'rainbow' },
            { rotation: { r: 0 } },
            { rswOffset: [0, 0, 0] },
        ]) {
            expect(parseFormation(layerJson(bad)).ok, JSON.stringify(bad)).toBe(false);
        }
    });

    it('レイヤーが null でも例外を投げずエラーを返す', () => {
        const result = parseFormation(JSON.stringify({ version: '1.0', name: 'x', layers: [null] }));
        expect(result.ok).toBe(false);
    });

    it('最上位が配列や null の JSON をエラーにする', () => {
        expect(parseFormation('[]').ok).toBe(false);
        expect(parseFormation('null').ok).toBe(false);
    });

    it('メジャーバージョンが違うファイルは読まない', () => {
        const result = parseFormation(JSON.stringify({ version: '2.0', name: 'x', layers: [] }));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors[0]).toMatch('バージョン');
    });

    it('省略された任意項目は既定値で補い、未知のフィールドは捨てる', () => {
        const result = parseFormation(layerJson({ unknownField: 1 }));
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const layer = result.config.layers[0];
        expect(layer).toMatchObject({ enabled: true, shape: 'sphere', colorMode: 'random' });
        expect(layer).not.toHaveProperty('unknownField');
        expect(layer).not.toHaveProperty('radius');
    });

    it('欠けた ID・重複した ID は振り直す', () => {
        const json = JSON.stringify({
            version: '1.0',
            name: 'x',
            layers: [
                { id: 'same', pattern: 'axis', satelliteCount: 1, spacing: 1 },
                { id: 'same', pattern: 'axis', satelliteCount: 1, spacing: 1 },
                { pattern: 'axis', satelliteCount: 1, spacing: 1 },
            ],
        });
        const result = parseFormation(json);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const ids = result.config.layers.map((l) => l.id);
        expect(ids[0]).toBe('same');
        expect(new Set(ids).size).toBe(3);
    });

    it('name が無ければファイル名を使う', () => {
        const json = JSON.stringify({ version: '1.0', layers: [] });
        const result = parseFormation(json, 'my_formation');
        expect(result.ok && result.config.name).toBe('my_formation');
    });

    it('保存 → 読み込みで内容が変わらない', () => {
        const config = createDefaultFormation();
        expect(parseFormation(serializeFormation(config))).toEqual({ ok: true, config });
    });
});

describe('formationFileName', () => {
    it('OS で使えない文字を置き換えて .json を付ける', () => {
        expect(formationFileName({ name: 'a/b:c*?' })).toBe('a_b_c__.json');
        expect(formationFileName({ name: '  ' })).toBe('formation.json');
        expect(formationFileName({ name: '編隊 A' })).toBe('編隊 A.json');
    });
});
