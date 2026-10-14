import * as THREE from 'three';
import type { Satellite } from '../simulation/Satellite.js';
import { TrailRenderer } from './TrailRenderer.js';
import { AXIS_COLORS, type DisplaySettings } from '@/store/settings';
import { createAxes, createGrid } from './sceneDecor.js';
import { consumeCollisionFlash, setHillPosition, setSatelliteAttitude } from './satelliteFrame.js';
import {
    BASE_EMISSIVE_INTENSITY,
    REFERENCE_COLOR,
    SELECTED_EMISSIVE_INTENSITY,
    createSatelliteMesh,
    disposeObject3D,
    resolveAppearance,
    resolveSatelliteColor,
} from './satelliteMeshFactory.js';

type SatelliteMesh = ReturnType<typeof createSatelliteMesh>;

const COLLISION_COLOR = 0xff0000;
/** 選択リングの色（UI のブランドカラー） */
const SELECTION_COLOR = 0xf07214;
const { degToRad } = THREE.MathUtils;

/** 半径 1 のリング。描画時に衛星の大きさへスケールし、他の物体に隠れないよう最前面に描く */
function createSelectionRing(): THREE.Mesh {
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.92, 1, 64),
        new THREE.MeshBasicMaterial({
            color: SELECTION_COLOR,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
            depthWrite: false,
        }),
    );
    ring.renderOrder = 10;
    ring.visible = false;
    return ring;
}

export class RenderingSystem {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private container: HTMLElement;
    private satelliteMeshes: SatelliteMesh[] = [];
    private gridHelper: THREE.Group;
    private axesGroup: THREE.Group;
    private trailRenderer: TrailRenderer;
    private getDisplay: () => DisplaySettings;
    private onSelectionChange: (index: number) => void = () => {};

    // Selection system
    private selectedSatelliteIndex: number = -1;
    private selectionRing: THREE.Mesh;
    private selectionBounds = new THREE.Box3();
    private selectionSphere = new THREE.Sphere();
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

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.setupRenderer();
        this.setupLighting();
        this.axesGroup = this.createAxes();
        this.gridHelper = this.createGrid();
        this.selectionRing = createSelectionRing();
        this.scene.add(this.selectionRing);
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
            const object = createSatelliteMesh(
                resolveAppearance(sat, display),
                isReference ? REFERENCE_COLOR : resolveSatelliteColor(sat, index, display),
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
            disposeObject3D(object);
        });
        this.satelliteMeshes = [];
    }

    /** 毎フレーム呼ぶ。位置・姿勢・ハイライトを同期し、advanceTrails のときだけ軌跡を伸ばす */
    public updateSatellitePositions(satellites: Satellite[], advanceTrails: boolean): void {
        const display = this.getDisplay();

        satellites.forEach((sat, index) => {
            const mesh = this.satelliteMeshes[index];
            const pos = sat.getPosition();
            setHillPosition(mesh.position, pos);

            // 姿勢は立方体・直方体のみ（球は回転させない）
            const shape = sat.metadata?.shape || display.satelliteShape;
            if (shape === 'cube' || shape === 'box') {
                const rotation = sat.metadata?.rotation;
                setSatelliteAttitude(
                    mesh.quaternion,
                    sat,
                    rotation ? degToRad(rotation.r) : 0,
                    rotation ? degToRad(rotation.s) : 0,
                );
            }

            // 選択ハイライトと衝突フィードバック（赤く発光）
            // 変化したときだけ書き換える（一時停止中も毎フレーム通るので、色文字列の解析を繰り返さない）
            const flashing = consumeCollisionFlash(sat);
            const material = mesh.material;
            material.emissiveIntensity =
                flashing || index === this.selectedSatelliteIndex
                    ? SELECTED_EMISSIVE_INTENSITY
                    : BASE_EMISSIVE_INTENSITY;
            const showingFlash = material.emissive.getHex() === COLLISION_COLOR;
            if (flashing && !showingFlash) material.emissive.setHex(COLLISION_COLOR);
            else if (!flashing && showingFlash) material.emissive.copy(material.color);

            if (advanceTrails && display.showTrails && index > 0) {
                this.trailRenderer.updateTrail(sat, pos, material.color, display.trailLength);
            }
        });
    }

    /** 一般衛星（index >= 1）のメッシュの色を sat.color に合わせる */
    public updateAllSatelliteColors(satellites: Satellite[]): void {
        for (let i = 1; i < this.satelliteMeshes.length; i++) {
            const material = this.satelliteMeshes[i].material;
            material.color.set(satellites[i].color);
            material.emissive.set(satellites[i].color);
        }
    }

    public clearTrails(satellites: Satellite[]): void {
        satellites.forEach((sat) => {
            this.trailRenderer.clearTrail(sat);
        });
    }

    private checkSatelliteSelection(): void {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hit = this.raycaster.intersectObjects(this.satelliteMeshes, false)[0];
        this.selectedSatelliteIndex = hit ? this.satelliteMeshes.indexOf(hit.object as SatelliteMesh) : -1;
        this.onSelectionChange(this.selectedSatelliteIndex);
    }

    /** 選択中の衛星を囲むリングを、常にカメラへ向けて衛星の大きさに合わせる */
    private updateSelectionRing(): void {
        const object = this.satelliteMeshes[this.selectedSatelliteIndex];
        this.selectionRing.visible = !!object?.visible;
        if (!object?.visible) return;
        this.selectionBounds.setFromObject(object).getBoundingSphere(this.selectionSphere);
        this.selectionRing.position.copy(this.selectionSphere.center);
        this.selectionRing.quaternion.copy(this.camera.quaternion);
        this.selectionRing.scale.setScalar(Math.max(this.selectionSphere.radius, 0.05) * 1.6);
    }

    public render(): void {
        this.updateSelectionRing();
        this.gridHelper.visible = this.getDisplay().showGrid;
        this.axesGroup.visible = this.getDisplay().showAxes;
        this.renderer.render(this.scene, this.camera);
    }

    public getSelectedSatelliteIndex(): number {
        return this.selectedSatelliteIndex;
    }

    public setSelectedSatelliteIndex(index: number): void {
        this.selectedSatelliteIndex = index;
    }

    public dispose(satellites: Satellite[]): void {
        this.clearTrails(satellites);
        this.disposeSatelliteMeshes();
        disposeObject3D(this.scene);
    }

    public handleResize(): void {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
}
