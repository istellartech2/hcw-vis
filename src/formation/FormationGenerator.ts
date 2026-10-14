import { Satellite } from '../simulation/Satellite.js';
import { OrbitInitializer } from '../simulation/OrbitInitializer.js';
import { SATELLITE_PALETTE } from '@/store/settings';
import type { FormationConfig, FormationLayer } from './FormationTypes.js';

/** フォーメーション設定から衛星配列を生成する */
export class FormationGenerator {
    private orbitInitializer: OrbitInitializer;

    constructor(meanMotion: number) {
        this.orbitInitializer = new OrbitInitializer(meanMotion);
    }

    updateMeanMotion(meanMotion: number): void {
        this.orbitInitializer.updateMeanMotion(meanMotion);
    }

    setJ2StableArrangement(enabled: boolean, ssCoefficient: number): void {
        this.orbitInitializer.setJ2StableArrangement(enabled, ssCoefficient);
    }

    /** 先頭は基準衛星（原点）、続いて有効なレイヤーの衛星 */
    generateSatellites(config: FormationConfig): Satellite[] {
        const reference = new Satellite(0, 0, 0, 0, 0, 0, '#ffffff');
        const layers = config.layers.filter((layer) => layer.enabled);
        return [reference, ...layers.flatMap((layer) => this.generateLayerSatellites(layer))];
    }

    private generateLayerSatellites(layer: FormationLayer): Satellite[] {
        const initialConditions = this.orbitInitializer.generatePositions(
            layer.pattern,
            layer.satelliteCount,
            layer.radius || 10,
            layer,
        );

        return initialConditions.map((ic, i) => {
            const color = layer.colorMode === 'random' ? SATELLITE_PALETTE[i % SATELLITE_PALETTE.length] : layer.color;
            const satellite = new Satellite(ic.x0, ic.y0, ic.z0, ic.vx0, ic.vy0, ic.vz0, color);
            satellite.metadata = {
                shape: layer.shape,
                size: layer.size,
                color,
                boxRatios: layer.boxRatios,
                rotation: layer.rotation,
            };
            return satellite;
        });
    }
}
