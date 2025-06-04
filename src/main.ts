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
    x0: number;
    y0: number;
    z0: number;
    vx0: number;
    vy0: number;
    vz0: number;
    color: string;
    trail: THREE.Vector3[];
    trailLine: THREE.Line | null;
    
    constructor(x0: number, y0: number, z0: number, vx0: number, vy0: number, vz0: number, color: string) {
        this.x0 = x0;
        this.y0 = y0;
        this.z0 = z0;
        this.vx0 = vx0;
        this.vy0 = vy0;
        this.vz0 = vz0;
        this.color = color;
        this.trail = [];
        this.trailLine = null;
    }
    
    getPosition(t: number, n: number): { x: number; y: number; z: number } {
        const nt = n * t;
        const cos_nt = Math.cos(nt);
        const sin_nt = Math.sin(nt);
        
        // x(t) = -(3x₀ + 2ẏ₀/n)cos(nt) + (ẋ₀/n)sin(nt) + (4x₀ + 2ẏ₀/n)
        const x = -(3 * this.x0 + 2 * this.vy0 / n) * cos_nt + (this.vx0 / n) * sin_nt + (4 * this.x0 + 2 * this.vy0 / n);
        
        // y(t) = (6x₀ + 4ẏ₀/n)sin(nt) + (2ẋ₀/n)cos(nt) - (6nx₀ + 3ẏ₀)t + (y₀ - 2ẋ₀/n)
        const y = (6 * this.x0 + 4 * this.vy0 / n) * sin_nt + (2 * this.vx0 / n) * cos_nt - (6 * n * this.x0 + 3 * this.vy0) * t + (this.y0 - 2 * this.vx0 / n);
        
        // z(t) = z₀cos(nt) + (ż₀/n)sin(nt)
        const z = this.z0 * cos_nt + (this.vz0 / n) * sin_nt;
        
        return { x, y, z };
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
    private paused: boolean = false;
    private n: number = 1.126e-3;  // rad/s (地球低軌道高度400km, 軌道周期約92.7分)
    private orbitRadius: number = 6778000;  // m (地球半径 + 高度400km)
    private cameraAngle: number = 0;
    private viewMode: number = 0;
    private mouseX: number = 0;
    private mouseY: number = 0;
    private mouseDown: boolean = false;
    private cameraPhi: number = Math.PI / 4;
    private cameraTheta: number = 0;
    private cameraDistance: number = 800;
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
        zSpread: HTMLInputElement;
        timeScale: HTMLSelectElement;
        simulationTime: HTMLSpanElement;
        autoRotate: HTMLInputElement;
        showTrails: HTMLInputElement;
        showGrid: HTMLInputElement;
        trailLength: HTMLInputElement;
        trailLengthValue: HTMLSpanElement;
        recordPhase: HTMLInputElement;
        recordPhaseValue: HTMLSpanElement;
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
            zSpread: document.getElementById('zSpread') as HTMLInputElement,
            timeScale: document.getElementById('timeScale') as HTMLSelectElement,
            simulationTime: document.getElementById('simulationTime') as HTMLSpanElement,
            autoRotate: document.getElementById('autoRotate') as HTMLInputElement,
            showTrails: document.getElementById('showTrails') as HTMLInputElement,
            showGrid: document.getElementById('showGrid') as HTMLInputElement,
            trailLength: document.getElementById('trailLength') as HTMLInputElement,
            trailLengthValue: document.getElementById('trailLengthValue') as HTMLSpanElement,
            recordPhase: document.getElementById('recordPhase') as HTMLInputElement,
            recordPhaseValue: document.getElementById('recordPhaseValue') as HTMLSpanElement
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
        this.camera.position.set(300, 500, 400);  // 斜め上から見下ろす視点
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
            case 'sphere':
                for (let i = 0; i < count - 1; i++) {
                    const phi = Math.acos(1 - 2 * (i + 0.5) / (count - 1));
                    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
                    
                    const x0 = radiusKm * Math.sin(phi) * Math.cos(theta);
                    const y0 = radiusKm * Math.sin(phi) * Math.sin(theta);
                    const z0 = radiusKm * Math.cos(phi) * 0.3;
                    
                    const vx0 = -2 * this.n * y0;
                    const vy0 = this.n * x0;
                    const vz0 = 0;
                    
                    positions.push({ x0, y0, z0, vx0, vy0, vz0 });
                }
                break;
                
            case 'random':
                for (let i = 0; i < count - 1; i++) {
                    const r = radiusKm * (0.5 + Math.random() * 0.5);
                    const theta = Math.random() * 2 * Math.PI;
                    const phi = Math.random() * Math.PI;
                    
                    const x0 = r * Math.sin(phi) * Math.cos(theta);
                    const y0 = r * Math.sin(phi) * Math.sin(theta);
                    const z0 = (Math.random() - 0.5) * zSpreadKm;
                    
                    const vx0 = -2 * this.n * y0;
                    const vy0 = this.n * x0;
                    const vz0 = Math.random() * 0.0001 - 0.00005;
                    
                    positions.push({ x0, y0, z0, vx0, vy0, vz0 });
                }
                break;
                
            case 'line':
                for (let i = 0; i < count - 1; i++) {
                    const t = (i / (count - 2)) * 2 - 1;
                    const x0 = radiusKm * t;
                    const y0 = 0;
                    const z0 = 0;
                    
                    const vx0 = 0;
                    const vy0 = this.n * x0;
                    const vz0 = 0;
                    
                    positions.push({ x0, y0, z0, vx0, vy0, vz0 });
                }
                break;
                
            case 'spiral':
                for (let i = 0; i < count - 1; i++) {
                    const t = i / (count - 2);
                    const angle = t * 4 * Math.PI;
                    const r = radiusKm * (0.3 + 0.7 * t);
                    
                    const x0 = r * Math.cos(angle);
                    const y0 = r * Math.sin(angle);
                    const z0 = zSpreadKm * (t - 0.5);
                    
                    const vx0 = -2 * this.n * y0;
                    const vy0 = this.n * x0;
                    const vz0 = 0;
                    
                    positions.push({ x0, y0, z0, vx0, vy0, vz0 });
                }
                break;
                
            case 'periodic':
                // PRO (Periodic Relative Orbit) - 理論的に正しい周期軌道
                // 標準的なFootball orbit解を使用: x(t) = ρcos(nt+φ), y(t) = -2ρsin(nt+φ), z(t) = 0
                for (let i = 0; i < count - 1; i++) {
                    const phase = (2 * Math.PI * i) / (count - 1);
                    const rho = radiusKm;  // km → m
                    
                    // 理論的に正しいPRO初期条件 (Hill方程式の解析解)
                    // x(t) = ρ cos(nt + φ)
                    // y(t) = -2ρ sin(nt + φ)
                    // z(t) = 0 (または小さなz成分を追加可能)
                    
                    // 初期位置 (t=0)
                    const x0 = rho * Math.cos(phase);           // Radial
                    const y0 = -2 * rho * Math.sin(phase);     // Along-track
                    const z0 = 0;                              // Cross-track (平面軌道)
                    
                    // 初期速度 (解析解の微分, t=0)
                    const vx0 = -rho * this.n * Math.sin(phase);     // ẋ = -ρn sin(nt+φ)
                    const vy0 = -2 * rho * this.n * Math.cos(phase); // ẏ = -2ρn cos(nt+φ)
                    const vz0 = 0;                                   // ż = 0
                    
                    positions.push({ 
                        x0: x0,    // Radial（ヒル方程式のx軸）
                        y0: y0,    // Along-track（ヒル方程式のy軸）
                        z0: z0,    // Cross-track（ヒル方程式のz軸）
                        vx0: vx0, 
                        vy0: vy0, 
                        vz0: vz0 
                    });
                }
                break;
                
            case 'record':
                // レコード盤軌道（3次元Football orbit）
                // 面内Football orbit + 面外調和振動の組み合わせ
                // theory.mdの正しい解析解に基づく安定軌道
                
                // ユーザー指定の位相差を取得（度をラジアンに変換）
                const userPhaseDiff = (parseInt(this.controls.recordPhase.value) * Math.PI) / 180;
                
                for (let i = 0; i < count - 1; i++) {
                    const phi = (2 * Math.PI * i) / (count - 1);        // 面内位相
                    const phi_z = phi + userPhaseDiff;                  // 面外位相（ユーザー指定差）
                    const rho = radiusKm;                               // 面内半径
                    const rho_z = rho * 0.5;                            // 面外振幅（可視化重視）
                    
                    // theory.mdより: 3次元Football orbitの初期条件
                    // x(t) = ρ cos(nt + φ)              // 面内Football orbit
                    // y(t) = -2ρ sin(nt + φ)            // 面内Football orbit  
                    // z(t) = ρz cos(nt + φz)            // 面外調和振動
                    
                    // 初期位置 (t=0)
                    const x0 = rho * Math.cos(phi);                    // ρ cos(φ)
                    const y0 = -2 * rho * Math.sin(phi);               // -2ρ sin(φ)
                    const z0 = rho_z * Math.cos(phi_z);                // ρz cos(φz)
                    
                    // 初期速度 (解析解の微分, t=0)
                    const vx0 = -rho * this.n * Math.sin(phi);         // -ρn sin(φ)
                    const vy0 = -2 * rho * this.n * Math.cos(phi);     // -2ρn cos(φ)
                    const vz0 = -rho_z * this.n * Math.sin(phi_z);     // -ρz n sin(φz)
                    
                    positions.push({ 
                        x0: x0,    // Radial（ヒル方程式のx軸）
                        y0: y0,    // Along-track（ヒル方程式のy軸）
                        z0: z0,    // Cross-track（ヒル方程式のz軸）
                        vx0: vx0, 
                        vy0: vy0, 
                        vz0: vz0 
                    });
                }
                break;
                
            case 'circle':
            default:
                for (let i = 0; i < count - 1; i++) {
                    const phase = (2 * Math.PI * i) / (count - 1);
                    const zOffset = zSpreadKm * (Math.random() - 0.5) * 2;
                    const { x0, y0, z0, vx0, vy0, vz0 } = this.generatePeriodicOrbitInitialConditions(radiusKm, phase, zOffset);
                    positions.push({ x0, y0, z0, vx0, vy0, vz0 });
                }
                break;
        }
        
        return positions;
    }
    
    private initSimulation(): void {
        this.satelliteMeshes.forEach(mesh => this.scene.remove(mesh));
        this.satellites.forEach(sat => {
            if (sat.trailLine) this.scene.remove(sat.trailLine);
        });
        
        const count = parseInt(this.controls.satelliteCount.value);
        const radius = parseInt(this.controls.orbitRadius.value);
        const zSpread = parseInt(this.controls.zSpread.value);
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
        
        const positions = this.generatePlacementPositions(pattern, count, radius, zSpread);
        
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
            const timeScale = parseFloat(this.controls.timeScale.value);
            this.time += 0.016 * timeScale;  // 16ms = 0.016秒
            
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
                const pos = sat.getPosition(this.time, this.n);
                const scale = 1000;
                // ヒル方程式座標系からThree.js座標系への変換
                // Hill: x=Radial, y=Along-track, z=Cross-track
                // Three.js: X=Along-track(右), Y=Radial(上), Z=Cross-track(手前)
                this.satelliteMeshes[index].position.set(pos.y * scale, pos.x * scale, pos.z * scale);
                
                if (this.controls.showTrails.checked && index > 0) {
                    const trailMax = parseInt(this.controls.trailLength.value);
                    // 軌跡も同じ座標変換を適用
                    sat.trail.push(new THREE.Vector3(pos.y * scale, pos.x * scale, pos.z * scale));
                    if (sat.trail.length > trailMax) sat.trail.shift();
                    
                    if (sat.trailLine) this.scene.remove(sat.trailLine);
                    
                    if (sat.trail.length > 1) {
                        const trailGeometry = new THREE.BufferGeometry().setFromPoints(sat.trail);
                        const trailMaterial = new THREE.LineBasicMaterial({ 
                            color: (this.satelliteMeshes[index].material as THREE.MeshPhongMaterial).color,
                            opacity: 0.5,
                            transparent: true
                        });
                        sat.trailLine = new THREE.Line(trailGeometry, trailMaterial);
                        this.scene.add(sat.trailLine);
                    }
                }
            });
            
            this.updateInfo();
            this.updateTimeDisplay();
            this.update2DPlots();
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
                const pos = sat.getPosition(this.time, this.n);
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
                const pos = sat.getPosition(this.time, this.n);
                const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
                
                // パターン別の理論値との比較を表示
                let extraInfo = '';
                if (this.controls.placementPattern.value === 'periodic') {
                    const radius = parseInt(this.controls.orbitRadius.value);
                    const theoreticalDistance = radius / 1000;  // 理論値 = 2ρ
                    const error = Math.abs(r - theoreticalDistance) / theoreticalDistance * 100;
                    extraInfo = ` (理論値: ${theoreticalDistance.toFixed(3)}km, 誤差: ${error.toFixed(2)}%)`;
                } else if (this.controls.placementPattern.value === 'record') {
                    const radius = parseInt(this.controls.orbitRadius.value);
                    const phaseDiff = parseInt(this.controls.recordPhase.value);
                    // レコード盤軌道（3次元Football orbit）の理論値：時刻により変動
                    const rho = radius / 1000;  // 面内半径
                    const minDistance = rho;  // 最小距離（z成分最小時）
                    const maxDistance = rho * Math.sqrt(5);  // 最大距離（面内最大時）
                    extraInfo = ` (3D軌道 ${phaseDiff}°: ${minDistance.toFixed(3)}-${maxDistance.toFixed(3)}km)`;
                }
                
                html += `<span class="satellite-info">
                        <span class="color-indicator" style="background-color: ${sat.color}"></span>
                        衛星${index}: 距離=${r.toFixed(3)}km${extraInfo}
                        </span>`;
            }
        });
        
        infoDiv.innerHTML = html;
    }
    
    public resetSimulation(): void {
        this.satellites.forEach(sat => {
            if (sat.trailLine) this.scene.remove(sat.trailLine);
            sat.trail = [];
        });
        this.initSimulation();
    }
    
    public togglePause(): void {
        this.paused = !this.paused;
    }
    
    public addPerturbation(): void {
        this.satellites.forEach((sat, index) => {
            if (index > 0) {
                sat.vx0 += (Math.random() - 0.5) * 0.00002;  // 0.0002 → 0.00002 (1桁小さく)
                sat.vy0 += (Math.random() - 0.5) * 0.00002;
                sat.vz0 += (Math.random() - 0.5) * 0.00002;
            }
        });
    }
    
    public changeView(): void {
        this.viewMode = (this.viewMode + 1) % 4;
        switch(this.viewMode) {
            case 0:
                this.cameraDistance = 800;
                this.cameraPhi = Math.PI / 4;
                this.cameraTheta = 0;
                break;
            case 1:
                this.cameraDistance = 800;
                this.cameraPhi = 0.1;
                this.cameraTheta = 0;
                break;
            case 2:
                this.cameraDistance = 800;
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
        
        // レコード盤軌道の位相差調整
        this.controls.recordPhase.addEventListener('input', () => {
            this.controls.recordPhaseValue.textContent = this.controls.recordPhase.value + '°';
            if (this.controls.placementPattern.value === 'record') {
                this.resetSimulation();
            }
        });
        
        // リアルタイムパラメータ変更
        this.controls.satelliteCount.addEventListener('change', () => {
            this.resetSimulation();
        });
        
        this.controls.placementPattern.addEventListener('change', () => {
            // レコード盤軌道選択時のみ位相差スライダーを表示
            const recordControl = document.getElementById('recordPhaseControl')!;
            if (this.controls.placementPattern.value === 'record') {
                recordControl.style.display = 'flex';
            } else {
                recordControl.style.display = 'none';
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
        
        this.controls.zSpread.addEventListener('change', () => {
            this.resetSimulation();
        });
        
        // チェックボックスの変更もリアルタイムで反映（すでに動作している）
        this.controls.showTrails.addEventListener('change', () => {
            if (!this.controls.showTrails.checked) {
                // 軌跡を非表示にする場合はすぐに削除
                this.satellites.forEach(sat => {
                    if (sat.trailLine) {
                        this.scene.remove(sat.trailLine);
                        sat.trailLine = null;
                    }
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