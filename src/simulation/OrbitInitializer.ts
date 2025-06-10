export interface InitialCondition {
    x0: number;
    y0: number;
    z0: number;
    vx0: number;
    vy0: number;
    vz0: number;
}

export type PlacementPattern = 
    | 'axis' 
    | 'grid' 
    | 'random_position' 
    | 'random_position_velocity' 
    | 'random_periodic' 
    | 'periodic_orbit' 
    | 'circular_orbit'
    | 'vbar_approach'
    | 'rbar_approach'
    | 'hexagonal_disk';

export class OrbitInitializer {
    // 平均運動 (rad/s)
    private n: number; // 平均運動（軌道角速度）
    
    constructor(n: number) {
        this.n = n;
    }
    
    updateMeanMotion(n: number): void {
        this.n = n;
    }
    
    generatePositions(
        pattern: string,
        count: number,
        radius: number,       // m
        zSpread: number,      // m
        zAmplitudeMultiplier?: number,
        positiveZ?: boolean,
        periodicParams?: { A: number, B: number, D: number, E: number, F: number }
    ): InitialCondition[] {
        const positions: InitialCondition[] = [];
        
        switch (pattern) {
            case 'axis':
                return this.generateAxisPositions(count, radius);
                
            case 'grid':
                return this.generateGridPositions(count, radius);
                
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
                return this.generateVBarApproach(count, radius);
                
            case 'rbar_approach':
                return this.generateRBarApproach(count, radius);
                
            case 'hexagonal_disk':
                return this.generateHexagonalDisk(count, radius);
                
            default:
                return this.generateAxisPositions(count, radius);
        }
    }
    
    private generateAxisPositions(count: number, radius: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const axisPositions: number[] = [];
        const eachAxisSatNum = count * 3;
        
        // 各軸に配置する位置を計算（ゼロ点を除外）
        for (let i = 1; i <= eachAxisSatNum; i++) {
            const position = (radius * i) / count;
            axisPositions.push(-position); // 負の方向
            axisPositions.push(position);  // 正の方向
        }
        
        // X軸に配置
        for (let i = 0; i < count * 2; i++) {
            positions.push({
                x0: axisPositions[i],
                y0: 0,
                z0: 0,
                vx0: 0,
                vy0: 0,
                vz0: 0
            });
        }
        
        // Y軸に配置
        for (let i = 0; i < count * 2; i++) {
            positions.push({
                x0: 0,
                y0: axisPositions[i],
                z0: 0,
                vx0: 0,
                vy0: 0,
                vz0: 0
            });
        }
        
        // Z軸に配置
        for (let i = 0; i < count * 2; i++) {
            positions.push({
                x0: 0,
                y0: 0,
                z0: axisPositions[i],
                vx0: 0,
                vy0: 0,
                vz0: 0
            });
        }
        
        return positions;
    }
    
    private generateGridPositions(count: number, radius: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const gridValues: number[] = [];
        
        // 各軸の格子点を計算
        for (let i = -count; i <= count; i++) {
            const value = (i * radius) / count;
            gridValues.push(value);
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
                        vz0: 0
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
                vz0: 0
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
                vz0: (Math.random() * 2 - 1) * maxVelocity
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
                vz0: (Math.random() * 2 - 1) * maxVelocityPeriodic
            });
        }
        
        return positions;
    }
    
    private generatePeriodicOrbit(
        count: number, 
        radius: number, 
        zAmplitudeMultiplier: number = 0,
        periodicParams?: { A: number, B: number, D: number, E: number, F: number }
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
                    vz0: vz0
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
                    vz0: vz0
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
                vz0: vz0
            });
        }
        
        return positions;
    }
    
    private generateVBarApproach(count: number, radius: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        
        // V-bar軌道: 速度ベクトル方向（Y軸、Along-track）からの接近
        // 宇宙ステーションの後方から接近する安全な軌道
        for (let i = 0; i < count; i++) {
            const approachDistance = radius * (1 + i * 0.5); // 段階的に配置
            
            // 初期位置: 後方から接近（Y軸負の方向）
            const x0 = 0; // 径方向は中央
            const y0 = -approachDistance; // 後方から接近
            const z0 = 0; // 軌道面内
            
            // ヒルの方程式の解析解を考慮した初期速度
            // V-bar軌道では、適切な接近速度が必要
            const approachTime = Math.PI / this.n; // 半周期での接近を想定
            
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
                vz0: vz0
            });
        }
        
        return positions;
    }
    
    private generateRBarApproach(count: number, radius: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        
        // R-bar軌道: 径方向（X軸、Radial）からの接近
        // 宇宙ステーションの下方（地球側）から接近する軌道
        for (let i = 0; i < count; i++) {
            const approachDistance = radius * (1 + i * 0.5); // 段階的に配置
            
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
                vz0: vz0
            });
        }
        
        return positions;
    }
    
    private generateHexagonalDisk(count: number, radius: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        
        // docs/diskOrbit.mdに基づいた実装
        // 正六角形タイル張り（ハニカム格子）を使用
        
        // Step 1: 必要な最小リング数kを計算
        const k = Math.ceil((-3 + Math.sqrt(12 * count - 3)) / 6);
        
        // Step 2: 軸座標(m, n)の点を生成し、半径の二乗を計算
        interface HexPoint {
            m: number;
            n: number;
            r_sq: number;
            x: number;
            y: number;
        }
        
        const points: HexPoint[] = [];
        
        // 範囲 m = -k ... k でループ
        for (let m = -k; m <= k; m++) {
            // n の有効範囲を d ≤ k 条件で絞る
            const n_min = Math.max(-k, -m - k);
            const n_max = Math.min(k, -m + k);
            
            for (let n = n_min; n <= n_max; n++) {
                // 距離条件をチェック
                const d = (Math.abs(m) + Math.abs(n) + Math.abs(m + n)) / 2;
                if (d <= k) {
                    // 直交座標への変換
                    const x = m + 0.5 * n;
                    const y = (Math.sqrt(3) / 2) * n;
                    
                    // 半径の二乗
                    const r_sq = m * m + m * n + n * n;
                    
                    points.push({ m, n, r_sq, x, y });
                }
            }
        }
        
        // Step 3: r_sq昇順 → theta昇順にソート
        points.sort((a, b) => {
            if (a.r_sq !== b.r_sq) {
                return a.r_sq - b.r_sq;
            }
            // r_sqが同じ場合はthetaでソート
            const theta_a = Math.atan2(a.y, a.x);
            const theta_b = Math.atan2(b.y, b.x);
            return theta_a - theta_b;
        });
        
        // Step 4: 先頭count個を取得し、円軌道の初期条件に変換
        const sqrt5 = Math.sqrt(5);
        
        for (let i = 0; i < Math.min(count, points.length); i++) {
            const point = points[i];
            
            // 極座標に変換
            const r_normalized = Math.sqrt(point.r_sq);
            const theta = Math.atan2(point.y, point.x);
            
            // 実際の半径にスケール
            const r = (r_normalized / k) * radius;
            
            // 円軌道の初期条件（docs/diskOrbit.mdの式を使用）
            const x0 = (r / sqrt5) * Math.cos(theta);
            const y0 = (2 * r / sqrt5) * Math.sin(theta);
            const z0 = (Math.sqrt(3) * r / sqrt5) * Math.cos(theta);
            
            const vx0 = (r * this.n / sqrt5) * Math.sin(theta);
            const vy0 = -(2 * r * this.n / sqrt5) * Math.cos(theta);
            const vz0 = (Math.sqrt(3) * r * this.n / sqrt5) * Math.sin(theta);
            
            positions.push({
                x0: x0,
                y0: y0,
                z0: z0,
                vx0: vx0,
                vy0: vy0,
                vz0: vz0
            });
        }
        
        return positions;
    }
}