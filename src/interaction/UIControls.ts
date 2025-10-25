export interface UIControlElements {
    satelliteCount: HTMLInputElement;
    placementPattern: HTMLSelectElement;
    diskPlacementMode: HTMLSelectElement;
    diskPlacementControls: HTMLDivElement;
    orbitRadius: HTMLInputElement;
    orbitRadiusControl: HTMLDivElement;
    satelliteSpacing: HTMLInputElement;
    satelliteSpacingControl: HTMLDivElement;
    orbitAltitude: HTMLInputElement;
    timeScale: HTMLSelectElement;
    simulationTime: HTMLSpanElement;
    showTrails: HTMLInputElement;
    showGrid: HTMLInputElement;
    showAxes: HTMLInputElement;
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
    satelliteSizeLabel: HTMLLabelElement;
    satelliteSizeUnit: HTMLSpanElement;
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
    j2Perturbation: HTMLInputElement;
    orbitUpdateButton: HTMLButtonElement;
    // CSV Playback controls
    csvPlaybackInput: HTMLInputElement;
    csvFileStatus: HTMLDivElement;
    csvStatusText: HTMLSpanElement;
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
    // Main CSV controls (top-left panel)
    csvPlaybackSpeedMain: HTMLSelectElement;
    csvPlayPauseMain: HTMLButtonElement;
    csvStopMain: HTMLButtonElement;
    csvTimeSliderMain: HTMLInputElement;
    csvCurrentTimeMain: HTMLSpanElement;
    csvTotalTimeMain: HTMLSpanElement;
    csvLoopEnabledMain: HTMLInputElement;
    csvPlaybackPanel: HTMLDivElement;
    satelliteConfigPanel: HTMLDivElement;
}

export class UIControls {
    public elements: UIControlElements;
    private referenceOrbitPending = false;
    
    constructor() {
        this.elements = {
            satelliteCount: document.getElementById('satelliteCount') as HTMLInputElement,
            placementPattern: document.getElementById('placementPattern') as HTMLSelectElement,
            diskPlacementMode: document.getElementById('diskPlacementMode') as HTMLSelectElement,
            diskPlacementControls: document.getElementById('diskPlacementControls') as HTMLDivElement,
            orbitRadius: document.getElementById('orbitRadius') as HTMLInputElement,
            orbitRadiusControl: document.getElementById('orbitRadiusControl') as HTMLDivElement,
            satelliteSpacing: document.getElementById('satelliteSpacing') as HTMLInputElement,
            satelliteSpacingControl: document.getElementById('satelliteSpacingControl') as HTMLDivElement,
            orbitAltitude: document.getElementById('orbitAltitude') as HTMLInputElement,
            timeScale: document.getElementById('timeScale') as HTMLSelectElement,
            simulationTime: document.getElementById('simulationTime') as HTMLSpanElement,
            showTrails: document.getElementById('showTrails') as HTMLInputElement,
            showGrid: document.getElementById('showGrid') as HTMLInputElement,
            showAxes: document.getElementById('showAxes') as HTMLInputElement,
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
            satelliteSizeLabel: document.getElementById('satelliteSizeLabel') as HTMLLabelElement,
            satelliteSizeUnit: document.getElementById('satelliteSizeUnit') as HTMLSpanElement,
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
            j2Perturbation: document.getElementById('j2Perturbation') as HTMLInputElement,
            orbitUpdateButton: document.getElementById('orbitUpdateButton') as HTMLButtonElement,
            // CSV Playback controls
            csvPlaybackInput: document.getElementById('csvPlaybackInput') as HTMLInputElement,
            csvFileStatus: document.getElementById('csvFileStatus') as HTMLDivElement,
            csvStatusText: document.getElementById('csvStatusText') as HTMLSpanElement,
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
            csvTimeRange: document.getElementById('csvTimeRange') as HTMLSpanElement,
            // Main CSV controls (top-left panel)
            csvPlaybackSpeedMain: document.getElementById('csvPlaybackSpeedMain') as HTMLSelectElement,
            csvPlayPauseMain: document.getElementById('csvPlayPauseMain') as HTMLButtonElement,
            csvStopMain: document.getElementById('csvStopMain') as HTMLButtonElement,
            csvTimeSliderMain: document.getElementById('csvTimeSliderMain') as HTMLInputElement,
            csvCurrentTimeMain: document.getElementById('csvCurrentTimeMain') as HTMLSpanElement,
            csvTotalTimeMain: document.getElementById('csvTotalTimeMain') as HTMLSpanElement,
            csvLoopEnabledMain: document.getElementById('csvLoopEnabledMain') as HTMLInputElement,
            csvPlaybackPanel: document.getElementById('csv-playback-panel') as HTMLDivElement,
            satelliteConfigPanel: document.getElementById('satellite-config-panel') as HTMLDivElement
        };
        this.setReferenceOrbitPending(false);
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

    markReferenceOrbitDirty(): void {
        if (!this.referenceOrbitPending) {
            this.setReferenceOrbitPending(true);
        }
    }

    setReferenceOrbitPending(pending: boolean): void {
        this.referenceOrbitPending = pending;
        const button = this.elements.orbitUpdateButton;
        if (!button) return;
        button.disabled = !pending;
        button.classList.toggle('pending', pending);
        button.textContent = pending ? '更新 (未反映)' : '更新';
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
            case 'concentric_disk':
                maxSatellites = 180; // 同心リング配置の想定上限
                defaultValue = 100;
                break;
            default:
                maxSatellites = 5;
                defaultValue = 1;
                break;
        }
        
        this.elements.satelliteCount.max = maxSatellites.toString();
        this.elements.satelliteCount.min = '1';
        this.elements.satelliteCount.value = defaultValue.toString();
        
        // 円盤軌道の場合は衛星サイズを0.3m に、それ以外は1.0mに設定
        if (pattern === 'hexagonal_disk' || pattern === 'concentric_disk') {
            this.elements.satelliteSize.value = '0.3';
            this.elements.diskPlacementControls.style.display = 'block';
        } else {
            this.elements.satelliteSize.value = '1.0';
            this.elements.diskPlacementControls.style.display = 'none';
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

    updateDiskPlacementMode(): void {
        const mode = this.elements.diskPlacementMode.value;

        if (mode === 'spacing') {
            this.elements.orbitRadiusControl.style.display = 'none';
            this.elements.satelliteSpacingControl.style.display = 'flex';
        } else {
            this.elements.orbitRadiusControl.style.display = 'flex';
            this.elements.satelliteSpacingControl.style.display = 'none';
        }
    }

    updateSatelliteSizeLabel(): void {
        const shape = this.elements.satelliteShape.value;

        if (shape === 'sphere') {
            this.elements.satelliteSizeLabel.textContent = '直径:';
        } else if (shape === 'cube') {
            this.elements.satelliteSizeLabel.textContent = '一辺:';
        } else {
            this.elements.satelliteSizeLabel.textContent = 'サイズ:';
        }
    }

    // Mode switching methods
    switchToCSVMode(): void {
        // Hide satellite configuration panel
        if (this.elements.satelliteConfigPanel) {
            this.elements.satelliteConfigPanel.style.display = 'none';
        }
        
        // Show CSV playback panel
        if (this.elements.csvPlaybackPanel) {
            this.elements.csvPlaybackPanel.style.display = 'block';
        }
        
        // Switch speed controls
        if (this.elements.timeScale) {
            this.elements.timeScale.style.display = 'none';
        }
        if (this.elements.csvPlaybackSpeedMain) {
            this.elements.csvPlaybackSpeedMain.style.display = 'block';
        }
    }

    switchToSimulationMode(): void {
        // Show satellite configuration panel
        if (this.elements.satelliteConfigPanel) {
            this.elements.satelliteConfigPanel.style.display = 'block';
        }
        
        // Hide CSV playback panel
        if (this.elements.csvPlaybackPanel) {
            this.elements.csvPlaybackPanel.style.display = 'none';
        }
        
        // Switch speed controls
        if (this.elements.timeScale) {
            this.elements.timeScale.style.display = 'block';
        }
        if (this.elements.csvPlaybackSpeedMain) {
            this.elements.csvPlaybackSpeedMain.style.display = 'none';
        }
    }
}
