import * as THREE from 'three';
import type { CSVPlaybackData, SatelliteCSVData } from './CSVParser.js';
import type { Satellite } from './Satellite.js';

/** 再生速度の上限（倍） */
const MAX_PLAYBACK_SPEED = 960;

const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();

/** 区間 [before, after] の平均速度（位置の差分） */
function velocityBetween(before: SatelliteCSVData, after: SatelliteCSVData): { x: number; y: number; z: number } {
    const dt = after.time - before.time;
    if (dt === 0) return { x: 0, y: 0, z: 0 };
    return {
        x: (after.position.x - before.position.x) / dt,
        y: (after.position.y - before.position.y) / dt,
        z: (after.position.z - before.position.z) / dt,
    };
}

/** time を含む区間の先頭 index（二分探索）。範囲外なら端の区間 */
function segmentIndex(series: SatelliteCSVData[], time: number): number {
    let lo = 0;
    let hi = series.length - 2;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (series[mid].time <= time) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

/**
 * CSV 時系列の再生（時刻の進行と補間）。位置は線形補間、姿勢は SLERP、速度は区間の差分。
 * DOM やストアには触れない。
 */
export class PlaybackEngine {
    private data: CSVPlaybackData | null = null;
    currentTime = 0;
    isPlaying = false;
    playbackSpeed = 1.0;
    loopEnabled = true;

    loadCSVData(data: CSVPlaybackData): void {
        this.data = data;
        this.currentTime = data.timeRange.min;
    }

    unload(): void {
        this.data = null;
        this.currentTime = 0;
        this.isPlaying = false;
    }

    isLoaded(): boolean {
        return this.data !== null;
    }

    getSatelliteCount(): number {
        return this.data?.satelliteCount ?? 0;
    }

    getTimeRange(): { min: number; max: number } | null {
        return this.data?.timeRange ?? null;
    }

    setPlaybackSpeed(speed: number): void {
        this.playbackSpeed = THREE.MathUtils.clamp(speed, 1, MAX_PLAYBACK_SPEED);
    }

    togglePlayPause(): void {
        this.isPlaying = !this.isPlaying;
    }

    stop(): void {
        this.isPlaying = false;
        if (this.data) this.currentTime = this.data.timeRange.min;
    }

    /** 0..1 の進捗位置へ移動する */
    seekToProgress(progress: number): void {
        if (!this.data) return;
        const { min, max } = this.data.timeRange;
        this.currentTime = THREE.MathUtils.clamp(min + progress * (max - min), min, max);
    }

    getCurrentProgress(): number {
        if (!this.data) return 0;
        const { min, max } = this.data.timeRange;
        return max === min ? 1 : (this.currentTime - min) / (max - min);
    }

    update(deltaTimeMs: number): void {
        if (!this.data || !this.isPlaying) return;

        this.currentTime += (deltaTimeMs / 1000) * this.playbackSpeed;
        const { min, max } = this.data.timeRange;
        if (this.currentTime > max) {
            if (this.loopEnabled) {
                this.currentTime = min;
            } else {
                this.currentTime = max;
                this.isPlaying = false;
            }
        }
    }

    /** 現在時刻の補間状態を衛星に書き込む（index は CSV の衛星番号） */
    applyTo(satellites: Satellite[]): void {
        if (!this.data) return;
        const count = Math.min(satellites.length, this.data.satelliteCount);
        for (let i = 0; i < count; i++) this.interpolate(this.data.satellites[i], satellites[i]);
    }

    private interpolate(series: SatelliteCSVData[], sat: Satellite): void {
        if (series.length === 0) return;
        if (series.length === 1) {
            this.assign(sat, series[0].position, series[0].quaternion, { x: 0, y: 0, z: 0 });
            return;
        }

        const index = segmentIndex(series, this.currentTime);
        const before = series[index];
        const after = series[index + 1];
        const velocity = velocityBetween(before, after);
        if (this.currentTime <= before.time) {
            this.assign(sat, before.position, before.quaternion, velocity);
            return;
        }
        if (this.currentTime >= after.time) {
            this.assign(sat, after.position, after.quaternion, velocity);
            return;
        }

        const t = (this.currentTime - before.time) / (after.time - before.time);
        const p0 = before.position;
        const p1 = after.position;
        qa.set(before.quaternion.x, before.quaternion.y, before.quaternion.z, before.quaternion.w);
        qb.set(after.quaternion.x, after.quaternion.y, after.quaternion.z, after.quaternion.w);
        qa.slerp(qb, t);
        this.assign(
            sat,
            { x: p0.x + t * (p1.x - p0.x), y: p0.y + t * (p1.y - p0.y), z: p0.z + t * (p1.z - p0.z) },
            { w: qa.w, x: qa.x, y: qa.y, z: qa.z },
            velocity,
        );
    }

    private assign(
        sat: Satellite,
        position: { x: number; y: number; z: number },
        quaternion: SatelliteCSVData['quaternion'],
        velocity: { x: number; y: number; z: number },
    ): void {
        sat.x = position.x;
        sat.y = position.y;
        sat.z = position.z;
        sat.vx = velocity.x;
        sat.vy = velocity.y;
        sat.vz = velocity.z;
        sat.quaternion = { ...quaternion };
    }
}
