import { CSVPlaybackData, SatelliteCSVData } from './CSVParser.js';
import { Satellite } from './Satellite.js';

export interface PlaybackState {
    currentTime: number;
    isPlaying: boolean;
    playbackSpeed: number;
    loopEnabled: boolean;
}

export interface InterpolatedSatelliteState {
    position: { x: number; y: number; z: number };
    quaternion: { w: number; x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
}

export class PlaybackEngine {
    private data: CSVPlaybackData | null = null;
    private state: PlaybackState;
    private lastUpdateTime: number = 0;
    private interpolatedStates: InterpolatedSatelliteState[] = [];

    constructor() {
        this.state = {
            currentTime: 0,
            isPlaying: false,
            playbackSpeed: 1.0,
            loopEnabled: true
        };
    }

    public loadCSVData(data: CSVPlaybackData): void {
        this.data = data;
        this.state.currentTime = data.timeRange.min;
        this.interpolatedStates = new Array(data.satelliteCount);
        this.updateInterpolatedStates();
    }

    public getState(): PlaybackState {
        return { ...this.state };
    }

    public setPlaybackSpeed(speed: number): void {
        this.state.playbackSpeed = Math.max(1.0, Math.min(960.0, speed));
    }

    public setCurrentTime(time: number): void {
        if (!this.data) return;
        
        this.state.currentTime = Math.max(
            this.data.timeRange.min,
            Math.min(this.data.timeRange.max, time)
        );
        this.updateInterpolatedStates();
    }

    public play(): void {
        this.state.isPlaying = true;
        this.lastUpdateTime = performance.now();
    }

    public pause(): void {
        this.state.isPlaying = false;
    }

    public stop(): void {
        this.state.isPlaying = false;
        if (this.data) {
            this.state.currentTime = this.data.timeRange.min;
            this.updateInterpolatedStates();
        }
    }

    public togglePlayPause(): void {
        if (this.state.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    public setLoopEnabled(enabled: boolean): void {
        this.state.loopEnabled = enabled;
    }

    public update(deltaTimeMs: number): void {
        if (!this.data || !this.state.isPlaying) {
            return;
        }

        const deltaTimeSeconds = (deltaTimeMs / 1000) * this.state.playbackSpeed;
        this.state.currentTime += deltaTimeSeconds;

        // Handle looping or stopping at end
        if (this.state.currentTime > this.data.timeRange.max) {
            if (this.state.loopEnabled) {
                this.state.currentTime = this.data.timeRange.min;
            } else {
                this.state.currentTime = this.data.timeRange.max;
                this.state.isPlaying = false;
            }
        }

        this.updateInterpolatedStates();
    }

    public getInterpolatedStates(): InterpolatedSatelliteState[] {
        return this.interpolatedStates;
    }

    public getSatelliteCount(): number {
        return this.data?.satelliteCount || 0;
    }

    public getTimeRange(): { min: number; max: number } | null {
        return this.data?.timeRange || null;
    }

    public getCurrentProgress(): number {
        if (!this.data) return 0;
        const duration = this.data.timeRange.max - this.data.timeRange.min;
        if (duration === 0) return 1;
        return (this.state.currentTime - this.data.timeRange.min) / duration;
    }

    private updateInterpolatedStates(): void {
        if (!this.data) return;

        for (let satIndex = 0; satIndex < this.data.satelliteCount; satIndex++) {
            const satelliteData = this.data.satellites[satIndex];
            this.interpolatedStates[satIndex] = this.interpolateSatelliteState(
                satelliteData,
                this.state.currentTime
            );
        }
    }

    private interpolateSatelliteState(
        satelliteData: SatelliteCSVData[],
        targetTime: number
    ): InterpolatedSatelliteState {
        if (satelliteData.length === 0) {
            return {
                position: { x: 0, y: 0, z: 0 },
                quaternion: { w: 1, x: 0, y: 0, z: 0 },
                velocity: { x: 0, y: 0, z: 0 }
            };
        }

        if (satelliteData.length === 1) {
            const data = satelliteData[0];
            return {
                position: { ...data.position },
                quaternion: { ...data.quaternion },
                velocity: { x: 0, y: 0, z: 0 }
            };
        }

        // Find the two data points to interpolate between
        let beforeIndex = 0;
        let afterIndex = satelliteData.length - 1;

        for (let i = 0; i < satelliteData.length - 1; i++) {
            if (satelliteData[i].time <= targetTime && satelliteData[i + 1].time >= targetTime) {
                beforeIndex = i;
                afterIndex = i + 1;
                break;
            }
        }

        const beforeData = satelliteData[beforeIndex];
        const afterData = satelliteData[afterIndex];

        // Handle edge cases
        if (targetTime <= beforeData.time) {
            return {
                position: { ...beforeData.position },
                quaternion: { ...beforeData.quaternion },
                velocity: this.calculateVelocity(satelliteData, beforeIndex)
            };
        }

        if (targetTime >= afterData.time) {
            return {
                position: { ...afterData.position },
                quaternion: { ...afterData.quaternion },
                velocity: this.calculateVelocity(satelliteData, afterIndex)
            };
        }

        // Linear interpolation factor
        const timeDelta = afterData.time - beforeData.time;
        const t = timeDelta > 0 ? (targetTime - beforeData.time) / timeDelta : 0;

        // Linear interpolation for position
        const position = {
            x: beforeData.position.x + t * (afterData.position.x - beforeData.position.x),
            y: beforeData.position.y + t * (afterData.position.y - beforeData.position.y),
            z: beforeData.position.z + t * (afterData.position.z - beforeData.position.z)
        };

        // SLERP interpolation for quaternion
        const quaternion = this.slerpQuaternion(beforeData.quaternion, afterData.quaternion, t);

        // Calculate velocity from position derivatives
        const velocity = this.calculateVelocityBetweenPoints(beforeData, afterData);

        return { position, quaternion, velocity };
    }

    private slerpQuaternion(
        q1: { w: number; x: number; y: number; z: number },
        q2: { w: number; x: number; y: number; z: number },
        t: number
    ): { w: number; x: number; y: number; z: number } {
        // Compute the cosine of the angle between them
        let dot = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;

        // If the dot product is negative, the quaternions have opposite handedness
        // and slerp won't take the shorter path. Fix by reversing one quaternion.
        let q2Copy = { ...q2 };
        if (dot < 0.0) {
            q2Copy.w = -q2Copy.w;
            q2Copy.x = -q2Copy.x;
            q2Copy.y = -q2Copy.y;
            q2Copy.z = -q2Copy.z;
            dot = -dot;
        }

        // If the inputs are too close for comfort, linearly interpolate
        if (dot > 0.9995) {
            const result = {
                w: q1.w + t * (q2Copy.w - q1.w),
                x: q1.x + t * (q2Copy.x - q1.x),
                y: q1.y + t * (q2Copy.y - q1.y),
                z: q1.z + t * (q2Copy.z - q1.z)
            };
            
            // Normalize the result
            const norm = Math.sqrt(result.w * result.w + result.x * result.x + 
                                 result.y * result.y + result.z * result.z);
            if (norm > 0) {
                result.w /= norm;
                result.x /= norm;
                result.y /= norm;
                result.z /= norm;
            }
            
            return result;
        }

        // Calculate the angle between the quaternions
        const theta_0 = Math.acos(Math.abs(dot));
        const theta = theta_0 * t;
        const sin_theta = Math.sin(theta);
        const sin_theta_0 = Math.sin(theta_0);

        const s0 = Math.cos(theta) - dot * sin_theta / sin_theta_0;
        const s1 = sin_theta / sin_theta_0;

        return {
            w: s0 * q1.w + s1 * q2Copy.w,
            x: s0 * q1.x + s1 * q2Copy.x,
            y: s0 * q1.y + s1 * q2Copy.y,
            z: s0 * q1.z + s1 * q2Copy.z
        };
    }

    private calculateVelocity(
        satelliteData: SatelliteCSVData[],
        index: number
    ): { x: number; y: number; z: number } {
        if (satelliteData.length < 2) {
            return { x: 0, y: 0, z: 0 };
        }

        let beforeIndex = Math.max(0, index - 1);
        let afterIndex = Math.min(satelliteData.length - 1, index + 1);

        // Use forward difference at the start
        if (index === 0) {
            beforeIndex = 0;
            afterIndex = 1;
        }
        // Use backward difference at the end
        else if (index === satelliteData.length - 1) {
            beforeIndex = satelliteData.length - 2;
            afterIndex = satelliteData.length - 1;
        }

        return this.calculateVelocityBetweenPoints(
            satelliteData[beforeIndex],
            satelliteData[afterIndex]
        );
    }

    private calculateVelocityBetweenPoints(
        before: SatelliteCSVData,
        after: SatelliteCSVData
    ): { x: number; y: number; z: number } {
        const dt = after.time - before.time;
        if (dt === 0) {
            return { x: 0, y: 0, z: 0 };
        }

        return {
            x: (after.position.x - before.position.x) / dt,
            y: (after.position.y - before.position.y) / dt,
            z: (after.position.z - before.position.z) / dt
        };
    }

    public applySatelliteStates(satellites: Satellite[]): void {
        if (!this.data || this.interpolatedStates.length === 0) {
            return;
        }

        const numSatellites = Math.min(satellites.length, this.interpolatedStates.length);

        for (let i = 0; i < numSatellites; i++) {
            const state = this.interpolatedStates[i];
            const satellite = satellites[i];

            // Update satellite position and velocity
            satellite.x = state.position.x;
            satellite.y = state.position.y;
            satellite.z = state.position.z;
            satellite.vx = state.velocity.x;
            satellite.vy = state.velocity.y;
            satellite.vz = state.velocity.z;

            // Store quaternion for rendering system
            // Note: We'll need to modify the satellite class to support quaternions
            (satellite as any).quaternion = state.quaternion;
        }
    }

    public isLoaded(): boolean {
        return this.data !== null;
    }

    public reset(): void {
        this.data = null;
        this.interpolatedStates = [];
        this.state = {
            currentTime: 0,
            isPlaying: false,
            playbackSpeed: 1.0,
            loopEnabled: true
        };
    }
}