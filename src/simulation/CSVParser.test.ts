import { describe, expect, it } from 'vite-plus/test';
import threeSatelliteCsv from '../../public/samples/three_satellite_6dof.csv?raw';
import { parseCSVFile } from './CSVParser';

describe('CSVParser', () => {
    it('6DOF サンプルを衛星ごとに読み込む', async () => {
        const data = await parseCSVFile(new File([threeSatelliteCsv], 'three_satellite_6dof.csv'));
        expect(data.satelliteCount).toBe(3);
        expect(data.satellites).toHaveLength(3);
        expect(data.satellites[0].length).toBeGreaterThan(1);
        expect(data.timeRange.min).toBe(0);
        expect(data.satellites[0][0].position).toEqual({ x: 5, y: 0, z: 0 });
    });

    it('列数が足りない CSV はエラーにする', async () => {
        const file = new File(['Time (s),X\n0,1\n'], 'bad.csv');
        await expect(parseCSVFile(file)).rejects.toThrow();
    });
});
