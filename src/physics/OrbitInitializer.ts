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
    | 'xy_ellipse' 
    | 'circular_orbit'
    | 'vbar_approach'
    | 'rbar_approach'
    | 'hexagonal_disk';

export class OrbitInitializer {
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
        radius: number, 
        zSpread: number,
        zAmplitudeMultiplier?: number
    ): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const radiusKm = radius / 1000;
        const zSpreadKm = zSpread / 1000;
        
        switch (pattern) {
            case 'axis':
                return this.generateAxisPositions(count, radiusKm);
                
            case 'grid':
                return this.generateGridPositions(count, radiusKm);
                
            case 'random_position':
                return this.generateRandomPositions(count, radiusKm);
                
            case 'random_position_velocity':
                return this.generateRandomPositionsVelocities(count, radiusKm);
                
            case 'random_periodic':
                return this.generateRandomPeriodic(count, radiusKm);
                
            case 'xy_ellipse':
                return this.generateXYEllipse(count, radiusKm, zAmplitudeMultiplier);
                
            case 'circular_orbit':
                return this.generateCircularOrbit(count, radiusKm);
                
            case 'vbar_approach':
                return this.generateVBarApproach(count, radiusKm);
                
            case 'rbar_approach':
                return this.generateRBarApproach(count, radiusKm);
                
            case 'hexagonal_disk':
                return this.generateHexagonalDisk(count, radiusKm);
                
            default:
                return this.generateAxisPositions(count, radiusKm);
        }
    }
    
    private generateAxisPositions(count: number, radiusKm: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const axisPositions: number[] = [];
        const eachAxisSatNum = count * 3;
        
        // 各軸に配置する位置を計算（ゼロ点を除外）
        for (let i = 1; i <= eachAxisSatNum; i++) {
            const position = (radiusKm * i) / count;
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
    
    private generateGridPositions(count: number, radiusKm: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const gridValues: number[] = [];
        
        // 各軸の格子点を計算
        for (let i = -count; i <= count; i++) {
            const value = (i * radiusKm) / count;
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
    
    private generateRandomPositions(count: number, radiusKm: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        
        for (let i = 0; i < count; i++) {
            positions.push({
                x0: (Math.random() * 2 - 1) * radiusKm,
                y0: (Math.random() * 2 - 1) * radiusKm,
                z0: (Math.random() * 2 - 1) * radiusKm,
                vx0: 0,
                vy0: 0,
                vz0: 0
            });
        }
        
        return positions;
    }
    
    private generateRandomPositionsVelocities(count: number, radiusKm: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const maxVelocity = radiusKm * 3 * this.n;
        
        for (let i = 0; i < count; i++) {
            positions.push({
                x0: (Math.random() * 2 - 1) * radiusKm,
                y0: (Math.random() * 2 - 1) * radiusKm,
                z0: (Math.random() * 2 - 1) * radiusKm,
                vx0: (Math.random() * 2 - 1) * maxVelocity,
                vy0: (Math.random() * 2 - 1) * maxVelocity,
                vz0: (Math.random() * 2 - 1) * maxVelocity
            });
        }
        
        return positions;
    }
    
    private generateRandomPeriodic(count: number, radiusKm: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const maxVelocityPeriodic = radiusKm * 3 * this.n;
        
        for (let i = 0; i < count; i++) {
            const x0 = (Math.random() * 2 - 1) * radiusKm;
            positions.push({
                x0: x0,
                y0: (Math.random() * 2 - 1) * radiusKm,
                z0: (Math.random() * 2 - 1) * radiusKm,
                vx0: (Math.random() * 2 - 1) * maxVelocityPeriodic,
                vy0: -2 * this.n * x0, // ドリフト消失条件
                vz0: (Math.random() * 2 - 1) * maxVelocityPeriodic
            });
        }
        
        return positions;
    }
    
    private generateXYEllipse(count: number, radiusKm: number, zAmplitudeMultiplier: number = 0): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const rho = radiusKm;
        const z_amplitude = zAmplitudeMultiplier * radiusKm;
        
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
        
        return positions;
    }
    
    private generateCircularOrbit(count: number, radiusKm: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const radius_circular = radiusKm;
        const z_amplitude = Math.sqrt(3) * radiusKm;
        
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
    
    private generateVBarApproach(count: number, radiusKm: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        
        // V-bar軌道: 速度ベクトル方向（Y軸、Along-track）からの接近
        // 宇宙ステーションの後方から接近する安全な軌道
        for (let i = 0; i < count; i++) {
            const approachDistance = radiusKm * (1 + i * 0.5); // 段階的に配置
            
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
    
    private generateRBarApproach(count: number, radiusKm: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        
        // R-bar軌道: 径方向（X軸、Radial）からの接近
        // 宇宙ステーションの下方（地球側）から接近する軌道
        for (let i = 0; i < count; i++) {
            const approachDistance = radiusKm * (1 + i * 0.5); // 段階的に配置
            
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
    
    private generateHexagonalDisk(count: number, radiusKm: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        
        // 円盤内の正六角形タイリング
        // 半径radiusKm内に頂点を配置
        
        // まず必要な層数を計算
        // 総数が指定数に近くなるように層数を決定
        let totalPoints = 1; // 中心点
        let layers = 0;
        
        while (totalPoints < count) {
            layers++;
            totalPoints += 6 * layers;
        }
        
        // 格子間隔を計算（円盤内に収まるように）
        const latticeSpacing = radiusKm / (layers + 0.5);
        
        // z軸の振幅（circular_orbitを参考に）
        const z_amplitude = Math.sqrt(3) * latticeSpacing;
        
        // 中心点を追加
        positions.push({
            x0: 0,
            y0: 0,
            z0: 0,
            vx0: 0,
            vy0: 0,
            vz0: 0
        });
        
        // 各層の点を追加
        let pointCount = 1;
        for (let layer = 1; layer <= layers && pointCount < count; layer++) {
            const layerRadius = layer * latticeSpacing;
            
            // 各層には6*layer個の点がある
            const pointsInLayer = 6 * layer;
            
            for (let i = 0; i < pointsInLayer && pointCount < count; i++) {
                // 六角形の6つの辺に沿って配置
                // 各辺にはlayer個の点
                const side = Math.floor(i / layer);
                const positionOnSide = i % layer;
                
                // 頂点の角度を計算
                const baseAngle = side * Math.PI / 3; // 60度ずつ
                const nextAngle = (side + 1) * Math.PI / 3;
                
                // 辺に沿った補間
                const t = positionOnSide / layer;
                const angle = baseAngle + t * (nextAngle - baseAngle);
                
                // xy座標を計算
                const x = layerRadius * Math.cos(angle);
                const y = layerRadius * Math.sin(angle);
                
                // Hill方程式の周期解を適用
                // 位相を各点で変える
                const phase = angle;
                
                const x0 = x;
                const y0 = -2 * x * Math.sin(phase);
                const z0 = z_amplitude * Math.cos(phase) * (layerRadius / radiusKm);
                
                // 速度成分（Hill方程式の周期解）
                const vx0 = this.n * y0 / 2;
                const vy0 = -2 * this.n * x0;
                const vz0 = -this.n * z_amplitude * Math.sin(phase) * (layerRadius / radiusKm);
                
                positions.push({
                    x0: x0,
                    y0: y0,
                    z0: z0,
                    vx0: vx0,
                    vy0: vy0,
                    vz0: vz0
                });
                
                pointCount++;
            }
        }
        
        return positions;
    }
}