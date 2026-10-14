/**
 * フォーメーション設定を扱う純粋関数。
 *
 * 設定は appStore の `formation` が唯一の正で、ここにある関数は
 * 新しい設定オブジェクトを返すだけ（引数は変更しない）。
 */

import {
    DEFAULT_FORMATION_CONFIG,
    DEFAULT_LAYER,
    FORMATION_FILE_VERSION,
    type FormationConfig,
    type FormationLayer,
    type ValidationResult,
} from './FormationTypes';
import { decodeFormation } from './formationDecoder';

const MAX_SATELLITES_PER_LAYER = 100000;

/** 1 グループが生成できる衛星数の上限（多すぎると描画が固まる） */
export const MAX_GENERATED_SATELLITES = 20000;

export function createDefaultFormation(): FormationConfig {
    return structuredClone(DEFAULT_FORMATION_CONFIG);
}

/**
 * レイヤーを差し替えた設定を返す。説明（シナリオの観察ポイントなど）は元の配置についてのものなので、
 * 利用者が配置を編集したら消す
 */
function withLayers(config: FormationConfig, layers: FormationLayer[]): FormationConfig {
    const { description: _description, ...rest } = config;
    return { ...rest, layers };
}

export function addLayer(config: FormationConfig, name?: string): FormationConfig {
    const layer: FormationLayer = {
        ...structuredClone(DEFAULT_LAYER),
        id: crypto.randomUUID(),
        name: name ?? `グループ ${config.layers.length + 1}`,
    };
    return withLayers(config, [...config.layers, layer]);
}

export function removeLayer(config: FormationConfig, layerId: string): FormationConfig {
    return withLayers(
        config,
        config.layers.filter((l) => l.id !== layerId),
    );
}

export function updateLayer(
    config: FormationConfig,
    layerId: string,
    updates: Partial<FormationLayer>,
): FormationConfig {
    return withLayers(
        config,
        config.layers.map((l) => (l.id === layerId ? { ...l, ...updates, id: l.id } : l)),
    );
}

export function toggleLayer(config: FormationConfig, layerId: string): FormationConfig {
    const layer = config.layers.find((l) => l.id === layerId);
    return layer ? updateLayer(config, layerId, { enabled: !layer.enabled }) : config;
}

/** レイヤーを offset（-1: 上へ, +1: 下へ）だけ移動する。範囲外なら変更しない */
export function moveLayer(config: FormationConfig, layerId: string, offset: -1 | 1): FormationConfig {
    const from = config.layers.findIndex((l) => l.id === layerId);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= config.layers.length) return config;
    const layers = [...config.layers];
    [layers[from], layers[to]] = [layers[to], layers[from]];
    return withLayers(config, layers);
}

/**
 * レイヤーが実際に生成する衛星数。
 * `satelliteCount` の意味はパターンごとに違う（軸上は各軸の片側の機数、格子は片側の格子数）ので、
 * 表示にはこちらを使う。OrbitInitializer の生成ロジックと一致させること。
 */
export function layerSatelliteCount(layer: Pick<FormationLayer, 'pattern' | 'satelliteCount'>): number {
    const n = Math.max(0, Math.floor(layer.satelliteCount));
    switch (layer.pattern) {
        case 'origin':
            return 1;
        case 'axis':
            return n * 6;
        case 'grid':
            return (2 * n + 1) ** 3 - 1;
        default:
            return n;
    }
}

/** 有効なレイヤーが生成する衛星数の合計（基準衛星は含まない） */
export function countSatellites(config: FormationConfig): number {
    return config.layers.filter((l) => l.enabled).reduce((sum, l) => sum + layerSatelliteCount(l), 0);
}

/** 保存用の JSON 文字列。バージョンは常に現在のファイル形式で書き出す */
export function serializeFormation(config: FormationConfig): string {
    return JSON.stringify({ ...config, version: FORMATION_FILE_VERSION }, null, 2);
}

/** 保存時のファイル名。OS で使えない文字は _ に置き換える */
export function formationFileName(config: Pick<FormationConfig, 'name'>): string {
    const stem = config.name
        // oxlint-disable-next-line no-control-regex -- 制御文字もファイル名に使えないので置き換える
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
        .trim()
        .slice(0, 100);
    return `${stem || 'formation'}.json`;
}

export type ParseResult = { ok: true; config: FormationConfig } | { ok: false; errors: string[] };

/**
 * JSON 文字列をフォーメーション設定として読み込む。
 * `JSON.parse` の結果は unknown として扱い、型の検査（decodeFormation）と
 * 値の範囲の検査（validateFormation）の両方を通ったものだけを返す。
 * @param fallbackName ファイルに name が無いときに使う名前（ファイル名など）
 */
export function parseFormation(json: string, fallbackName?: string): ParseResult {
    let raw: unknown;
    try {
        raw = JSON.parse(json);
    } catch (error) {
        return {
            ok: false,
            errors: [`JSON として読めません: ${error instanceof Error ? error.message : String(error)}`],
        };
    }
    const decoded = decodeFormation(raw, fallbackName);
    if (!decoded.ok) return decoded;
    const validation = validateFormation(decoded.config);
    return validation.valid ? decoded : { ok: false, errors: validation.errors };
}

/** 型が正しい設定について、値の範囲や組み合わせを検査する */
export function validateFormation(config: FormationConfig): ValidationResult {
    const errors: string[] = [];
    if (config.name.trim().length === 0) errors.push('フォーメーション名が空です');
    config.layers.forEach((layer, index) => errors.push(...validateLayer(layer, index)));
    return { valid: errors.length === 0, errors };
}

function validateLayer(layer: FormationLayer, index: number): string[] {
    const errors: string[] = [];
    const prefix = `グループ ${index + 1} (${layer.name}): `;

    if (
        !Number.isInteger(layer.satelliteCount) ||
        layer.satelliteCount < 1 ||
        layer.satelliteCount > MAX_SATELLITES_PER_LAYER
    ) {
        errors.push(`${prefix}衛星数は1〜${MAX_SATELLITES_PER_LAYER}の整数で指定してください`);
    } else if (layerSatelliteCount(layer) > MAX_GENERATED_SATELLITES) {
        errors.push(`${prefix}生成される衛星が ${MAX_GENERATED_SATELLITES} 機を超えます`);
    }

    if (layer.placementMode === 'radius' && !(layer.radius && layer.radius > 0)) {
        errors.push(`${prefix}範囲は正の数を指定してください`);
    } else if (layer.placementMode === 'spacing' && !(layer.spacing && layer.spacing > 0)) {
        errors.push(`${prefix}衛星間距離は正の数を指定してください`);
    }

    if (!(layer.size > 0)) errors.push(`${prefix}サイズは正の数を指定してください`);

    if (layer.shape === 'box') {
        const ratios = layer.boxRatios;
        if (!ratios) {
            errors.push(`${prefix}直方体の比率が指定されていません`);
        } else if (ratios.x <= 0 || ratios.y <= 0 || ratios.z <= 0) {
            errors.push(`${prefix}直方体の比率は正の数を指定してください`);
        }
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(layer.color)) {
        errors.push(`${prefix}色は16進数カラーコード（例: #ff6b6b）で指定してください`);
    }

    return errors;
}
