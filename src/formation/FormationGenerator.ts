/**
 * フォーメーション設計から衛星配列を生成するクラス
 */

import { Satellite } from '../simulation/Satellite.js';
import { OrbitInitializer } from '../simulation/OrbitInitializer.js';
import type { FormationConfig, FormationLayer } from './FormationTypes.js';

export interface SatelliteMetadata {
    layerId: string;
    layerName: string;
    shape: string;
    size: number;
    color: string;
    boxRatios?: { x: number, y: number, z: number };
    rotation?: { r: number, s: number };
    model3dFile?: string;
}

export class FormationGenerator {
    private orbitInitializer: OrbitInitializer;

    constructor(meanMotion: number) {
        this.orbitInitializer = new OrbitInitializer(meanMotion);
    }

    /**
     * 平均運動を更新
     */
    updateMeanMotion(meanMotion: number): void {
        this.orbitInitializer.updateMeanMotion(meanMotion);
    }

    /**
     * J2安定配置の設定を更新
     */
    setJ2StableArrangement(enabled: boolean, ssCoefficient: number): void {
        this.orbitInitializer.setJ2StableArrangement(enabled, ssCoefficient);
    }

    /**
     * フォーメーション設定から衛星配列を生成
     */
    generateSatellites(config: FormationConfig): Satellite[] {
        const satellites: Satellite[] = [];

        // 主衛星（中心）を追加
        const centerSatellite = new Satellite(0, 0, 0, 0, 0, 0, '#ffffff');
        satellites.push(centerSatellite);

        // 有効なレイヤーから衛星を生成
        const enabledLayers = config.layers.filter(layer => layer.enabled);

        for (const layer of enabledLayers) {
            const layerSatellites = this.generateLayerSatellites(layer);
            satellites.push(...layerSatellites);
        }

        return satellites;
    }

    /**
     * 単一レイヤーから衛星を生成
     */
    private generateLayerSatellites(layer: FormationLayer): Satellite[] {
        const satellites: Satellite[] = [];

        // ランダム色用のカラーパレット
        const randomColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff'];

        // パターンに応じたパラメータを準備
        const radius = layer.radius || 10; // Default radius if not specified
        const zAmplitude = layer.zAmplitude;
        const positiveZ = layer.positiveZ;
        const spacing = layer.spacing;

        // 楕円軌道パラメータの変換
        let periodicParams: { A: number, B: number, D: number, E: number, F: number } | undefined;
        if (layer.periodicParams) {
            periodicParams = {
                A: layer.periodicParams.A,
                B: layer.periodicParams.B,
                D: layer.periodicParams.D,
                E: layer.periodicParams.E,
                F: layer.periodicParams.F
            };
        }

        // OrbitInitializerを使用して初期条件を生成
        const initialConditions = this.orbitInitializer.generatePositions(
            layer.pattern,
            layer.satelliteCount,
            radius,
            0, // zSpread（将来的に追加可能）
            zAmplitude,
            positiveZ,
            periodicParams,
            spacing
        );

        // 各初期条件から衛星を生成
        for (let i = 0; i < initialConditions.length; i++) {
            const ic = initialConditions[i];

            // 色を決定（colorModeに応じて）
            const satelliteColor = layer.colorMode === 'random'
                ? randomColors[i % randomColors.length]
                : layer.color;

            const satellite = new Satellite(
                ic.x0,
                ic.y0,
                ic.z0,
                ic.vx0,
                ic.vy0,
                ic.vz0,
                satelliteColor
            );

            // メタデータを衛星に付加（拡張プロパティとして）
            (satellite as any).metadata = {
                layerId: layer.id,
                layerName: layer.name,
                shape: layer.shape,
                size: layer.size,
                color: satelliteColor,
                boxRatios: layer.boxRatios,
                rotation: layer.rotation,
                model3dFile: layer.model3dFile
            } as SatelliteMetadata;

            satellites.push(satellite);
        }

        return satellites;
    }

    /**
     * 衛星のメタデータを取得
     */
    static getSatelliteMetadata(satellite: Satellite): SatelliteMetadata | undefined {
        return (satellite as any).metadata;
    }

    /**
     * フォーメーションの統計情報を取得
     */
    getStatistics(config: FormationConfig): {
        totalLayers: number;
        enabledLayers: number;
        totalSatellites: number;
        satellitesByLayer: Map<string, number>;
    } {
        const enabledLayers = config.layers.filter(layer => layer.enabled);
        const satellitesByLayer = new Map<string, number>();

        for (const layer of enabledLayers) {
            satellitesByLayer.set(layer.name, layer.satelliteCount);
        }

        const totalSatellites = enabledLayers.reduce((sum, layer) => sum + layer.satelliteCount, 0) + 1; // +1 for center satellite

        return {
            totalLayers: config.layers.length,
            enabledLayers: enabledLayers.length,
            totalSatellites,
            satellitesByLayer
        };
    }
}
