import * as THREE from 'three';

interface SatelliteData {
    x0: number;
    y0: number;
    z0: number;
    vx0: number;
    vy0: number;
    vz0: number;
    color: string;
    trail: THREE.Vector3[];
    trailLine: THREE.Line | null;
}

class Satellite {
    // 初期位置・速度
    x0: number;
    y0: number;
    z0: number;
    vx0: number;
    vy0: number;
    vz0: number;
    
    // 現在の状態（数値積分用）
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    
    color: string;
    trail: THREE.Vector3[];
    trailLine: THREE.Line | null;
    trailGeometry: THREE.BufferGeometry | null;
    trailMaterial: THREE.LineBasicMaterial | null;
    frameCounter: number;  // 軌跡更新の間引き用
    
    constructor(x0: number, y0: number, z0: number, vx0: number, vy0: number, vz0: number, color: string) {
        this.x0 = x0;
        this.y0 = y0;
        this.z0 = z0;
        this.vx0 = vx0;
        this.vy0 = vy0;
        this.vz0 = vz0;
        
        // 現在の状態を初期化
        this.x = x0;
        this.y = y0;
        this.z = z0;
        this.vx = vx0;
        this.vy = vy0;
        this.vz = vz0;
        
        this.color = color;
        this.trail = [];
        this.trailLine = null;
        this.trailGeometry = null;
        this.trailMaterial = null;
        this.frameCounter = 0;
    }
    
    getPosition(): { x: number; y: number; z: number } {
        // 数値積分による現在位置を返す
        return { x: this.x, y: this.y, z: this.z };
    }
    
    getVelocity(): { vx: number; vy: number; vz: number } {
        // 現在の速度を返す
        return { vx: this.vx, vy: this.vy, vz: this.vz };
    }
    
    reset() {
        // 初期状態にリセット
        this.x = this.x0;
        this.y = this.y0;
        this.z = this.z0;
        this.vx = this.vx0;
        this.vy = this.vy0;
        this.vz = this.vz0;
        this.trail = [];
        this.frameCounter = 0;
        
        // THREE.jsオブジェクトの適切な解放
        if (this.trailGeometry) {
            this.trailGeometry.dispose();
            this.trailGeometry = null;
        }
        if (this.trailMaterial) {
            this.trailMaterial.dispose();
            this.trailMaterial = null;
        }
        this.trailLine = null;
    }
    
    dispose() {
        // メモリ解放用
        if (this.trailGeometry) {
            this.trailGeometry.dispose();
        }
        if (this.trailMaterial) {
            this.trailMaterial.dispose();
        }
    }
}

class HillEquationSimulation {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private satellites: Satellite[] = [];
    private satelliteMeshes: THREE.Mesh[] = [];
    private time: number = 0;  // 秒単位
    private dt: number = 0.1;  // 積分時間ステップ（秒）
    private paused: boolean = false;
    private animationFrameCounter: number = 0;  // アニメーションフレームカウンター
    private n: number = 1.126e-3;  // rad/s (地球低軌道高度400km, 軌道周期約92.7分)
    private orbitRadius: number = 6778000;  // m (地球半径 + 高度400km)
    private cameraAngle: number = 0;
    private viewMode: number = 0;
    private mouseX: number = 0;
    private mouseY: number = 0;
    private mouseDown: boolean = false;
    private cameraPhi: number = Math.PI / 3;  // より真上からの視点
    private cameraTheta: number = Math.PI / 4;
    private cameraDistance: number = 400;  // より近い距離
    private gridHelper: THREE.GridHelper;
    private plotContexts: {
        xy: CanvasRenderingContext2D;
        xz: CanvasRenderingContext2D;
        yz: CanvasRenderingContext2D;
    };
    private controls: {
        satelliteCount: HTMLInputElement;
        placementPattern: HTMLSelectElement;
        orbitRadius: HTMLInputElement;
        orbitAltitude: HTMLInputElement;
        orbitRadiusDisplay: HTMLSpanElement;
        timeScale: HTMLSelectElement;
        simulationTime: HTMLSpanElement;
        autoRotate: HTMLInputElement;
        showTrails: HTMLInputElement;
        showGrid: HTMLInputElement;
        trailLength: HTMLInputElement;
        trailLengthValue: HTMLSpanElement;
    };
    
    constructor() {
        this.container = document.getElementById('canvas-container')!;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75, 
            this.container.clientWidth / this.container.clientHeight, 
            0.1, 
            10000
        );
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('canvas') as HTMLCanvasElement,
            antialias: true,
            alpha: true 
        });
        
        this.controls = {
            satelliteCount: document.getElementById('satelliteCount') as HTMLInputElement,
            placementPattern: document.getElementById('placementPattern') as HTMLSelectElement,
            orbitRadius: document.getElementById('orbitRadius') as HTMLInputElement,
            orbitAltitude: document.getElementById('orbitAltitude') as HTMLInputElement,
            orbitRadiusDisplay: document.getElementById('orbitRadiusDisplay') as HTMLSpanElement,
            timeScale: document.getElementById('timeScale') as HTMLSelectElement,
            simulationTime: document.getElementById('simulationTime') as HTMLSpanElement,
            autoRotate: document.getElementById('autoRotate') as HTMLInputElement,
            showTrails: document.getElementById('showTrails') as HTMLInputElement,
            showGrid: document.getElementById('showGrid') as HTMLInputElement,
            trailLength: document.getElementById('trailLength') as HTMLInputElement,
            trailLengthValue: document.getElementById('trailLengthValue') as HTMLSpanElement
        };
        
        this.setupRenderer();
        this.setupLighting();
        this.setupMouseControls();
        this.createAxes();
        this.gridHelper = this.createGrid();
        this.setupPlotContexts();
        this.setupEventListeners();
        this.updateOrbitParameters();  // 初期値で軌道パラメータを計算
        this.initSimulation();
        this.animate();
    }
    
    private setupRenderer(): void {
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // 新しい座標系に合わせてカメラ位置を調整
        // X=Along-track(進行方向), Y=Radial(動径方向-上), Z=Cross-track(軌道面垂直)
        this.camera.position.set(100, 250, 100);
        this.camera.lookAt(0, 0, 0);
    }
    
    private setupLighting(): void {
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 100, 50);
        this.scene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0x4a9eff, 0.5);
        pointLight.position.set(0, 0, 0);
        this.scene.add(pointLight);
    }
    
    private setupMouseControls(): void {
        this.container.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        
        this.container.addEventListener('mousemove', (e) => {
            if (this.mouseDown && !this.controls.autoRotate.checked) {
                const deltaX = e.clientX - this.mouseX;
                const deltaY = e.clientY - this.mouseY;
                this.cameraTheta -= deltaX * 0.01;
                this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi + deltaY * 0.01));
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
            }
        });
        
        this.container.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });
        
        this.container.addEventListener('wheel', (e) => {
            this.cameraDistance *= (1 + e.deltaY * 0.001);
            this.cameraDistance = Math.max(200, Math.min(2000, this.cameraDistance));
        });
    }
    
    private createAxes(): void {
        const axesGroup = new THREE.Group();
        
        // Three.js座標系での軸表示（ヒル方程式座標系に対応）
        // Three.js X軸 = Along-track（進行方向）
        const xGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(300, 0, 0)
        ]);
        const xMaterial = new THREE.LineBasicMaterial({ color: 0x4ecdc4 }); // 青緑（進行方向）
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        axesGroup.add(xAxis);
        
        // Three.js Y軸 = Radial（動径方向）
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 300, 0)
        ]);
        const yMaterial = new THREE.LineBasicMaterial({ color: 0xff6b6b }); // 赤（動径方向）
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        axesGroup.add(yAxis);
        
        // Three.js Z軸 = Cross-track（軌道面垂直）
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 300)
        ]);
        const zMaterial = new THREE.LineBasicMaterial({ color: 0xf7b731 }); // 黄（軌道面垂直）
        const zAxis = new THREE.Line(zGeometry, zMaterial);
        axesGroup.add(zAxis);
        
        this.scene.add(axesGroup);
    }
    
    private createGrid(): THREE.GridHelper {
        const gridHelper = new THREE.GridHelper(1000, 20, 0x444444, 0x222222);
        gridHelper.position.y = -200;
        this.scene.add(gridHelper);
        return gridHelper;
    }
    
    private setupPlotContexts(): void {
        const xyCanvas = document.getElementById('plot-xy') as HTMLCanvasElement;
        const xzCanvas = document.getElementById('plot-xz') as HTMLCanvasElement;
        const yzCanvas = document.getElementById('plot-yz') as HTMLCanvasElement;
        
        this.plotContexts = {
            xy: xyCanvas.getContext('2d')!,
            xz: xzCanvas.getContext('2d')!,
            yz: yzCanvas.getContext('2d')!
        };
    }
    
    // Hill方程式の微分方程式（右辺）
    private hillEquationDerivatives(state: {x: number, y: number, z: number, vx: number, vy: number, vz: number}): 
        {dx: number, dy: number, dz: number, dvx: number, dvy: number, dvz: number} {
        const { x, y, z, vx, vy, vz } = state;
        const n = this.n;
        
        // Hill方程式の加速度項
        // ẍ = 2nẏ + 3n²x
        // ÿ = -2nẋ
        // z̈ = -n²z
        const ax = 2 * n * vy + 3 * n * n * x;
        const ay = -2 * n * vx;
        const az = -n * n * z;
        
        return {
            dx: vx,
            dy: vy,
            dz: vz,
            dvx: ax,
            dvy: ay,
            dvz: az
        };
    }
    
    // 4次ルンゲクッタ法による数値積分
    private rungeKutta4Step(sat: Satellite, dt: number): void {
        // 現在の状態
        const state0 = {
            x: sat.x,
            y: sat.y,
            z: sat.z,
            vx: sat.vx,
            vy: sat.vy,
            vz: sat.vz
        };
        
        // k1
        const k1 = this.hillEquationDerivatives(state0);
        
        // k2
        const state1 = {
            x: state0.x + 0.5 * dt * k1.dx,
            y: state0.y + 0.5 * dt * k1.dy,
            z: state0.z + 0.5 * dt * k1.dz,
            vx: state0.vx + 0.5 * dt * k1.dvx,
            vy: state0.vy + 0.5 * dt * k1.dvy,
            vz: state0.vz + 0.5 * dt * k1.dvz
        };
        const k2 = this.hillEquationDerivatives(state1);
        
        // k3
        const state2 = {
            x: state0.x + 0.5 * dt * k2.dx,
            y: state0.y + 0.5 * dt * k2.dy,
            z: state0.z + 0.5 * dt * k2.dz,
            vx: state0.vx + 0.5 * dt * k2.dvx,
            vy: state0.vy + 0.5 * dt * k2.dvy,
            vz: state0.vz + 0.5 * dt * k2.dvz
        };
        const k3 = this.hillEquationDerivatives(state2);
        
        // k4
        const state3 = {
            x: state0.x + dt * k3.dx,
            y: state0.y + dt * k3.dy,
            z: state0.z + dt * k3.dz,
            vx: state0.vx + dt * k3.dvx,
            vy: state0.vy + dt * k3.dvy,
            vz: state0.vz + dt * k3.dvz
        };
        const k4 = this.hillEquationDerivatives(state3);
        
        // 状態を更新（4次ルンゲクッタ法の公式）
        sat.x += dt * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx) / 6;
        sat.y += dt * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy) / 6;
        sat.z += dt * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz) / 6;
        sat.vx += dt * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx) / 6;
        sat.vy += dt * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy) / 6;
        sat.vz += dt * (k1.dvz + 2 * k2.dvz + 2 * k3.dvz + k4.dvz) / 6;
    }
    
    private updateOrbitParameters(): void {
        // 地球の定数
        const EARTH_RADIUS = 6378.137;  // km
        const EARTH_MU = 3.986004418e14;  // m³/s² (地球の重力定数)
        
        // 軌道高度から軌道半径を計算
        const altitude = parseFloat(this.controls.orbitAltitude.value);  // km
        const radiusKm = EARTH_RADIUS + altitude;  // km
        this.orbitRadius = radiusKm * 1000;  // m
        
        // 平均運動（軌道角速度）を計算
        // n = √(μ/r³)
        this.n = Math.sqrt(EARTH_MU / Math.pow(this.orbitRadius, 3));  // rad/s
        
        // 軌道周期を計算（参考表示用）
        const orbitalPeriod = (2 * Math.PI) / this.n;  // 秒
        const periodMinutes = orbitalPeriod / 60;  // 分
        
        // UI表示を更新
        this.controls.orbitRadiusDisplay.textContent = 
            `軌道半径: ${radiusKm.toFixed(0)} km (周期: ${periodMinutes.toFixed(1)}分)`;
    }
    
    private generatePeriodicOrbitInitialConditions(radius: number, phase: number, zOffset: number = 0): {
        x0: number; y0: number; z0: number; vx0: number; vy0: number; vz0: number;
    } {
        // PRO (Periodic Relative Orbit) - 安定な周期軌道の初期条件
        // ドリフト消失条件: vy0 = -2*n*x0 (theory.mdより)
        
        // フットボール軌道（2:1楕円）の初期条件
        // ドリフトがない安定な周期軌道を実現
        const x0 = radius * Math.cos(phase);
        const y0 = 0;  // y方向の初期位置は0
        const z0 = 0 + zOffset;  // z方向の初期位置
        
        // 初期速度（正しいドリフト消失条件を満たす）
        const vx0 = 0;  // x方向の初期速度は0
        const vy0 = -2 * this.n * x0;  // ドリフト消失条件: vy0 = -2*n*x0
        const vz0 = 0;  // z方向の初期速度は0
        
        return { x0, y0, z0, vx0, vy0, vz0 };
    }
    
    private generatePlacementPositions(pattern: string, count: number, radius: number, zSpread: number): Array<{x0: number, y0: number, z0: number, vx0: number, vy0: number, vz0: number}> {
        const positions: Array<{x0: number, y0: number, z0: number, vx0: number, vy0: number, vz0: number}> = [];
        const radiusKm = radius / 1000;
        const zSpreadKm = zSpread / 1000;
        
        switch (pattern) {
            case 'axis':
                // 軸上配置：X,Y,Z軸それぞれに衛星数×2個ずつ配置（速度0）
                // 衛星数=1: 各軸の-X,+X に配置（合計6個）
                // 衛星数=2: 各軸の-X,-0.5X,+0.5X,+X に配置（合計12個）
                const axisPositions = [];
                const eachAxisSatNum = count * 3;
                
                // 各軸に配置する位置を計算（ゼロ点を除外）
                // -radiusKm から +radiusKm まで (2*count+1) 等分して、ゼロ点以外を選択
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
                break;
                
            case 'grid':
                // 格子配置：3D格子点に配置（速度0）
                // 衛星数=1: 各軸{-X,0,+X}の3x3x3=27個から原点除いて26個
                // 衛星数=2: 各軸{-X,-0.5X,0,+0.5X,+X}の5x5x5=125個から原点除いて124個
                const gridValues = [];
                
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
                break;
                
            case 'random_position':
                // ランダム（位置）: 位置はランダム、速度は0
                for (let i = 0; i < count; i++) {
                    positions.push({
                        x0: (Math.random() * 2 - 1) * radiusKm, // -radiusKm ～ +radiusKm
                        y0: (Math.random() * 2 - 1) * radiusKm,
                        z0: (Math.random() * 2 - 1) * radiusKm,
                        vx0: 0,
                        vy0: 0,
                        vz0: 0
                    });
                }
                break;
                
            case 'random_position_velocity':
                // ランダム（位置速度）: 位置と速度両方ランダム
                const maxVelocity = radiusKm * 3 * this.n;
                for (let i = 0; i < count; i++) {
                    positions.push({
                        x0: (Math.random() * 2 - 1) * radiusKm, // -radiusKm ～ +radiusKm
                        y0: (Math.random() * 2 - 1) * radiusKm,
                        z0: (Math.random() * 2 - 1) * radiusKm,
                        vx0: (Math.random() * 2 - 1) * maxVelocity, // -radiusKm*3*n ～ +radiusKm*3*n
                        vy0: (Math.random() * 2 - 1) * maxVelocity,
                        vz0: (Math.random() * 2 - 1) * maxVelocity
                    });
                }
                break;
                
            case 'random_periodic':
                // ランダム（周期解）: 位置はランダム、vy0はドリフト消失条件、vx0とvz0はランダム
                const maxVelocityPeriodic = radiusKm * 3 * this.n;
                for (let i = 0; i < count; i++) {
                    const x0 = (Math.random() * 2 - 1) * radiusKm; // -radiusKm ～ +radiusKm
                    positions.push({
                        x0: x0,
                        y0: (Math.random() * 2 - 1) * radiusKm,
                        z0: (Math.random() * 2 - 1) * radiusKm,
                        vx0: (Math.random() * 2 - 1) * maxVelocityPeriodic, // ランダム
                        vy0: -2 * this.n * x0, // ドリフト消失条件: vy0 = -2*n*x0
                        vz0: (Math.random() * 2 - 1) * maxVelocityPeriodic  // ランダム
                    });
                }
                break;
                
            case 'xy_ellipse':
                // XY平面楕円: Football orbit（2:1楕円軌道）
                // 初期条件: x0=radiusKm, y0=0 から始まる楕円軌道
                
                // Football orbit: x(t) = ρcos(nt+φ), y(t) = -2ρsin(nt+φ)
                // 初期条件 x0=radiusKm, y0=0 から: φ=0, ρ=radiusKm
                // 初期速度: vx0=0, vy0=-2*ρ*n
                const rho = radiusKm;
                
                for (let i = 0; i < count; i++) {
                    // 各衛星を楕円上に等間隔で配置
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
                break;
                
            case 'circular_orbit':
                // 円軌道: Football orbitを参考にz方向振幅をsqrt(3)倍した軌道
                // 初期条件: x0=radiusKm, y0=0, z0=sqrt(3)*radiusKm から始まる円軌道
                
                const radius_circular = radiusKm;
                const z_amplitude = Math.sqrt(3) * radiusKm;
                
                for (let i = 0; i < count; i++) {
                    // 各衛星を円軌道上に等間隔で配置
                    const phase = (2 * Math.PI * i) / count;
                    
                    const x0 = radius_circular * Math.cos(phase);
                    const y0 = - 2 * radius_circular * Math.sin(phase);  // 円軌道なのでy0は0
                    const z0 = z_amplitude * Math.cos(phase);  // z方向振幅はsqrt(3)倍
                    
                    // ドリフト消失条件を満たす初期速度
                    const vx0 = -this.n * radius_circular * Math.sin(phase);
                    const vy0 = -2 * this.n * x0;  // ドリフト消失条件: vy0 = -2*n*x0
                    const vz0 = -this.n * z_amplitude * Math.sin(phase);  // z方向の速度
                    
                    positions.push({
                        x0: x0,
                        y0: y0,
                        z0: z0,
                        vx0: vx0,
                        vy0: vy0,
                        vz0: vz0
                    });
                }
                break;
                
            default:
                // デフォルトは軸上配置
                return this.generatePlacementPositions('axis', count, radius, zSpread);
                break;
        }
        
        return positions;
    }
    
    private initSimulation(): void {
        // 既存のメッシュを削除
        this.satelliteMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material && Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => mat.dispose());
            } else if (mesh.material) {
                (mesh.material as THREE.Material).dispose();
            }
        });
        
        // 既存の衛星オブジェクトを適切にクリーンアップ
        this.satellites.forEach(sat => {
            if (sat.trailLine) this.scene.remove(sat.trailLine);
            sat.dispose();
        });
        
        const count = parseInt(this.controls.satelliteCount.value);
        const radius = parseInt(this.controls.orbitRadius.value);
        const pattern = this.controls.placementPattern.value;
        
        this.satellites = [];
        this.satelliteMeshes = [];
        
        const centerGeometry = new THREE.SphereGeometry(8, 32, 32);
        const centerMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.3
        });
        const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
        this.scene.add(centerMesh);
        this.satelliteMeshes.push(centerMesh);
        this.satellites.push(new Satellite(0, 0, 0, 0, 0, 0, '#ffffff'));
        
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7b731, 0x5f27cd, 0x00d2d3, 0xff9ff3, 0x54a0ff];
        const hexColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff'];
        
        const positions = this.generatePlacementPositions(pattern, count, radius, 0);
        
        positions.forEach((pos, i) => {
            const satGeometry = new THREE.SphereGeometry(6, 32, 32);
            const satMaterial = new THREE.MeshPhongMaterial({ 
                color: colors[i % colors.length],
                emissive: colors[i % colors.length],
                emissiveIntensity: 0.2
            });
            const satMesh = new THREE.Mesh(satGeometry, satMaterial);
            this.scene.add(satMesh);
            this.satelliteMeshes.push(satMesh);
            
            this.satellites.push(new Satellite(pos.x0, pos.y0, pos.z0, pos.vx0, pos.vy0, pos.vz0, hexColors[i % hexColors.length]));
        });
        
        this.time = 0;
    }
    
    private animate = (): void => {
        requestAnimationFrame(this.animate);
        
        if (!this.paused) {
            this.animationFrameCounter++;
            const timeScale = parseFloat(this.controls.timeScale.value);
            const deltaTime = 0.016 * timeScale;  // 16ms = 0.016秒
            this.time += deltaTime;
            
            // 積分時間ステップを倍速時間に応じて調整
            // 倍速が大きいほど大きなステップを使用（計算負荷軽減）
            const adaptiveDt = Math.min(this.dt * Math.max(1, timeScale / 10), deltaTime);
            
            // 数値積分の実行（衛星数が多い場合は計算を間引く）
            const satelliteCount = this.satellites.length - 1; // 中心衛星を除く
            const skipIntegration = satelliteCount > 20 && this.animationFrameCounter % 2 !== 0;
            
            if (!skipIntegration) {
                const integrationSteps = Math.max(1, Math.ceil(deltaTime / adaptiveDt));
                const stepDt = deltaTime / integrationSteps;
                
                for (let step = 0; step < integrationSteps; step++) {
                    this.satellites.forEach((sat, index) => {
                        if (index > 0) {  // 中心衛星は動かさない
                            this.rungeKutta4Step(sat, stepDt);
                        }
                    });
                }
            }
            
            if (this.controls.autoRotate.checked) {
                this.cameraAngle += 0.005;
                // 新しい座標系でのカメラ自動回転: XZ平面で回転し、Y軸（Radial）を上から見下ろす
                this.camera.position.x = Math.cos(this.cameraAngle) * this.cameraDistance * 0.6;
                this.camera.position.z = Math.sin(this.cameraAngle) * this.cameraDistance * 0.6;
                this.camera.position.y = this.cameraDistance * 0.8;  // Radial方向（上）から見下ろす
            } else {
                // 手動カメラ操作も新しい座標系に対応
                this.camera.position.x = Math.sin(this.cameraTheta) * Math.sin(this.cameraPhi) * this.cameraDistance;
                this.camera.position.y = Math.cos(this.cameraPhi) * this.cameraDistance;
                this.camera.position.z = Math.cos(this.cameraTheta) * Math.sin(this.cameraPhi) * this.cameraDistance;
            }
            this.camera.lookAt(0, 0, 0);
            
            this.satellites.forEach((sat, index) => {
                const pos = sat.getPosition();
                const scale = 1000;
                // ヒル方程式座標系からThree.js座標系への変換
                // Hill: x=Radial, y=Along-track, z=Cross-track
                // Three.js: X=Along-track(右), Y=Radial(上), Z=Cross-track(手前)
                this.satelliteMeshes[index].position.set(pos.y * scale, pos.x * scale, pos.z * scale);
                
                if (this.controls.showTrails.checked && index > 0) {
                    // 軌跡を5フレームに1回だけ更新（メモリと計算負荷軽減）
                    sat.frameCounter++;
                    if (sat.frameCounter % 5 === 0) {
                        const trailMax = parseInt(this.controls.trailLength.value);
                        
                        // 軌跡も同じ座標変換を適用
                        if (sat.trail.length === 0 || sat.frameCounter % 10 === 0) {
                            // 10フレームに1回だけVector3を新規作成
                            sat.trail.push(new THREE.Vector3(pos.y * scale, pos.x * scale, pos.z * scale));
                            if (sat.trail.length > trailMax) sat.trail.shift();
                        }
                        
                        if (sat.trail.length > 1) {
                            // 初回のみgeometry/materialを作成、以降は使い回し
                            if (!sat.trailGeometry) {
                                sat.trailGeometry = new THREE.BufferGeometry();
                                sat.trailMaterial = new THREE.LineBasicMaterial({ 
                                    color: (this.satelliteMeshes[index].material as THREE.MeshPhongMaterial).color,
                                    opacity: 0.5,
                                    transparent: true
                                });
                                sat.trailLine = new THREE.Line(sat.trailGeometry, sat.trailMaterial);
                                this.scene.add(sat.trailLine);
                            }
                            
                            // 頂点データのみ更新（新規オブジェクト作成なし）
                            sat.trailGeometry.setFromPoints(sat.trail);
                        }
                    }
                }
            });
            
            // 情報表示と2Dプロットは10フレームに1回だけ更新（計算負荷軽減）
            if (this.animationFrameCounter % 10 === 0) {
                this.updateInfo();
                this.update2DPlots();
            }
            
            // 時間表示は5フレームに1回更新
            if (this.animationFrameCounter % 5 === 0) {
                this.updateTimeDisplay();
            }
        }
        
        this.gridHelper.visible = this.controls.showGrid.checked;
        
        this.renderer.render(this.scene, this.camera);
    }
    
    private updateTimeDisplay(): void {
        const totalSeconds = Math.floor(this.time);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            this.controls.simulationTime.textContent = `${hours}時間${minutes}分${seconds}秒`;
        } else if (minutes > 0) {
            this.controls.simulationTime.textContent = `${minutes}分${seconds}秒`;
        } else {
            this.controls.simulationTime.textContent = `${seconds}秒`;
        }
    }
    
    private update2DPlots(): void {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff'];
        const plotSize = 300;
        const center = plotSize / 2;
        const scale = 0.4;  // スケール調整
        
        // 各プロットをクリア
        Object.values(this.plotContexts).forEach(ctx => {
            ctx.clearRect(0, 0, plotSize, plotSize);
            
            // グリッドを描画
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            
            // 縦線
            for (let i = 0; i <= 10; i++) {
                const x = (plotSize / 10) * i;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, plotSize);
                ctx.stroke();
            }
            
            // 横線
            for (let i = 0; i <= 10; i++) {
                const y = (plotSize / 10) * i;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(plotSize, y);
                ctx.stroke();
            }
            
            // 中心線
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.moveTo(center, 0);
            ctx.lineTo(center, plotSize);
            ctx.moveTo(0, center);
            ctx.lineTo(plotSize, center);
            ctx.stroke();
        });
        
        // 衛星をプロット
        this.satellites.forEach((sat, index) => {
            if (index === 0) {
                // 中心衛星
                Object.values(this.plotContexts).forEach(ctx => {
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(center, center, 4, 0, 2 * Math.PI);
                    ctx.fill();
                });
            } else {
                const pos = sat.getPosition();
                const color = colors[(index - 1) % colors.length];
                
                // XY平面 (動径方向 - 進行方向) - Three.js表示に合わせてX-Y軸を入れ替え
                const xyX = center + pos.y * scale * plotSize;  // Along-track (進行方向)
                const xyY = center - pos.x * scale * plotSize;  // Radial (動径方向)
                this.plotContexts.xy.fillStyle = color;
                this.plotContexts.xy.beginPath();
                this.plotContexts.xy.arc(xyX, xyY, 3, 0, 2 * Math.PI);
                this.plotContexts.xy.fill();
                
                // XZ平面 (進行方向 - 軌道面垂直) - Three.js表示に合わせて
                const xzX = center + pos.y * scale * plotSize;  // Along-track (進行方向)
                const xzY = center - pos.z * scale * plotSize;  // Cross-track (軌道面垂直)
                this.plotContexts.xz.fillStyle = color;
                this.plotContexts.xz.beginPath();
                this.plotContexts.xz.arc(xzX, xzY, 3, 0, 2 * Math.PI);
                this.plotContexts.xz.fill();
                
                // YZ平面 (動径方向 - 軌道面垂直) - Three.js表示に合わせて
                const yzX = center + pos.x * scale * plotSize;  // Radial (動径方向)
                const yzY = center - pos.z * scale * plotSize;  // Cross-track (軌道面垂直)
                this.plotContexts.yz.fillStyle = color;
                this.plotContexts.yz.beginPath();
                this.plotContexts.yz.arc(yzX, yzY, 3, 0, 2 * Math.PI);
                this.plotContexts.yz.fill();
            }
        });
        
        // 軸ラベル（Three.js表示に合わせて修正）
        // XY平面: X=Along-track(進行方向), Y=Radial(動径方向)
        this.plotContexts.xy.fillStyle = '#4ecdc4';
        this.plotContexts.xy.font = '12px Arial';
        this.plotContexts.xy.fillText('Along', plotSize - 40, center - 5);
        this.plotContexts.xy.fillStyle = '#ff6b6b';
        this.plotContexts.xy.fillText('Radial', center + 5, 20);
        
        // XZ平面: X=Along-track(進行方向), Z=Cross-track(軌道面垂直)
        this.plotContexts.xz.fillStyle = '#4ecdc4';
        this.plotContexts.xz.fillText('Along', plotSize - 40, center - 5);
        this.plotContexts.xz.fillStyle = '#f7b731';
        this.plotContexts.xz.fillText('Cross', center + 5, 20);
        
        // YZ平面: Y=Radial(動径方向), Z=Cross-track(軌道面垂直)
        this.plotContexts.yz.fillStyle = '#ff6b6b';
        this.plotContexts.yz.fillText('Radial', plotSize - 40, center - 5);
        this.plotContexts.yz.fillStyle = '#f7b731';
        this.plotContexts.yz.fillText('Cross', center + 5, 20);
    }
    
    private updateInfo(): void {
        const infoDiv = document.getElementById('satelliteInfo')!;
        let html = '<strong>衛星の状態:</strong><br>';
        
        // 現在の軌道パラメータを表示
        const altitude = parseFloat(this.controls.orbitAltitude.value);
        const orbitalPeriod = (2 * Math.PI) / this.n / 60;  // 分
        html += `<div style="margin-bottom: 10px; color: #999;">
                軌道高度: ${altitude.toFixed(0)} km | 
                平均運動: ${(this.n * 1000).toFixed(3)} mrad/s | 
                周期: ${orbitalPeriod.toFixed(1)} 分
                </div>`;
        
        this.satellites.forEach((sat, index) => {
            if (index > 0) {
                const pos = sat.getPosition();
                const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
                
                // 配置パターン別の情報を表示
                let extraInfo = '';
                const pattern = this.controls.placementPattern.value;
                if (pattern === 'axis') {
                    extraInfo = ` (軸上配置)`;
                } else if (pattern === 'grid') {
                    extraInfo = ` (格子配置)`;
                } else if (pattern === 'random_position') {
                    extraInfo = ` (ランダム位置)`;
                } else if (pattern === 'random_position_velocity') {
                    extraInfo = ` (ランダム位置速度)`;
                } else if (pattern === 'random_periodic') {
                    extraInfo = ` (ランダム周期解)`;
                } else if (pattern === 'xy_ellipse') {
                    extraInfo = ` (XY平面楕円)`;
                }
                
                html += `<span class="satellite-info">
                        <span class="color-indicator" style="background-color: ${sat.color}"></span>
                        衛星${index}${extraInfo}
                        </span>`;
            }
        });
        
        infoDiv.innerHTML = html;
    }
    
    public resetSimulation(): void {
        this.satellites.forEach(sat => {
            if (sat.trailLine) this.scene.remove(sat.trailLine);
            sat.reset();
        });
        this.initSimulation();
    }
    
    public togglePause(): void {
        this.paused = !this.paused;
    }
    
    public addPerturbation(): void {
        this.satellites.forEach((sat, index) => {
            if (index > 0) {
                // 現在の速度に摂動を加える（数値積分用）
                sat.vx += (Math.random() - 0.5) * 0.00002;  // 0.0002 → 0.00002 (1桁小さく)
                sat.vy += (Math.random() - 0.5) * 0.00002;
                sat.vz += (Math.random() - 0.5) * 0.00002;
            }
        });
    }
    
    public changeView(): void {
        this.viewMode = (this.viewMode + 1) % 4;
        switch(this.viewMode) {
            case 0:
                this.cameraDistance = 400;
                this.cameraPhi = Math.PI / 4;
                this.cameraTheta = 0;
                break;
            case 1:
                this.cameraDistance = 400;
                this.cameraPhi = 0.1;
                this.cameraTheta = 0;
                break;
            case 2:
                this.cameraDistance = 400;
                this.cameraPhi = Math.PI / 2;
                this.cameraTheta = 0;
                break;
            case 3:
                this.cameraDistance = 400;
                this.cameraPhi = Math.PI / 3;
                this.cameraTheta = Math.PI / 4;
                break;
        }
    }
    
    private setupEventListeners(): void {
        this.controls.timeScale.addEventListener('change', () => {
            // No need to update display since it's a dropdown
        });
        
        this.controls.trailLength.addEventListener('input', () => {
            this.controls.trailLengthValue.textContent = this.controls.trailLength.value;
        });
        
        // リアルタイムパラメータ変更
        this.controls.satelliteCount.addEventListener('change', () => {
            this.resetSimulation();
        });
        
        this.controls.placementPattern.addEventListener('change', () => {
            // 配置パターンに応じて衛星数の上限を調整
            const pattern = this.controls.placementPattern.value;
            if (pattern === 'random_position' || pattern === 'random_position_velocity' || pattern === 'random_periodic') {
                this.controls.satelliteCount.max = '100';
                this.controls.satelliteCount.min = '1';
            } else {
                this.controls.satelliteCount.max = '5';
                this.controls.satelliteCount.min = '1';
            }
            this.resetSimulation();
        });
        
        // 軌道高度変更時のイベント
        this.controls.orbitAltitude.addEventListener('input', () => {
            this.updateOrbitParameters();
        });
        
        this.controls.orbitAltitude.addEventListener('change', () => {
            this.updateOrbitParameters();
            this.resetSimulation();
        });
        
        this.controls.orbitRadius.addEventListener('change', () => {
            this.resetSimulation();
        });
        
        // チェックボックスの変更もリアルタイムで反映（すでに動作している）
        this.controls.showTrails.addEventListener('change', () => {
            if (!this.controls.showTrails.checked) {
                // 軌跡を非表示にする場合は適切にクリーンアップ
                this.satellites.forEach(sat => {
                    if (sat.trailLine) {
                        this.scene.remove(sat.trailLine);
                        sat.trailLine = null;
                    }
                    if (sat.trailGeometry) {
                        sat.trailGeometry.dispose();
                        sat.trailGeometry = null;
                    }
                    if (sat.trailMaterial) {
                        sat.trailMaterial.dispose();
                        sat.trailMaterial = null;
                    }
                    sat.trail = [];
                    sat.frameCounter = 0;
                });
            }
        });
        
        window.addEventListener('resize', () => {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });
        
        // キーボードショートカット
        window.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    this.togglePause();
                    break;
                case 'r':
                    this.resetSimulation();
                    break;
                case 'p':
                    this.addPerturbation();
                    break;
                case 'v':
                    this.changeView();
                    break;
                case 't':
                    this.controls.showTrails.checked = !this.controls.showTrails.checked;
                    this.controls.showTrails.dispatchEvent(new Event('change'));
                    break;
                case 'g':
                    this.controls.showGrid.checked = !this.controls.showGrid.checked;
                    break;
                case 'a':
                    this.controls.autoRotate.checked = !this.controls.autoRotate.checked;
                    break;
                case '+':
                case '=':
                    const currentScale = parseFloat(this.controls.timeScale.value);
                    this.controls.timeScale.value = Math.min(10, currentScale + 0.5).toString();
                    this.controls.timeScaleValue.textContent = this.controls.timeScale.value;
                    break;
                case '-':
                case '_':
                    const currentScale2 = parseFloat(this.controls.timeScale.value);
                    this.controls.timeScale.value = Math.max(0, currentScale2 - 0.5).toString();
                    this.controls.timeScaleValue.textContent = this.controls.timeScale.value;
                    break;
                case 'h':
                    this.showHelp();
                    break;
            }
        });
    }
    
    private showHelp(): void {
        alert(`キーボードショートカット:
        
スペース: 一時停止/再開
R: リセット
P: 摂動を加える
V: 視点変更
T: 軌跡表示切り替え
G: グリッド表示切り替え
A: カメラ自動回転切り替え
+/=: 時間スケール増加
-/_: 時間スケール減少
H: このヘルプを表示

マウス操作:
ドラッグ: カメラ回転
スクロール: ズーム`);
    }
}

let simulation: HillEquationSimulation;

document.addEventListener('DOMContentLoaded', () => {
    simulation = new HillEquationSimulation();
    
    // Attach functions to window object after simulation is created
    (window as any).resetSimulation = () => simulation.resetSimulation();
    (window as any).togglePause = () => simulation.togglePause();
    (window as any).addPerturbation = () => simulation.addPerturbation();
    (window as any).changeView = () => simulation.changeView();
});