import * as THREE from 'three';
import { Satellite } from '@/simulation/Satellite';
import { HillEquationSolver } from '@/simulation/HillEquationSolver';
import { OrbitElementsCalculator, type OrbitalElements } from '@/simulation/OrbitElements';
import { RenderingSystem } from '@/visualization/RenderingSystem';
import { createDefaultFormation } from '@/formation/formationConfig';
import { FormationGenerator } from '@/formation/FormationGenerator';
import { CollisionDetector } from '@/collision/CollisionDetector';
import { CollisionResponse } from '@/collision/CollisionResponse';
import { appStore, type AppStore } from '@/store/appStore';
import { SATELLITE_PALETTE, type OrbitInputs, type SatelliteShape } from '@/store/settings';
import { CameraController } from './CameraController';
import { CsvPlayback } from './CsvPlayback';

export type RswAxis = 'r' | 's' | 'w';
export type RswVector = Record<RswAxis, number>;

const FRAME_DELTA_SECONDS = 0.016;
const DEFAULT_COLLISION_DIAMETER = 0.5;

/**
 * HCW 相対運動シミュレーションの本体。
 *
 * Three.js のシーン・物理積分・CSV 再生・フォーメーションを管理し、
 * 状態はすべて appStore 経由で UI とやり取りする（DOM には触れない）。
 * UI からはこのクラスの public メソッドをコマンドとして呼び出す。
 */
export class SimulationEngine {
    private scene = new THREE.Scene();
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private viewport: HTMLElement;
    private cameraController: CameraController;
    private renderingSystem: RenderingSystem;
    private hillSolver: HillEquationSolver;
    private formationGenerator: FormationGenerator;
    private collisionDetector = new CollisionDetector(DEFAULT_COLLISION_DIAMETER / 2);
    private collisionResponse = new CollisionResponse();
    private csvPlayback: CsvPlayback;

    private satellites: Satellite[] = [];
    private time = 0;
    private simulationStartTime = new Date();
    private dt = 0.1;
    private frameCounter = 0;
    private n = 1.126e-3;
    private orbitRadius = 6778137;
    private orbitElements!: OrbitalElements;

    /** CSV 再生に入る前の衛星形状（終了時に戻す） */
    private shapeBeforePlayback: SatelliteShape | null = null;
    private animationFrameId = 0;
    private abort = new AbortController();
    private unsubscribers: Array<() => void> = [];
    private resizeObserver: ResizeObserver;

    constructor(viewport: HTMLElement, canvas: HTMLCanvasElement) {
        this.viewport = viewport;
        const { signal } = this.abort;

        this.camera = new THREE.PerspectiveCamera(50, this.aspect(), 0.001, 50000000);
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            logarithmicDepthBuffer: true,
        });

        this.hillSolver = new HillEquationSolver(this.n);
        this.cameraController = new CameraController(this.camera, canvas, signal);
        this.renderingSystem = new RenderingSystem(
            this.scene,
            this.camera,
            this.renderer,
            viewport,
            () => appStore.getState().display,
            signal,
        );
        this.renderingSystem.setOnSelectionChange((index) => this.publishSelectedSatellite(index));
        this.cameraController.resetView();

        this.formationGenerator = new FormationGenerator(this.n);

        this.csvPlayback = new CsvPlayback(() => this.enterPlaybackMode());

        const state = appStore.getState();
        this.collisionDetector.setEnabled(state.simulation.collisionEnabled);
        this.setOrbit(state.orbit);
        this.applyFormation(this.formationGenerator.generateSatellites(state.formation));

        const celestial = this.renderingSystem.getCelestialBodies();
        celestial.createEarth(this.orbitRadius, state.display.earthTexture, state.display.earthBrightness);
        celestial.setEarthVisibility(state.display.showEarth);
        celestial.setLatLongGridVisibility(state.display.showLatLongGrid);

        this.unsubscribers.push(appStore.subscribe((next, prev) => this.onStoreChange(next, prev)));

        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(viewport);

        this.animate();
    }

    dispose(): void {
        cancelAnimationFrame(this.animationFrameId);
        this.abort.abort();
        this.unsubscribers.forEach((unsubscribe) => unsubscribe());
        this.resizeObserver.disconnect();
        this.renderingSystem.getCelestialBodies().dispose();
        this.renderer.dispose();
    }

    // ------------------------------------------------------------------
    // ストア購読: 設定変更をシーンへ反映
    // ------------------------------------------------------------------

    private onStoreChange(next: AppStore, prev: AppStore): void {
        const d = next.display;
        const pd = prev.display;
        if (d !== pd) {
            const celestial = this.renderingSystem.getCelestialBodies();
            if (d.showEarth !== pd.showEarth) celestial.setEarthVisibility(d.showEarth);
            if (d.showLatLongGrid !== pd.showLatLongGrid) celestial.setLatLongGridVisibility(d.showLatLongGrid);
            if (d.earthBrightness !== pd.earthBrightness) celestial.setEarthBrightness(d.earthBrightness);
            if (d.earthTexture !== pd.earthTexture) {
                celestial.createEarth(this.orbitRadius, d.earthTexture, d.earthBrightness);
                celestial.setLatLongGridVisibility(d.showLatLongGrid);
            }
            if (!d.showTrails && pd.showTrails) this.clearTrails();
            if (d.uniformSatelliteColor !== pd.uniformSatelliteColor || d.satelliteColor !== pd.satelliteColor) {
                this.updateAllSatelliteColors();
            }
            if (d.satelliteShape !== pd.satelliteShape) {
                if (d.satelliteShape !== 'sphere' && next.simulation.collisionEnabled) {
                    next.setSimulation({ collisionEnabled: false });
                }
                this.rebuildSatelliteMeshes();
            } else if (d.satelliteSize !== pd.satelliteSize) {
                this.rebuildSatelliteMeshes();
                if (!this.hasFormationSizes()) {
                    this.collisionDetector.setCollisionRadius(d.satelliteSize / 2);
                }
            }
        }

        const sim = next.simulation;
        const ps = prev.simulation;
        if (sim !== ps) {
            if (sim.j2Perturbation !== ps.j2Perturbation) this.updateOrbitParameters();
            if (sim.j2StableArrangement !== ps.j2StableArrangement) {
                this.syncFormationGenerator();
                this.resetPositions();
            }
            if (sim.collisionEnabled !== ps.collisionEnabled) this.collisionDetector.setEnabled(sim.collisionEnabled);
            if (sim.satelliteMass !== ps.satelliteMass) {
                this.satellites.forEach((sat) => {
                    sat.mass = sim.satelliteMass;
                });
            }
        }
    }

    // ------------------------------------------------------------------
    // メインループ
    // ------------------------------------------------------------------

    private animate = (): void => {
        this.animationFrameId = requestAnimationFrame(this.animate);
        this.cameraController.updateCameraPosition();

        const store = appStore.getState();
        if (!store.paused) {
            this.frameCounter++;
            const publishTime = this.frameCounter % 5 === 0;

            if (this.csvPlayback.update(FRAME_DELTA_SECONDS * 1000, publishTime)) {
                this.updateSatellitesFromPlayback();
                this.renderingSystem.updateSatellitePositions(this.satellites);
                if (publishTime) store.patch({ simTime: this.csvPlayback.getCurrentTime() });
            } else {
                this.stepPhysics(store.simulation.timeScale);
                this.renderingSystem.updateSatellitePositions(this.satellites);
                if (publishTime) store.patch({ simTime: this.time });
            }

            if (this.frameCounter % 10 === 0) {
                this.publishReferenceInfo();
                if (this.renderingSystem.getSelectedSatelliteIndex() >= 0) {
                    this.publishSelectedSatellite();
                }
            }

            this.renderingSystem.updateCelestialBodies(this.currentTime(), this.simulationStartTime);
        }

        this.renderingSystem.render();
    };

    private stepPhysics(timeScale: number): void {
        const scaledDeltaTime = FRAME_DELTA_SECONDS * timeScale;
        this.time += scaledDeltaTime;

        const adaptiveDt = Math.min(this.dt * Math.max(1, timeScale / 10), scaledDeltaTime);
        const satelliteCount = this.satellites.length - 1;
        // 衛星数が多い場合は1フレームおきに積分して負荷を下げる
        if (satelliteCount > 20 && this.frameCounter % 2 !== 0) return;

        const integrationSteps = Math.max(1, Math.ceil(scaledDeltaTime / adaptiveDt));
        const stepDt = scaledDeltaTime / integrationSteps;

        for (let step = 0; step < integrationSteps; step++) {
            for (let i = 1; i < this.satellites.length; i++) {
                this.hillSolver.rungeKutta4Step(this.satellites[i], stepDt);
            }
            if (this.collisionDetector.isEnabled()) {
                const collisions = this.collisionDetector.detect(this.satellites);
                if (collisions.length > 0) {
                    this.collisionResponse.applyResponse(this.satellites, collisions);
                }
            }
        }
    }

    private currentTime(): number {
        return this.csvPlayback.isActive() ? this.csvPlayback.getCurrentTime() : this.time;
    }

    // ------------------------------------------------------------------
    // テレメトリ（UI 表示用の状態をストアへ書き出す）
    // ------------------------------------------------------------------

    private publishReferenceInfo(): void {
        const elements = this.orbitElements;
        const currentDate = new Date(Date.now() + this.currentTime() * 1000);
        const eci = OrbitElementsCalculator.getECIPosition(elements, currentDate);
        appStore.getState().patch({
            referenceInfo: {
                geodetic: eci
                    ? {
                          latitude: eci.geodetic.latitude,
                          longitude: eci.geodetic.longitude,
                          altitudeKm: eci.geodetic.altitude / 1000,
                      }
                    : null,
                eciKm: eci
                    ? {
                          x: eci.position.x / 1000,
                          y: eci.position.y / 1000,
                          z: eci.position.z / 1000,
                      }
                    : null,
                orbit: {
                    altitudeKm: elements.altitude / 1000,
                    periodMinutes: elements.period,
                    inclination: elements.inclination,
                    eccentricity: elements.eccentricity,
                    raan: elements.raan,
                    argOfPerigee: elements.argOfPerigee,
                },
            },
        });
    }

    private publishSelectedSatellite(index?: number): void {
        if (index !== undefined) this.renderingSystem.setSelectedSatelliteIndex(index);
        const selectedIndex = this.renderingSystem.getSelectedSatelliteIndex();
        const store = appStore.getState();

        if (selectedIndex < 0 || selectedIndex >= this.satellites.length) {
            if (store.selected) store.patch({ selected: null });
            if (store.ui.activeDialog) store.setUI({ activeDialog: null });
            return;
        }

        const sat = this.satellites[selectedIndex];
        const pos = sat.getPosition();
        const vel = sat.getVelocity();
        store.patch({
            selected: {
                index: selectedIndex,
                position: { r: pos.x, s: pos.y, w: pos.z },
                velocity: { r: vel.x, s: vel.y, w: vel.z },
                speed: Math.hypot(vel.x, vel.y, vel.z),
                distance: Math.hypot(pos.x, pos.y, pos.z),
            },
        });
    }

    // ------------------------------------------------------------------
    // コマンド: シミュレーション
    // ------------------------------------------------------------------

    togglePause(): void {
        const store = appStore.getState();
        store.patch({ paused: !store.paused });
    }

    /** ストアのフォーメーション設定から衛星を再生成し、時刻を 0 に戻す */
    resetPositions(): void {
        if (this.csvPlayback.isActive()) {
            this.stopPlayback();
            return;
        }
        this.clearSelection();
        this.time = 0;
        const store = appStore.getState();
        store.patch({ simTime: 0 });
        this.applyFormation(this.formationGenerator.generateSatellites(store.formation));
    }

    /** フォーメーション設定をデフォルトに戻して再配置 */
    resetFormation(): void {
        appStore.getState().updateFormation(createDefaultFormation);
        this.resetPositions();
    }

    resetView(): void {
        this.cameraController.resetView();
    }

    clearSelection(): void {
        this.publishSelectedSatellite(-1);
    }

    addPerturbation(): void {
        const amount = appStore.getState().simulation.perturbationAmount;
        for (let i = 1; i < this.satellites.length; i++) {
            const sat = this.satellites[i];
            sat.vx += (Math.random() - 0.5) * amount;
            sat.vy += (Math.random() - 0.5) * amount;
            sat.vz += (Math.random() - 0.5) * amount;
        }
    }

    /** 選択中の衛星に速度変化 (m/s) を与える */
    applyDeltaV(dv: Partial<RswVector>): void {
        const sat = this.getSelectedSatellite();
        if (!sat) return;
        sat.vx += finiteOrZero(dv.r);
        sat.vy += finiteOrZero(dv.s);
        sat.vz += finiteOrZero(dv.w);
        this.publishSelectedSatellite();
    }

    /** 選択中の衛星の位置 (m) を瞬間的に変更する */
    applyPositionChange(delta: Partial<RswVector>): void {
        const sat = this.getSelectedSatellite();
        if (!sat) return;
        sat.x += finiteOrZero(delta.r);
        sat.y += finiteOrZero(delta.s);
        sat.z += finiteOrZero(delta.w);
        this.publishSelectedSatellite();
    }

    private getSelectedSatellite(): Satellite | null {
        const index = this.renderingSystem.getSelectedSatelliteIndex();
        return index >= 0 && index < this.satellites.length ? this.satellites[index] : null;
    }

    /**
     * 基準軌道を更新する。
     * @returns 入力エラーのメッセージ（空なら成功）
     */
    applyOrbit(inputs: OrbitInputs): string[] {
        const errors = OrbitElementsCalculator.validateElements({
            inclination: inputs.inclination,
            raan: inputs.raan,
            eccentricity: 0,
            argOfPerigee: inputs.argOfPerigee,
            meanAnomaly: inputs.meanAnomaly,
            altitude: inputs.altitudeKm * 1000,
        });
        if (errors.length > 0) return errors;

        this.setOrbit(inputs);
        this.renderingSystem
            .getCelestialBodies()
            .createEarth(
                this.orbitRadius,
                appStore.getState().display.earthTexture,
                appStore.getState().display.earthBrightness,
            );
        this.renderingSystem.getCelestialBodies().setLatLongGridVisibility(appStore.getState().display.showLatLongGrid);
        appStore.getState().patch({ orbit: { ...inputs } });
        this.publishReferenceInfo();
        this.resetPositions();
        return [];
    }

    private setOrbit(inputs: OrbitInputs): void {
        this.orbitElements = OrbitElementsCalculator.calculateOrbitalElements(
            inputs.inclination,
            inputs.raan,
            0,
            inputs.argOfPerigee,
            inputs.meanAnomaly,
            inputs.altitudeKm * 1000,
        );
        Satellite.setReferenceOrbit(this.orbitElements);
        this.updateOrbitParameters();
    }

    private updateOrbitParameters(): void {
        this.orbitRadius = this.orbitElements.semiMajorAxis;
        this.n = this.orbitElements.meanMotion;
        this.hillSolver.updateMeanMotion(this.n);
        this.hillSolver.setOrbitParameters(this.orbitRadius, (this.orbitElements.inclination * Math.PI) / 180);
        this.hillSolver.setJ2Perturbation(appStore.getState().simulation.j2Perturbation);
        this.syncFormationGenerator();
    }

    private syncFormationGenerator(): void {
        this.formationGenerator.updateMeanMotion(this.n);
        this.formationGenerator.setJ2StableArrangement(
            appStore.getState().simulation.j2StableArrangement,
            this.hillSolver.getSSCoefficientC(),
        );
    }

    // ------------------------------------------------------------------
    // コマンド: CSV 再生
    // ------------------------------------------------------------------

    loadCsvFile(file: File): Promise<void> {
        return this.csvPlayback.loadFile(file);
    }

    loadCsvSample(path: string): Promise<void> {
        return this.csvPlayback.loadSample(path);
    }

    togglePlaybackPlay(): void {
        this.csvPlayback.togglePlayPause();
    }

    stopPlayback(): void {
        this.csvPlayback.stop();
        this.updateSatellitesFromPlayback();
    }

    seekPlayback(progress: number): void {
        this.csvPlayback.seekToProgress(progress);
        this.updateSatellitesFromPlayback();
        this.renderingSystem.updateSatellitePositions(this.satellites);
    }

    setPlaybackSpeed(speed: number): void {
        this.csvPlayback.setSpeed(speed);
    }

    setPlaybackLoop(loop: boolean): void {
        this.csvPlayback.setLoop(loop);
    }

    /** CSV 再生モードを終了してシミュレーションに戻る */
    exitPlayback(): void {
        this.csvPlayback.deactivate();
        if (this.shapeBeforePlayback) {
            appStore.getState().setDisplay({ satelliteShape: this.shapeBeforePlayback });
            this.shapeBeforePlayback = null;
        }
        this.resetPositions();
    }

    private enterPlaybackMode(): void {
        this.clearSelection();
        this.clearTrails();
        // 姿勢が見えるよう、球体なら立方体表示に切り替える
        const store = appStore.getState();
        this.shapeBeforePlayback ??= store.display.satelliteShape;
        if (store.display.satelliteShape === 'sphere') {
            store.setDisplay({ satelliteShape: 'cube' });
        }
        const count = this.csvPlayback.getEngine().getSatelliteCount();
        this.satellites = Array.from(
            { length: count },
            (_, i) =>
                new Satellite(
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    i === 0 ? '#ffffff' : SATELLITE_PALETTE[(i - 1) % SATELLITE_PALETTE.length],
                ),
        );
        this.updateSatellitesFromPlayback();
        this.rebuildSatelliteMeshes();
    }

    private updateSatellitesFromPlayback(): void {
        const states = this.csvPlayback.getEngine().getInterpolatedStates();
        const count = Math.min(states.length, this.satellites.length);
        for (let i = 0; i < count; i++) {
            const state = states[i];
            const sat = this.satellites[i];
            if (!state) continue;
            sat.x = state.position.x;
            sat.y = state.position.y;
            sat.z = state.position.z;
            sat.vx = state.velocity.x;
            sat.vy = state.velocity.y;
            sat.vz = state.velocity.z;
            sat.quaternion = state.quaternion;
        }
    }

    // ------------------------------------------------------------------
    // コマンド: 表示
    // ------------------------------------------------------------------

    async loadFile3D(file: File): Promise<void> {
        try {
            await this.renderingSystem.loadFile3D(file);
        } catch (error) {
            console.error('Failed to load 3D model:', error);
            appStore.getState().setDisplay({ satelliteShape: 'sphere' });
            throw error;
        }
        this.rebuildSatelliteMeshes();
    }

    private clearTrails(): void {
        this.renderingSystem.clearTrails(this.satellites);
    }

    private updateAllSatelliteColors(): void {
        const { uniformSatelliteColor, satelliteColor } = appStore.getState().display;
        for (let i = 1; i < this.satellites.length; i++) {
            this.satellites[i].color = uniformSatelliteColor
                ? satelliteColor
                : SATELLITE_PALETTE[(i - 1) % SATELLITE_PALETTE.length];
        }
        this.renderingSystem.updateAllSatelliteColors();
    }

    /** メッシュを作り直して現在位置に置く（一時停止中はメインループが位置を更新しないため、ここで置く） */
    private rebuildSatelliteMeshes(): void {
        this.renderingSystem.createSatelliteMeshes(this.satellites, { showReference: this.csvPlayback.isActive() });
        this.renderingSystem.updateSatellitePositions(this.satellites);
    }

    // ------------------------------------------------------------------
    // フォーメーション適用
    // ------------------------------------------------------------------

    private applyFormation(satellites: Satellite[]): void {
        if (this.satellites.length > 0) this.clearTrails();
        this.satellites = satellites;

        const mass = appStore.getState().simulation.satelliteMass;
        let maxSize = 0;
        for (const sat of satellites) {
            sat.mass = mass;
            sat.collided = false;
            sat.collisionTime = null;
            const size = FormationGenerator.getSatelliteMetadata(sat)?.size;
            if (size) maxSize = Math.max(maxSize, size);
        }
        // 衝突半径は実際の衛星サイズ（直径）から求める
        this.collisionDetector.setCollisionRadius((maxSize || DEFAULT_COLLISION_DIAMETER) / 2);

        this.time = 0;
        this.rebuildSatelliteMeshes();
    }

    private hasFormationSizes(): boolean {
        return this.satellites.some((sat) => FormationGenerator.getSatelliteMetadata(sat)?.size !== undefined);
    }

    // ------------------------------------------------------------------

    private aspect(): number {
        return this.viewport.clientWidth / Math.max(1, this.viewport.clientHeight);
    }

    private handleResize(): void {
        this.renderingSystem.handleResize();
    }
}

function finiteOrZero(value: number | undefined): number {
    return value !== undefined && Number.isFinite(value) ? value : 0;
}
