import type { AttitudeQuaternion } from './Satellite.js';

/**
 * CSV 再生用の時系列データの読み込み。
 * 形式: `Time, Sat1_X, Sat1_Y, Sat1_Z, Sat1_Qw, Sat1_Qx, Sat1_Qy, Sat1_Qz, Sat2_X, ...`（docs/csv-playback-format.md）
 */

export interface SatelliteCSVData {
    time: number;
    position: { x: number; y: number; z: number };
    quaternion: AttitudeQuaternion;
}

export interface CSVPlaybackData {
    /** 衛星ごとの時系列 */
    satellites: SatelliteCSVData[][];
    timeRange: { min: number; max: number };
    satelliteCount: number;
}

/** 衛星 1 機ぶんの列: 位置 3 + クォータニオン 4 */
const SATELLITE_COLUMNS = ['X', 'Y', 'Z', 'Qw', 'Qx', 'Qy', 'Qz'];

const parseRow = (line: string) => line.split(',').map((cell) => cell.trim());

export async function parseCSVFile(file: File): Promise<CSVPlaybackData> {
    return parseCSVContent(await file.text());
}

export function parseCSVContent(content: string): CSVPlaybackData {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const satelliteCount = validateHeader(parseRow(lines[0]), errors, warnings);
    if (errors.length > 0) {
        throw new Error(`CSV validation failed: ${errors.join(', ')}`);
    }

    const expectedColumns = 1 + satelliteCount * SATELLITE_COLUMNS.length;
    const satellites: SatelliteCSVData[][] = Array.from({ length: satelliteCount }, () => []);
    let previousTime = -Infinity;

    for (let i = 1; i < lines.length; i++) {
        const rowNumber = i + 1;
        const row = parseRow(lines[i]);
        if (row.length !== expectedColumns) {
            errors.push(`Row has ${row.length} columns, expected ${expectedColumns}`);
            continue;
        }

        const values = row.map(parseFloat);
        const rowErrors: string[] = [];
        if (isNaN(values[0])) rowErrors.push('Invalid time value');
        for (let sat = 0; sat < satelliteCount; sat++) {
            const base = 1 + sat * SATELLITE_COLUMNS.length;
            if (values.slice(base, base + 3).some(isNaN)) {
                rowErrors.push(`Invalid position value for satellite ${sat + 1}`);
            }
            if (values.slice(base + 3, base + 7).some(isNaN)) {
                rowErrors.push(`Invalid quaternion value for satellite ${sat + 1}`);
            }
        }
        if (rowErrors.length > 0) {
            errors.push(...rowErrors);
            continue;
        }

        const time = values[0];
        if (time <= previousTime) {
            errors.push(`Time values must be strictly increasing. Row ${rowNumber}: ${time} <= ${previousTime}`);
        }
        previousTime = time;

        for (let sat = 0; sat < satelliteCount; sat++) {
            const [x, y, z, w, qx, qy, qz] = values.slice(1 + sat * SATELLITE_COLUMNS.length);
            const quaternion = { w, x: qx, y: qy, z: qz };
            const norm = Math.hypot(w, qx, qy, qz);
            if (Math.abs(norm - 1.0) > 0.01) {
                warnings.push(
                    `Row ${rowNumber}: satellite ${sat + 1} quaternion is not normalized (norm=${norm.toFixed(3)})`,
                );
                quaternion.w /= norm;
                quaternion.x /= norm;
                quaternion.y /= norm;
                quaternion.z /= norm;
            }
            satellites[sat].push({ time, position: { x, y, z }, quaternion });
        }
    }

    if (errors.length > 0) {
        throw new Error(`CSV validation failed:\n${errors.join('\n')}`);
    }
    if (warnings.length > 0) {
        console.warn('CSV parsing warnings:', warnings);
    }

    const times = satellites[0];
    return {
        satellites,
        // 時刻は単調増加を検証済みなので、先頭と末尾がそのまま最小・最大
        timeRange: { min: times[0].time, max: times[times.length - 1].time },
        satelliteCount,
    };
}

/** ヘッダーを検証して衛星数を返す。列名が期待どおりでないだけなら警告に留める */
function validateHeader(header: string[], errors: string[], warnings: string[]): number {
    if (!header[0]?.toLowerCase().includes('time')) {
        errors.push('First column must be time column');
    }

    const dataColumns = header.length - 1;
    const satelliteCount = dataColumns / SATELLITE_COLUMNS.length;
    if (!Number.isInteger(satelliteCount)) {
        errors.push(
            `Invalid number of columns. Expected 1 + N×${SATELLITE_COLUMNS.length} columns, got ${header.length}`,
        );
        return 0;
    }
    if (satelliteCount < 1) {
        errors.push('CSV must contain at least one satellite');
        return 0;
    }

    for (let sat = 0; sat < satelliteCount; sat++) {
        SATELLITE_COLUMNS.forEach((suffix, i) => {
            const actual = header[1 + sat * SATELLITE_COLUMNS.length + i];
            if (!actual?.includes(suffix)) {
                warnings.push(`Expected column pattern like "Sat${sat + 1}_${suffix}", got "${actual}"`);
            }
        });
    }
    return satelliteCount;
}
