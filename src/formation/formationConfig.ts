/**
 * フォーメーション設定を扱う純粋関数。
 *
 * 設定は appStore の `formation` が唯一の正で、ここにある関数は
 * 新しい設定オブジェクトを返すだけ（引数は変更しない）。
 */

import {
    ALL_PATTERNS,
    DEFAULT_FORMATION_CONFIG,
    DEFAULT_LAYER,
    type FormationConfig,
    type FormationLayer,
    type ValidationResult,
} from './FormationTypes';

const MAX_SATELLITES_PER_LAYER = 100000;

export function createDefaultFormation(): FormationConfig {
    return structuredClone(DEFAULT_FORMATION_CONFIG);
}

export function addLayer(config: FormationConfig, name?: string): FormationConfig {
    const layer: FormationLayer = {
        ...structuredClone(DEFAULT_LAYER),
        id: crypto.randomUUID(),
        name: name ?? `レイヤー ${config.layers.length + 1}`,
    };
    return { ...config, layers: [...config.layers, layer] };
}

export function removeLayer(config: FormationConfig, layerId: string): FormationConfig {
    return { ...config, layers: config.layers.filter((l) => l.id !== layerId) };
}

export function updateLayer(
    config: FormationConfig,
    layerId: string,
    updates: Partial<FormationLayer>,
): FormationConfig {
    return {
        ...config,
        layers: config.layers.map((l) => (l.id === layerId ? { ...l, ...updates, id: l.id } : l)),
    };
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
    return { ...config, layers };
}

/** 有効なレイヤーの衛星数の合計（基準衛星は含まない） */
export function countSatellites(config: FormationConfig): number {
    return config.layers.filter((l) => l.enabled).reduce((sum, l) => sum + l.satelliteCount, 0);
}

export function serializeFormation(config: FormationConfig): string {
    return JSON.stringify(config, null, 2);
}

export type ParseResult = { ok: true; config: FormationConfig } | { ok: false; errors: string[] };

export function parseFormation(json: string): ParseResult {
    let config: FormationConfig;
    try {
        config = JSON.parse(json) as FormationConfig;
    } catch (error) {
        return { ok: false, errors: [`JSON解析エラー: ${error instanceof Error ? error.message : String(error)}`] };
    }
    const validation = validateFormation(config);
    return validation.valid ? { ok: true, config } : { ok: false, errors: validation.errors };
}

export function validateFormation(config: FormationConfig): ValidationResult {
    const errors: string[] = [];

    if (!config || typeof config !== 'object') {
        return { valid: false, errors: ['フォーメーション設定が不正です'] };
    }
    if (!config.version) errors.push('バージョン情報がありません');
    if (!config.name || config.name.trim().length === 0) errors.push('フォーメーション名が空です');
    if (!Array.isArray(config.layers)) {
        errors.push('レイヤー情報が不正です');
        return { valid: false, errors };
    }

    config.layers.forEach((layer, index) => errors.push(...validateLayer(layer, index)));
    return { valid: errors.length === 0, errors };
}

function validateLayer(layer: FormationLayer, index: number): string[] {
    const errors: string[] = [];
    const prefix = `レイヤー ${index + 1} (${layer.name}): `;

    if (!layer.id) errors.push(`${prefix}IDがありません`);
    if (!layer.name) errors.push(`${prefix}名前がありません`);

    if (!(ALL_PATTERNS as readonly string[]).includes(layer.pattern)) {
        errors.push(`${prefix}配置パターンが不正です`);
    }

    if (!(layer.satelliteCount >= 1 && layer.satelliteCount <= MAX_SATELLITES_PER_LAYER)) {
        errors.push(`${prefix}衛星数は1〜${MAX_SATELLITES_PER_LAYER}の範囲で指定してください`);
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

    if (!layer.color || !/^#[0-9a-fA-F]{6}$/.test(layer.color)) {
        errors.push(`${prefix}色は16進数カラーコード（例: #ff6b6b）で指定してください`);
    }

    return errors;
}
