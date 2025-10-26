export interface UIControlElements {
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
    j2StableArrangement: HTMLInputElement;
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
}

export class UIControls {
    public elements: UIControlElements;
    private referenceOrbitPending = false;
    
    constructor() {
        this.elements = {
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
            j2StableArrangement: document.getElementById('j2StableArrangement') as HTMLInputElement,
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
            csvPlaybackPanel: document.getElementById('csv-playback-panel') as HTMLDivElement
        };
        this.setReferenceOrbitPending(false);
    }
    
    updateTimeDisplay(time: number): void {
        const totalSeconds = Math.floor(time);
        const days = Math.floor(totalSeconds / 86400);  // 86400 seconds in a day
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const paddedMinutes = minutes.toString().padStart(2, '0');
        const paddedSeconds = seconds.toString().padStart(2, '0');

        if (days > 0) {
            this.elements.simulationTime.textContent = `${days}日${hours}時間${paddedMinutes}分${paddedSeconds}秒`;
        } else if (hours > 0) {
            this.elements.simulationTime.textContent = `${hours}時間${paddedMinutes}分${paddedSeconds}秒`;
        } else {
            this.elements.simulationTime.textContent = `${paddedMinutes}分${paddedSeconds}秒`;
        }
    }
    
    
    updateTrailLengthDisplay(): void {
        this.elements.trailLengthValue.textContent = this.elements.trailLength.value;
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
    
    updateSatelliteSizeLabel(): void {
        const shape = this.elements.satelliteShape.value;
        let labelText = 'サイズ';

        if (shape === 'sphere') {
            labelText = '直径';
        } else if (shape === 'cube') {
            labelText = '一辺';
        }

        // Update label with unit in smaller font
        this.elements.satelliteSizeLabel.innerHTML = `${labelText} <span class="text-[10px] opacity-70 font-normal normal-case">(m)</span>:`;
    }

    // Mode switching methods
    switchToCSVMode(): void {
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
