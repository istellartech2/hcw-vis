import * as THREE from 'three';
import { Satellite } from '@/simulation/Satellite';
import { HillEquationSolver } from '@/simulation/HillEquationSolver';
import { OrbitElementsCalculator, type OrbitalElements } from '@/simulation/OrbitElements';
import { applyElasticCollisions, detectCollisions } from '@/simulation/collision';
import { RenderingSystem } from '@/visualization/RenderingSystem';
import { CelestialBodies } from '@/visualization/CelestialBodies';
import { FormationGenerator } from '@/formation/FormationGenerator';
import { appStore, isCsvModeWithoutFile, type AppMode, type AppStore } from '@/store/appStore';
import { SATELLITE_PALETTE, type OrbitInputs, type SatelliteShape } from '@/store/settings';
import { CameraController } from './CameraController';
import { CsvPlayback } from './CsvPlayback';

export type RswAxis = 'r' | 's' | 'w';
export type RswVector = Record<RswAxis, number>;

const FRAME_DELTA_SECONDS = 0.016;
/** 積分の基本ステップ (s)。時間倍率が大きいときは比例して広げる */
const BASE_DT = 0.1;
const DEFAULT_COLLISION_DIAMETER = 0.5;

const paletteColor = (i: number) => SATELLITE_PALETTE[(i - 1) % SATELLITE_PALETTE.length];

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
    private cameraController: CameraController;
    private renderingSystem: RenderingSystem;
    private earth: CelestialBodies;
    private hillSolver: HillEquationSolver;
    private formationGenerator: FormationGenerator;
    private csvPlayback = new CsvPlayback(() => this.enterPlaybackMode());

    private satellites: Satellite[] = [];
    private time = 0;
    private simulationStartTime = new Date();
    private frameCounter = 0;
    private orbitElements!: OrbitalElements;
    /** 衝突判定に使う衛星の半径 (m) */
    private collisionRadius = DEFAULT_COLLISION_DIAMETER / 2;

    /** CSV 再生に入る前の衛星形状（終了時に戻す） */
    private shapeBeforePlayback: SatelliteShape | null = null;
    private animationFrameId = 0;
    private abort = new AbortController();
    private unsubscribe: () => void;
    private resizeObserver: ResizeObserver;

    constructor(viewport: HTMLElement, canvas: HTMLCanvasElement) {
        const { signal } = this.abort;
        const state = appStore.getState();

        this.camera = new THREE.PerspectiveCamera(
            50,
            viewport.clientWidth / Math.max(1, viewport.clientHeight),
            0.001,
            50000000,
        );
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, logarithmicDepthBuffer: true });
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

        this.earth = new CelestialBodies(this.scene, this.renderer.capabilities.getMaxAnisotropy(), (loading) =>
            appStore.getState().patch({ loading }),
        );
        this.earth.setTexture(state.display.earthTexture);
        this.earth.setBrightness(state.display.earthBrightness);
        this.earth.setVisible(state.display.showEarth);
        this.earth.setLatLongGridVisible(state.display.showLatLongGrid);

        this.hillSolver = new HillEquationSolver(0);
        this.formationGenerator = new FormationGenerator(0);
        this.setOrbit(state.orbit);
        this.applyFormation(this.formationGenerator.generateSatellites(state.formation));

        this.unsubscribe = appStore.subscribe((next, prev) => this.onStoreChange(next, prev));
        this.resizeObserver = new ResizeObserver(() => this.renderingSystem.handleResize());
        this.resizeObserver.observe(viewport);

        this.animate();
    }

    dispose(): void {
        cancelAnimationFrame(this.animationFrameId);
        this.abort.abort();
        this.unsubscribe();
        this.resizeObserver.disconnect();
        this.renderingSystem.dispose(this.satellites);
        this.earth.dispose();
        this.renderer.dispose();
    }

    // ------------------------------------------------------------------
    // ストア購読: 設定変更をシーンへ反映
    // ------------------------------------------------------------------

    private onStoreChange(next: AppStore, prev: AppStore): void {
        // 名前や説明だけの変更では再配置しない（layers は編集のたびに新しい配列になる）
        if (next.formation.layers !== prev.formation.layers) this.resetPositions();

        const d = next.display;
        const pd = prev.display;
        if (d !== pd) {
            if (d.showEarth !== pd.showEarth) this.earth.setVisible(d.showEarth);
            if (d.showLatLongGrid !== pd.showLatLongGrid) this.earth.setLatLongGridVisible(d.showLatLongGrid);
            if (d.earthBrightness !== pd.earthBrightness) this.earth.setBrightness(d.earthBrightness);
            if (d.earthTexture !== pd.earthTexture) this.earth.setTexture(d.earthTexture);
            if (!d.showTrails && pd.showTrails) this.renderingSystem.clearTrails(this.satellites);
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
                if (!this.satellites.some((sat) => sat.metadata?.size !== undefined)) {
                    this.collisionRadius = d.satelliteSize / 2;
                }
            }
        }

        const sim = next.simulation;
        const ps = prev.simulation;
        if (sim !== ps) {
            if (sim.j2Perturbation !== ps.j2Perturbation) this.updateOrbitParameters();
            if (sim.j2StableArrangement !== ps.j2StableArrangement) {
                this.updateOrbitParameters();
                this.resetPositions();
            }
            if (sim.satelliteMass !== ps.satelliteMass) {
                for (const sat of this.satellites) sat.mass = sim.satelliteMass;
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
        // CSV 再生は自前の再生／一時停止（playback.isPlaying）を持ち、シミュレーションの paused とは独立
        const playingCsv = this.csvPlayback.isActive();
        const advancing = playingCsv ? this.csvPlayback.isPlaying() : !store.paused;

        if (advancing) {
            this.frameCounter++;
            const publishTime = this.frameCounter % 5 === 0;
            if (playingCsv) {
                this.csvPlayback.update(FRAME_DELTA_SECONDS * 1000, publishTime);
            } else {
                this.stepPhysics(store.simulation.timeScale);
            }
            if (publishTime) store.patch({ simTime: this.currentTime() });
            if (this.frameCounter % 10 === 0) {
                this.publishReferenceInfo();
                if (this.renderingSystem.getSelectedSatelliteIndex() >= 0) this.publishSelectedSatellite();
            }
            this.earth.update(
                new Date(this.simulationStartTime.getTime() + this.currentTime() * 1000),
                this.orbitElements,
            );
        }

        // 位置と見た目は毎フレーム同期する（一時停止中のシークや再配置もそのまま反映される）。軌跡は進んだときだけ伸ばす
        if (playingCsv) this.csvPlayback.applyTo(this.satellites);
        this.renderingSystem.updateSatellitePositions(this.satellites, advancing);
        this.renderingSystem.render();
    };

    private stepPhysics(timeScale: number): void {
        const scaledDeltaTime = FRAME_DELTA_SECONDS * timeScale;
        this.time += scaledDeltaTime;

        // 衛星数が多い場合は1フレームおきに積分して負荷を下げる
        if (this.satellites.length - 1 > 20 && this.frameCounter % 2 !== 0) return;

        const adaptiveDt = Math.min(BASE_DT * Math.max(1, timeScale / 10), scaledDeltaTime);
        const integrationSteps = Math.max(1, Math.ceil(scaledDeltaTime / adaptiveDt));
        const stepDt = scaledDeltaTime / integrationSteps;
        const collisionEnabled = appStore.getState().simulation.collisionEnabled;

        for (let step = 0; step < integrationSteps; step++) {
            for (let i = 1; i < this.satellites.length; i++) {
                this.hillSolver.rungeKutta4Step(this.satellites[i], stepDt);
            }
            if (collisionEnabled) {
                applyElasticCollisions(this.satellites, detectCollisions(this.satellites, this.collisionRadius));
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
        const eci = OrbitElementsCalculator.getECIPosition(
            this.orbitElements,
            new Date(Date.now() + this.currentTime() * 1000),
        );
        appStore.getState().patch({
            referenceInfo: eci ? { latitude: eci.geodetic.latitude, longitude: eci.geodetic.longitude } : null,
        });
    }

    private publishSelectedSatellite(index?: number): void {
        if (index !== undefined) this.renderingSystem.setSelectedSatelliteIndex(index);
        const store = appStore.getState();
        const sat = this.getSelectedSatellite();

        if (!sat) {
            if (store.selected) store.patch({ selected: null });
            if (store.ui.activeDialog) store.setUI({ activeDialog: null });
            return;
        }

        store.patch({
            selected: {
                index: this.renderingSystem.getSelectedSatelliteIndex(),
                position: { r: sat.x, s: sat.y, w: sat.z },
                velocity: { r: sat.vx, s: sat.vy, w: sat.vz },
                speed: Math.hypot(sat.vx, sat.vy, sat.vz),
                distance: Math.hypot(sat.x, sat.y, sat.z),
            },
        });
    }

    // ------------------------------------------------------------------
    // コマンド: シミュレーション
    // ------------------------------------------------------------------

    /**
     * モードを切り替える（パネルのモード切替とショートカットの共通処理）。
     * - CSV へ: ファイルを読み込むまでシミュレーションは一時停止しておく（裏で動くと CSV 再生と紛らわしい）
     * - シミュレーションへ: CSV 再生中なら終了し、一時停止を解除する
     */
    setMode(next: AppMode): void {
        const store = appStore.getState();
        if (next === 'simulation') {
            if (this.csvPlayback.isActive()) this.exitPlayback();
            store.setUI({ mode: 'simulation', panelTab: 'formation' });
            store.patch({ paused: false });
        } else {
            store.setUI({ mode: 'csv', panelTab: 'csv' });
            store.patch({ paused: true });
        }
    }

    /** 再生／一時停止（再生バーのボタンと Space）。CSV 再生中は CSV、ファイル未読み込みなら何もしない */
    togglePlay(): void {
        const store = appStore.getState();
        if (this.csvPlayback.isActive()) this.csvPlayback.togglePlayPause();
        else if (!isCsvModeWithoutFile(store)) store.patch({ paused: !store.paused });
    }

    /** ストアのフォーメーション設定から衛星を再生成し、時刻を 0 に戻す（CSV 再生中は先頭へ戻す） */
    resetPositions(): void {
        if (this.csvPlayback.isActive()) {
            this.csvPlayback.stop();
            return;
        }
        this.clearSelection();
        appStore.getState().patch({ simTime: 0 });
        this.applyFormation(this.formationGenerator.generateSatellites(appStore.getState().formation));
    }

    resetView(): void {
        this.cameraController.resetView();
    }

    clearSelection(): void {
        this.publishSelectedSatellite(-1);
    }

    addPerturbation(): void {
        const amount = appStore.getState().simulation.perturbationAmount;
        for (const sat of this.satellites.slice(1)) {
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
        return this.satellites[this.renderingSystem.getSelectedSatelliteIndex()] ?? null;
    }

    /**
     * 基準軌道を更新する。
     * @returns 入力エラーのメッセージ（空なら成功）
     */
    applyOrbit(inputs: OrbitInputs): string[] {
        const errors = OrbitElementsCalculator.validateElements({
            inclination: inputs.inclination,
            raan: inputs.raan,
            argOfPerigee: inputs.argOfPerigee,
            meanAnomaly: inputs.meanAnomaly,
            altitude: inputs.altitudeKm * 1000,
        });
        if (errors.length > 0) return errors;

        this.setOrbit(inputs);
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
        this.earth.setOrbitRadius(this.orbitElements.semiMajorAxis);
        this.updateOrbitParameters();
    }

    /** 軌道と J2 設定から、積分器と配置生成器のパラメータを更新する（積分器の SS 係数を配置生成器が使う） */
    private updateOrbitParameters(): void {
        const { semiMajorAxis, meanMotion, inclination } = this.orbitElements;
        const { j2Perturbation, j2StableArrangement } = appStore.getState().simulation;
        this.hillSolver.updateMeanMotion(meanMotion);
        this.hillSolver.setOrbitParameters(semiMajorAxis, THREE.MathUtils.degToRad(inclination));
        this.hillSolver.setJ2Perturbation(j2Perturbation);
        this.formationGenerator.updateMeanMotion(meanMotion);
        this.formationGenerator.setJ2StableArrangement(j2StableArrangement, this.hillSolver.getSSCoefficientC());
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

    stopPlayback(): void {
        this.csvPlayback.stop();
    }

    seekPlayback(progress: number): void {
        this.csvPlayback.seekToProgress(progress);
    }

    setPlaybackSpeed(speed: number): void {
        this.csvPlayback.setSpeed(speed);
    }

    setPlaybackLoop(loop: boolean): void {
        this.csvPlayback.setLoop(loop);
    }

    /** CSV 再生モードを終了してシミュレーションに戻る */
    private exitPlayback(): void {
        this.csvPlayback.deactivate();
        if (this.shapeBeforePlayback) {
            appStore.getState().setDisplay({ satelliteShape: this.shapeBeforePlayback });
            this.shapeBeforePlayback = null;
        }
        this.resetPositions();
    }

    private enterPlaybackMode(): void {
        this.clearSelection();
        this.renderingSystem.clearTrails(this.satellites);
        // 姿勢が見えるよう、球体なら立方体表示に切り替える
        const store = appStore.getState();
        this.shapeBeforePlayback ??= store.display.satelliteShape;
        if (store.display.satelliteShape === 'sphere') {
            store.setDisplay({ satelliteShape: 'cube' });
        }
        this.satellites = Array.from(
            { length: this.csvPlayback.getSatelliteCount() },
            (_, i) => new Satellite(0, 0, 0, 0, 0, 0, i === 0 ? '#ffffff' : paletteColor(i)),
        );
        this.csvPlayback.applyTo(this.satellites);
        this.rebuildSatelliteMeshes();
    }

    // ------------------------------------------------------------------
    // 表示
    // ------------------------------------------------------------------

    private updateAllSatelliteColors(): void {
        const { uniformSatelliteColor, satelliteColor } = appStore.getState().display;
        this.satellites.forEach((sat, i) => {
            if (i > 0) sat.color = uniformSatelliteColor ? satelliteColor : paletteColor(i);
        });
        this.renderingSystem.updateAllSatelliteColors(this.satellites);
    }

    private rebuildSatelliteMeshes(): void {
        this.renderingSystem.createSatelliteMeshes(this.satellites, { showReference: this.csvPlayback.isActive() });
    }

    // ------------------------------------------------------------------
    // フォーメーション適用
    // ------------------------------------------------------------------

    private applyFormation(satellites: Satellite[]): void {
        this.renderingSystem.clearTrails(this.satellites);
        this.satellites = satellites;
        this.time = 0;

        const mass = appStore.getState().simulation.satelliteMass;
        let maxSize = 0;
        for (const sat of satellites) {
            sat.mass = mass;
            maxSize = Math.max(maxSize, sat.metadata?.size || 0);
        }
        // 衝突半径は実際の衛星サイズ（直径）から求める
        this.collisionRadius = (maxSize || DEFAULT_COLLISION_DIAMETER) / 2;
        this.rebuildSatelliteMeshes();
    }
}

function finiteOrZero(value: number | undefined): number {
    return value !== undefined && Number.isFinite(value) ? value : 0;
}
