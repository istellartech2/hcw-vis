/**
 * 読み込んだ JSON（unknown）を FormationConfig に変換する。
 *
 * `JSON.parse(...) as FormationConfig` のような型アサーションは使わず、
 * フィールドごとに実行時の型を確かめて新しいオブジェクトを組み立てる。
 * - 型が違う値（数値の欄に文字列など）はエラーにする
 * - 省略できる欄が無ければ既定値で補う（古い JSON との互換のため）
 * - 未知のフィールドは捨てる
 * 値の範囲（衛星数の上限など）の検査は formationConfig.ts の validateFormation が行う。
 */

import {
    ALL_PATTERNS,
    GRID_PLANES,
    DEFAULT_LAYER,
    FORMATION_FILE_VERSION,
    type FormationConfig,
    type FormationLayer,
    type PatternType,
    type PlacementMode,
    type ShapeType,
} from './FormationTypes';

export type DecodeResult = { ok: true; config: FormationConfig } | { ok: false; errors: string[] };

const SHAPES: readonly ShapeType[] = ['sphere', 'cube', 'box', '3dfile'];
const PLACEMENT_MODES: readonly PlacementMode[] = ['radius', 'spacing'];
const COLOR_MODES: readonly FormationLayer['colorMode'][] = ['uniform', 'random'];

type Obj = Record<string, unknown>;

function isObject(value: unknown): value is Obj {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** フィールドを読みながらエラーを集める小さなリーダー */
class Reader {
    constructor(
        private readonly obj: Obj,
        private readonly prefix: string,
        private readonly errors: string[],
    ) {}

    private fail(key: string, expected: string): undefined {
        this.errors.push(`${this.prefix}${key} は${expected}で指定してください`);
        return undefined;
    }

    has(key: string): boolean {
        return this.obj[key] !== undefined;
    }

    string(key: string): string | undefined {
        const v = this.obj[key];
        if (v === undefined) return undefined;
        return typeof v === 'string' ? v : this.fail(key, '文字列');
    }

    number(key: string): number | undefined {
        const v = this.obj[key];
        if (v === undefined) return undefined;
        return typeof v === 'number' && Number.isFinite(v) ? v : this.fail(key, '数値');
    }

    boolean(key: string): boolean | undefined {
        const v = this.obj[key];
        if (v === undefined) return undefined;
        return typeof v === 'boolean' ? v : this.fail(key, 'true / false');
    }

    oneOf<T extends string>(key: string, options: readonly T[]): T | undefined {
        const v = this.obj[key];
        if (v === undefined) return undefined;
        if ((options as readonly unknown[]).includes(v)) return v as T;
        // 選択肢が多いと読めないので、そのときは値だけを示す
        if (options.length > 4) {
            this.errors.push(`${this.prefix}${key} の値 ${JSON.stringify(v)} には対応していません`);
            return undefined;
        }
        return this.fail(key, `${options.join(' / ')} のいずれか`);
    }

    /** 数値だけを持つオブジェクト（{ x, y, z } など）。どれか 1 つでも欠けたり型が違えばエラー */
    numbers<K extends string>(key: string, keys: readonly K[]): Record<K, number> | undefined {
        const v = this.obj[key];
        if (v === undefined) return undefined;
        const expected = `{ ${keys.join(', ')} } の数値`;
        if (!isObject(v)) return this.fail(key, expected);
        const result = {} as Record<K, number>;
        for (const k of keys) {
            const n = v[k];
            if (typeof n !== 'number' || !Number.isFinite(n)) return this.fail(key, expected);
            result[k] = n;
        }
        return result;
    }
}

function decodeLayer(raw: unknown, index: number, errors: string[]): FormationLayer | null {
    const label = `グループ ${index + 1}`;
    if (!isObject(raw)) {
        errors.push(`${label}: オブジェクトではありません`);
        return null;
    }
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name : label;
    const r = new Reader(raw, `${label} (${name}): `, errors);
    const before = errors.length;

    const pattern = r.oneOf<PatternType>('pattern', ALL_PATTERNS);
    if (!r.has('pattern')) errors.push(`${label} (${name}): pattern（配置パターン）がありません`);
    const satelliteCount = r.number('satelliteCount');
    if (!r.has('satelliteCount')) errors.push(`${label} (${name}): satelliteCount（衛星数）がありません`);

    const layer: FormationLayer = {
        id: r.string('id') ?? '',
        name: r.string('name') ?? name,
        enabled: r.boolean('enabled') ?? true,
        pattern: pattern ?? DEFAULT_LAYER.pattern,
        placementMode: r.oneOf('placementMode', PLACEMENT_MODES) ?? DEFAULT_LAYER.placementMode,
        radius: r.number('radius'),
        spacing: r.number('spacing'),
        satelliteCount: satelliteCount ?? DEFAULT_LAYER.satelliteCount,
        shape: r.oneOf('shape', SHAPES) ?? DEFAULT_LAYER.shape,
        size: r.number('size') ?? DEFAULT_LAYER.size,
        boxRatios: r.numbers('boxRatios', ['x', 'y', 'z']),
        rotation: r.numbers('rotation', ['r', 's']),
        colorMode: r.oneOf('colorMode', COLOR_MODES) ?? DEFAULT_LAYER.colorMode,
        color: r.string('color') ?? DEFAULT_LAYER.color,
        model3dFile: r.string('model3dFile'),
        zAmplitude: r.number('zAmplitude'),
        periodicParams: r.numbers('periodicParams', ['A', 'B', 'D', 'E', 'F']),
        positiveZ: r.boolean('positiveZ'),
        rswOffset: r.numbers('rswOffset', ['r', 's', 'w']),
        rswVelocity: r.numbers('rswVelocity', ['r', 's', 'w']),
        gridPlane: r.oneOf('gridPlane', GRID_PLANES),
    };
    if (errors.length > before) return null;

    // 省略された任意項目はキーごと消して、保存し直したときに undefined が混ざらないようにする
    for (const key of Object.keys(layer) as (keyof FormationLayer)[]) {
        if (layer[key] === undefined) delete layer[key];
    }
    return layer;
}

export function decodeFormation(raw: unknown, fallbackName?: string): DecodeResult {
    if (!isObject(raw)) {
        return {
            ok: false,
            errors: ['フォーメーション設定の JSON ではありません（最上位がオブジェクトではありません）'],
        };
    }
    const errors: string[] = [];
    const r = new Reader(raw, '', errors);

    const version = r.string('version');
    if (version === undefined && !r.has('version')) {
        errors.push('version がありません。このアプリで保存した JSON か確認してください');
    } else if (version !== undefined && version.split('.')[0] !== FORMATION_FILE_VERSION.split('.')[0]) {
        errors.push(`対応していないバージョンです（ファイル: ${version}、対応: ${FORMATION_FILE_VERSION}）`);
    }
    if (!Array.isArray(raw.layers)) {
        errors.push('layers（衛星グループの一覧）がありません');
        return { ok: false, errors };
    }

    const name = r.string('name');
    const description = r.string('description');
    const createdAt = r.string('createdAt');
    const layers = raw.layers.map((layer, index) => decodeLayer(layer, index, errors));
    if (errors.length > 0) return { ok: false, errors };

    // ID は UI のキーに使うので、欠けていたり重複していたら振り直す
    const seen = new Set<string>();
    const fixedLayers = (layers as FormationLayer[]).map((layer) => {
        const id = layer.id && !seen.has(layer.id) ? layer.id : crypto.randomUUID();
        seen.add(id);
        return id === layer.id ? layer : { ...layer, id };
    });

    return {
        ok: true,
        config: {
            version: FORMATION_FILE_VERSION,
            name: name?.trim() ? name : (fallbackName ?? '読み込んだフォーメーション'),
            ...(description !== undefined && { description }),
            createdAt: createdAt ?? new Date().toISOString(),
            layers: fixedLayers,
        },
    };
}
