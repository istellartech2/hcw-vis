export interface UIControlElements {
    satelliteCount: HTMLInputElement;
    placementPattern: HTMLSelectElement;
    orbitRadius: HTMLInputElement;
    orbitAltitude: HTMLInputElement;
    timeScale: HTMLSelectElement;
    simulationTime: HTMLSpanElement;
    showTrails: HTMLInputElement;
    showGrid: HTMLInputElement;
    showLatLongGrid: HTMLInputElement;
    showEarth: HTMLInputElement;
    earthTexture: HTMLSelectElement;
    trailLength: HTMLInputElement;
    trailLengthValue: HTMLSpanElement;
    zAmplitude: HTMLInputElement;
    zAmplitudeValue: HTMLSpanElement;
    zAmplitudeControl: HTMLDivElement;
    periodicParamsControl: HTMLDivElement;
    paramB: HTMLInputElement;
    paramBValue: HTMLSpanElement;
    paramD: HTMLInputElement;
    paramDValue: HTMLSpanElement;
    paramE: HTMLInputElement;
    paramEValue: HTMLSpanElement;
    paramF: HTMLInputElement;
    paramFValue: HTMLSpanElement;
    eccentricityValue: HTMLSpanElement;
    circularZDirection: HTMLInputElement;
    circularZDirectionControl: HTMLDivElement;
    thrustAmount: HTMLInputElement;
    perturbationAmount: HTMLInputElement;
    uniformSatelliteColor: HTMLInputElement;
    satelliteColor: HTMLInputElement;
    satelliteSize: HTMLInputElement;
    satelliteShape: HTMLSelectElement;
    cubeRotationControls: HTMLDivElement;
    cubeRotationR: HTMLInputElement;
    cubeRotationRValue: HTMLSpanElement;
    cubeRotationS: HTMLInputElement;
    cubeRotationSValue: HTMLSpanElement;
    file3dControls: HTMLDivElement;
    file3dInput: HTMLInputElement;
    file3dRotationR: HTMLInputElement;
    file3dRotationRValue: HTMLSpanElement;
    file3dRotationS: HTMLInputElement;
    file3dRotationSValue: HTMLSpanElement;
    inclination: HTMLInputElement;
    raan: HTMLInputElement;
    argOfPerigee: HTMLInputElement;
    meanAnomaly: HTMLInputElement;
    // CSV Playback controls
    csvPlaybackInput: HTMLInputElement;
    csvFileStatus: HTMLDivElement;
    csvStatusText: HTMLSpanElement;
    loadSampleSingle: HTMLButtonElement;
    loadSampleMultiple: HTMLButtonElement;
    csvPlaybackControls: HTMLDivElement;
    csvPlayPause: HTMLButtonElement;
    csvStop: HTMLButtonElement;
    csvTimeSlider: HTMLInputElement;
    csvCurrentTime: HTMLSpanElement;
    csvTotalTime: HTMLSpanElement;
    csvPlaybackSpeed: HTMLSelectElement;
    csvLoopEnabled: HTMLInputElement;
    csvSatelliteCount: HTMLSpanElement;
    csvDataPoints: HTMLSpanElement;
    csvTimeRange: HTMLSpanElement;
}

export class UIControls {
    public elements: UIControlElements;
    
    constructor() {
        this.elements = {
            satelliteCount: document.getElementById('satelliteCount') as HTMLInputElement,
            placementPattern: document.getElementById('placementPattern') as HTMLSelectElement,
            orbitRadius: document.getElementById('orbitRadius') as HTMLInputElement,
            orbitAltitude: document.getElementById('orbitAltitude') as HTMLInputElement,
            timeScale: document.getElementById('timeScale') as HTMLSelectElement,
            simulationTime: document.getElementById('simulationTime') as HTMLSpanElement,
            showTrails: document.getElementById('showTrails') as HTMLInputElement,
            showGrid: document.getElementById('showGrid') as HTMLInputElement,
            showLatLongGrid: document.getElementById('showLatLongGrid') as HTMLInputElement,
            showEarth: document.getElementById('showEarth') as HTMLInputElement,
            earthTexture: document.getElementById('earthTexture') as HTMLSelectElement,
            trailLength: document.getElementById('trailLength') as HTMLInputElement,
            trailLengthValue: document.getElementById('trailLengthValue') as HTMLSpanElement,
            zAmplitude: document.getElementById('zAmplitude') as HTMLInputElement,
            zAmplitudeValue: document.getElementById('zAmplitudeValue') as HTMLSpanElement,
            zAmplitudeControl: document.getElementById('zAmplitudeControl') as HTMLDivElement,
            periodicParamsControl: document.getElementById('periodicParamsControl') as HTMLDivElement,
            paramB: document.getElementById('paramB') as HTMLInputElement,
            paramBValue: document.getElementById('paramBValue') as HTMLSpanElement,
            paramD: document.getElementById('paramD') as HTMLInputElement,
            paramDValue: document.getElementById('paramDValue') as HTMLSpanElement,
            paramE: document.getElementById('paramE') as HTMLInputElement,
            paramEValue: document.getElementById('paramEValue') as HTMLSpanElement,
            paramF: document.getElementById('paramF') as HTMLInputElement,
            paramFValue: document.getElementById('paramFValue') as HTMLSpanElement,
            eccentricityValue: document.getElementById('eccentricityValue') as HTMLSpanElement,
            circularZDirection: document.getElementById('circularZDirection') as HTMLInputElement,
            circularZDirectionControl: document.getElementById('circularZDirectionControl') as HTMLDivElement,
            thrustAmount: document.getElementById('thrustAmount') as HTMLInputElement,
            perturbationAmount: document.getElementById('perturbationAmount') as HTMLInputElement,
            uniformSatelliteColor: document.getElementById('uniformSatelliteColor') as HTMLInputElement,
            satelliteColor: document.getElementById('satelliteColor') as HTMLInputElement,
            satelliteSize: document.getElementById('satelliteSize') as HTMLInputElement,
            satelliteShape: document.getElementById('satelliteShape') as HTMLSelectElement,
            cubeRotationControls: document.getElementById('cubeRotationControls') as HTMLDivElement,
            cubeRotationR: document.getElementById('cubeRotationR') as HTMLInputElement,
            cubeRotationRValue: document.getElementById('cubeRotationRValue') as HTMLSpanElement,
            cubeRotationS: document.getElementById('cubeRotationS') as HTMLInputElement,
            cubeRotationSValue: document.getElementById('cubeRotationSValue') as HTMLSpanElement,
            file3dControls: document.getElementById('file3dControls') as HTMLDivElement,
            file3dInput: document.getElementById('file3dInput') as HTMLInputElement,
            file3dRotationR: document.getElementById('file3dRotationR') as HTMLInputElement,
            file3dRotationRValue: document.getElementById('file3dRotationRValue') as HTMLSpanElement,
            file3dRotationS: document.getElementById('file3dRotationS') as HTMLInputElement,
            file3dRotationSValue: document.getElementById('file3dRotationSValue') as HTMLSpanElement,
            inclination: document.getElementById('inclination') as HTMLInputElement,
            raan: document.getElementById('raan') as HTMLInputElement,
            argOfPerigee: document.getElementById('argOfPerigee') as HTMLInputElement,
            meanAnomaly: document.getElementById('meanAnomaly') as HTMLInputElement,
            // CSV Playback controls
            csvPlaybackInput: document.getElementById('csvPlaybackInput') as HTMLInputElement,
            csvFileStatus: document.getElementById('csvFileStatus') as HTMLDivElement,
            csvStatusText: document.getElementById('csvStatusText') as HTMLSpanElement,
            loadSampleSingle: document.getElementById('loadSampleSingle') as HTMLButtonElement,
            loadSampleMultiple: document.getElementById('loadSampleMultiple') as HTMLButtonElement,
            csvPlaybackControls: document.getElementById('csvPlaybackControls') as HTMLDivElement,
            csvPlayPause: document.getElementById('csvPlayPause') as HTMLButtonElement,
            csvStop: document.getElementById('csvStop') as HTMLButtonElement,
            csvTimeSlider: document.getElementById('csvTimeSlider') as HTMLInputElement,
            csvCurrentTime: document.getElementById('csvCurrentTime') as HTMLSpanElement,
            csvTotalTime: document.getElementById('csvTotalTime') as HTMLSpanElement,
            csvPlaybackSpeed: document.getElementById('csvPlaybackSpeed') as HTMLSelectElement,
            csvLoopEnabled: document.getElementById('csvLoopEnabled') as HTMLInputElement,
            csvSatelliteCount: document.getElementById('csvSatelliteCount') as HTMLSpanElement,
            csvDataPoints: document.getElementById('csvDataPoints') as HTMLSpanElement,
            csvTimeRange: document.getElementById('csvTimeRange') as HTMLSpanElement
        };
    }
    
    updateTimeDisplay(time: number): void {
        const totalSeconds = Math.floor(time);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const paddedMinutes = minutes.toString().padStart(2, '0');
        const paddedSeconds = seconds.toString().padStart(2, '0');
        
        if (hours > 0) {
            this.elements.simulationTime.textContent = `${hours}時間${paddedMinutes}分${paddedSeconds}秒`;
        } else {
            this.elements.simulationTime.textContent = `${paddedMinutes}分${paddedSeconds}秒`;
        }
    }
    
    
    updateTrailLengthDisplay(): void {
        this.elements.trailLengthValue.textContent = this.elements.trailLength.value;
    }
    
    updateZAmplitudeDisplay(): void {
        this.elements.zAmplitudeValue.textContent = parseFloat(this.elements.zAmplitude.value).toFixed(1);
    }
    
    updatePeriodicParamsDisplay(): void {
        this.elements.paramBValue.textContent = parseFloat(this.elements.paramB.value).toFixed(1);
        this.elements.paramDValue.textContent = parseFloat(this.elements.paramD.value).toFixed(1);
        this.elements.paramEValue.textContent = parseFloat(this.elements.paramE.value).toFixed(1);
        this.elements.paramFValue.textContent = parseFloat(this.elements.paramF.value).toFixed(1);
        
        // 離心率を計算して表示
        this.updateEccentricity();
    }
    
    updateEccentricity(): void {
        const A = parseFloat(this.elements.orbitRadius.value);
        const B = parseFloat(this.elements.paramB.value) * A;
        const D = parseFloat(this.elements.paramD.value) * A;
        const E = parseFloat(this.elements.paramE.value) * A;
        const F = parseFloat(this.elements.paramF.value) * A;
        
        // OrbitInitializer.tsでの実装に基づく正しいHill方程式の周期解:
        // x(t) = A*cos(nt) + B*sin(nt)
        // y(t) = -2*A*sin(nt) + 2*B*cos(nt) + D
        // z(t) = E*cos(nt) + F*sin(nt)
        
        // 3次元軌道の最大・最小半径を数値的に計算
        let maxR = 0;
        let minR = Infinity;
        
        const nPoints = 360;
        for (let i = 0; i <= nPoints; i++) {
            const phase = (2 * Math.PI * i) / nPoints;
            const cos_t = Math.cos(phase);
            const sin_t = Math.sin(phase);
            
            // ドリフト項を除いた位置（Dは除外）
            const x = A * cos_t + B * sin_t;
            const y = -2 * A * sin_t + 2 * B * cos_t;
            const z = E * cos_t + F * sin_t;
            
            // 3次元空間での距離
            const r = Math.sqrt(x * x + y * y + z * z);
            
            if (r > maxR) maxR = r;
            if (r < minR) minR = r;
        }
        
        // 離心率を計算
        let eccentricity = 0;
        
        // 完全な円軌道の場合、maxR = minR
        if (maxR > 1e-10) {
            // 楕円の離心率: e = sqrt(1 - (b/a)^2)
            // ここで a = maxR (長半径), b = minR (短半径)
            eccentricity = Math.sqrt(1 - (minR * minR) / (maxR * maxR));
        }
        
        // 数値誤差の処理
        if (Math.abs(maxR - minR) < 1e-10 * maxR) {
            eccentricity = 0; // 実質的に円
        }
        
        // NaNチェック
        if (isNaN(eccentricity) || !isFinite(eccentricity)) {
            eccentricity = 0;
        }
        
        // 0から1の範囲にクリップ
        eccentricity = Math.max(0, Math.min(1, eccentricity));
        
        this.elements.eccentricityValue.textContent = eccentricity.toFixed(3);
    }
    
    // satelliteSizeDisplay method removed - now using direct number input
    

    
    setupPlacementPatternLimits(): void {
        const pattern = this.elements.placementPattern.value;
        let maxSatellites = 5;
        let defaultValue = 1;
        
        switch (pattern) {
            case 'random_position':
            case 'random_position_velocity':
            case 'random_periodic':
                maxSatellites = 100;
                defaultValue = 20;
                break;
            case 'axis':
                maxSatellites = 5;
                defaultValue = 3;
                break;
            case 'grid':
                maxSatellites = 3;
                defaultValue = 1;
                break;
            case 'periodic_orbit':
                maxSatellites = 50;
                defaultValue = 8;
                break;
            case 'circular_orbit':
                maxSatellites = 50;
                defaultValue = 8;
                break;
            case 'vbar_approach':
                maxSatellites = 10;
                defaultValue = 3;
                break;
            case 'rbar_approach':
                maxSatellites = 10;
                defaultValue = 3;
                break;
            case 'hexagonal_disk':
                maxSatellites = 127; // 1 + 3*1*2 + 3*2*2 + ... + 3*6*2 = 127 (up to 6 layers)
                defaultValue = 100; // Set to 100 as requested
                break;
            default:
                maxSatellites = 5;
                defaultValue = 1;
                break;
        }
        
        this.elements.satelliteCount.max = maxSatellites.toString();
        this.elements.satelliteCount.min = '1';
        this.elements.satelliteCount.value = defaultValue.toString();
        
        // 円盤軌道の場合は衛星サイズを0.2に、それ以外は0.8に設定
        if (pattern === 'hexagonal_disk') {
            this.elements.satelliteSize.value = '0.2';
        } else {
            this.elements.satelliteSize.value = '0.8';
        }
        
        if (pattern === 'periodic_orbit') {
            this.elements.zAmplitudeControl.style.display = 'none';
            this.elements.periodicParamsControl.style.display = 'block';
            this.elements.circularZDirectionControl.style.display = 'none';
        } else if (pattern === 'circular_orbit') {
            this.elements.zAmplitudeControl.style.display = 'none';
            this.elements.periodicParamsControl.style.display = 'none';
            this.elements.circularZDirectionControl.style.display = 'block';
        } else {
            this.elements.zAmplitudeControl.style.display = 'none';
            this.elements.periodicParamsControl.style.display = 'none';
            this.elements.circularZDirectionControl.style.display = 'none';
        }
    }
}