import { generateConcentricDisk, generateHexagonalDisk, generateSquareLatticeDisk } from './patterns/diskPatterns';
import type { InitialCondition } from './patterns/types';

export type { InitialCondition } from './patterns/types';

export type PlacementPattern =
    | 'origin'
    | 'axis'
    | 'grid'
    | 'random_position'
    | 'random_position_velocity'
    | 'random_periodic'
    | 'periodic_orbit'
    | 'circular_orbit'
    | 'vbar_approach'
    | 'rbar_approach'
    | 'hexagonal_disk'
    | 'square_lattice_disk'
    | 'concentric_disk';

export class OrbitInitializer {
    // 平均運動 (rad/s)
    private n: number; // 平均運動（軌道角速度）
    private useJ2StableArrangement: boolean = false; // J2安定配置を使用するか
    private ssCoefficient: number = 1.0; // SS係数c（デフォルトは1.0 = J2摂動なし）

    constructor(n: number) {
        this.n = n;
    }

    updateMeanMotion(n: number): void {
        this.n = n;
    }

    // J2安定配置の設定
    setJ2StableArrangement(enabled: boolean, ssCoefficient: number = 1.0): void {
        this.useJ2StableArrangement = enabled;
        this.ssCoefficient = ssCoefficient;
    }

    // ディスク系パターン用: J2安定配置が無効なら c = 1.0
    private diskPatternOptions() {
        return { n: this.n, ssCoefficient: this.useJ2StableArrangement ? this.ssCoefficient : 1.0 };
    }

    generatePositions(
        pattern: string,
        count: number,
        radius: number, // m
        zSpread: number, // m
        zAmplitudeMultiplier?: number,
        positiveZ?: boolean,
        periodicParams?: { A: number; B: number; D: number; E: number; F: number },
        spacing?: number, // m - satellite spacing (alternative to radius for disk patterns)
        rswOffset?: { r: number; s: number; w: number }, // RSWオフセット（軸上パターン用）
    ): InitialCondition[] {
        switch (pattern) {
            case 'origin':
                return this.generateOriginPosition(rswOffset);

            case 'axis':
                return this.generateAxisPositions(count, radius, spacing, rswOffset);

            case 'grid':
                return this.generateGridPositions(count, radius, spacing);

            case 'random_position':
                return this.generateRandomPositions(count, radius);

            case 'random_position_velocity':
                return this.generateRandomPositionsVelocities(count, radius);

            case 'random_periodic':
                return this.generateRandomPeriodic(count, radius);

            case 'periodic_orbit':
                return this.generatePeriodicOrbit(count, radius, zAmplitudeMultiplier, periodicParams);

            case 'circular_orbit':
                return this.generateCircularOrbit(count, radius, positiveZ ?? true);

            case 'vbar_approach':
                return this.generateVBarApproach(count, radius, spacing);

            case 'rbar_approach':
                return this.generateRBarApproach(count, radius, spacing);

            case 'hexagonal_disk':
                return generateHexagonalDisk(count, radius, spacing, this.diskPatternOptions());
            case 'square_lattice_disk':
                return generateSquareLatticeDisk(count, radius, spacing, this.diskPatternOptions());
            case 'concentric_disk':
                return generateConcentricDisk(count, radius, spacing, this.diskPatternOptions());

            default:
                return this.generateAxisPositions(count, radius);
        }
    }

    private generateAxisPositions(
        count: number,
        radius: number,
        spacing?: number,
        rswOffset?: { r: number; s: number; w: number },
    ): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const axisPositions: number[] = [];
        const eachAxisSatNum = count * 3;

        // RSWオフセットの取得（デフォルトは0）
        const offsetR = rswOffset?.r || 0;
        const offsetS = rswOffset?.s || 0;
        const offsetW = rswOffset?.w || 0;

        // 各軸に配置する位置を計算（ゼロ点を除外）
        if (spacing !== undefined) {
            // Spacing mode: place satellites at fixed intervals
            for (let i = 1; i <= eachAxisSatNum; i++) {
                const position = spacing * i;
                axisPositions.push(-position); // 負の方向
                axisPositions.push(position); // 正の方向
            }
        } else {
            // Radius mode: distribute satellites within radius
            for (let i = 1; i <= eachAxisSatNum; i++) {
                const position = (radius * i) / count;
                axisPositions.push(-position); // 負の方向
                axisPositions.push(position); // 正の方向
            }
        }

        // X軸（R軸）に配置 - オフセットを適用
        for (let i = 0; i < count * 2; i++) {
            positions.push({
                x0: axisPositions[i] + offsetR,
                y0: offsetS,
                z0: offsetW,
                vx0: 0,
                vy0: 0,
                vz0: 0,
            });
        }

        // Y軸（S軸）に配置 - オフセットを適用
        for (let i = 0; i < count * 2; i++) {
            positions.push({
                x0: offsetR,
                y0: axisPositions[i] + offsetS,
                z0: offsetW,
                vx0: 0,
                vy0: 0,
                vz0: 0,
            });
        }

        // Z軸（W軸）に配置 - オフセットを適用
        for (let i = 0; i < count * 2; i++) {
            positions.push({
                x0: offsetR,
                y0: offsetS,
                z0: axisPositions[i] + offsetW,
                vx0: 0,
                vy0: 0,
                vz0: 0,
            });
        }

        return positions;
    }

    /**
     * 原点配置: 原点に1つの衛星を配置（RSWオフセットで位置調整可能）
     */
    private generateOriginPosition(rswOffset?: { r: number; s: number; w: number }): InitialCondition[] {
        const offsetR = rswOffset?.r || 0;
        const offsetS = rswOffset?.s || 0;
        const offsetW = rswOffset?.w || 0;

        return [
            {
                x0: offsetR,
                y0: offsetS,
                z0: offsetW,
                vx0: 0,
                vy0: 0,
                vz0: 0,
            },
        ];
    }

    private generateGridPositions(count: number, radius: number, spacing?: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const gridValues: number[] = [];

        // 各軸の格子点を計算
        if (spacing !== undefined) {
            // Spacing mode: use fixed grid spacing
            for (let i = -count; i <= count; i++) {
                const value = i * spacing;
                gridValues.push(value);
            }
        } else {
            // Radius mode: distribute grid within radius
            for (let i = -count; i <= count; i++) {
                const value = (i * radius) / count;
                gridValues.push(value);
            }
        }

        // 3D格子の全組み合わせを生成（原点を除外）
        for (let i = 0; i < gridValues.length; i++) {
            for (let j = 0; j < gridValues.length; j++) {
                for (let k = 0; k < gridValues.length; k++) {
                    const x = gridValues[i];
                    const y = gridValues[j];
                    const z = gridValues[k];

                    // 原点は除外
                    if (x === 0 && y === 0 && z === 0) continue;

                    positions.push({
                        x0: x,
                        y0: y,
                        z0: z,
                        vx0: 0,
                        vy0: 0,
                        vz0: 0,
                    });
                }
            }
        }

        return positions;
    }

    private generateRandomPositions(count: number, radius: number): InitialCondition[] {
        const positions: InitialCondition[] = [];

        for (let i = 0; i < count; i++) {
            positions.push({
                x0: (Math.random() * 2 - 1) * radius,
                y0: (Math.random() * 2 - 1) * radius,
                z0: (Math.random() * 2 - 1) * radius,
                vx0: 0,
                vy0: 0,
                vz0: 0,
            });
        }

        return positions;
    }

    private generateRandomPositionsVelocities(count: number, radius: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const maxVelocity = radius * 3 * this.n;

        for (let i = 0; i < count; i++) {
            positions.push({
                x0: (Math.random() * 2 - 1) * radius,
                y0: (Math.random() * 2 - 1) * radius,
                z0: (Math.random() * 2 - 1) * radius,
                vx0: (Math.random() * 2 - 1) * maxVelocity,
                vy0: (Math.random() * 2 - 1) * maxVelocity,
                vz0: (Math.random() * 2 - 1) * maxVelocity,
            });
        }

        return positions;
    }

    private generateRandomPeriodic(count: number, radius: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const maxVelocityPeriodic = radius * 3 * this.n;

        for (let i = 0; i < count; i++) {
            const x0 = (Math.random() * 2 - 1) * radius;
            positions.push({
                x0: x0,
                y0: (Math.random() * 2 - 1) * radius,
                z0: (Math.random() * 2 - 1) * radius,
                vx0: (Math.random() * 2 - 1) * maxVelocityPeriodic,
                vy0: -2 * this.n * x0, // ドリフト消失条件
                vz0: (Math.random() * 2 - 1) * maxVelocityPeriodic,
            });
        }

        return positions;
    }

    private generatePeriodicOrbit(
        count: number,
        radius: number,
        zAmplitudeMultiplier: number = 0,
        periodicParams?: { A: number; B: number; D: number; E: number; F: number },
    ): InitialCondition[] {
        const positions: InitialCondition[] = [];

        // Use periodic parameters if provided, otherwise fall back to old behavior
        if (periodicParams) {
            const { A, B, D, E, F } = periodicParams;

            for (let i = 0; i < count; i++) {
                const phase = (2 * Math.PI * i) / count;

                // Hill equation solutions at time t corresponding to phase:
                // x(t) = A cos(nt) + B sin(nt)
                // y(t) = -2A sin(nt) + 2B cos(nt) + D
                // z(t) = E cos(nt) + F sin(nt)

                // Initial positions at phase angle (t = phase/n):
                const x0 = A * Math.cos(phase) + B * Math.sin(phase);
                const y0 = -2 * A * Math.sin(phase) + 2 * B * Math.cos(phase) + D;
                const z0 = E * Math.cos(phase) + F * Math.sin(phase);

                // Initial velocities (derivatives at phase):
                // dx/dt = -An sin(nt) + Bn cos(nt)
                // dy/dt = -2An cos(nt) - 2Bn sin(nt)
                // dz/dt = -En sin(nt) + Fn cos(nt)
                const vx0 = -A * this.n * Math.sin(phase) + B * this.n * Math.cos(phase);
                const vy0 = -2 * A * this.n * Math.cos(phase) - 2 * B * this.n * Math.sin(phase);
                const vz0 = -E * this.n * Math.sin(phase) + F * this.n * Math.cos(phase);

                positions.push({
                    x0: x0,
                    y0: y0,
                    z0: z0,
                    vx0: vx0,
                    vy0: vy0,
                    vz0: vz0,
                });
            }
        } else {
            // Fall back to old behavior for backward compatibility
            const rho = radius;
            const z_amplitude = zAmplitudeMultiplier * radius;

            for (let i = 0; i < count; i++) {
                const phase = (2 * Math.PI * i) / count;

                const x0 = rho * Math.cos(phase);
                const y0 = -2 * rho * Math.sin(phase);
                const z0 = z_amplitude * Math.cos(phase);
                const vx0 = -rho * this.n * Math.sin(phase);
                const vy0 = -2 * rho * this.n * Math.cos(phase);
                const vz0 = -this.n * z_amplitude * Math.sin(phase);

                positions.push({
                    x0: x0,
                    y0: y0,
                    z0: z0,
                    vx0: vx0,
                    vy0: vy0,
                    vz0: vz0,
                });
            }
        }

        return positions;
    }

    private generateCircularOrbit(count: number, radius: number, positiveZ: boolean = true): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const radius_circular = radius;
        const z_amplitude = Math.sqrt(3) * radius * (positiveZ ? 1 : -1);

        for (let i = 0; i < count; i++) {
            const phase = (2 * Math.PI * i) / count;

            const x0 = radius_circular * Math.cos(phase);
            const y0 = -2 * radius_circular * Math.sin(phase);
            const z0 = z_amplitude * Math.cos(phase);

            const vx0 = -this.n * radius_circular * Math.sin(phase);
            const vy0 = -2 * this.n * x0;
            const vz0 = -this.n * z_amplitude * Math.sin(phase);

            positions.push({
                x0: x0,
                y0: y0,
                z0: z0,
                vx0: vx0,
                vy0: vy0,
                vz0: vz0,
            });
        }

        return positions;
    }

    private generateVBarApproach(count: number, radius: number, spacing?: number): InitialCondition[] {
        const positions: InitialCondition[] = [];

        // V-bar軌道: 速度ベクトル方向（Y軸、Along-track）からの接近
        // 宇宙ステーションの後方から接近する安全な軌道
        for (let i = 0; i < count; i++) {
            let approachDistance: number;

            if (spacing !== undefined) {
                // 衛星間距離モード: spacing間隔で配置
                approachDistance = spacing * (i + 1);
            } else {
                // 範囲指定モード: radiusまでの範囲内に均等に配置
                approachDistance = (radius * (i + 1)) / count;
            }

            // 初期位置: 後方から接近（Y軸負の方向）
            const x0 = 0; // 径方向は中央
            const y0 = -approachDistance; // 後方から接近
            const z0 = 0; // 軌道面内

            // ターゲットに向かう初期速度を計算
            // ヒルの方程式の線形解を使用
            const vx0 = 0; // 径方向初期速度は0
            const vy0 = this.n * approachDistance * 0.5; // 適切な接近速度
            const vz0 = 0; // 軌道面内

            positions.push({
                x0: x0,
                y0: y0,
                z0: z0,
                vx0: vx0,
                vy0: vy0,
                vz0: vz0,
            });
        }

        return positions;
    }

    private generateRBarApproach(count: number, radius: number, spacing?: number): InitialCondition[] {
        const positions: InitialCondition[] = [];

        // R-bar軌道: 径方向（X軸、Radial）からの接近
        // 宇宙ステーションの下方（地球側）から接近する軌道
        for (let i = 0; i < count; i++) {
            let approachDistance: number;

            if (spacing !== undefined) {
                // 衛星間距離モード: spacing間隔で配置
                approachDistance = spacing * (i + 1);
            } else {
                // 範囲指定モード: radiusまでの範囲内に均等に配置
                approachDistance = (radius * (i + 1)) / count;
            }

            // 初期位置: 下方から接近（X軸負の方向）
            const x0 = -approachDistance; // 下方から接近
            const y0 = 0; // 軌道進行方向は中央
            const z0 = 0; // 軌道面内

            // R-bar軌道の初期速度
            // 径方向の運動特性を考慮した速度設定
            const vx0 = this.n * approachDistance * 0.3; // 径方向接近速度
            const vy0 = -2 * this.n * x0; // ヒルの方程式による結合項
            const vz0 = 0; // 軌道面内

            positions.push({
                x0: x0,
                y0: y0,
                z0: z0,
                vx0: vx0,
                vy0: vy0,
                vz0: vz0,
            });
        }

        return positions;
    }
}
