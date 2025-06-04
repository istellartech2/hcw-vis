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
    | 'circular_orbit';

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
        zSpread: number
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
                return this.generateXYEllipse(count, radiusKm);
                
            case 'circular_orbit':
                return this.generateCircularOrbit(count, radiusKm);
                
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
            const position = (radiusKm * i) / eachAxisSatNum;
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
    
    private generateXYEllipse(count: number, radiusKm: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const rho = radiusKm;
        
        for (let i = 0; i < count; i++) {
            const phase = (2 * Math.PI * i) / count;
            
            const x0 = rho * Math.cos(phase);
            const y0 = -2 * rho * Math.sin(phase);
            const vx0 = -rho * this.n * Math.sin(phase);
            const vy0 = -2 * rho * this.n * Math.cos(phase);
            
            positions.push({
                x0: x0,
                y0: y0,
                z0: 0,
                vx0: vx0,
                vy0: vy0,
                vz0: 0
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
}