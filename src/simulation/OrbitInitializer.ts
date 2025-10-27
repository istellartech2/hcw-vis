export interface InitialCondition {
    x0: number;
    y0: number;
    z0: number;
    vx0: number;
    vy0: number;
    vz0: number;
}

interface DiskLatticePoint {
    x: number;
    y: number;
    theta: number;
    radiusEuclid: number;
}

interface HexLatticePoint extends DiskLatticePoint {
    q: number;
    r: number;
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
    
    generatePositions(
        pattern: string,
        count: number,
        radius: number,       // m
        zSpread: number,      // m
        zAmplitudeMultiplier?: number,
        positiveZ?: boolean,
        periodicParams?: { A: number, B: number, D: number, E: number, F: number },
        spacing?: number      // m - satellite spacing (alternative to radius for disk patterns)
    ): InitialCondition[] {
        const positions: InitialCondition[] = [];
        
        switch (pattern) {
            case 'axis':
                return this.generateAxisPositions(count, radius, spacing);

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
                return this.generateHexagonalDisk(count, radius, spacing);
            case 'square_lattice_disk':
                return this.generateSquareLatticeDisk(count, radius, spacing);
            case 'concentric_disk':
                return this.generateConcentricDisk(count, radius, spacing);
                
            default:
                return this.generateAxisPositions(count, radius);
        }
    }
    
    private generateAxisPositions(count: number, radius: number, spacing?: number): InitialCondition[] {
        const positions: InitialCondition[] = [];
        const axisPositions: number[] = [];
        const eachAxisSatNum = count * 3;

        // 各軸に配置する位置を計算（ゼロ点を除外）
        if (spacing !== undefined) {
            // Spacing mode: place satellites at fixed intervals
            for (let i = 1; i <= eachAxisSatNum; i++) {
                const position = spacing * i;
                axisPositions.push(-position); // 負の方向
                axisPositions.push(position);  // 正の方向
            }
        } else {
            // Radius mode: distribute satellites within radius
            for (let i = 1; i <= eachAxisSatNum; i++) {
                const position = (radius * i) / count;
                axisPositions.push(-position); // 負の方向
                axisPositions.push(position);  // 正の方向
            }
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
                approachDistance = radius * (i + 1) / count;
            }

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
                approachDistance = radius * (i + 1) / count;
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
                vz0: vz0
            });
        }

        return positions;
    }
    
    private generateHexagonalDisk(count: number, radius: number, spacing?: number): InitialCondition[] {
        const hexPoints = this.generateHexLatticePoints(count);
        return this.createDiskInitialConditions(hexPoints, radius, spacing);
    }

    private generateSquareLatticeDisk(count: number, radius: number, spacing?: number): InitialCondition[] {
        const squarePoints = this.generateSquareLatticePoints(count);
        return this.createDiskInitialConditions(squarePoints, radius, spacing);
    }

    private createDiskInitialConditions(points: DiskLatticePoint[], radius: number, spacing?: number): InitialCondition[] {
        const positions: InitialCondition[] = [];

        if (points.length === 0) {
            return positions;
        }

        const sqrt5 = Math.sqrt(5);
        const sqrt3 = Math.sqrt(3);

        const hasSpacing = spacing !== undefined && Number.isFinite(spacing) && (spacing as number) > 0;
        const maxEuclidRadius = points.reduce((max, point) => Math.max(max, point.radiusEuclid), 0);

        let radialScale: number;
        if (hasSpacing) {
            radialScale = spacing as number;
        } else if (maxEuclidRadius > 0 && radius > 0) {
            radialScale = radius / maxEuclidRadius;
        } else if (maxEuclidRadius > 0) {
            // radius未指定時の安全な正規化
            radialScale = 1 / maxEuclidRadius;
        } else {
            radialScale = 0;
        }

        for (const point of points) {
            const rPhysical = point.radiusEuclid * radialScale;
            const theta = point.theta;

            const x0 = (rPhysical / sqrt5) * Math.cos(theta);
            const y0 = (2 * rPhysical / sqrt5) * Math.sin(theta);
            const z0 = (sqrt3 * rPhysical / sqrt5) * Math.cos(theta);

            const vx0 = (rPhysical * this.n / sqrt5) * Math.sin(theta);

            // J2安定配置: vy0 = -2nc·x0 を満たす初期速度
            // 通常: vy0 = -2n·x0
            const c = this.useJ2StableArrangement ? this.ssCoefficient : 1.0;
            const vy0 = -(2 * rPhysical * this.n * c / sqrt5) * Math.cos(theta);

            const vz0 = (sqrt3 * rPhysical * this.n / sqrt5) * Math.sin(theta);

            positions.push({
                x0,
                y0,
                z0,
                vx0,
                vy0,
                vz0
            });
        }

        return positions;
    }

    private generateHexLatticePoints(count: number): HexLatticePoint[] {
        const candidates: HexLatticePoint[] = [];

        if (count <= 0) {
            return candidates;
        }

        const requiredRings = this.computeRequiredHexRings(count) + 1; // 余剰リングを追加して円形クリッピングに余裕を持たせる

        for (let ring = 0; ring <= requiredRings; ring++) {
            candidates.push(...this.enumerateHexRing(ring));
        }

        candidates.sort((a, b) => {
            if (a.radiusEuclid !== b.radiusEuclid) {
                return a.radiusEuclid - b.radiusEuclid;
            }
            return a.theta - b.theta;
        });

        return candidates.slice(0, count);
    }

    private generateSquareLatticePoints(count: number): DiskLatticePoint[] {
        if (count <= 0) {
            return [];
        }

        const result: DiskLatticePoint[] = [];
        const visited = new Set<string>();
        const minHeap = new MinHeap<DiskLatticePoint>((a, b) => {
            if (a.radiusEuclid !== b.radiusEuclid) {
                return a.radiusEuclid - b.radiusEuclid;
            }
            return a.theta - b.theta;
        });

        const enqueue = (x: number, y: number) => {
            const key = `${x},${y}`;
            if (visited.has(key)) {
                return;
            }
            visited.add(key);
            minHeap.push(this.createSquareLatticePoint(x, y));
        };

        enqueue(0, 0);

        const neighborOffsets: Array<[number, number]> = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
        ];

        while (result.length < count && !minHeap.isEmpty()) {
            const point = minHeap.pop();
            if (!point) {
                break;
            }
            result.push(point);

            for (const [dx, dy] of neighborOffsets) {
                enqueue(point.x + dx, point.y + dy);
            }
        }

        return result.slice(0, count);
    }

    private enumerateHexRing(ring: number): HexLatticePoint[] {
        const ringPoints: HexLatticePoint[] = [];

        if (ring === 0) {
            ringPoints.push(this.createHexLatticePoint(0, 0));
            return ringPoints;
        }

        let q = ring;
        let r = 0;
        const directions = [
            { dq: -1, dr: 1 },
            { dq: -1, dr: 0 },
            { dq: 0, dr: -1 },
            { dq: 1, dr: -1 },
            { dq: 1, dr: 0 },
            { dq: 0, dr: 1 }
        ];

        for (const dir of directions) {
            for (let step = 0; step < ring; step++) {
                ringPoints.push(this.createHexLatticePoint(q, r));
                q += dir.dq;
                r += dir.dr;
            }
        }

        return ringPoints;
    }

    private createHexLatticePoint(q: number, r: number): HexLatticePoint {
        const x = q + 0.5 * r;
        const y = (Math.sqrt(3) / 2) * r;
        const radiusEuclid = Math.hypot(x, y);
        const theta = radiusEuclid === 0 ? 0 : Math.atan2(y, x);

        return { q, r, x, y, theta, radiusEuclid };
    }

    private computeRequiredHexRings(count: number): number {
        if (count <= 1) {
            return 0;
        }

        const safeCount = Math.max(1, count);
        const discriminant = Math.max(0, 12 * safeCount - 3);
        const rings = Math.ceil((-3 + Math.sqrt(discriminant)) / 6);
        return Math.max(0, rings);
    }

    private createSquareLatticePoint(x: number, y: number): DiskLatticePoint {
        const radiusEuclid = Math.hypot(x, y);
        const theta = radiusEuclid === 0 ? 0 : Math.atan2(y, x);
        return { x, y, theta, radiusEuclid };
    }

    private generateConcentricDisk(count: number, radius: number, spacing?: number): InitialCondition[] {
        const positions: InitialCondition[] = [];

        if (count <= 0) {
            return positions;
        }

        const sqrt5 = Math.sqrt(5);
        const sqrt3 = Math.sqrt(3);

        // スペーシングを決定
        // spacing指定の場合: ユーザー指定の衛星間距離を使用
        // radius指定の場合: 衛星数から自動計算
        let ringSpacing: number;
        let maxRadius: number;

        if (spacing !== undefined && spacing > 0) {
            // 衛星間距離ベース
            ringSpacing = spacing;
            // 最大半径は制限なし（必要なリング数から自動決定）
            maxRadius = Infinity;
        } else {
            // 範囲ベース（従来の方法）
            if (radius <= 0) {
                for (let i = 0; i < count; i++) {
                    positions.push({ x0: 0, y0: 0, z0: 0, vx0: 0, vy0: 0, vz0: 0 });
                }
                return positions;
            }
            const normalizedCount = Math.max(1, count);
            ringSpacing = Math.max(radius / Math.ceil(Math.sqrt(normalizedCount)), radius / normalizedCount, 1e-6);
            maxRadius = radius;
        }

        interface RingConfig {
            radius: number;
            nodes: number;
        }

        const rings: RingConfig[] = [];
        let remaining = count;
        let level = 0;

        while (remaining > 0 && level < 1000) {
            if (level === 0) {
                rings.push({ radius: 0, nodes: 1 });
                remaining -= 1;
            } else {
                const rawRadius = level * ringSpacing;
                const r = Math.min(rawRadius, maxRadius);
                const circumference = 2 * Math.PI * Math.max(r, ringSpacing);
                const estimatedNodes = Math.round(circumference / ringSpacing);
                let nodes = Math.max(6, estimatedNodes);
                nodes = Math.max(1, Math.min(nodes, remaining));
                rings.push({ radius: r, nodes });
                remaining -= nodes;
            }
            level += 1;
        }

        for (let ringIndex = 0; ringIndex < rings.length && positions.length < count; ringIndex++) {
            const { radius: ringRadius, nodes } = rings[ringIndex];
            if (nodes <= 0) {
                continue;
            }

            const deltaTheta = (2 * Math.PI) / nodes;
            const offset = ringIndex % 2 === 0 ? 0 : deltaTheta / 2;

            for (let node = 0; node < nodes && positions.length < count; node++) {
                const theta = offset + node * deltaTheta;
                const cosTheta = Math.cos(theta);
                const sinTheta = Math.sin(theta);

                const x0 = (ringRadius / sqrt5) * cosTheta;
                const y0 = (2 * ringRadius / sqrt5) * sinTheta;
                const z0 = (sqrt3 * ringRadius / sqrt5) * cosTheta;

                const vx0 = (ringRadius * this.n / sqrt5) * sinTheta;

                // J2安定配置: vy0 = -2nc·x0 を満たす初期速度
                // 通常: vy0 = -2n·x0
                const c = this.useJ2StableArrangement ? this.ssCoefficient : 1.0;
                const vy0 = -(2 * ringRadius * this.n * c / sqrt5) * cosTheta;

                const vz0 = (sqrt3 * ringRadius * this.n / sqrt5) * sinTheta;

                positions.push({ x0, y0, z0, vx0, vy0, vz0 });
            }
        }

        while (positions.length < count) {
            positions.push({ x0: 0, y0: 0, z0: 0, vx0: 0, vy0: 0, vz0: 0 });
        }

        return positions;
    }
}

class MinHeap<T> {
    private heap: T[] = [];
    private compare: (a: T, b: T) => number;

    constructor(compare: (a: T, b: T) => number) {
        this.compare = compare;
    }

    push(value: T): void {
        this.heap.push(value);
        this.bubbleUp(this.heap.length - 1);
    }

    pop(): T | undefined {
        if (this.heap.length === 0) {
            return undefined;
        }
        const top = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0 && end !== undefined) {
            this.heap[0] = end;
            this.bubbleDown(0);
        }
        return top;
    }

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    private bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) {
                break;
            }
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }

    private bubbleDown(index: number): void {
        const length = this.heap.length;
        while (true) {
            let smallest = index;
            const left = 2 * index + 1;
            const right = 2 * index + 2;

            if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
                smallest = left;
            }
            if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
                smallest = right;
            }
            if (smallest === index) {
                break;
            }
            this.swap(index, smallest);
            index = smallest;
        }
    }

    private swap(i: number, j: number): void {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
}
