import * as THREE from 'three';
import { Satellite } from './simulation/Satellite.js';
import { HillEquationSolver } from './simulation/HillEquationSolver.js';
import { OrbitInitializer } from './simulation/OrbitInitializer.js';
import { OrbitElementsCalculator } from './simulation/OrbitElements.js';
import type { OrbitalElements } from './simulation/OrbitElements.js';
import { UIControls } from './interaction/UIControls.js';
import { CameraController } from './interaction/CameraController.js';
import { EventHandler } from './interaction/EventHandler.js';
import type { EventHandlerCallbacks } from './interaction/EventHandler.js';
import { RenderingSystem } from './visualization/RenderingSystem.js';

class HillEquationSimulation implements EventHandlerCallbacks {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private satellites: Satellite[] = [];
    private time: number = 0;
    private simulationStartTime: Date = new Date();
    // 時間刻み (seconds)
    private dt: number = 0.1;
    private paused: boolean = false;
    private animationFrameCounter: number = 0;
    // 基準軌道の平均運動 (rad/s)
    private n: number = 1.126e-3;
    // 基準軌道半径 (m)
    private orbitRadius: number = 6778137;
    
    // System components
    private hillSolver: HillEquationSolver;
    private orbitInitializer: OrbitInitializer;
    private uiControls: UIControls;
    private cameraController: CameraController;
    private eventHandler: EventHandler;
    private renderingSystem: RenderingSystem;
    
    // Orbital elements
    private currentOrbitElements!: OrbitalElements;
    
    // Fullscreen mode
    private isFullscreen: boolean = false;
    private originalContainerStyle: string = '';
    
    constructor() {
        this.container = document.getElementById('canvas-container')!;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75, 
            this.container.clientWidth / this.container.clientHeight, 
            0.001, 
            50000000
        );
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('canvas') as HTMLCanvasElement,
            antialias: true,
            alpha: true,
            logarithmicDepthBuffer: true
        });
        
        // System components initialization
        this.hillSolver = new HillEquationSolver(this.n);
        this.orbitInitializer = new OrbitInitializer(this.n);
        this.uiControls = new UIControls();
        this.cameraController = new CameraController(this.camera, this.container);
        this.renderingSystem = new RenderingSystem(this.scene, this.camera, this.renderer, this.container, this.uiControls);
        this.cameraController.resetView(); // Set initial camera position
        this.eventHandler = new EventHandler(this.uiControls, this.renderingSystem.getCelestialBodies(), this, this.container);
        
        this.setupSatelliteSelectionListener();
        this.setupUIEventListeners();
        this.setupReferenceSatellitePanel();
        this.initializeOrbitElements();
        this.updateOrbitParameters();
        this.uiControls.setupPlacementPatternLimits();
        this.initSimulation();
        
        // Create Earth (orbit radius in meters)
        const selectedTexture = this.uiControls.elements.earthTexture.value;
        this.renderingSystem.getCelestialBodies().createEarth(this.orbitRadius, selectedTexture);
        this.renderingSystem.getCelestialBodies().setEarthVisibility(true);
        
        this.animate();
    }
    
    private setupSatelliteSelectionListener(): void {
        this.container.addEventListener('satelliteSelected', (e: Event) => {
            const customEvent = e as CustomEvent;
            this.updateSelectedSatelliteInfo(customEvent.detail.index);
        });
    }
    
    private setupUIEventListeners(): void {
        // Satellite size number input
        this.uiControls.elements.satelliteSize.addEventListener('input', () => {
            this.updateSatelliteSize();
        });
    }
    
    
    private setupReferenceSatellitePanel(): void {
        // 基準衛星情報パネルの折りたたみ機能を初期化
        const toggleButton = document.getElementById('reference-satellite-toggle');
        const content = document.getElementById('reference-satellite-content');
        
        if (toggleButton && content) {
            // 初期状態は折りたたまれている
            content.classList.add('hidden');
            toggleButton.classList.add('collapsed');
            
            // グローバル関数として登録
            (window as any).toggleReferenceSatelliteInfo = () => {
                const isCollapsed = toggleButton.classList.contains('collapsed');
                
                if (isCollapsed) {
                    content.classList.remove('hidden');
                    toggleButton.classList.remove('collapsed');
                } else {
                    content.classList.add('hidden');
                    toggleButton.classList.add('collapsed');
                }
            };
        }
    }
    
    private initializeOrbitElements(): void {
        // UIから初期値を読み取り
        const inclination = parseFloat(this.uiControls.elements.inclination.value);
        const raan = parseFloat(this.uiControls.elements.raan.value);
        const eccentricity = parseFloat(this.uiControls.elements.eccentricity.value);
        const argOfPerigee = parseFloat(this.uiControls.elements.argOfPerigee.value);
        const meanAnomaly = parseFloat(this.uiControls.elements.meanAnomaly.value);
        const altitudeKm = parseFloat(this.uiControls.elements.orbitAltitude.value);
        const altitude = altitudeKm * 1000; // Convert km to meters
        
        // 軌道要素を計算
        this.currentOrbitElements = OrbitElementsCalculator.calculateOrbitalElements(
            inclination, raan, eccentricity, argOfPerigee, meanAnomaly, altitude
        );
        
        // 基準衛星の軌道要素を設定
        Satellite.setReferenceOrbit(this.currentOrbitElements);
        
        // ECI座標を取得
        const eciData = OrbitElementsCalculator.getECIPosition(this.currentOrbitElements);
        
        // UI表示を更新
        this.uiControls.updateOrbitInfo(this.currentOrbitElements, eciData?.position, eciData?.geodetic);
    }
    
    
    private updateOrbitParameters(): void {
        if (!this.currentOrbitElements) return;
        
        // semiMajorAxis is already in meters
        this.orbitRadius = this.currentOrbitElements.semiMajorAxis;
        // meanMotion is already in rad/s
        this.n = this.currentOrbitElements.meanMotion;
        
        this.hillSolver.updateMeanMotion(this.n);
        this.orbitInitializer.updateMeanMotion(this.n);
        
        if (this.renderingSystem) {
            const selectedTexture = this.uiControls.elements.earthTexture.value;
            this.renderingSystem.getCelestialBodies().createEarth(this.orbitRadius, selectedTexture);
        }
    }
    
    
    private generatePlacementPositions(pattern: string, count: number, radius: number, zSpread: number, zAmplitudeMultiplier?: number, positiveZ?: boolean): Array<{x0: number, y0: number, z0: number, vx0: number, vy0: number, vz0: number}> {
        return this.orbitInitializer.generatePositions(pattern, count, radius, zSpread, zAmplitudeMultiplier, positiveZ);
    }
    
    public updateAllSatelliteColors(): void {
        const isUniform = this.uiControls.elements.uniformSatelliteColor.checked;
        const uniformColor = this.uiControls.elements.satelliteColor.value;
        const hexColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff'];
        
        for (let i = 1; i < this.satellites.length; i++) {
            const satellite = this.satellites[i];
            if (isUniform) {
                satellite.color = uniformColor;
            } else {
                const colorIndex = (i - 1) % hexColors.length;
                satellite.color = hexColors[colorIndex];
            }
        }
        
        this.renderingSystem.updateAllSatelliteColors();
    }
    
    private initSimulation(): void {
        // Clean up existing satellites
        this.satellites.forEach(sat => {
            sat.dispose();
        });
        
        const count = parseInt(this.uiControls.elements.satelliteCount.value);
        const radius = parseFloat(this.uiControls.elements.orbitRadius.value);
        const pattern = this.uiControls.elements.placementPattern.value;
        
        this.satellites = [];
        
        // Create center satellite
        this.satellites.push(new Satellite(0, 0, 0, 0, 0, 0, '#ffffff'));
        
        const useUniformColor = this.uiControls.elements.uniformSatelliteColor.checked;
        const uniformColor = this.uiControls.elements.satelliteColor.value;
        const hexColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff'];
        
        const zAmplitudeMultiplier = parseFloat(this.uiControls.elements.zAmplitude.value) || 0;
        const positiveZ = this.uiControls.elements.circularZDirection.checked;
        const positions = this.generatePlacementPositions(pattern, count, radius, 0, zAmplitudeMultiplier, positiveZ);
        
        positions.forEach((pos, i) => {
            let satelliteColor: string;
            
            if (useUniformColor) {
                satelliteColor = uniformColor;
            } else {
                satelliteColor = hexColors[i % hexColors.length];
            }
            
            this.satellites.push(new Satellite(pos.x0, pos.y0, pos.z0, pos.vx0, pos.vy0, pos.vz0, satelliteColor));
        });
        
        // Create meshes in rendering system
        this.renderingSystem.createSatelliteMeshes(this.satellites);
        
        this.time = 0;
        this.simulationStartTime = new Date();
    }
    
    private animate = (): void => {
        requestAnimationFrame(this.animate);
        
        if (!this.paused) {
            this.animationFrameCounter++;
            const timeScale = parseFloat(this.uiControls.elements.timeScale.value);
            const deltaTime = 0.016 * timeScale;
            this.time += deltaTime;
            
            // Physics integration
            const adaptiveDt = Math.min(this.dt * Math.max(1, timeScale / 10), deltaTime);
            const satelliteCount = this.satellites.length - 1;
            const skipIntegration = satelliteCount > 20 && this.animationFrameCounter % 2 !== 0;
            
            if (!skipIntegration) {
                const integrationSteps = Math.max(1, Math.ceil(deltaTime / adaptiveDt));
                const stepDt = deltaTime / integrationSteps;
                
                for (let step = 0; step < integrationSteps; step++) {
                    this.satellites.forEach((sat, index) => {
                        if (index > 0) {
                            this.hillSolver.rungeKutta4Step(sat, stepDt);
                        }
                    });
                }
            }
            
            // Update camera and rendering
            this.cameraController.updateCameraPosition();
            this.renderingSystem.updateSatellitePositions(this.satellites);
            
            // Update info and plots
            if (this.animationFrameCounter % 10 === 0) {
                this.updateInfo();
                this.updateOrbitInfoRealtime();
                this.renderingSystem.updatePlots(this.satellites);
            }
            
            // Update selected satellite info (only when selected and much less frequently)
            if (this.renderingSystem.getSelectedSatelliteIndex() >= 0 && this.animationFrameCounter % 60 === 0) {
                this.updateSelectedSatelliteInfo();
            }
            
            // Update time display
            if (this.animationFrameCounter % 5 === 0) {
                this.uiControls.updateTimeDisplay(this.time);
            }
            
            // Update celestial bodies
            this.renderingSystem.updateCelestialBodies(this.time, this.simulationStartTime);
        }
        
        this.renderingSystem.render();
    }
    
    
    private updateInfo(): void {
        // 新しいパネルに基準衛星情報を更新
        this.updateReferenceSatellitePanel();
        
        // 左下の基準衛星情報表示は無効化（新しいパネルに統合されたため）
        // 既存のsatelliteInfo要素があれば非表示にする
        const oldInfoDiv = document.getElementById('satelliteInfo');
        if (oldInfoDiv) {
            oldInfoDiv.style.display = 'none';
        }
    }
    
    private updateReferenceSatellitePanel(): void {
        const geodeticInfo = document.getElementById('geodetic-info');
        const eciInfo = document.getElementById('eci-info');
        const orbitalInfo = document.getElementById('orbital-info');
        
        if (!geodeticInfo || !eciInfo || !orbitalInfo || !this.currentOrbitElements) {
            return;
        }
        
        // ECI座標を取得（現在時刻で計算）
        const currentDate = new Date(Date.now() + this.time * 1000);
        const eciData = OrbitElementsCalculator.getECIPosition(this.currentOrbitElements, currentDate);
        
        if (eciData) {
            // 位置情報（緯度経度高度）
            geodeticInfo.innerHTML = `
                緯度: ${eciData.geodetic.latitude.toFixed(1)}°<br>
                経度: ${eciData.geodetic.longitude.toFixed(1)}°<br>
                高度: ${(eciData.geodetic.altitude / 1000).toFixed(0)} km
            `;
            
            // ECI座標系
            eciInfo.innerHTML = `
                X: ${(eciData.position.x / 1000).toFixed(1)} km<br>
                Y: ${(eciData.position.y / 1000).toFixed(1)} km<br>
                Z: ${(eciData.position.z / 1000).toFixed(1)} km
            `;
        }
        
        // 軌道要素
        orbitalInfo.innerHTML = `
            高度: ${(this.currentOrbitElements.altitude / 1000).toFixed(1)} km<br>
            周期: ${this.currentOrbitElements.period.toFixed(1)} 分<br>
            傾斜角: ${this.currentOrbitElements.inclination.toFixed(1)}°<br>
            離心率: ${this.currentOrbitElements.eccentricity.toFixed(4)}<br>
            昇交点経度: ${this.currentOrbitElements.raan.toFixed(1)}°<br>
            近地点引数: ${this.currentOrbitElements.argOfPerigee.toFixed(1)}°
        `;
    }
    
    private updateOrbitInfoRealtime(): void {
        if (!this.currentOrbitElements) return;
        
        // 現在時刻でECI座標と緯度経度高度を計算
        const currentDate = new Date(Date.now() + this.time * 1000);
        const eciData = OrbitElementsCalculator.getECIPosition(this.currentOrbitElements, currentDate);

        // UIの軌道情報エリアを更新
        this.uiControls.updateOrbitInfo(this.currentOrbitElements, eciData?.position, eciData?.geodetic);
        this.uiControls.updateGeodeticDisplay(eciData?.geodetic);
    }
    
    // この機能はRenderingSystemに移譲済みのため削除
    
    public updateSelectedSatelliteInfo(index?: number): void {
        if (index !== undefined) {
            this.renderingSystem.setSelectedSatelliteIndex(index);
        }
        
        const selectedIndex = this.renderingSystem.getSelectedSatelliteIndex();
        console.log(`updateSelectedSatelliteInfo called with selectedIndex: ${selectedIndex}`);
        let selectedInfoDiv = document.getElementById('selectedSatelliteInfo');
        
        if (!selectedInfoDiv) {
            // 選択衛星情報表示エリアを作成
            selectedInfoDiv = document.createElement('div');
            selectedInfoDiv.id = 'selectedSatelliteInfo';
            selectedInfoDiv.style.cssText = `
                position: absolute;
                top: 110px;
                left: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px;
                border-radius: 10px;
                font-size: 12px;
                display: none;
                border: 1px solid rgba(74, 158, 255, 0.3);
                backdrop-filter: blur(10px);
                max-width: 280px;
            `;
            document.getElementById('canvas-container')!.appendChild(selectedInfoDiv);
        }
        
        if (selectedIndex >= 0 && selectedIndex < this.satellites.length) {
            const sat = this.satellites[selectedIndex];
            const pos = sat.getPosition();
            const vel = sat.getVelocity();
            
            const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            const v = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
            
            // Check if we need to create the structure (first time or satellite changed)
            let infoTextDiv = selectedInfoDiv.querySelector('#info-text');
            let thrustControlsDiv = selectedInfoDiv.querySelector('#thrust-controls');
            
            if (!infoTextDiv || !thrustControlsDiv) {
                // Create the structure once
                selectedInfoDiv.innerHTML = `
                    <div id="info-text"></div>
                    <div style="margin-top: 10px;">
                        <strong>推力制御:</strong><br>
                        <div id="thrust-controls"></div>
                    </div>
                `;
                
                infoTextDiv = selectedInfoDiv.querySelector('#info-text')!;
                thrustControlsDiv = selectedInfoDiv.querySelector('#thrust-controls')!;
                
                // Create buttons once
                const axes = [
                    { axis: 'r', label: 'R' },
                    { axis: 's', label: 'S' },
                    { axis: 'w', label: 'W' }
                ];
                
                axes.forEach(({ axis, label }) => {
                    const plusBtn = document.createElement('button');
                    plusBtn.textContent = `+${label}`;
                    plusBtn.style.cssText = 'margin: 2px; padding: 2px 6px; font-size: 10px;';
                    plusBtn.addEventListener('click', () => {
                        const thrustAmount = parseFloat(this.uiControls.elements.thrustAmount.value);
                        console.log(`Plus button clicked for axis: ${axis}, thrust: ${thrustAmount}`);
                        this.applyThrustToSelected(axis, thrustAmount);
                    });
                    
                    const minusBtn = document.createElement('button');
                    minusBtn.textContent = `-${label}`;
                    minusBtn.style.cssText = 'margin: 2px; padding: 2px 6px; font-size: 10px;';
                    minusBtn.addEventListener('click', () => {
                        const thrustAmount = parseFloat(this.uiControls.elements.thrustAmount.value);
                        console.log(`Minus button clicked for axis: ${axis}, thrust: ${thrustAmount}`);
                        this.applyThrustToSelected(axis, -thrustAmount);
                    });
                    
                    thrustControlsDiv!.appendChild(plusBtn);
                    thrustControlsDiv!.appendChild(minusBtn);
                    
                    if (axis !== 'w') {
                        thrustControlsDiv!.appendChild(document.createElement('br'));
                    }
                });
                
                console.log('Thrust control buttons created');
            }
            
            // Always update just the text content
            infoTextDiv!.innerHTML = `
                <strong>選択衛星: ${selectedIndex === 0 ? '主衛星' : `衛星${selectedIndex}`}</strong><br>
                位置: R=${pos.x.toFixed(0)}, S=${pos.y.toFixed(0)}, W=${pos.z.toFixed(0)} m<br>
                速度: ${v.toFixed(2)} m/s<br>
                距離: ${r.toFixed(0)} m
            `;
            
            selectedInfoDiv.style.display = 'block';
        } else {
            selectedInfoDiv.style.display = 'none';
        }
    }
    
    public resetSimulation(): void {
        this.satellites.forEach(sat => {
            if (sat.trailLine) this.scene.remove(sat.trailLine);
            sat.reset();
        });
        this.renderingSystem.setSelectedSatelliteIndex(-1);
        this.updateSelectedSatelliteInfo();
        this.initSimulation();
    }
    
    public togglePause(): void {
        this.paused = !this.paused;
    }
    
    public addPerturbation(): void {
        const perturbationAmount = parseFloat(this.uiControls.elements.perturbationAmount.value);
        console.log(`Adding perturbation: ±${(perturbationAmount/2).toFixed(3)} m/s to each axis`);
        
        this.satellites.forEach((sat, index) => {
            if (index > 0) {
                // 現在の速度に摂動を加える（数値積分用）
                sat.vx += (Math.random() - 0.5) * perturbationAmount;
                sat.vy += (Math.random() - 0.5) * perturbationAmount;
                sat.vz += (Math.random() - 0.5) * perturbationAmount;
            }
        });
    }
    
    public resetView(): void {
        this.cameraController.resetView();
    }
    
    public toggleFullscreen(): void {
        const container = this.container;
        const button = document.getElementById('fullscreen-toggle')!;
        const body = document.body;
        
        if (!this.isFullscreen) {
            // ページ内全画面モードに切り替え
            this.originalContainerStyle = container.style.cssText;
            
            // bodyに全画面クラスを追加してページ全体のレイアウトを調整
            body.classList.add('canvas-fullscreen');
            
            // コンテナにも全画面クラスを追加
            container.classList.add('fullscreen-mode');
            
            button.textContent = '🗗';
            button.title = '全画面を終了';
            this.isFullscreen = true;
        } else {
            // 通常モードに戻る
            body.classList.remove('canvas-fullscreen');
            container.classList.remove('fullscreen-mode');
            container.style.cssText = this.originalContainerStyle;
            
            button.textContent = '⛶';
            button.title = '全画面表示';
            this.isFullscreen = false;
        }
        
        // レンダラーサイズを更新
        setTimeout(() => {
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        }, 100);
    }
    
    public applyThrustToSelected(axis: string, dv: number): void {
        const selectedIndex = this.renderingSystem.getSelectedSatelliteIndex();
        
        // Validate inputs
        if (selectedIndex < 0 || selectedIndex >= this.satellites.length) {
            console.warn(`Invalid satellite index: ${selectedIndex}. Valid range: 0-${this.satellites.length - 1}`);
            return;
        }
        
        if (!['r', 's', 'w'].includes(axis.toLowerCase())) {
            console.warn(`Invalid axis: ${axis}. Valid axes: 'r', 's', 'w'`);
            return;
        }
        
        if (isNaN(dv) || !isFinite(dv)) {
            console.warn(`Invalid velocity change: ${dv}. Must be a finite number.`);
            return;
        }
        
        const sat = this.satellites[selectedIndex];
        
        // 速度変化を適用（m/s単位）
        switch (axis.toLowerCase()) {
            case 'r':
                sat.vx += dv;
                break;
            case 's':
                sat.vy += dv;
                break;
            case 'w':
                sat.vz += dv;
                break;
        }
        
        // Log thrust application for debugging
        console.log(`Applied thrust: ${dv.toFixed(6)} m/s in ${axis.toUpperCase()} direction to satellite ${selectedIndex}`);
    }
    
    public updateOrbitElementsFromUI(): void {
        const inclination = parseFloat(this.uiControls.elements.inclination.value);
        const raan = parseFloat(this.uiControls.elements.raan.value);
        const eccentricity = parseFloat(this.uiControls.elements.eccentricity.value);
        const argOfPerigee = parseFloat(this.uiControls.elements.argOfPerigee.value);
        const meanAnomaly = parseFloat(this.uiControls.elements.meanAnomaly.value);
        const altitudeKm = parseFloat(this.uiControls.elements.orbitAltitude.value);
        const altitude = altitudeKm * 1000; // Convert km to meters
        
        // 入力値の妥当性チェック
        const errors = OrbitElementsCalculator.validateElements({
            inclination, raan, eccentricity, argOfPerigee, meanAnomaly, altitude
        });
        
        if (errors.length > 0) {
            console.warn("軌道要素入力エラー:", errors);
            return;
        }
        
        // 軌道要素を再計算
        this.currentOrbitElements = OrbitElementsCalculator.calculateOrbitalElements(
            inclination, raan, eccentricity, argOfPerigee, meanAnomaly, altitude
        );
        
        // 基準衛星の軌道要素を更新
        Satellite.setReferenceOrbit(this.currentOrbitElements);
        
        // ECI座標を取得
        const eciData = OrbitElementsCalculator.getECIPosition(this.currentOrbitElements);
        
        // UI表示を更新
        this.uiControls.updateOrbitInfo(this.currentOrbitElements, eciData?.position, eciData?.geodetic);

        // 軌道パラメータを更新
        this.updateOrbitParameters();
    }
    
    public clearTrails(): void {
        this.renderingSystem.clearTrails(this.satellites);
    }
    
    public updateSatelliteSize(): void {
        this.renderingSystem.updateSatelliteSize(this.satellites);
    }
    
}

let simulation: HillEquationSimulation;

document.addEventListener('DOMContentLoaded', () => {
    simulation = new HillEquationSimulation();
    (window as any).simulation = simulation;
});