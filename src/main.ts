import * as THREE from 'three';
import { Satellite } from './models/Satellite.js';
import { HillEquationSolver } from './physics/HillEquationSolver.js';
import { OrbitInitializer } from './physics/OrbitInitializer.js';
import { TrailRenderer } from './visualization/TrailRenderer.js';
import { PlotRenderer } from './visualization/PlotRenderer.js';
import { UIControls } from './ui/UIControls.js';

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
    
    // ヘルパークラス
    private hillSolver: HillEquationSolver;
    private orbitInitializer: OrbitInitializer;
    private trailRenderer: TrailRenderer;
    private plotRenderer: PlotRenderer;
    private uiControls: UIControls;
    
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
        
        // ヘルパークラスの初期化
        this.hillSolver = new HillEquationSolver(this.n);
        this.orbitInitializer = new OrbitInitializer(this.n);
        this.trailRenderer = new TrailRenderer(this.scene);
        this.plotRenderer = new PlotRenderer();
        this.uiControls = new UIControls();
        
        this.setupRenderer();
        this.setupLighting();
        this.setupMouseControls();
        this.createAxes();
        this.gridHelper = this.createGrid();
        this.setupEventListeners();
        this.updateOrbitParameters();  // 初期値で軌道パラメータを計算
        this.uiControls.setupPlacementPatternLimits();  // 初期配置に応じた衛星数の設定
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
            if (this.mouseDown && !this.uiControls.elements.autoRotate.checked) {
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
    
    
    
    private updateOrbitParameters(): void {
        // 地球の定数
        const EARTH_RADIUS = 6378.137;  // km
        const EARTH_MU = 3.986004418e14;  // m³/s² (地球の重力定数)
        
        // 軌道高度から軌道半径を計算
        const altitude = parseFloat(this.uiControls.elements.orbitAltitude.value);  // km
        const radiusKm = EARTH_RADIUS + altitude;  // km
        this.orbitRadius = radiusKm * 1000;  // m
        
        // 平均運動（軌道角速度）を計算
        // n = √(μ/r³)
        this.n = Math.sqrt(EARTH_MU / Math.pow(this.orbitRadius, 3));  // rad/s
        
        // ヘルパークラスも更新
        this.hillSolver.updateMeanMotion(this.n);
        this.orbitInitializer.updateMeanMotion(this.n);
        
        // 軌道周期を計算（参考表示用）
        const orbitalPeriod = (2 * Math.PI) / this.n;  // 秒
        const periodMinutes = orbitalPeriod / 60;  // 分
        
        // UI表示を更新
        this.uiControls.updateOrbitDisplay(radiusKm, periodMinutes);
    }
    
    
    private generatePlacementPositions(pattern: string, count: number, radius: number, zSpread: number, zAmplitudeMultiplier?: number): Array<{x0: number, y0: number, z0: number, vx0: number, vy0: number, vz0: number}> {
        return this.orbitInitializer.generatePositions(pattern, count, radius, zSpread, zAmplitudeMultiplier);
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
        
        const count = parseInt(this.uiControls.elements.satelliteCount.value);
        const radius = parseInt(this.uiControls.elements.orbitRadius.value);
        const pattern = this.uiControls.elements.placementPattern.value;
        
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
        
        const zAmplitudeMultiplier = parseFloat(this.uiControls.elements.zAmplitude.value) || 0;
        const positions = this.generatePlacementPositions(pattern, count, radius, 0, zAmplitudeMultiplier);
        
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
            const timeScale = parseFloat(this.uiControls.elements.timeScale.value);
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
                            this.hillSolver.rungeKutta4Step(sat, stepDt);
                        }
                    });
                }
            }
            
            if (this.uiControls.elements.autoRotate.checked) {
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
                
                if (this.uiControls.elements.showTrails.checked && index > 0) {
                    const trailMax = parseInt(this.uiControls.elements.trailLength.value);
                    const color = (this.satelliteMeshes[index].material as THREE.MeshPhongMaterial).color;
                    this.trailRenderer.updateTrail(sat, pos, scale, color, trailMax);
                }
            });
            
            // 情報表示と2Dプロットは10フレームに1回だけ更新（計算負荷軽減）
            if (this.animationFrameCounter % 10 === 0) {
                this.updateInfo();
                this.plotRenderer.update(this.satellites);
            }
            
            // 時間表示は5フレームに1回更新
            if (this.animationFrameCounter % 5 === 0) {
                this.uiControls.updateTimeDisplay(this.time);
            }
        }
        
        this.gridHelper.visible = this.uiControls.elements.showGrid.checked;
        
        this.renderer.render(this.scene, this.camera);
    }
    
    
    private updateInfo(): void {
        const infoDiv = document.getElementById('satelliteInfo')!;
        let html = '<strong>衛星の状態:</strong><br>';
        
        // 現在の軌道パラメータを表示
        const altitude = parseFloat(this.uiControls.elements.orbitAltitude.value);
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
                const pattern = this.uiControls.elements.placementPattern.value;
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
                } else if (pattern === 'circular_orbit') {
                    extraInfo = ` (円軌道)`;
                } else if (pattern === 'vbar_approach') {
                    extraInfo = ` (V-bar軌道)`;
                } else if (pattern === 'rbar_approach') {
                    extraInfo = ` (R-bar軌道)`;
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
        this.uiControls.elements.timeScale.addEventListener('change', () => {
            // No need to update display since it's a dropdown
        });
        
        this.uiControls.elements.trailLength.addEventListener('input', () => {
            this.uiControls.elements.trailLengthValue.textContent = this.uiControls.elements.trailLength.value;
        });
        
        // リアルタイムパラメータ変更
        this.uiControls.elements.satelliteCount.addEventListener('change', () => {
            this.resetSimulation();
        });
        
        this.uiControls.elements.placementPattern.addEventListener('change', () => {
            this.uiControls.setupPlacementPatternLimits();
            this.resetSimulation();
        });
        
        // 軌道高度変更時のイベント
        this.uiControls.elements.orbitAltitude.addEventListener('input', () => {
            this.updateOrbitParameters();
        });
        
        this.uiControls.elements.orbitAltitude.addEventListener('change', () => {
            this.updateOrbitParameters();
            this.resetSimulation();
        });
        
        this.uiControls.elements.orbitRadius.addEventListener('change', () => {
            this.resetSimulation();
        });
        
        this.uiControls.elements.zAmplitude.addEventListener('input', () => {
            this.uiControls.updateZAmplitudeDisplay();
            this.resetSimulation();
        });
        
        // チェックボックスの変更もリアルタイムで反映（すでに動作している）
        this.uiControls.elements.showTrails.addEventListener('change', () => {
            if (!this.uiControls.elements.showTrails.checked) {
                // 軌跡を非表示にする場合は適切にクリーンアップ
                this.satellites.forEach(sat => {
                    this.trailRenderer.clearTrail(sat);
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
                    this.uiControls.elements.showTrails.checked = !this.uiControls.elements.showTrails.checked;
                    this.uiControls.elements.showTrails.dispatchEvent(new Event('change'));
                    break;
                case 'g':
                    this.uiControls.elements.showGrid.checked = !this.uiControls.elements.showGrid.checked;
                    break;
                case 'a':
                    this.uiControls.elements.autoRotate.checked = !this.uiControls.elements.autoRotate.checked;
                    break;
                case '+':
                case '=':
                    const currentScale = parseFloat(this.uiControls.elements.timeScale.value);
                    this.uiControls.elements.timeScale.value = Math.min(10, currentScale + 0.5).toString();
                    // timeScale is a dropdown, no need for value display
                    break;
                case '-':
                case '_':
                    const currentScale2 = parseFloat(this.uiControls.elements.timeScale.value);
                    this.uiControls.elements.timeScale.value = Math.max(0, currentScale2 - 0.5).toString();
                    // timeScale is a dropdown, no need for value display
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