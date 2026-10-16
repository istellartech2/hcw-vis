/**
 * 基準衛星の地上軌跡（衛星直下点の緯度経度の列）
 */

import { OrbitElementsCalculator, type OrbitalElements } from './OrbitElements';

export interface LatLon {
    latitude: number; // 度
    longitude: number; // 度（-180〜180）
}

/** 地上軌跡。経度 ±180° をまたぐ所で折れ線を分けてあるので、各折れ線はそのまま地図に描ける */
export interface GroundTrack {
    /** centerDate の 1 周前から centerDate まで */
    past: LatLon[][];
    /** centerDate から 1 周後まで */
    future: LatLon[][];
}

/** 1 周あたりのサンプル数（約 2° ごと） */
const SAMPLES_PER_ORBIT = 180;

/** 経度の変化が 180° を超えたら日付変更線をまたいだとみなして折れ線を分ける */
function splitAtAntimeridian(points: LatLon[]): LatLon[][] {
    const segments: LatLon[][] = [];
    let current: LatLon[] = [];
    for (const point of points) {
        const prev = current[current.length - 1];
        if (prev && Math.abs(point.longitude - prev.longitude) > 180) {
            segments.push(current);
            current = [];
        }
        current.push(point);
    }
    if (current.length > 0) segments.push(current);
    return segments;
}

function sampleTrack(elements: OrbitalElements, fromMs: number, toMs: number, steps: number): LatLon[] {
    const points: LatLon[] = [];
    for (let i = 0; i <= steps; i++) {
        const eci = OrbitElementsCalculator.getECIPosition(elements, new Date(fromMs + ((toMs - fromMs) * i) / steps));
        if (eci) points.push({ latitude: eci.geodetic.latitude, longitude: eci.geodetic.longitude });
    }
    return points;
}

/** centerDate の前後 1 周ずつの地上軌跡を計算する（地球の自転を含むので、周回ごとに西へずれる） */
export function computeGroundTrack(elements: OrbitalElements, centerDate: Date): GroundTrack {
    const periodMs = elements.period * 60 * 1000;
    const center = centerDate.getTime();
    return {
        past: splitAtAntimeridian(sampleTrack(elements, center - periodMs, center, SAMPLES_PER_ORBIT)),
        future: splitAtAntimeridian(sampleTrack(elements, center, center + periodMs, SAMPLES_PER_ORBIT)),
    };
}
