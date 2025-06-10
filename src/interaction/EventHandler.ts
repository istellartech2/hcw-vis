import { UIControls } from './UIControls.js';
import { CelestialBodies } from '../visualization/CelestialBodies.js';

export interface EventHandlerCallbacks {
    resetSimulation: () => void;
    togglePause: () => void;
    addPerturbation: () => void;
    resetView: () => void;
    toggleFullscreen: () => void;
    applyThrustToSelected: (axis: string, dv: number) => void;
    updateOrbitElementsFromUI: () => void;
    updateAllSatelliteColors: () => void;
    clearTrails: () => void;
}

export class EventHandler {
    private uiControls: UIControls;
    private celestialBodies: CelestialBodies;
    private callbacks: EventHandlerCallbacks;
    private container: HTMLElement;

    constructor(
        uiControls: UIControls, 
        celestialBodies: CelestialBodies, 
        callbacks: EventHandlerCallbacks,
        container: HTMLElement
    ) {
        this.uiControls = uiControls;
        this.celestialBodies = celestialBodies;
        this.callbacks = callbacks;
        this.container = container;
        this.setupEventListeners();
        this.setupGlobalFunctions();
    }

    private setupEventListeners(): void {
        // Time scale controls
        this.uiControls.elements.timeScale.addEventListener('change', () => {
            // No need to update display since it's a dropdown
        });
        
        this.uiControls.elements.trailLength.addEventListener('input', () => {
            this.uiControls.elements.trailLengthValue.textContent = this.uiControls.elements.trailLength.value;
        });
        
        // Simulation parameter controls
        this.uiControls.elements.satelliteCount.addEventListener('change', () => {
            this.callbacks.resetSimulation();
        });
        
        this.uiControls.elements.placementPattern.addEventListener('change', () => {
            this.uiControls.setupPlacementPatternLimits();
            this.callbacks.resetSimulation();
        });
        
        this.uiControls.elements.circularZDirection.addEventListener('change', () => {
            this.callbacks.resetSimulation();
        });
        
        // Orbital elements controls
        const orbitElementInputs = [
            this.uiControls.elements.inclination,
            this.uiControls.elements.raan,
            this.uiControls.elements.eccentricity,
            this.uiControls.elements.argOfPerigee,
            this.uiControls.elements.meanAnomaly,
            this.uiControls.elements.orbitAltitude
        ];
        
        orbitElementInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.callbacks.updateOrbitElementsFromUI();
            });
            
            input.addEventListener('change', () => {
                this.callbacks.updateOrbitElementsFromUI();
                this.callbacks.resetSimulation();
            });
        });
        
        this.uiControls.elements.orbitRadius.addEventListener('change', () => {
            this.callbacks.resetSimulation();
        });
        
        this.uiControls.elements.zAmplitude.addEventListener('input', () => {
            this.uiControls.updateZAmplitudeDisplay();
            this.callbacks.resetSimulation();
        });
        
        // Display controls
        this.uiControls.elements.showTrails.addEventListener('change', () => {
            if (!this.uiControls.elements.showTrails.checked) {
                this.callbacks.clearTrails();
            }
        });
        
        this.uiControls.elements.showEarth.addEventListener('change', () => {
            this.celestialBodies.setEarthVisibility(this.uiControls.elements.showEarth.checked);
        });
        
        // Satellite color controls
        this.uiControls.elements.uniformSatelliteColor.addEventListener('change', () => {
            this.callbacks.updateAllSatelliteColors();
        });
        
        this.uiControls.elements.satelliteColor.addEventListener('input', () => {
            if (this.uiControls.elements.uniformSatelliteColor.checked) {
                this.callbacks.updateAllSatelliteColors();
            }
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.callbacks.resetSimulation(); // Will trigger camera update
        });
        
        // Keyboard shortcuts
        this.setupKeyboardControls();
    }

    private setupKeyboardControls(): void {
        window.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    this.callbacks.togglePause();
                    break;
                case 'r':
                    this.callbacks.resetSimulation();
                    break;
                case 'p':
                    this.callbacks.addPerturbation();
                    break;
                case 'v':
                    this.callbacks.resetView();
                    break;
                case 't':
                    this.uiControls.elements.showTrails.checked = !this.uiControls.elements.showTrails.checked;
                    this.uiControls.elements.showTrails.dispatchEvent(new Event('change'));
                    break;
                case 'g':
                    this.uiControls.elements.showGrid.checked = !this.uiControls.elements.showGrid.checked;
                    break;
                case 'e':
                    this.uiControls.elements.showEarth.checked = !this.uiControls.elements.showEarth.checked;
                    this.celestialBodies.setEarthVisibility(this.uiControls.elements.showEarth.checked);
                    break;
                case '+':
                case '=':
                    const currentScale = parseFloat(this.uiControls.elements.timeScale.value);
                    this.uiControls.elements.timeScale.value = Math.min(10, currentScale + 0.5).toString();
                    break;
                case '-':
                case '_':
                    const currentScale2 = parseFloat(this.uiControls.elements.timeScale.value);
                    this.uiControls.elements.timeScale.value = Math.max(0, currentScale2 - 0.5).toString();
                    break;
                case 'h':
                    this.showHelp();
                    break;
                case 'escape':
                    this.callbacks.toggleFullscreen(); // Will handle fullscreen exit or selection clear
                    break;
                // Thrust control keyboard shortcuts
                case 'arrowup':
                    {
                        const thrustAmount = parseFloat(this.uiControls.elements.thrustAmount.value);
                        if (e.shiftKey) {
                            this.callbacks.applyThrustToSelected('w', thrustAmount);
                        } else {
                            this.callbacks.applyThrustToSelected('s', thrustAmount);
                        }
                        e.preventDefault();
                    }
                    break;
                case 'arrowdown':
                    {
                        const thrustAmount = parseFloat(this.uiControls.elements.thrustAmount.value);
                        if (e.shiftKey) {
                            this.callbacks.applyThrustToSelected('w', -thrustAmount);
                        } else {
                            this.callbacks.applyThrustToSelected('s', -thrustAmount);
                        }
                        e.preventDefault();
                    }
                    break;
                case 'arrowleft':
                    {
                        const thrustAmount = parseFloat(this.uiControls.elements.thrustAmount.value);
                        this.callbacks.applyThrustToSelected('r', -thrustAmount);
                        e.preventDefault();
                    }
                    break;
                case 'arrowright':
                    {
                        const thrustAmount = parseFloat(this.uiControls.elements.thrustAmount.value);
                        this.callbacks.applyThrustToSelected('r', thrustAmount);
                        e.preventDefault();
                    }
                    break;
            }
        });
    }

    private setupGlobalFunctions(): void {
        // Global functions for HTML onclick handlers
        (window as any).resetSimulation = () => this.callbacks.resetSimulation();
        (window as any).togglePause = () => this.callbacks.togglePause();
        (window as any).addPerturbation = () => this.callbacks.addPerturbation();
        (window as any).resetView = () => this.callbacks.resetView();
        (window as any).toggleFullscreen = () => this.callbacks.toggleFullscreen();
        
        // Section collapse functionality
        (window as any).toggleSection = (sectionId: string) => {
            const content = document.getElementById(sectionId);
            const icon = document.querySelector(`[onclick*="${sectionId}"] .toggle-icon`);
            
            if (content && icon) {
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    icon.textContent = '▲';
                    icon.classList.add('expanded');
                } else {
                    content.style.display = 'none';
                    icon.textContent = '▼';
                    icon.classList.remove('expanded');
                }
            }
        };
    }

    private showHelp(): void {
        alert(`キーボードショートカット:
        
スペース: 一時停止/再開
R: リセット
P: 摂動を加える
V: 視点変更
T: 軌跡表示切り替え
G: グリッド表示切り替え
E: 地球表示切り替え
Escape: 選択解除/全画面終了
+/=: 時間スケール増加
-/_: 時間スケール減少
H: このヘルプを表示

推力制御（衛星選択時）:
矢印キー上/下: S軸方向推力
矢印キー左/右: R軸方向推力
Shift+矢印キー上/下: W軸方向推力

マウス操作:
クリック: 衛星を選択
ドラッグ: カメラ回転
スクロール: ズーム

画面操作:
右下ボタン: 全画面切り替え`);
    }
}