export interface UIControlElements {
    satelliteCount: HTMLInputElement;
    placementPattern: HTMLSelectElement;
    orbitRadius: HTMLInputElement;
    orbitAltitude: HTMLInputElement;
    orbitRadiusDisplay: HTMLSpanElement;
    timeScale: HTMLSelectElement;
    simulationTime: HTMLSpanElement;
    autoRotate: HTMLInputElement;
    showTrails: HTMLInputElement;
    showGrid: HTMLInputElement;
    trailLength: HTMLInputElement;
    trailLengthValue: HTMLSpanElement;
}

export class UIControls {
    public elements: UIControlElements;
    
    constructor() {
        this.elements = {
            satelliteCount: document.getElementById('satelliteCount') as HTMLInputElement,
            placementPattern: document.getElementById('placementPattern') as HTMLSelectElement,
            orbitRadius: document.getElementById('orbitRadius') as HTMLInputElement,
            orbitAltitude: document.getElementById('orbitAltitude') as HTMLInputElement,
            orbitRadiusDisplay: document.getElementById('orbitRadiusDisplay') as HTMLSpanElement,
            timeScale: document.getElementById('timeScale') as HTMLSelectElement,
            simulationTime: document.getElementById('simulationTime') as HTMLSpanElement,
            autoRotate: document.getElementById('autoRotate') as HTMLInputElement,
            showTrails: document.getElementById('showTrails') as HTMLInputElement,
            showGrid: document.getElementById('showGrid') as HTMLInputElement,
            trailLength: document.getElementById('trailLength') as HTMLInputElement,
            trailLengthValue: document.getElementById('trailLengthValue') as HTMLSpanElement
        };
    }
    
    updateTimeDisplay(time: number): void {
        const totalSeconds = Math.floor(time);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            this.elements.simulationTime.textContent = `${hours}時間${minutes}分${seconds}秒`;
        } else if (minutes > 0) {
            this.elements.simulationTime.textContent = `${minutes}分${seconds}秒`;
        } else {
            this.elements.simulationTime.textContent = `${seconds}秒`;
        }
    }
    
    updateOrbitDisplay(radiusKm: number, periodMinutes: number): void {
        this.elements.orbitRadiusDisplay.textContent = 
            `軌道半径: ${radiusKm.toFixed(0)} km (周期: ${periodMinutes.toFixed(1)}分)`;
    }
    
    updateTrailLengthDisplay(): void {
        this.elements.trailLengthValue.textContent = this.elements.trailLength.value;
    }
    
    setupPlacementPatternLimits(): void {
        const pattern = this.elements.placementPattern.value;
        if (pattern === 'random_position' || 
            pattern === 'random_position_velocity' || 
            pattern === 'random_periodic') {
            this.elements.satelliteCount.max = '100';
            this.elements.satelliteCount.min = '1';
        } else {
            this.elements.satelliteCount.max = '5';
            this.elements.satelliteCount.min = '1';
        }
    }
}