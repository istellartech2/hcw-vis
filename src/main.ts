import * as THREE from 'three';
import { Satellite } from './models/Satellite.js';
import { HillEquationSolver } from './physics/HillEquationSolver.js';
import { OrbitInitializer } from './physics/OrbitInitializer.js';
import { OrbitElementsCalculator } from './physics/OrbitElements.js';
import type { OrbitalElements } from './physics/OrbitElements.js';
import { UIControls } from './ui/UIControls.js';
import { CameraController } from './controls/CameraController.js';
import { EventHandler } from './controls/EventHandler.js';
import type { EventHandlerCallbacks } from './controls/EventHandler.js';
import { RenderingSystem } from './rendering/RenderingSystem.js';

class HillEquationSimulation implements EventHandlerCallbacks {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private satellites: Satellite[] = [];
    private time: number = 0;
    private dt: number = 0.1;
    private paused: boolean = false;
    private animationFrameCounter: number = 0;
    private n: number = 1.126e-3;
    private orbitRadius: number = 6778000;
    
    // System components
    private hillSolver: HillEquationSolver;
    private orbitInitializer: OrbitInitializer;
    private uiControls: UIControls;
    private cameraController: CameraController;
    private eventHandler: EventHandler;
    private renderingSystem: RenderingSystem;
    
    // Orbital elements
    private currentOrbitElements: OrbitalElements;
    
    // Fullscreen mode
    private isFullscreen: boolean = false;
    private originalContainerStyle: string = '';
    
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
        
        // System components initialization
        this.hillSolver = new HillEquationSolver(this.n);
        this.orbitInitializer = new OrbitInitializer(this.n);
        this.uiControls = new UIControls();
        this.cameraController = new CameraController(this.camera, this.container);
        this.renderingSystem = new RenderingSystem(this.scene, this.camera, this.renderer, this.container, this.uiControls);
        this.eventHandler = new EventHandler(this.uiControls, this.renderingSystem.getCelestialBodies(), this, this.container);
        
        this.setupSatelliteSelectionListener();
        this.initializeOrbitElements();
        this.updateOrbitParameters();
        this.uiControls.setupPlacementPatternLimits();
        this.initSimulation();
        
        // Create Earth
        this.renderingSystem.getCelestialBodies().createEarth(this.orbitRadius / 1000);
        this.renderingSystem.getCelestialBodies().setEarthVisibility(true);
        
        this.animate();
    }
    
    private setupSatelliteSelectionListener(): void {
        this.container.addEventListener('satelliteSelected', (e: CustomEvent) => {
            this.updateSelectedSatelliteInfo(e.detail.index);
        });
    }
    
    
    
    private initializeOrbitElements(): void {
        // UIから初期値を読み取り
        const inclination = parseFloat(this.uiControls.elements.inclination.value);
        const raan = parseFloat(this.uiControls.elements.raan.value);
        const eccentricity = parseFloat(this.uiControls.elements.eccentricity.value);
        const argOfPerigee = parseFloat(this.uiControls.elements.argOfPerigee.value);
        const meanAnomaly = parseFloat(this.uiControls.elements.meanAnomaly.value);
        const altitude = parseFloat(this.uiControls.elements.orbitAltitude.value);
        
        // 軌道要素を計算
        this.currentOrbitElements = OrbitElementsCalculator.calculateOrbitalElements(
            inclination, raan, eccentricity, argOfPerigee, meanAnomaly, altitude
        );
        
        // UI表示を更新
        this.uiControls.updateOrbitInfo(this.currentOrbitElements);
    }
    
    
    private updateOrbitParameters(): void {
        if (!this.currentOrbitElements) return;
        
        const radiusKm = this.currentOrbitElements.semiMajorAxis;
        this.orbitRadius = radiusKm * 1000;
        this.n = this.currentOrbitElements.meanMotion;
        
        this.hillSolver.updateMeanMotion(this.n);
        this.orbitInitializer.updateMeanMotion(this.n);
        
        if (this.renderingSystem) {
            this.renderingSystem.getCelestialBodies().createEarth(radiusKm);
        }
    }
    
    
    private generatePlacementPositions(pattern: string, count: number, radius: number, zSpread: number, zAmplitudeMultiplier?: number): Array<{x0: number, y0: number, z0: number, vx0: number, vy0: number, vz0: number}> {
        return this.orbitInitializer.generatePositions(pattern, count, radius, zSpread, zAmplitudeMultiplier);
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
        const radius = parseInt(this.uiControls.elements.orbitRadius.value);
        const pattern = this.uiControls.elements.placementPattern.value;
        
        this.satellites = [];
        
        // Create center satellite
        this.satellites.push(new Satellite(0, 0, 0, 0, 0, 0, '#ffffff'));
        
        const useUniformColor = this.uiControls.elements.uniformSatelliteColor.checked;
        const uniformColor = this.uiControls.elements.satelliteColor.value;
        const hexColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff'];
        
        const zAmplitudeMultiplier = parseFloat(this.uiControls.elements.zAmplitude.value) || 0;
        const positions = this.generatePlacementPositions(pattern, count, radius, 0, zAmplitudeMultiplier);
        
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
                this.renderingSystem.updatePlots(this.satellites);
            }
            
            // Update selected satellite info
            if (this.renderingSystem.getSelectedSatelliteIndex() >= 0) {
                this.updateSelectedSatelliteInfo(this.renderingSystem.getSelectedSatelliteIndex());
            }
            
            // Update time display
            if (this.animationFrameCounter % 5 === 0) {
                this.uiControls.updateTimeDisplay(this.time);
            }
            
            // Update celestial bodies
            this.renderingSystem.updateCelestialBodies(this.time);
        }
        
        this.renderingSystem.render();
    }
    
    
    private updateInfo(): void {
        const infoDiv = document.getElementById('satelliteInfo')!;
        let html = '基準衛星の状態:';
        
        if (this.currentOrbitElements) {
            html += `<div style="margin-bottom: 5px; color: #999;">
                    高度: ${this.currentOrbitElements.altitude.toFixed(1)} km | 
                    周期: ${this.currentOrbitElements.period.toFixed(1)} 分 | 
                    傾斜角: ${this.currentOrbitElements.inclination.toFixed(1)}°
                    </div>`;
        }
        
        infoDiv.innerHTML = html;
    }
    
    private checkSatelliteSelection(): void {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.satelliteMeshes);
        
        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            const index = this.satelliteMeshes.indexOf(clickedMesh as THREE.Mesh);
            
            if (index >= 0) {
                this.selectedSatelliteIndex = index;
                this.updateSelectedSatelliteInfo();
            }
        } else {
            // 空いた場所をクリックしたら選択解除
            this.selectedSatelliteIndex = -1;
            this.updateSelectedSatelliteInfo();
        }
    }
    
    public updateSelectedSatelliteInfo(index?: number): void {
        if (index !== undefined) {
            this.renderingSystem.setSelectedSatelliteIndex(index);
        }
        
        const selectedIndex = this.renderingSystem.getSelectedSatelliteIndex();
        const infoDiv = document.getElementById('selectedSatelliteInfo');
        if (!infoDiv) {
            // 選択衛星情報表示エリアを作成
            const newInfoDiv = document.createElement('div');
            newInfoDiv.id = 'selectedSatelliteInfo';
            newInfoDiv.style.cssText = `
                position: absolute;
                top: 70px;
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
            document.getElementById('canvas-container')!.appendChild(newInfoDiv);
        }
        
        const selectedInfoDiv = document.getElementById('selectedSatelliteInfo')!;
        
        if (selectedIndex >= 0) {
            const sat = this.satellites[selectedIndex];
            const pos = sat.getPosition();
            const vel = sat.getVelocity();
            
            const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            const v = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
            
            selectedInfoDiv.innerHTML = `
                <strong>選択衛星: ${selectedIndex === 0 ? '主衛星' : `衛星${selectedIndex}`}</strong><br>
                位置: X=${(pos.x*1000).toFixed(0)}, Y=${(pos.y*1000).toFixed(0)}, Z=${(pos.z*1000).toFixed(0)} L<br>
                速度: ${(v*1000).toFixed(2)} L/s<br>
                距離: ${(r*1000).toFixed(0)} L<br>
                <div style="margin-top: 10px;">
                    <strong>推力制御:</strong><br>
                    <button onclick="applyThrust('x', 0.001)" style="margin: 2px; padding: 2px 6px; font-size: 10px;">+X</button>
                    <button onclick="applyThrust('x', -0.001)" style="margin: 2px; padding: 2px 6px; font-size: 10px;">-X</button><br>
                    <button onclick="applyThrust('y', 0.001)" style="margin: 2px; padding: 2px 6px; font-size: 10px;">+Y</button>
                    <button onclick="applyThrust('y', -0.001)" style="margin: 2px; padding: 2px 6px; font-size: 10px;">-Y</button><br>
                    <button onclick="applyThrust('z', 0.001)" style="margin: 2px; padding: 2px 6px; font-size: 10px;">+Z</button>
                    <button onclick="applyThrust('z', -0.001)" style="margin: 2px; padding: 2px 6px; font-size: 10px;">-Z</button>
                </div>
            `;
            selectedInfoDiv.style.display = 'block';
            
            
            // 推力印加関数をグローバルに登録
            (window as any).applyThrust = (axis: string, dv: number) => {
                this.applyThrustToSelected(axis, dv);
            };
        } else {
            selectedInfoDiv.style.display = 'none';
        }
    }
    
    public resetSimulation(): void {
        this.satellites.forEach(sat => {
            if (sat.trailLine) this.scene.remove(sat.trailLine);
            sat.reset();
        });
        this.selectedSatelliteIndex = -1;
        this.updateSelectedSatelliteInfo();
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
    
    public toggleFullscreen(): void {
        const container = this.container;
        const button = document.getElementById('fullscreen-toggle')!;
        
        if (!this.isFullscreen) {
            // 全画面モードに切り替え
            this.originalContainerStyle = container.style.cssText;
            container.classList.add('fullscreen-mode');
            button.textContent = '⛶';
            button.title = '全画面を終了';
            this.isFullscreen = true;
        } else {
            // 通常モードに戻る
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
        if (selectedIndex < 0 || selectedIndex >= this.satellites.length) {
            return;
        }
        
        const sat = this.satellites[selectedIndex];
        
        // 速度変化を適用（km/s単位）
        switch (axis) {
            case 'x':
                sat.vx += dv;
                break;
            case 'y':
                sat.vy += dv;
                break;
            case 'z':
                sat.vz += dv;
                break;
        }
        
        // 情報表示を更新
        this.updateSelectedSatelliteInfo();
    }
    
    public updateOrbitElementsFromUI(): void {
        const inclination = parseFloat(this.uiControls.elements.inclination.value);
        const raan = parseFloat(this.uiControls.elements.raan.value);
        const eccentricity = parseFloat(this.uiControls.elements.eccentricity.value);
        const argOfPerigee = parseFloat(this.uiControls.elements.argOfPerigee.value);
        const meanAnomaly = parseFloat(this.uiControls.elements.meanAnomaly.value);
        const altitude = parseFloat(this.uiControls.elements.orbitAltitude.value);
        
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
        
        // UI表示を更新
        this.uiControls.updateOrbitInfo(this.currentOrbitElements);
        
        // 軌道パラメータを更新
        this.updateOrbitParameters();
    }
    
    public clearTrails(): void {
        this.renderingSystem.clearAllTrails();
    }
    
}

let simulation: HillEquationSimulation;

document.addEventListener('DOMContentLoaded', () => {
    simulation = new HillEquationSimulation();
});