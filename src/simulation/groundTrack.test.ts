import { describe, expect, it } from 'vite-plus/test';
import { computeGroundTrack, type LatLon } from './groundTrack';
import { OrbitElementsCalculator } from './OrbitElements';

const DATE = new Date('2026-01-01T00:00:00Z');

function orbit(inclination: number, altitudeKm = 500) {
    return OrbitElementsCalculator.calculateOrbitalElements(inclination, 0, 0, 0, 0, altitudeKm * 1000);
}

const flat = (segments: LatLon[][]) => segments.flat();

describe('computeGroundTrack', () => {
    it('緯度は軌道傾斜角を超えず、経度は -180〜180 に収まる', () => {
        const track = computeGroundTrack(orbit(51.6), DATE);
        const points = [...flat(track.past), ...flat(track.future)];
        expect(points.length).toBeGreaterThan(300);
        for (const p of points) {
            expect(Math.abs(p.latitude)).toBeLessThanOrEqual(51.6 + 0.5);
            expect(p.longitude).toBeGreaterThanOrEqual(-180);
            expect(p.longitude).toBeLessThanOrEqual(180);
        }
        // 傾斜角近くの緯度まで到達する
        expect(Math.max(...points.map((p) => p.latitude))).toBeGreaterThan(50);
    });

    it('赤道軌道は緯度 0 のまま、日付変更線をまたぐ所で折れ線が分かれる', () => {
        const track = computeGroundTrack(orbit(0), DATE);
        for (const p of flat(track.future)) expect(Math.abs(p.latitude)).toBeLessThan(0.5);
        // 1 周で経度をほぼ一回りするので、必ず一度は ±180° をまたぐ
        expect(track.future.length).toBeGreaterThanOrEqual(2);
        for (const segment of track.future) {
            for (let i = 1; i < segment.length; i++) {
                expect(Math.abs(segment[i].longitude - segment[i - 1].longitude)).toBeLessThan(180);
            }
        }
    });

    it('過去と未来は centerDate でつながり、1 周後の直下点は地球の自転ぶん西へずれる', () => {
        const elements = orbit(51.6);
        const track = computeGroundTrack(elements, DATE);
        const past = flat(track.past);
        const future = flat(track.future);
        expect(past[past.length - 1]).toEqual(future[0]);

        // 1 周 (約 94.6 分) で地球は約 23.7° 東へ回るので、直下点はその分西へずれる
        const drift = ((future[future.length - 1].longitude - future[0].longitude + 540) % 360) - 180;
        const expected = -(elements.period / (23.9345 * 60)) * 360;
        expect(drift).toBeCloseTo(expected, 0);
    });
});
