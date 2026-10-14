import { describe, expect, it } from 'vite-plus/test';
import { parseFormation, serializeFormation, validateFormation } from './formationConfig';
import { FORMATION_SCENARIOS } from './scenarios';

describe('FORMATION_SCENARIOS', () => {
    it('id が重複しない', () => {
        const ids = FORMATION_SCENARIOS.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(FORMATION_SCENARIOS.map((s) => [s.id, s] as const))('%s は有効な設定で、保存して読み直せる', (_, s) => {
        const config = s.build();
        expect(validateFormation(config).errors).toEqual([]);
        expect(config.description).toBeTruthy();
        const parsed = parseFormation(serializeFormation(config));
        expect(parsed.ok).toBe(true);
    });

    it('呼ぶたびに新しいレイヤー id を作る', () => {
        const [a, b] = [FORMATION_SCENARIOS[0].build(), FORMATION_SCENARIOS[0].build()];
        expect(a.layers[0].id).not.toBe(b.layers[0].id);
    });
});
