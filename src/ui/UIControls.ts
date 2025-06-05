export interface UIControlElements {
    satelliteCount: HTMLInputElement;
    placementPattern: HTMLSelectElement;
    orbitRadius: HTMLInputElement;
    orbitAltitude: HTMLInputElement;
    timeScale: HTMLSelectElement;
    simulationTime: HTMLSpanElement;
    autoRotate: HTMLInputElement;
    showTrails: HTMLInputElement;
    showGrid: HTMLInputElement;
    showEarth: HTMLInputElement;
    showOrbitalPlane: HTMLInputElement;
    showLVLHAxes: HTMLInputElement;
    trailLength: HTMLInputElement;
    trailLengthValue: HTMLSpanElement;
    zAmplitude: HTMLInputElement;
    zAmplitudeValue: HTMLSpanElement;
    zAmplitudeControl: HTMLDivElement;
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
            autoRotate: document.getElementById('autoRotate') as HTMLInputElement,
            showTrails: document.getElementById('showTrails') as HTMLInputElement,
            showGrid: document.getElementById('showGrid') as HTMLInputElement,
            showEarth: document.getElementById('showEarth') as HTMLInputElement,
            showOrbitalPlane: document.getElementById('showOrbitalPlane') as HTMLInputElement,
            showLVLHAxes: document.getElementById('showLVLHAxes') as HTMLInputElement,
            trailLength: document.getElementById('trailLength') as HTMLInputElement,
            trailLengthValue: document.getElementById('trailLengthValue') as HTMLSpanElement,
            zAmplitude: document.getElementById('zAmplitude') as HTMLInputElement,
            zAmplitudeValue: document.getElementById('zAmplitudeValue') as HTMLSpanElement,
            zAmplitudeControl: document.getElementById('zAmplitudeControl') as HTMLDivElement
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
    
    updateOrbitDisplay(radiusKm: number, periodMinutes: number): void {
        // orbitRadiusDisplay element has been removed from HTML
    }
    
    updateTrailLengthDisplay(): void {
        this.elements.trailLengthValue.textContent = this.elements.trailLength.value;
    }
    
    updateZAmplitudeDisplay(): void {
        this.elements.zAmplitudeValue.textContent = parseFloat(this.elements.zAmplitude.value).toFixed(1);
    }
    
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
            case 'xy_ellipse':
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
            default:
                maxSatellites = 5;
                defaultValue = 1;
                break;
        }
        
        this.elements.satelliteCount.max = maxSatellites.toString();
        this.elements.satelliteCount.min = '1';
        this.elements.satelliteCount.value = defaultValue.toString();
        
        if (pattern === 'xy_ellipse') {
            this.elements.zAmplitudeControl.style.display = 'block';
        } else {
            this.elements.zAmplitudeControl.style.display = 'none';
        }
    }
}