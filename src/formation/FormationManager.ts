/**
 * フォーメーション設計システムのレイヤー管理クラス
 */

import type {
    FormationConfig,
    FormationLayer,
    ValidationResult,
    DEFAULT_LAYER
} from './FormationTypes.js';
import { DEFAULT_LAYER as defaultLayerConfig, DEFAULT_FORMATION_CONFIG } from './FormationTypes.js';

export class FormationManager {
    private config: FormationConfig;
    private changeCallbacks: Array<(config: FormationConfig) => void> = [];
    private nextLayerId: number = 1;

    constructor() {
        this.config = this.createDefaultConfig();
    }

    /**
     * デフォルトのフォーメーション設定を作成
     */
    private createDefaultConfig(): FormationConfig {
        return JSON.parse(JSON.stringify(DEFAULT_FORMATION_CONFIG));
    }

    /**
     * デフォルトフォーメーションを読み込む
     */
    loadDefaultFormation(): void {
        this.config = this.createDefaultConfig();
        this.nextLayerId = this.config.layers.length + 1;
        this.notifyChange();
    }

    /**
     * 現在の設定を取得
     */
    getConfig(): FormationConfig {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * 設定を更新
     */
    setConfig(config: FormationConfig): void {
        this.config = config;
        this.notifyChange();
    }

    /**
     * フォーメーション名を設定
     */
    setName(name: string): void {
        this.config.name = name;
        this.notifyChange();
    }

    /**
     * フォーメーション説明を設定
     */
    setDescription(description: string): void {
        this.config.description = description;
        this.notifyChange();
    }

    /**
     * 全レイヤーを取得
     */
    getLayers(): FormationLayer[] {
        return [...this.config.layers];
    }

    /**
     * レイヤーを追加
     */
    addLayer(name?: string): FormationLayer {
        const layerId = `layer-${this.nextLayerId++}`;
        const layerName = name || `レイヤー ${this.config.layers.length + 1}`;

        const newLayer: FormationLayer = {
            ...defaultLayerConfig,
            id: layerId,
            name: layerName
        };

        this.config.layers.push(newLayer);
        this.notifyChange();

        return newLayer;
    }

    /**
     * レイヤーを削除
     */
    removeLayer(layerId: string): boolean {
        const index = this.config.layers.findIndex(l => l.id === layerId);
        if (index === -1) return false;

        this.config.layers.splice(index, 1);
        this.notifyChange();
        return true;
    }

    /**
     * レイヤーを更新
     */
    updateLayer(layerId: string, updates: Partial<FormationLayer>): boolean {
        const layer = this.config.layers.find(l => l.id === layerId);
        if (!layer) return false;

        Object.assign(layer, updates);
        this.notifyChange();
        return true;
    }

    /**
     * レイヤーの順序を変更（上に移動）
     */
    moveLayerUp(layerId: string): boolean {
        const index = this.config.layers.findIndex(l => l.id === layerId);
        if (index <= 0) return false;

        [this.config.layers[index - 1], this.config.layers[index]] =
        [this.config.layers[index], this.config.layers[index - 1]];

        this.notifyChange();
        return true;
    }

    /**
     * レイヤーの順序を変更（下に移動）
     */
    moveLayerDown(layerId: string): boolean {
        const index = this.config.layers.findIndex(l => l.id === layerId);
        if (index === -1 || index >= this.config.layers.length - 1) return false;

        [this.config.layers[index], this.config.layers[index + 1]] =
        [this.config.layers[index + 1], this.config.layers[index]];

        this.notifyChange();
        return true;
    }

    /**
     * レイヤーの有効/無効を切り替え
     */
    toggleLayerEnabled(layerId: string): boolean {
        const layer = this.config.layers.find(l => l.id === layerId);
        if (!layer) return false;

        layer.enabled = !layer.enabled;
        this.notifyChange();
        return true;
    }

    /**
     * 有効なレイヤーの合計衛星数を取得
     */
    getTotalSatelliteCount(): number {
        return this.config.layers
            .filter(layer => layer.enabled)
            .reduce((sum, layer) => sum + layer.satelliteCount, 0);
    }

    /**
     * JSON形式にエクスポート
     */
    exportToJSON(): string {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * JSON形式からインポート
     */
    importFromJSON(jsonString: string): ValidationResult {
        try {
            const config = JSON.parse(jsonString) as FormationConfig;
            const validation = this.validateConfig(config);

            if (!validation.valid) {
                return validation;
            }

            this.config = config;

            // 次のレイヤーIDを更新
            const maxId = config.layers.reduce((max, layer) => {
                const match = layer.id.match(/layer-(\d+)/);
                if (match) {
                    return Math.max(max, parseInt(match[1], 10));
                }
                return max;
            }, 0);
            this.nextLayerId = maxId + 1;

            this.notifyChange();
            return { valid: true, errors: [] };
        } catch (error) {
            return {
                valid: false,
                errors: [`JSON解析エラー: ${error instanceof Error ? error.message : String(error)}`]
            };
        }
    }

    /**
     * 設定をバリデート
     */
    validateConfig(config: FormationConfig): ValidationResult {
        const errors: string[] = [];

        // バージョンチェック
        if (!config.version) {
            errors.push('バージョン情報がありません');
        }

        // 名前チェック
        if (!config.name || config.name.trim().length === 0) {
            errors.push('フォーメーション名が空です');
        }

        // レイヤーチェック
        if (!Array.isArray(config.layers)) {
            errors.push('レイヤー情報が不正です');
            return { valid: false, errors };
        }

        // 各レイヤーのバリデーション
        config.layers.forEach((layer, index) => {
            const layerErrors = this.validateLayer(layer, index);
            errors.push(...layerErrors);
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * レイヤーをバリデート
     */
    private validateLayer(layer: FormationLayer, index: number): string[] {
        const errors: string[] = [];
        const prefix = `レイヤー ${index + 1} (${layer.name}): `;

        // 必須フィールドチェック
        if (!layer.id) errors.push(`${prefix}IDがありません`);
        if (!layer.name) errors.push(`${prefix}名前がありません`);

        // パターンの妥当性チェック
        const validPatterns = [
            'axis', 'grid', 'random_position', 'random_position_velocity', 'random_periodic',
            'periodic_orbit', 'circular_orbit', 'hexagonal_disk', 'square_lattice_disk', 'concentric_disk',
            'vbar_approach', 'rbar_approach'
        ];
        if (!validPatterns.includes(layer.pattern)) {
            errors.push(`${prefix}配置パターンが不正です`);
        }

        // 衛星数チェック
        if (layer.satelliteCount < 1 || layer.satelliteCount > 100000) {
            errors.push(`${prefix}衛星数は1〜100000の範囲で指定してください`);
        }

        // 配置モードに応じたパラメータチェック
        if (layer.placementMode === 'radius') {
            if (!layer.radius || layer.radius <= 0) {
                errors.push(`${prefix}範囲は正の数を指定してください`);
            }
        } else if (layer.placementMode === 'spacing') {
            if (!layer.spacing || layer.spacing <= 0) {
                errors.push(`${prefix}衛星間距離は正の数を指定してください`);
            }
        }

        // サイズチェック
        if (layer.size <= 0) {
            errors.push(`${prefix}サイズは正の数を指定してください`);
        }

        // 直方体の比率チェック
        if (layer.shape === 'box') {
            if (!layer.boxRatios) {
                errors.push(`${prefix}直方体の比率が指定されていません`);
            } else {
                if (layer.boxRatios.x <= 0 || layer.boxRatios.y <= 0 || layer.boxRatios.z <= 0) {
                    errors.push(`${prefix}直方体の比率は正の数を指定してください`);
                }
            }
        }

        // 色チェック
        if (!layer.color || !layer.color.match(/^#[0-9a-fA-F]{6}$/)) {
            errors.push(`${prefix}色は16進数カラーコード（例: #ff6b6b）で指定してください`);
        }

        return errors;
    }

    /**
     * 変更通知のコールバックを登録
     */
    onChange(callback: (config: FormationConfig) => void): void {
        this.changeCallbacks.push(callback);
    }

    /**
     * 変更通知
     */
    private notifyChange(): void {
        const config = this.getConfig();
        this.changeCallbacks.forEach(callback => callback(config));
    }

    /**
     * 設定をリセット（デフォルトフォーメーションに戻す）
     */
    reset(): void {
        this.loadDefaultFormation();
    }
}
