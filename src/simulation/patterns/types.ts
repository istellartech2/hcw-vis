export interface InitialCondition {
    x0: number;
    y0: number;
    z0: number;
    vx0: number;
    vy0: number;
    vz0: number;
}

export interface DiskLatticePoint {
    x: number;
    y: number;
    theta: number;
    radiusEuclid: number;
}

export interface HexLatticePoint extends DiskLatticePoint {
    q: number;
    r: number;
}
