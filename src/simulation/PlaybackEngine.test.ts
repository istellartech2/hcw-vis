import { describe, expect, it } from 'vite-plus/test';
import { PlaybackEngine } from './PlaybackEngine';
import { Satellite } from './Satellite';
import type { CSVPlaybackData } from './CSVParser';

const identity = { w: 1, x: 0, y: 0, z: 0 };

/** 衛星 1 機が 0 s に x = 0、10 s に x = 10 にいるデータ */
const data: CSVPlaybackData = {
    satellites: [
        [
            { time: 0, position: { x: 0, y: 0, z: 0 }, quaternion: identity },
            { time: 10, position: { x: 10, y: 0, z: 0 }, quaternion: identity },
        ],
    ],
    timeRange: { min: 0, max: 10 },
    satelliteCount: 1,
};

function loaded(): PlaybackEngine {
    const engine = new PlaybackEngine();
    engine.loadCSVData(data);
    return engine;
}

describe('PlaybackEngine', () => {
    it('再生速度は UI の選択肢（最大 7200 倍）をそのまま使い、1 倍未満にはしない', () => {
        const engine = loaded();
        engine.setPlaybackSpeed(7200);
        expect(engine.playbackSpeed).toBe(7200);
        engine.setPlaybackSpeed(0.5);
        expect(engine.playbackSpeed).toBe(1);
    });

    it('位置を線形補間し、速度は区間の差分になる', () => {
        const engine = loaded();
        engine.seekToProgress(0.25);
        const sat = new Satellite(0, 0, 0, 0, 0, 0, '#ffffff');
        engine.applyTo([sat]);
        expect(sat.x).toBeCloseTo(2.5, 9);
        expect(sat.vx).toBeCloseTo(1, 9);
        expect(sat.quaternion).toEqual(identity);
    });

    it('ループなしでは末尾で止まり、ループありでは先頭へ戻る', () => {
        const engine = loaded();
        engine.loopEnabled = false;
        engine.togglePlayPause();
        engine.update(11_000);
        expect(engine.currentTime).toBe(10);
        expect(engine.isPlaying).toBe(false);

        engine.loopEnabled = true;
        engine.togglePlayPause();
        engine.update(1_000);
        expect(engine.currentTime).toBe(0);
    });
});
