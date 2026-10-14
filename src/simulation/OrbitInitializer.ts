import { generateConcentricDisk, generateHexagonalDisk, generateSquareLatticeDisk } from './diskPatterns';

/** Hill 座標系での初期状態（位置 m・速度 m/s） */
export interface InitialCondition {
    x0: number;
    y0: number;
    z0: number;
    vx0: number;
    vy0: number;
    vz0: number;
}

/** パターンごとの追加パラメータ（使わないパターンでは無視される） */
export interface PatternOptions {
    /** 周期軌道（旧形式）の W 振幅倍率 */
    zAmplitude?: number;
    /** 円軌道で W 振幅を正側に取るか */
    positiveZ?: boolean;
    /** 周期軌道のパラメータ（指定があれば zAmplitude より優先） */
    periodicParams?: { A: number; B: number; D: number; E: number; F: number };
    /** 衛星間距離 (m)。指定があれば radius の代わりに使う */
    spacing?: number;
    /** 原点・軸上パターンの RSW オフセット (m) */
    rswOffset?: { r: number; s: number; w: number };
}

const at = (x0: number, y0: number, z0: number): InitialCondition => ({ x0, y0, z0, vx0: 0, vy0: 0, vz0: 0 });
const randomSigned = (scale: number) => (Math.random() * 2 - 1) * scale;

export class OrbitInitializer {
    /** 平均運動 (rad/s) */
    private n: number;
    private useJ2StableArrangement = false;
    /** SS係数c（デフォルトは1.0 = J2摂動なし） */
    private ssCoefficient = 1.0;

    constructor(n: number) {
        this.n = n;
    }

    updateMeanMotion(n: number): void {
        this.n = n;
    }

    setJ2StableArrangement(enabled: boolean, ssCoefficient: number = 1.0): void {
        this.useJ2StableArrangement = enabled;
        this.ssCoefficient = ssCoefficient;
    }

    /** 未知のパターンは軸上配置になる */
    generatePositions(
        pattern: string,
        count: number,
        radius: number, // m
        options: PatternOptions = {},
    ): InitialCondition[] {
        const { spacing, rswOffset } = options;
        // ディスク系パターン用: J2安定配置が無効なら c = 1.0
        const disk = { n: this.n, ssCoefficient: this.useJ2StableArrangement ? this.ssCoefficient : 1.0 };

        switch (pattern) {
            case 'origin':
                return [at(rswOffset?.r || 0, rswOffset?.s || 0, rswOffset?.w || 0)];
            case 'grid':
                return this.generateGridPositions(count, radius, spacing);
            case 'random_position':
                return Array.from({ length: count }, () =>
                    at(randomSigned(radius), randomSigned(radius), randomSigned(radius)),
                );
            case 'random_position_velocity':
                return this.generateRandomPositionsVelocities(count, radius);
            case 'random_periodic':
                return this.generateRandomPeriodic(count, radius);
            case 'periodic_orbit':
                return this.generatePeriodicOrbit(count, radius, options.zAmplitude, options.periodicParams);
            case 'circular_orbit':
                return this.generateCircularOrbit(count, radius, options.positiveZ ?? true);
            case 'vbar_approach':
                return this.generateVBarApproach(count, radius, spacing);
            case 'rbar_approach':
                return this.generateRBarApproach(count, radius, spacing);
            case 'hexagonal_disk':
                return generateHexagonalDisk(count, radius, spacing, disk);
            case 'square_lattice_disk':
                return generateSquareLatticeDisk(count, radius, spacing, disk);
            case 'concentric_disk':
                return generateConcentricDisk(count, radius, spacing, disk);
            case 'axis':
                return this.generateAxisPositions(count, radius, spacing, rswOffset);
            default:
                return this.generateAxisPositions(count, radius);
        }
    }

    /** R・S・W の各軸上に、原点を挟んで ±方向へ count 機ずつ並べる */
    private generateAxisPositions(
        count: number,
        radius: number,
        spacing?: number,
        rswOffset?: { r: number; s: number; w: number },
    ): InitialCondition[] {
        const offsetR = rswOffset?.r || 0;
        const offsetS = rswOffset?.s || 0;
        const offsetW = rswOffset?.w || 0;

        // 軸上の座標（ゼロ点を除く）: -d1, d1, -d2, d2, ...
        const axisPositions: number[] = [];
        for (let i = 1; i <= count; i++) {
            const position = spacing !== undefined ? spacing * i : (radius * i) / count;
            axisPositions.push(-position, position);
        }

        return [
            ...axisPositions.map((p) => at(p + offsetR, offsetS, offsetW)),
            ...axisPositions.map((p) => at(offsetR, p + offsetS, offsetW)),
            ...axisPositions.map((p) => at(offsetR, offsetS, p + offsetW)),
        ];
    }

    /** 3D 格子（原点を除く）。各軸 -count..count */
    private generateGridPositions(count: number, radius: number, spacing?: number): InitialCondition[] {
        const gridValues: number[] = [];
        for (let i = -count; i <= count; i++) {
            gridValues.push(spacing !== undefined ? i * spacing : (i * radius) / count);
        }

        const positions: InitialCondition[] = [];
        for (const x of gridValues) {
            for (const y of gridValues) {
                for (const z of gridValues) {
                    if (x === 0 && y === 0 && z === 0) continue;
                    positions.push(at(x, y, z));
                }
            }
        }
        return positions;
    }

    private generateRandomPositionsVelocities(count: number, radius: number): InitialCondition[] {
        const maxVelocity = radius * 3 * this.n;
        return Array.from({ length: count }, () => ({
            x0: randomSigned(radius),
            y0: randomSigned(radius),
            z0: randomSigned(radius),
            vx0: randomSigned(maxVelocity),
            vy0: randomSigned(maxVelocity),
            vz0: randomSigned(maxVelocity),
        }));
    }

    private generateRandomPeriodic(count: number, radius: number): InitialCondition[] {
        const maxVelocity = radius * 3 * this.n;
        return Array.from({ length: count }, () => {
            const x0 = randomSigned(radius);
            return {
                x0,
                y0: randomSigned(radius),
                z0: randomSigned(radius),
                vx0: randomSigned(maxVelocity),
                vy0: -2 * this.n * x0, // ドリフト消失条件
                vz0: randomSigned(maxVelocity),
            };
        });
    }

    /**
     * 周期軌道。位相 phase = nt を等間隔に取った HCW 周期解
     *   x = A cos + B sin, y = -2A sin + 2B cos + D, z = E cos + F sin
     * の位置と速度。periodicParams が無い旧形式は A = radius, E = zAmplitude·radius の楕円
     */
    private generatePeriodicOrbit(
        count: number,
        radius: number,
        zAmplitudeMultiplier: number = 0,
        periodicParams?: { A: number; B: number; D: number; E: number; F: number },
    ): InitialCondition[] {
        const n = this.n;
        return Array.from({ length: count }, (_, i) => {
            const phase = (2 * Math.PI * i) / count;
            const cos = Math.cos(phase);
            const sin = Math.sin(phase);

            if (periodicParams) {
                const { A, B, D, E, F } = periodicParams;
                return {
                    x0: A * cos + B * sin,
                    y0: -2 * A * sin + 2 * B * cos + D,
                    z0: E * cos + F * sin,
                    vx0: -A * n * sin + B * n * cos,
                    vy0: -2 * A * n * cos - 2 * B * n * sin,
                    vz0: -E * n * sin + F * n * cos,
                };
            }

            const zAmplitude = zAmplitudeMultiplier * radius;
            return {
                x0: radius * cos,
                y0: -2 * radius * sin,
                z0: zAmplitude * cos,
                vx0: -radius * n * sin,
                vy0: -2 * radius * n * cos,
                vz0: -n * zAmplitude * sin,
            };
        });
    }

    /** 基準衛星から一定距離を保つ円軌道（W 振幅 √3·radius） */
    private generateCircularOrbit(count: number, radius: number, positiveZ: boolean): InitialCondition[] {
        const zAmplitude = Math.sqrt(3) * radius * (positiveZ ? 1 : -1);
        return Array.from({ length: count }, (_, i) => {
            const phase = (2 * Math.PI * i) / count;
            const x0 = radius * Math.cos(phase);
            return {
                x0,
                y0: -2 * radius * Math.sin(phase),
                z0: zAmplitude * Math.cos(phase),
                vx0: -this.n * radius * Math.sin(phase),
                vy0: -2 * this.n * x0,
                vz0: -this.n * zAmplitude * Math.sin(phase),
            };
        });
    }

    /** i 機目の接近距離（spacing 間隔、なければ radius までを等分） */
    private approachDistance(i: number, count: number, radius: number, spacing?: number): number {
        return spacing !== undefined ? spacing * (i + 1) : (radius * (i + 1)) / count;
    }

    /** V-bar 接近: 後方（S 軸負方向）から軌道進行方向に沿って近づく */
    private generateVBarApproach(count: number, radius: number, spacing?: number): InitialCondition[] {
        return Array.from({ length: count }, (_, i) => {
            const d = this.approachDistance(i, count, radius, spacing);
            return { x0: 0, y0: -d, z0: 0, vx0: 0, vy0: this.n * d * 0.5, vz0: 0 };
        });
    }

    /** R-bar 接近: 下方（地球側、R 軸負方向）から近づく */
    private generateRBarApproach(count: number, radius: number, spacing?: number): InitialCondition[] {
        return Array.from({ length: count }, (_, i) => {
            const d = this.approachDistance(i, count, radius, spacing);
            const x0 = -d;
            return { x0, y0: 0, z0: 0, vx0: this.n * d * 0.3, vy0: -2 * this.n * x0, vz0: 0 };
        });
    }
}
