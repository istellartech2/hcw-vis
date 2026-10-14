import * as THREE from 'three';
import { Satellite } from '../simulation/Satellite.js';
import { TrailRenderer } from './TrailRenderer.js';
import { CelestialBodies } from './CelestialBodies.js';
import { AXIS_COLORS, type DisplaySettings } from '@/store/settings';
import { createAxes, createGrid } from './sceneDecor.js';
import { ModelLoader } from './ModelLoader.js';
import { consumeCollisionFlash, setHillPosition, setSatelliteAttitude } from './satelliteFrame.js';
import {
    REFERENCE_COLOR,
    REFERENCE_EMISSIVE_INTENSITY,
    SATELLITE_EMISSIVE_INTENSITY,
    SELECTED_EMISSIVE_INTENSITY,
    createSatelliteObject,
    displayColor,
    disposeSatelliteObject,
    forEachEmissiveMaterial,
    resolveAppearance,
    resolveSatelliteColor,
    type SatelliteObject,
} from './satelliteMeshFactory.js';

const COLLISION_COLOR = 0xff0000;
const WHITE = new THREE.Color(0xffffff);

function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/** UI で指定した R/S 軸回転（ラジアン）。UI の形状が立方体なら立方体用、3Dファイルなら3Dモデル用 */
function uiRotation(display: DisplaySettings): [number, number] {
    switch (display.satelliteShape as string) {
        case 'cube':
        case 'box':
            return [degToRad(display.cubeRotationR), degToRad(display.cubeRotationS)];
        case '3dfile':
            return [degToRad(display.file3dRotationR), degToRad(display.file3dRotationS)];
        default:
            return [0, 0];
    }
}

export class RenderingSystem {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private container: HTMLElement;
    private satelliteMeshes: SatelliteObject[] = [];
    private gridHelper: THREE.Group;
    private axesGroup: THREE.Group;
    private trailRenderer: TrailRenderer;
    private celestialBodies: CelestialBodies;
    private getDisplay: () => DisplaySettings;
    private onSelectionChange: (index: number) => void = () => {};
    private animationFrameCounter: number = 0;
    private modelLoader: ModelLoader;
    private loadedModel: SatelliteObject | null = null;

    // Selection system
    private selectedSatelliteIndex: number = -1;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;

    constructor(
        scene: THREE.Scene,
        camera: THREE.PerspectiveCamera,
        renderer: THREE.WebGLRenderer,
        container: HTMLElement,
        getDisplay: () => DisplaySettings,
        signal?: AbortSignal,
    ) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.container = container;
        this.getDisplay = getDisplay;

        this.trailRenderer = new TrailRenderer(this.scene);
        this.celestialBodies = new CelestialBodies(this.scene, this.renderer.capabilities.getMaxAnisotropy());
        this.modelLoader = new ModelLoader();

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.setupRenderer();
        this.setupLighting();
        this.axesGroup = this.createAxes();
        this.gridHelper = this.createGrid();
        this.setupSatelliteSelection(signal);
    }

    private setupRenderer(): void {
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // Note: Initial camera position is managed by CameraController
        // This is just a fallback position
        this.camera.lookAt(0, 0, 0);
    }

    private setupLighting(): void {
        // 空（上）と地球側（下）の色を分けた半球光で柔らかい陰影をつける
        this.scene.add(new THREE.HemisphereLight(0xdbe6ff, 0x1a2030, 1.4));

        // 太陽光に見立てたキーライト 1 灯と、輪郭を拾う弱いリムライト
        const key = new THREE.DirectionalLight(0xffffff, 2.4);
        key.position.set(60, 100, 40);
        this.scene.add(key);

        const rim = new THREE.DirectionalLight(0x9fb8ff, 0.6);
        rim.position.set(-80, -20, -100);
        this.scene.add(rim);
    }

    private createAxes(): THREE.Group {
        const axesGroup = createAxes(AXIS_COLORS);
        this.scene.add(axesGroup);
        axesGroup.visible = this.getDisplay().showAxes;
        return axesGroup;
    }

    private createGrid(): THREE.Group {
        // 1 m 間隔（5 m ごとに主線）。原点の少し下に置き、外側へフェードさせる
        const grid = createGrid();
        grid.position.y = -10;
        this.scene.add(grid);
        return grid;
    }

    private setupSatelliteSelection(signal?: AbortSignal): void {
        this.container.addEventListener(
            'click',
            (e) => {
                const rect = this.container.getBoundingClientRect();
                this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                this.checkSatelliteSelection();
            },
            { signal },
        );
    }

    public setOnSelectionChange(callback: (index: number) => void): void {
        this.onSelectionChange = callback;
    }

    /**
     * @param options.showReference 基準衛星(index 0)も表示する（CSV再生では全衛星が実データ）
     */
    public createSatelliteMeshes(satellites: Satellite[], options: { showReference?: boolean } = {}): void {
        this.disposeSatelliteMeshes();

        const display = this.getDisplay();
        const showReference = options.showReference ?? false;
        satellites.forEach((sat, index) => {
            const isReference = index === 0;
            const object = createSatelliteObject(
                resolveAppearance(sat, display),
                isReference ? REFERENCE_COLOR : resolveSatelliteColor(sat, index, display),
                isReference ? REFERENCE_EMISSIVE_INTENSITY : SATELLITE_EMISSIVE_INTENSITY,
                this.loadedModel,
            );
            // 基準衛星は CSV 再生時のみ表示
            if (isReference) object.visible = showReference;

            this.scene.add(object);
            this.satelliteMeshes.push(object);
        });
    }

    private disposeSatelliteMeshes(): void {
        this.satelliteMeshes.forEach((object) => {
            this.scene.remove(object);
            disposeSatelliteObject(object);
        });
        this.satelliteMeshes = [];
    }

    public updateSatellitePositions(satellites: Satellite[]): void {
        const display = this.getDisplay();
        // 既定の回転は UI の形状で決まる（衛星ごとの形状ではない）
        const [defaultRotR, defaultRotS] = uiRotation(display);

        satellites.forEach((sat, index) => {
            const object = this.satelliteMeshes[index];
            const pos = sat.getPosition();
            setHillPosition(object.position, pos);

            // 姿勢は立方体・直方体・3Dモデルのみ（球は回転させない）
            const shape = sat.metadata?.shape || display.satelliteShape;
            if (shape === 'cube' || shape === 'box' || shape === '3dfile') {
                const rotation = sat.metadata?.rotation;
                setSatelliteAttitude(
                    object.quaternion,
                    sat,
                    rotation ? degToRad(rotation.r) : defaultRotR,
                    rotation ? degToRad(rotation.s) : defaultRotS,
                );
            }

            // 選択ハイライトと衝突フィードバック（赤く発光）
            const flashing = consumeCollisionFlash(sat);
            const baseIntensity = index === 0 ? REFERENCE_EMISSIVE_INTENSITY : SATELLITE_EMISSIVE_INTENSITY;
            const intensity =
                flashing || index === this.selectedSatelliteIndex ? SELECTED_EMISSIVE_INTENSITY : baseIntensity;
            forEachEmissiveMaterial(object, (material) => {
                material.emissiveIntensity = intensity;
                if (flashing) {
                    material.emissive.setHex(COLLISION_COLOR);
                } else {
                    material.emissive.set(sat.color);
                }
            });

            if (display.showTrails && index > 0) {
                let color = WHITE;
                forEachEmissiveMaterial(object, (material) => {
                    color = material.color;
                });
                this.trailRenderer.updateTrail(sat, pos, 1, color, display.trailLength);
            }
        });
    }

    public updateAllSatelliteColors(): void {
        const display = this.getDisplay();
        for (let i = 1; i < this.satelliteMeshes.length; i++) {
            const color = displayColor(display, i - 1);
            forEachEmissiveMaterial(this.satelliteMeshes[i], (material) => {
                material.color.setHex(color);
                material.emissive.setHex(color);
            });
        }
    }

    public clearTrails(satellites: Satellite[]): void {
        satellites.forEach((sat) => {
            this.trailRenderer.clearTrail(sat);
        });
    }

    private checkSatelliteSelection(): void {
        try {
            this.raycaster.setFromCamera(this.mouse, this.camera);

            // Groups (3D models) need recursive intersection
            const intersects = this.raycaster.intersectObjects(this.satelliteMeshes, true);

            if (intersects.length > 0) {
                const clickedObject = intersects[0].object;

                // Find which satellite mesh/group contains the clicked object
                let index = -1;
                for (let i = 0; i < this.satelliteMeshes.length; i++) {
                    const satelliteMesh = this.satelliteMeshes[i];
                    if (
                        satelliteMesh === clickedObject ||
                        (satelliteMesh instanceof THREE.Group && this.isChildOf(clickedObject, satelliteMesh))
                    ) {
                        index = i;
                        break;
                    }
                }

                if (index >= 0 && index < this.satelliteMeshes.length) {
                    this.selectedSatelliteIndex = index;
                    console.log(`Selected satellite ${index}`);
                    this.updateSelectedSatelliteInfo();
                } else {
                    console.warn(`Invalid satellite index: ${index}`);
                }
            } else {
                this.selectedSatelliteIndex = -1;
                this.updateSelectedSatelliteInfo();
            }
        } catch (error) {
            console.error('Error in satellite selection:', error);
            this.selectedSatelliteIndex = -1;
            this.updateSelectedSatelliteInfo();
        }
    }

    private isChildOf(object: THREE.Object3D, parent: THREE.Object3D): boolean {
        let current = object.parent;
        while (current) {
            if (current === parent) return true;
            current = current.parent;
        }
        return false;
    }

    private updateSelectedSatelliteInfo(): void {
        this.onSelectionChange(this.selectedSatelliteIndex);
    }

    public render(): void {
        this.gridHelper.visible = this.getDisplay().showGrid;
        this.axesGroup.visible = this.getDisplay().showAxes;
        this.renderer.render(this.scene, this.camera);
    }

    public updateCelestialBodies(time: number, simulationStartTime?: Date): void {
        this.celestialBodies.update(time, simulationStartTime);
    }

    public getCelestialBodies(): CelestialBodies {
        return this.celestialBodies;
    }

    public getSelectedSatelliteIndex(): number {
        return this.selectedSatelliteIndex;
    }

    public updateSatelliteSize(satellites: Satellite[]): void {
        // Recreate satellite meshes with new size
        this.createSatelliteMeshes(satellites);
    }

    public setSelectedSatelliteIndex(index: number): void {
        this.selectedSatelliteIndex = index;
    }

    public handleResize(): void {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    /**
     * 3Dモデルを読み込む。失敗時は例外を投げるので、呼び出し側で形状のフォールバックを行う。
     */
    public async loadFile3D(file: File): Promise<void> {
        this.loadedModel = await this.modelLoader.loadModel(file);
    }
}
