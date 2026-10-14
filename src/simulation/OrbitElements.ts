/**
 * 基準軌道の軌道要素と、satellite.js（SGP4）による ECI 位置の計算
 */

import * as satellite from 'satellite.js';

/** 地球赤道半径 (m) */
export const EARTH_RADIUS = 6378137;
/** 地心重力定数 (m³/s²) */
export const EARTH_MU = 3.986004418e14;

export interface OrbitalElements {
    inclination: number; // 軌道傾斜角 (degrees)
    raan: number; // 昇交点経度 (degrees)
    eccentricity: number; // 離心率
    argOfPerigee: number; // 近地点引数 (degrees)
    meanAnomaly: number; // 平均近点角 (degrees)
    altitude: number; // 高度 (m)
    semiMajorAxis: number; // 長半径 (m)
    period: number; // 軌道周期 (minutes)
    meanMotion: number; // 平均運動 (rad/s)
}

/** 高度 altitudeKm の円軌道の周期（分） */
export function orbitPeriodMinutes(altitudeKm: number): number {
    return (2 * Math.PI * Math.sqrt((EARTH_RADIUS + altitudeKm * 1000) ** 3 / EARTH_MU)) / 60;
}

/** 軌道要素ごとの SGP4 レコード（初期化は重いので一度だけ行う） */
const satrecCache = new WeakMap<OrbitalElements, satellite.SatRec>();

export class OrbitElementsCalculator {
    /**
     * 基本軌道要素から計算された軌道要素を取得
     */
    public static calculateOrbitalElements(
        inclination: number,
        raan: number,
        eccentricity: number,
        argOfPerigee: number,
        meanAnomaly: number,
        altitude: number, // m (meters)
    ): OrbitalElements {
        const semiMajorAxis = EARTH_RADIUS + altitude;
        // 平均運動と軌道周期（ケプラーの第3法則）
        const meanMotion = Math.sqrt(EARTH_MU / Math.pow(semiMajorAxis, 3));
        const periodMinutes = (2 * Math.PI) / meanMotion / 60;

        return {
            inclination,
            raan,
            eccentricity,
            argOfPerigee,
            meanAnomaly,
            altitude,
            semiMajorAxis,
            period: periodMinutes,
            meanMotion,
        };
    }

    /**
     * 軌道要素の妥当性をチェック
     */
    public static validateElements(elements: Partial<OrbitalElements>): string[] {
        const errors: string[] = [];

        if (elements.inclination !== undefined && (elements.inclination < 0 || elements.inclination > 180)) {
            errors.push('軌道傾斜角は0-180度の範囲で入力してください');
        }

        if (elements.raan !== undefined && (elements.raan < 0 || elements.raan >= 360)) {
            errors.push('昇交点経度は0-360度の範囲で入力してください');
        }

        if (elements.eccentricity !== undefined && (elements.eccentricity < 0 || elements.eccentricity >= 1)) {
            errors.push('離心率は0-0.99の範囲で入力してください');
        }

        if (elements.argOfPerigee !== undefined && (elements.argOfPerigee < 0 || elements.argOfPerigee >= 360)) {
            errors.push('近地点引数は0-360度の範囲で入力してください');
        }

        if (elements.meanAnomaly !== undefined && (elements.meanAnomaly < 0 || elements.meanAnomaly >= 360)) {
            errors.push('平均近点角は0-360度の範囲で入力してください');
        }

        if (elements.altitude !== undefined && (elements.altitude < 200000 || elements.altitude > 36000000)) {
            errors.push('高度は200-36000kmの範囲で入力してください');
        }

        return errors;
    }

    /**
     * 軌道要素からTLE形式の文字列を生成してsatellite.jsのSGP4レコードを作成
     */
    private static createSatelliteRecord(elements: OrbitalElements): satellite.SatRec {
        // 簡単なTLE形式を生成（実際のTLEではないが、satellite.jsで動作する形式）
        const meanMotionRevPerDay = (elements.meanMotion * 86400) / (2 * Math.PI);

        // TLE Line 1 format: 1 NNNNNC NNNNNAAA NNNNN.NNNNNNNN +.NNNNNNNN +NNNNN-N +NNNNN-N N NNNNN
        const line1 = `1 25544U 98067A   21275.51782528  .00000286  00000-0  12847-4 0  9991`;

        // TLE Line 2 format: 2 NNNNN NNN.NNNN NNN.NNNN NNNNNNN NNN.NNNN NNN.NNNN NN.NNNNNNNNNNNNNN
        const inclination = elements.inclination.toFixed(4).padStart(8);
        const raan = elements.raan.toFixed(4).padStart(8);
        const eccentricity = (elements.eccentricity * 10000000).toFixed(0).padStart(7, '0');
        const argOfPerigee = elements.argOfPerigee.toFixed(4).padStart(8);
        const meanAnomaly = elements.meanAnomaly.toFixed(4).padStart(8);
        const meanMotion = meanMotionRevPerDay.toFixed(8).padStart(11);

        const line2 = `2 25544 ${inclination} ${raan} ${eccentricity} ${argOfPerigee} ${meanAnomaly} ${meanMotion}00001`;

        return satellite.twoline2satrec(line1, line2);
    }

    /**
     * satellite.jsを使用してECI座標系の位置と速度、緯度経度高度を取得
     */
    public static getECIPosition(
        elements: OrbitalElements,
        date: Date = new Date(),
    ): {
        position: { x: number; y: number; z: number };
        velocity: { x: number; y: number; z: number };
        geodetic: { latitude: number; longitude: number; altitude: number };
    } | null {
        try {
            let satrec = satrecCache.get(elements);
            if (!satrec) {
                satrec = this.createSatelliteRecord(elements);
                satrecCache.set(elements, satrec);
            }
            const result = satellite.propagate(satrec, date);
            if (!result?.position || !result.velocity) return null;

            // ECI座標から緯度経度高度を計算
            const positionGd = satellite.eciToGeodetic(result.position, satellite.gstime(date));
            // satellite.js は km, km/s で返すので m, m/s に換算する
            return {
                position: {
                    x: result.position.x * 1000,
                    y: result.position.y * 1000,
                    z: result.position.z * 1000,
                },
                velocity: {
                    x: result.velocity.x * 1000,
                    y: result.velocity.y * 1000,
                    z: result.velocity.z * 1000,
                },
                geodetic: {
                    latitude: satellite.degreesLat(positionGd.latitude),
                    longitude: satellite.degreesLong(positionGd.longitude),
                    altitude: positionGd.height * 1000,
                },
            };
        } catch (error) {
            console.error('ECI position calculation failed:', error);
            return null;
        }
    }
}
