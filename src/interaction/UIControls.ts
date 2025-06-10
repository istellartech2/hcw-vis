export interface UIControlElements {
    satelliteCount: HTMLInputElement;
    placementPattern: HTMLSelectElement;
    orbitRadius: HTMLInputElement;
    orbitAltitude: HTMLInputElement;
    timeScale: HTMLSelectElement;
    simulationTime: HTMLSpanElement;
    showTrails: HTMLInputElement;
    showGrid: HTMLInputElement;
    showEarth: HTMLInputElement;
    earthTexture: HTMLSelectElement;
    trailLength: HTMLInputElement;
    trailLengthValue: HTMLSpanElement;
    zAmplitude: HTMLInputElement;
    zAmplitudeValue: HTMLSpanElement;
    zAmplitudeControl: HTMLDivElement;
    circularZDirection: HTMLInputElement;
    circularZDirectionControl: HTMLDivElement;
    thrustAmount: HTMLInputElement;
    perturbationAmount: HTMLInputElement;
    uniformSatelliteColor: HTMLInputElement;
    satelliteColor: HTMLInputElement;
    satelliteSize: HTMLInputElement;
    satelliteShape: HTMLSelectElement;
    inclination: HTMLInputElement;
    raan: HTMLInputElement;
    eccentricity: HTMLInputElement;
    argOfPerigee: HTMLInputElement;
    meanAnomaly: HTMLInputElement;
    orbitInfo: HTMLDivElement;
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
            showEarth: document.getElementById('showEarth') as HTMLInputElement,
            earthTexture: document.getElementById('earthTexture') as HTMLSelectElement,
                    trailLength: document.getElementById('trailLength') as HTMLInputElement,
            trailLengthValue: document.getElementById('trailLengthValue') as HTMLSpanElement,
            zAmplitude: document.getElementById('zAmplitude') as HTMLInputElement,
            zAmplitudeValue: document.getElementById('zAmplitudeValue') as HTMLSpanElement,
            zAmplitudeControl: document.getElementById('zAmplitudeControl') as HTMLDivElement,
            circularZDirection: document.getElementById('circularZDirection') as HTMLInputElement,
            circularZDirectionControl: document.getElementById('circularZDirectionControl') as HTMLDivElement,
            thrustAmount: document.getElementById('thrustAmount') as HTMLInputElement,
            perturbationAmount: document.getElementById('perturbationAmount') as HTMLInputElement,
            uniformSatelliteColor: document.getElementById('uniformSatelliteColor') as HTMLInputElement,
            satelliteColor: document.getElementById('satelliteColor') as HTMLInputElement,
            satelliteSize: document.getElementById('satelliteSize') as HTMLInputElement,
            satelliteShape: document.getElementById('satelliteShape') as HTMLSelectElement,
            inclination: document.getElementById('inclination') as HTMLInputElement,
            raan: document.getElementById('raan') as HTMLInputElement,
            eccentricity: document.getElementById('eccentricity') as HTMLInputElement,
            argOfPerigee: document.getElementById('argOfPerigee') as HTMLInputElement,
            meanAnomaly: document.getElementById('meanAnomaly') as HTMLInputElement,
            orbitInfo: document.getElementById('orbitInfo') as HTMLDivElement
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
    
    // satelliteSizeDisplay method removed - now using direct number input
    
    updateOrbitInfo(orbitElements: {
        inclination: number;
        raan: number;
        eccentricity: number;
        argOfPerigee: number;
        meanAnomaly: number;
        altitude: number;
        period: number;
        semiMajorAxis: number;
    }, eciPosition?: { x: number; y: number; z: number } | null, geodetic?: { latitude: number; longitude: number; altitude: number } | null): void {
        let eciInfo = '';
        if (eciPosition) {
            // eciPosition はメーター単位なので、kmで表示するために1000で割る
            eciInfo = `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                    <div><strong>ECI座標系 (km):</strong></div>
                    <div>X: ${(eciPosition.x / 1000).toFixed(2)}</div>
                    <div>Y: ${(eciPosition.y / 1000).toFixed(2)}</div>
                    <div>Z: ${(eciPosition.z / 1000).toFixed(2)}</div>
                </div>
            `;
        }
        
        let geodeticInfo = '';
        
        this.elements.orbitInfo.innerHTML = `
            <div style="font-size: 12px; color: #666; margin-top: 10px;">
                <div><strong>軌道情報:</strong></div>
                <div>長半径: ${(orbitElements.semiMajorAxis / 1000).toFixed(1)} km</div>
                <div>周期: ${orbitElements.period.toFixed(1)} 分</div>
                <div>離心率: ${orbitElements.eccentricity.toFixed(3)}</div>
                <div>傾斜角: ${orbitElements.inclination.toFixed(1)}°</div>
                ${eciInfo}
                ${geodeticInfo}
            </div>
        `;
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
        
        if (pattern === 'xy_ellipse') {
            this.elements.zAmplitudeControl.style.display = 'block';
            this.elements.circularZDirectionControl.style.display = 'none';
        } else if (pattern === 'circular_orbit') {
            this.elements.zAmplitudeControl.style.display = 'none';
            this.elements.circularZDirectionControl.style.display = 'block';
        } else {
            this.elements.zAmplitudeControl.style.display = 'none';
            this.elements.circularZDirectionControl.style.display = 'none';
        }
    }
}