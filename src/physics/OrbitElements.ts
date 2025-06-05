/**
 * 軌道要素の計算と管理を行うクラス
 * satellite.jsライブラリを使用して軌道要素の変換と計算を実行
 */

interface OrbitalElements {
    inclination: number;      // 軌道傾斜角 (degrees)
    raan: number;            // 昇交点経度 (degrees)
    eccentricity: number;    // 離心率
    argOfPerigee: number;    // 近地点引数 (degrees)
    meanAnomaly: number;     // 平均近点角 (degrees)
    altitude: number;        // 高度 (km)
    semiMajorAxis: number;   // 長半径 (km)
    period: number;          // 軌道周期 (minutes)
    meanMotion: number;      // 平均運動 (rad/s)
}

export type { OrbitalElements };

export class OrbitElementsCalculator {
    private static readonly EARTH_RADIUS = 6378.137;  // km
    private static readonly EARTH_MU = 3.986004418e14;  // m³/s²
    
    /**
     * 基本軌道要素から計算された軌道要素を取得
     */
    public static calculateOrbitalElements(
        inclination: number,
        raan: number,
        eccentricity: number,
        argOfPerigee: number,
        meanAnomaly: number,
        altitude: number
    ): OrbitalElements {
        // 長半径を計算
        const semiMajorAxis = this.EARTH_RADIUS + altitude;
        
        // 軌道周期を計算 (ケプラーの第3法則)
        const semiMajorAxisMeters = semiMajorAxis * 1000;
        const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxisMeters, 3) / this.EARTH_MU);
        const periodMinutes = periodSeconds / 60;
        
        // 平均運動を計算
        const meanMotion = Math.sqrt(this.EARTH_MU / Math.pow(semiMajorAxisMeters, 3));
        
        return {
            inclination,
            raan,
            eccentricity,
            argOfPerigee,
            meanAnomaly,
            altitude,
            semiMajorAxis,
            period: periodMinutes,
            meanMotion
        };
    }
    
    /**
     * 度からラジアンに変換
     */
    public static degToRad(degrees: number): number {
        return degrees * Math.PI / 180;
    }
    
    /**
     * ラジアンから度に変換
     */
    public static radToDeg(radians: number): number {
        return radians * 180 / Math.PI;
    }
    
    /**
     * 軌道要素の妥当性をチェック
     */
    public static validateElements(elements: Partial<OrbitalElements>): string[] {
        const errors: string[] = [];
        
        if (elements.inclination !== undefined && (elements.inclination < 0 || elements.inclination > 180)) {
            errors.push("軌道傾斜角は0-180度の範囲で入力してください");
        }
        
        if (elements.raan !== undefined && (elements.raan < 0 || elements.raan >= 360)) {
            errors.push("昇交点経度は0-360度の範囲で入力してください");
        }
        
        if (elements.eccentricity !== undefined && (elements.eccentricity < 0 || elements.eccentricity >= 1)) {
            errors.push("離心率は0-0.99の範囲で入力してください");
        }
        
        if (elements.argOfPerigee !== undefined && (elements.argOfPerigee < 0 || elements.argOfPerigee >= 360)) {
            errors.push("近地点引数は0-360度の範囲で入力してください");
        }
        
        if (elements.meanAnomaly !== undefined && (elements.meanAnomaly < 0 || elements.meanAnomaly >= 360)) {
            errors.push("平均近点角は0-360度の範囲で入力してください");
        }
        
        if (elements.altitude !== undefined && (elements.altitude < 200 || elements.altitude > 36000)) {
            errors.push("高度は200-36000kmの範囲で入力してください");
        }
        
        return errors;
    }
    
    /**
     * デフォルトのISS軌道要素を取得
     */
    public static getISSElements(): OrbitalElements {
        return this.calculateOrbitalElements(
            51.6,  // ISS軌道傾斜角
            0,     // 昇交点経度
            0,     // 離心率（円軌道）
            0,     // 近地点引数
            0,     // 平均近点角
            408    // ISS平均高度
        );
    }
    
    /**
     * 軌道要素から軌道周期での位置を計算（簡易版）
     */
    public static calculatePositionAtTime(elements: OrbitalElements, timeSeconds: number): {
        trueAnomaly: number;
        radius: number;
    } {
        // 平均近点角の計算（時間発展）
        const meanAnomalyRad = this.degToRad(elements.meanAnomaly) + elements.meanMotion * timeSeconds;
        
        // 簡易計算（離心率が小さい場合の近似）
        let trueAnomaly = meanAnomalyRad;
        if (elements.eccentricity > 0.001) {
            // ケプラー方程式の簡易解法（ニュートン法1回）
            const eccentricAnomaly = meanAnomalyRad + elements.eccentricity * Math.sin(meanAnomalyRad);
            trueAnomaly = 2 * Math.atan(Math.sqrt((1 + elements.eccentricity) / (1 - elements.eccentricity)) * Math.tan(eccentricAnomaly / 2));
        }
        
        // 軌道上の距離（km）
        const radius = elements.semiMajorAxis * (1 - elements.eccentricity * elements.eccentricity) / 
                      (1 + elements.eccentricity * Math.cos(trueAnomaly));
        
        return {
            trueAnomaly: this.radToDeg(trueAnomaly),
            radius
        };
    }
}