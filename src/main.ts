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
import { LoadingIndicator } from './ui/LoadingIndicator.js';
import { CSVPlaybackController } from './interaction/CSVPlaybackController.js';

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
    private loadingIndicator: LoadingIndicator;
    private csvPlaybackController: CSVPlaybackController;
    
    // Orbital elements
    private currentOrbitElements!: OrbitalElements;
    
    
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
        this.loadingIndicator = new LoadingIndicator();
        this.csvPlaybackController = new CSVPlaybackController(this.uiControls, this.loadingIndicator);
        this.csvPlaybackController.setUpdateCallback(() => this.updateSatellitesFromPlayback());
        this.cameraController.resetView(); // Set initial camera position
        this.eventHandler = new EventHandler(this.uiControls, this.renderingSystem.getCelestialBodies(), this, this.container);
        
        this.setupSatelliteSelectionListener();
        this.setupUIEventListeners();
        this.setupReferenceSatellitePanel();
        this.initializeOrbitElements();
        this.updateOrbitParameters();
        this.uiControls.setupPlacementPatternLimits();
        this.uiControls.updatePeriodicParamsDisplay(); // Initialize slider displays
        this.uiControls.updateSatelliteSizeLabel(); // Initialize size label
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
        
        // J2 perturbation checkbox
        this.uiControls.elements.j2Perturbation?.addEventListener('change', () => {
            this.updateOrbitParameters();
        });
        
        // Periodic parameters sliders
        this.uiControls.elements.paramB.addEventListener('input', () => {
            this.uiControls.updatePeriodicParamsDisplay();
            if (this.uiControls.elements.placementPattern.value === 'periodic_orbit') {
                this.resetSimulation();
            }
        });
        
        this.uiControls.elements.paramD.addEventListener('input', () => {
            this.uiControls.updatePeriodicParamsDisplay();
            if (this.uiControls.elements.placementPattern.value === 'periodic_orbit') {
                this.resetSimulation();
            }
        });
        
        this.uiControls.elements.paramE.addEventListener('input', () => {
            this.uiControls.updatePeriodicParamsDisplay();
            if (this.uiControls.elements.placementPattern.value === 'periodic_orbit') {
                this.resetSimulation();
            }
        });
        
        this.uiControls.elements.paramF.addEventListener('input', () => {
            this.uiControls.updatePeriodicParamsDisplay();
            if (this.uiControls.elements.placementPattern.value === 'periodic_orbit') {
                this.resetSimulation();
            }
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
            
            // 衛星配置パネルのトグル
            (window as any).toggleSatelliteConfig = () => {
                const content = document.getElementById('satellite-config-content');
                const toggleIcon = document.getElementById('satellite-config-toggle');
                
                if (content && toggleIcon) {
                    if (content.style.display === 'none') {
                        content.style.display = 'flex';
                        toggleIcon.textContent = '▼';
                    } else {
                        content.style.display = 'none';
                        toggleIcon.textContent = '▶';
                    }
                }
            };

            // CSV制御パネルのトグル
            (window as any).toggleCSVControls = () => {
                const content = document.getElementById('csv-controls-content');
                const toggleIcon = document.getElementById('csv-controls-toggle');
                
                if (content && toggleIcon) {
                    if (content.style.display === 'none') {
                        content.style.display = 'flex';
                        toggleIcon.textContent = '▼';
                    } else {
                        content.style.display = 'none';
                        toggleIcon.textContent = '▶';
                    }
                }
            };
        }
    }
    
    private initializeOrbitElements(): void {
        // UIから初期値を読み取り
        const inputValues = this.readReferenceOrbitInputs();
        if (!inputValues) {
            return;
        }

        const { inclination, raan, argOfPerigee, meanAnomaly, altitudeKm } = inputValues;
        const eccentricity = 0; // 離心率は0で固定
        const altitude = altitudeKm * 1000; // Convert km to meters
        
        // 軌道要素を計算
        this.currentOrbitElements = OrbitElementsCalculator.calculateOrbitalElements(
            inclination, raan, eccentricity, argOfPerigee, meanAnomaly, altitude
        );
        
        // 基準衛星の軌道要素を設定
        Satellite.setReferenceOrbit(this.currentOrbitElements);
        
        // ECI座標を取得
        const eciData = OrbitElementsCalculator.getECIPosition(this.currentOrbitElements);
    }
    
    
    private updateOrbitParameters(): void {
        if (!this.currentOrbitElements) return;
        
        // semiMajorAxis is already in meters
        this.orbitRadius = this.currentOrbitElements.semiMajorAxis;
        // meanMotion is already in rad/s
        this.n = this.currentOrbitElements.meanMotion;
        
        this.hillSolver.updateMeanMotion(this.n);
        this.orbitInitializer.updateMeanMotion(this.n);
        
        // J2摂動の設定を更新
        const j2Enabled = this.uiControls.elements.j2Perturbation?.checked || false;
        const inclinationRad = this.currentOrbitElements.inclination * Math.PI / 180;
        this.hillSolver.setOrbitParameters(this.orbitRadius, inclinationRad);
        this.hillSolver.setJ2Perturbation(j2Enabled);
        
        if (this.renderingSystem) {
            const selectedTexture = this.uiControls.elements.earthTexture.value;
            this.renderingSystem.getCelestialBodies().createEarth(this.orbitRadius, selectedTexture);
        }
    }
    
    
    private generatePlacementPositions(
        pattern: string,
        count: number,
        radius: number,
        zSpread: number,
        zAmplitudeMultiplier?: number,
        positiveZ?: boolean,
        periodicParams?: { A: number, B: number, D: number, E: number, F: number }
    ): Array<{x0: number, y0: number, z0: number, vx0: number, vy0: number, vz0: number}> {
        // Check if spacing mode is selected for disk patterns
        let spacing: number | undefined;
        if ((pattern === 'hexagonal_disk' || pattern === 'concentric_disk') &&
            this.uiControls.elements.diskPlacementMode.value === 'spacing') {
            spacing = parseFloat(this.uiControls.elements.satelliteSpacing.value);
        }

        return this.orbitInitializer.generatePositions(pattern, count, radius, zSpread, zAmplitudeMultiplier, positiveZ, periodicParams, spacing);
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

        // J2安定配置の設定
        const j2StableEnabled = this.uiControls.elements.j2StableArrangement?.checked || false;
        const ssCoefficient = this.hillSolver.getSSCoefficientC();
        this.orbitInitializer.setJ2StableArrangement(j2StableEnabled, ssCoefficient);

        const count = parseInt(this.uiControls.elements.satelliteCount.value);
        const radius = parseFloat(this.uiControls.elements.orbitRadius.value);
        const pattern = this.uiControls.elements.placementPattern.value;
        
        // Show loading indicator for large simulations
        if (count > 50) {
            this.loadingIndicator.showProcessing(`${count}個の衛星配置を生成`);
        }
        
        this.satellites = [];
        
        // Create center satellite
        this.satellites.push(new Satellite(0, 0, 0, 0, 0, 0, '#ffffff'));
        
        const useUniformColor = this.uiControls.elements.uniformSatelliteColor.checked;
        const uniformColor = this.uiControls.elements.satelliteColor.value;
        const hexColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff'];
        
        const zAmplitudeMultiplier = parseFloat(this.uiControls.elements.zAmplitude.value) || 0;
        const positiveZ = this.uiControls.elements.circularZDirection.checked;
        
        // Get periodic parameters for periodic_orbit pattern
        let periodicParams: { A: number, B: number, D: number, E: number, F: number } | undefined;
        if (pattern === 'periodic_orbit') {
            const A = radius; // Use range(m) as A parameter
            const ratioB = parseFloat(this.uiControls.elements.paramB.value);
            const ratioD = parseFloat(this.uiControls.elements.paramD.value);
            const ratioE = parseFloat(this.uiControls.elements.paramE.value);
            const ratioF = parseFloat(this.uiControls.elements.paramF.value);
            
            periodicParams = {
                A: A,
                B: A * ratioB,
                D: A * ratioD,
                E: A * ratioE,
                F: A * ratioF
            };
        }
        
        const positions = this.generatePlacementPositions(pattern, count, radius, 0, zAmplitudeMultiplier, positiveZ, periodicParams);
        
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
        
        // Hide loading indicator if shown
        if (count > 50) {
            this.loadingIndicator.hide();
        }
        
        this.time = 0;
        this.simulationStartTime = new Date();
    }
    
    private animate = (): void => {
        requestAnimationFrame(this.animate);
        
        // Always update camera (even when paused)
        this.cameraController.updateCameraPosition();
        
        if (!this.paused) {
            this.animationFrameCounter++;
            const deltaTime = 0.016;
            
            // Update CSV playback controller
            this.csvPlaybackController.update(deltaTime * 1000); // Convert to milliseconds
            
            // Check if we're in CSV playback mode
            if (this.csvPlaybackController.isPlaybackActive()) {
                // CSV playback mode - satellites are updated by playback controller
                this.renderingSystem.updateSatellitePositions(this.satellites);
                
                // Update time display with CSV playback time
                if (this.animationFrameCounter % 5 === 0) {
                    const playbackTime = this.csvPlaybackController.getPlaybackEngine().getState().currentTime;
                    this.uiControls.updateTimeDisplay(playbackTime);
                }
            } else {
                // Normal simulation mode
                const timeScale = parseFloat(this.uiControls.elements.timeScale.value);
                const scaledDeltaTime = deltaTime * timeScale;
                this.time += scaledDeltaTime;
                
                // Physics integration
                const adaptiveDt = Math.min(this.dt * Math.max(1, timeScale / 10), scaledDeltaTime);
                const satelliteCount = this.satellites.length - 1;
                const skipIntegration = satelliteCount > 20 && this.animationFrameCounter % 2 !== 0;
                
                if (!skipIntegration) {
                    const integrationSteps = Math.max(1, Math.ceil(scaledDeltaTime / adaptiveDt));
                    const stepDt = scaledDeltaTime / integrationSteps;
                    
                    for (let step = 0; step < integrationSteps; step++) {
                        this.satellites.forEach((sat, index) => {
                            if (index > 0) {
                                this.hillSolver.rungeKutta4Step(sat, stepDt);
                            }
                        });
                    }
                }
                
                // Update rendering
                this.renderingSystem.updateSatellitePositions(this.satellites);
                
                // Update time display for normal simulation
                if (this.animationFrameCounter % 5 === 0) {
                    this.uiControls.updateTimeDisplay(this.time);
                }
            }
            
            // Update info and plots (for both modes)
            if (this.animationFrameCounter % 10 === 0) {
                this.updateInfo();
                this.updateOrbitInfoRealtime();
            }
            
            // Update selected satellite info (only when selected and much less frequently)
            if (this.renderingSystem.getSelectedSatelliteIndex() >= 0 && this.animationFrameCounter % 60 === 0) {
                this.updateSelectedSatelliteInfo();
            }
            
            // Update celestial bodies
            // Use CSV playback time if in playback mode, otherwise use simulation time
            const currentTime = this.csvPlaybackController.isPlaybackActive() 
                ? this.csvPlaybackController.getPlaybackEngine().getState().currentTime
                : this.time;
            this.renderingSystem.updateCelestialBodies(currentTime, this.simulationStartTime);
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
        // Use CSV playback time if in playback mode, otherwise use simulation time
        const currentTime = this.csvPlaybackController.isPlaybackActive() 
            ? this.csvPlaybackController.getPlaybackEngine().getState().currentTime
            : this.time;
        const currentDate = new Date(Date.now() + currentTime * 1000);
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
        // 軌道周期を時間と分で表示
        const periodMinutes = this.currentOrbitElements.period;
        const periodHours = Math.floor(periodMinutes / 60);
        const periodRemainingMinutes = periodMinutes % 60;
        let periodDisplay = '';
        if (periodHours > 0) {
            periodDisplay = `${periodHours}時間${periodRemainingMinutes.toFixed(1)}分`;
        } else {
            periodDisplay = `${periodMinutes.toFixed(1)}分`;
        }

        orbitalInfo.innerHTML = `
            高度: ${(this.currentOrbitElements.altitude / 1000).toFixed(1)} km<br>
            周期: ${periodDisplay}<br>
            傾斜角: ${this.currentOrbitElements.inclination.toFixed(1)}°<br>
            離心率: ${this.currentOrbitElements.eccentricity.toFixed(4)}<br>
            昇交点経度: ${this.currentOrbitElements.raan.toFixed(1)}°<br>
            近地点引数: ${this.currentOrbitElements.argOfPerigee.toFixed(1)}°
        `;
    }
    
    private updateOrbitInfoRealtime(): void {
        if (!this.currentOrbitElements) return;
        
        // 現在時刻でECI座標と緯度経度高度を計算
        // Use CSV playback time if in playback mode, otherwise use simulation time
        const currentTime = this.csvPlaybackController.isPlaybackActive() 
            ? this.csvPlaybackController.getPlaybackEngine().getState().currentTime
            : this.time;
        const currentDate = new Date(Date.now() + currentTime * 1000);
        const eciData = OrbitElementsCalculator.getECIPosition(this.currentOrbitElements, currentDate);

        // 基準衛星パネルをリアルタイム更新
        this.updateReferenceSatellitePanel();
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
                bottom: 20px;
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
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            if (this.paused) {
                timeDisplay.classList.add('paused');
            } else {
                timeDisplay.classList.remove('paused');
            }
        }
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
        const inputValues = this.readReferenceOrbitInputs();
        if (!inputValues) {
            return;
        }

        const { inclination, raan, argOfPerigee, meanAnomaly, altitudeKm } = inputValues;
        const eccentricity = 0; // 離心率は0で固定
        const altitude = altitudeKm * 1000; // Convert km to meters
        
        // 入力値の妥当性チェック
        const errors = OrbitElementsCalculator.validateElements({
            inclination, raan, eccentricity, argOfPerigee, meanAnomaly, altitude
        });
        
        if (errors.length > 0) {
            console.warn("軌道要素入力エラー:", errors);
            return;
        }

        this.uiControls.setReferenceOrbitPending(false);
        
        // Show loading for orbit calculation and Earth texture change
        this.loadingIndicator.showProcessing('軌道要素を計算');
        
        // 軌道要素を再計算
        this.currentOrbitElements = OrbitElementsCalculator.calculateOrbitalElements(
            inclination, raan, eccentricity, argOfPerigee, meanAnomaly, altitude
        );
        
        // 基準衛星の軌道要素を更新
        Satellite.setReferenceOrbit(this.currentOrbitElements);
        
        // 軌道パラメータを更新（地球の再作成も含む）
        this.updateOrbitParameters();
        
        // 基準衛星パネルの軌道情報を即座に更新
        this.updateReferenceSatellitePanel();
        
        // Hide loading indicator after a short delay to show completion
        setTimeout(() => {
            this.loadingIndicator.hide();
        }, 500);
    }

    private readReferenceOrbitInputs(): {
        inclination: number;
        raan: number;
        argOfPerigee: number;
        meanAnomaly: number;
        altitudeKm: number;
    } | null {
        const fields = {
            inclination: {
                element: this.uiControls.elements.inclination,
                value: parseFloat(this.uiControls.elements.inclination.value)
            },
            raan: {
                element: this.uiControls.elements.raan,
                value: parseFloat(this.uiControls.elements.raan.value)
            },
            argOfPerigee: {
                element: this.uiControls.elements.argOfPerigee,
                value: parseFloat(this.uiControls.elements.argOfPerigee.value)
            },
            meanAnomaly: {
                element: this.uiControls.elements.meanAnomaly,
                value: parseFloat(this.uiControls.elements.meanAnomaly.value)
            },
            orbitAltitude: {
                element: this.uiControls.elements.orbitAltitude,
                value: parseFloat(this.uiControls.elements.orbitAltitude.value)
            }
        } as const;

        let firstInvalid: HTMLInputElement | null = null;

        for (const key of Object.keys(fields) as Array<keyof typeof fields>) {
            const entry = fields[key];
            entry.element.setCustomValidity('');
            if (Number.isNaN(entry.value)) {
                entry.element.setCustomValidity('数値を入力してください');
                if (!firstInvalid) {
                    firstInvalid = entry.element;
                }
            }
        }

        if (firstInvalid) {
            firstInvalid.reportValidity();
            firstInvalid.focus();
            return null;
        }

        return {
            inclination: fields.inclination.value,
            raan: fields.raan.value,
            argOfPerigee: fields.argOfPerigee.value,
            meanAnomaly: fields.meanAnomaly.value,
            altitudeKm: fields.orbitAltitude.value
        };
    }

    public clearTrails(): void {
        this.renderingSystem.clearTrails(this.satellites);
    }
    
    public updateSatelliteSize(): void {
        this.renderingSystem.updateSatelliteSize(this.satellites);
    }
    
    public loadFile3D(file: File): void {
        this.renderingSystem.loadFile3D(file);
    }

    private updateSatellitesFromPlayback(): void {
        const playbackEngine = this.csvPlaybackController.getPlaybackEngine();
        const interpolatedStates = playbackEngine.getInterpolatedStates();
        
        if (interpolatedStates.length === 0) return;
        
        // Adjust satellite count to match CSV data
        const targetSatelliteCount = interpolatedStates.length;
        
        // If we need more satellites, create them
        while (this.satellites.length < targetSatelliteCount) {
            const newSatellite = new Satellite(0, 0, 0, 0, 0, 0, '#ffffff');
            this.satellites.push(newSatellite);
        }
        
        // If we have too many satellites, remove the extras
        while (this.satellites.length > targetSatelliteCount) {
            const removedSatellite = this.satellites.pop();
            if (removedSatellite) {
                removedSatellite.dispose();
            }
        }
        
        // Update satellite positions and attitudes from CSV data
        for (let i = 0; i < interpolatedStates.length; i++) {
            const state = interpolatedStates[i];
            const satellite = this.satellites[i];
            
            // Update position
            satellite.x = state.position.x;
            satellite.y = state.position.y;
            satellite.z = state.position.z;
            
            // Update velocity
            satellite.vx = state.velocity.x;
            satellite.vy = state.velocity.y;
            satellite.vz = state.velocity.z;
            
            // Store quaternion for future use (when rendering system supports it)
            (satellite as any).quaternion = state.quaternion;
        }
        
        // Recreate satellite meshes if the count changed
        // Always recreate for now to ensure proper mesh setup
        this.renderingSystem.createSatelliteMeshes(this.satellites);
    }
    
}

let simulation: HillEquationSimulation;

document.addEventListener('DOMContentLoaded', () => {
    simulation = new HillEquationSimulation();
    (window as any).simulation = simulation;
    
    // グローバル関数として登録
    (window as any).resetSimulation = () => simulation.resetSimulation();
    (window as any).togglePause = () => simulation.togglePause();
    (window as any).addPerturbation = () => simulation.addPerturbation();
    (window as any).resetView = () => simulation.resetView();
});
