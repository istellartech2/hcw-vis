import * as THREE from 'three';
import { Satellite } from '../simulation/Satellite.js';
import { TrailRenderer } from './TrailRenderer.js';
import { CelestialBodies } from './CelestialBodies.js';
import type { DisplaySettings } from '@/store/settings';
import { ModelLoader } from './ModelLoader.js';
import { consumeCollisionFlash, setHillPosition, setSatelliteAttitude } from './satelliteFrame.js';
import {
    REFERENCE_COLOR,
    REFERENCE_EMISSIVE_INTENSITY,
    SATELLITE_EMISSIVE_INTENSITY,
    createSatelliteObject,
    displayColor,
    disposeSatelliteObject,
    forEachPhongMaterial,
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
    private gridHelper: THREE.GridHelper;
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
        this.celestialBodies = new CelestialBodies(this.scene);
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
        // 環境光を強化（全体的な明るさ）
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        // メインの指向性ライト（上前方から）
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight1.position.set(100, 100, 50);
        this.scene.add(directionalLight1);

        // サブの指向性ライト（下後方から、影を柔らかく）
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight2.position.set(-50, -50, -50);
        this.scene.add(directionalLight2);

        // サイドライト（左右から）
        const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight3.position.set(100, 0, -100);
        this.scene.add(directionalLight3);

        const directionalLight4 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight4.position.set(-100, 0, 100);
        this.scene.add(directionalLight4);
    }

    private createAxes(): THREE.Group {
        const axesGroup = new THREE.Group();

        // X-axis (Along-track)
        const xGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(15, 0, 0), // 15m axis for 10m range
        ]);
        const xMaterial = new THREE.LineBasicMaterial({ color: 0x00bfff });
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        axesGroup.add(xAxis);

        // Y-axis (Radial)
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 15, 0), // 15m axis for 10m range
        ]);
        const yMaterial = new THREE.LineBasicMaterial({ color: 0xff6b6b });
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        axesGroup.add(yAxis);

        // Z-axis (Cross-track)
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 15), // 15m axis for 10m range
        ]);
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x2ecc71 });
        const zAxis = new THREE.Line(zGeometry, zMaterial);
        axesGroup.add(zAxis);

        this.scene.add(axesGroup);
        axesGroup.visible = this.getDisplay().showAxes;
        return axesGroup;
    }

    private createGrid(): THREE.GridHelper {
        // Grid adapted for 10m range with 1x scaling
        // Size: 30 units = 30m total, Divisions: 30 = 1m per division
        // Subtle colors for background reference
        const gridHelper = new THREE.GridHelper(30, 30, 0x777777);
        gridHelper.position.y = -10; // Just below origin level
        this.scene.add(gridHelper);
        return gridHelper;
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
            const intensity = flashing || index === this.selectedSatelliteIndex ? 0.8 : 0.2;
            forEachPhongMaterial(object, (material) => {
                material.emissiveIntensity = intensity;
                if (flashing) {
                    material.emissive.setHex(COLLISION_COLOR);
                } else {
                    material.emissive.set(sat.color);
                }
            });

            if (display.showTrails && index > 0) {
                let color = WHITE;
                forEachPhongMaterial(object, (material) => {
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
            forEachPhongMaterial(this.satelliteMeshes[i], (material) => {
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
