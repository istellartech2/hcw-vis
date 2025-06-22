export interface SatelliteCSVData {
    time: number;
    position: { x: number; y: number; z: number };
    quaternion: { w: number; x: number; y: number; z: number };
}

export interface CSVPlaybackData {
    satellites: SatelliteCSVData[][];
    timeRange: { min: number; max: number };
    sampleRate: number;
    satelliteCount: number;
}

export interface CSVValidationError {
    row: number;
    column?: number;
    message: string;
    severity: 'error' | 'warning';
}

export class CSVParser {
    private static readonly POSITION_COLUMNS = 3;
    private static readonly QUATERNION_COLUMNS = 4;
    private static readonly SATELLITE_COLUMNS = 7; // 3 position + 4 quaternion
    private static readonly TIME_COLUMN = 1;

    public static async parseCSVFile(file: File): Promise<CSVPlaybackData> {
        const content = await this.readFileContent(file);
        return this.parseCSVContent(content);
    }

    private static async readFileContent(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    resolve(e.target.result as string);
                } else {
                    reject(new Error('Failed to read file content'));
                }
            };
            reader.onerror = () => reject(new Error('File reading error'));
            reader.readAsText(file);
        });
    }

    public static parseCSVContent(content: string): CSVPlaybackData {
        const lines = content.trim().split(/\r?\n/);
        
        if (lines.length < 2) {
            throw new Error('CSV file must contain at least a header row and one data row');
        }

        const errors: CSVValidationError[] = [];
        
        // Parse header
        const header = this.parseCSVRow(lines[0]);
        const satelliteCount = this.validateHeader(header, errors);
        
        if (errors.some(e => e.severity === 'error')) {
            throw new Error(`CSV validation failed: ${errors.map(e => e.message).join(', ')}`);
        }

        // Parse data rows
        const satellites: SatelliteCSVData[][] = Array.from({ length: satelliteCount }, () => []);
        const timeValues: number[] = [];

        for (let i = 1; i < lines.length; i++) {
            try {
                const row = this.parseCSVRow(lines[i]);
                this.validateDataRow(row, satelliteCount, i + 1, errors);
                
                if (errors.some(e => e.severity === 'error')) {
                    continue; // Skip invalid rows but continue parsing
                }

                const time = parseFloat(row[0]);
                timeValues.push(time);

                // Extract satellite data
                for (let satIndex = 0; satIndex < satelliteCount; satIndex++) {
                    const baseCol = 1 + satIndex * this.SATELLITE_COLUMNS;
                    
                    const position = {
                        x: parseFloat(row[baseCol]),     // RSW X (Radial)
                        y: parseFloat(row[baseCol + 1]), // RSW Y (Along-track)
                        z: parseFloat(row[baseCol + 2])  // RSW Z (Cross-track)
                    };

                    const quaternion = {
                        w: parseFloat(row[baseCol + 3]), // Quaternion W (scalar)
                        x: parseFloat(row[baseCol + 4]), // Quaternion X
                        y: parseFloat(row[baseCol + 5]), // Quaternion Y
                        z: parseFloat(row[baseCol + 6])  // Quaternion Z
                    };

                    // Validate quaternion normalization
                    const qNorm = Math.sqrt(quaternion.w * quaternion.w + 
                                           quaternion.x * quaternion.x + 
                                           quaternion.y * quaternion.y + 
                                           quaternion.z * quaternion.z);
                    
                    if (Math.abs(qNorm - 1.0) > 0.01) {
                        errors.push({
                            row: i + 1,
                            column: baseCol + 3,
                            message: `Satellite ${satIndex + 1} quaternion is not normalized (norm=${qNorm.toFixed(3)})`,
                            severity: 'warning'
                        });
                        
                        // Normalize the quaternion
                        quaternion.w /= qNorm;
                        quaternion.x /= qNorm;
                        quaternion.y /= qNorm;
                        quaternion.z /= qNorm;
                    }

                    satellites[satIndex].push({
                        time,
                        position,
                        quaternion
                    });
                }
            } catch (error) {
                errors.push({
                    row: i + 1,
                    message: `Failed to parse row: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    severity: 'error'
                });
            }
        }

        // Validate time sequence
        this.validateTimeSequence(timeValues, errors);

        if (errors.some(e => e.severity === 'error')) {
            const errorMessages = errors.filter(e => e.severity === 'error').map(e => e.message);
            throw new Error(`CSV validation failed:\n${errorMessages.join('\n')}`);
        }

        // Log warnings
        const warnings = errors.filter(e => e.severity === 'warning');
        if (warnings.length > 0) {
            console.warn('CSV parsing warnings:', warnings);
        }

        // Calculate metadata
        const timeRange = {
            min: Math.min(...timeValues),
            max: Math.max(...timeValues)
        };

        const sampleRate = timeValues.length > 1 
            ? (timeRange.max - timeRange.min) / (timeValues.length - 1)
            : 1.0;

        return {
            satellites,
            timeRange,
            sampleRate,
            satelliteCount
        };
    }

    private static parseCSVRow(line: string): string[] {
        // Simple CSV parser - handles basic CSV format
        // For more complex CSV (with quoted fields containing commas), consider using a proper CSV library
        return line.split(',').map(cell => cell.trim());
    }

    private static validateHeader(header: string[], errors: CSVValidationError[]): number {
        // First column should be time
        if (!header[0] || !header[0].toLowerCase().includes('time')) {
            errors.push({
                row: 1,
                column: 1,
                message: 'First column must be time column',
                severity: 'error'
            });
        }

        // Calculate number of satellites from remaining columns
        const dataColumns = header.length - this.TIME_COLUMN;
        
        if (dataColumns % this.SATELLITE_COLUMNS !== 0) {
            errors.push({
                row: 1,
                message: `Invalid number of columns. Expected ${this.TIME_COLUMN} + N×${this.SATELLITE_COLUMNS} columns, got ${header.length}`,
                severity: 'error'
            });
            return 0;
        }

        const satelliteCount = dataColumns / this.SATELLITE_COLUMNS;

        if (satelliteCount < 1) {
            errors.push({
                row: 1,
                message: 'CSV must contain at least one satellite',
                severity: 'error'
            });
            return 0;
        }

        // Validate satellite column headers
        for (let satIndex = 0; satIndex < satelliteCount; satIndex++) {
            const baseCol = this.TIME_COLUMN + satIndex * this.SATELLITE_COLUMNS;
            const satPrefix = `Sat${satIndex + 1}`;
            
            const expectedCols = [
                `${satPrefix}_X`,
                `${satPrefix}_Y`, 
                `${satPrefix}_Z`,
                `${satPrefix}_Qw`,
                `${satPrefix}_Qx`,
                `${satPrefix}_Qy`,
                `${satPrefix}_Qz`
            ];

            for (let i = 0; i < expectedCols.length; i++) {
                const colIndex = baseCol + i;
                const actualCol = header[colIndex];
                
                if (!actualCol || !actualCol.includes(expectedCols[i].split('_')[1])) {
                    errors.push({
                        row: 1,
                        column: colIndex + 1,
                        message: `Expected column pattern like "${expectedCols[i]}", got "${actualCol}"`,
                        severity: 'warning'
                    });
                }
            }
        }

        return satelliteCount;
    }

    private static validateDataRow(row: string[], expectedSatelliteCount: number, rowNumber: number, errors: CSVValidationError[]): void {
        const expectedColumns = this.TIME_COLUMN + expectedSatelliteCount * this.SATELLITE_COLUMNS;
        
        if (row.length !== expectedColumns) {
            errors.push({
                row: rowNumber,
                message: `Row has ${row.length} columns, expected ${expectedColumns}`,
                severity: 'error'
            });
            return;
        }

        // Validate time value
        const timeValue = parseFloat(row[0]);
        if (isNaN(timeValue)) {
            errors.push({
                row: rowNumber,
                column: 1,
                message: 'Invalid time value',
                severity: 'error'
            });
        }

        // Validate satellite data
        for (let satIndex = 0; satIndex < expectedSatelliteCount; satIndex++) {
            const baseCol = this.TIME_COLUMN + satIndex * this.SATELLITE_COLUMNS;
            
            // Validate position values
            for (let i = 0; i < this.POSITION_COLUMNS; i++) {
                const value = parseFloat(row[baseCol + i]);
                if (isNaN(value)) {
                    errors.push({
                        row: rowNumber,
                        column: baseCol + i + 1,
                        message: `Invalid position value for satellite ${satIndex + 1}`,
                        severity: 'error'
                    });
                }
            }

            // Validate quaternion values
            for (let i = 0; i < this.QUATERNION_COLUMNS; i++) {
                const value = parseFloat(row[baseCol + this.POSITION_COLUMNS + i]);
                if (isNaN(value)) {
                    errors.push({
                        row: rowNumber,
                        column: baseCol + this.POSITION_COLUMNS + i + 1,
                        message: `Invalid quaternion value for satellite ${satIndex + 1}`,
                        severity: 'error'
                    });
                }
            }
        }
    }

    private static validateTimeSequence(timeValues: number[], errors: CSVValidationError[]): void {
        for (let i = 1; i < timeValues.length; i++) {
            if (timeValues[i] <= timeValues[i - 1]) {
                errors.push({
                    row: i + 2, // +2 because row 1 is header and we're looking at i+1 index
                    column: 1,
                    message: `Time values must be strictly increasing. Row ${i + 2}: ${timeValues[i]} <= ${timeValues[i - 1]}`,
                    severity: 'error'
                });
            }
        }
    }

    public static validateCSVFile(file: File): Promise<CSVValidationError[]> {
        return this.parseCSVFile(file).then(
            () => [], // No errors if parsing succeeded
            (error) => [{
                row: 0,
                message: error.message,
                severity: 'error' as const
            }]
        );
    }
}