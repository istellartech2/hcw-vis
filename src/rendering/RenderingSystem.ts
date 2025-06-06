import * as THREE from 'three';
import { Satellite } from '../models/Satellite.js';
import { TrailRenderer } from '../visualization/TrailRenderer.js';
import { PlotRenderer } from '../visualization/PlotRenderer.js';
import { CelestialBodies } from '../visualization/CelestialBodies.js';
import { UIControls } from '../ui/UIControls.js';

export class RenderingSystem {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private container: HTMLElement;
    private satelliteMeshes: THREE.Mesh[] = [];
    private gridHelper: THREE.GridHelper;
    private trailRenderer: TrailRenderer;
    private plotRenderer: PlotRenderer;
    private celestialBodies: CelestialBodies;
    private uiControls: UIControls;
    private animationFrameCounter: number = 0;
    
    // Selection system
    private selectedSatelliteIndex: number = -1;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;

    constructor(
        scene: THREE.Scene,
        camera: THREE.PerspectiveCamera,
        renderer: THREE.WebGLRenderer,
        container: HTMLElement,
        uiControls: UIControls
    ) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.container = container;
        this.uiControls = uiControls;
        
        this.trailRenderer = new TrailRenderer(this.scene);
        this.plotRenderer = new PlotRenderer();
        this.celestialBodies = new CelestialBodies(this.scene);
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.setupRenderer();
        this.setupLighting();
        this.createAxes();
        this.gridHelper = this.createGrid();
        this.setupSatelliteSelection();
    }

    private setupRenderer(): void {
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.camera.position.set(100, 250, 100);
        this.camera.lookAt(0, 0, 0);
    }

    private setupLighting(): void {
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 100, 50);
        this.scene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0x4a9eff, 0.5);
        pointLight.position.set(0, 0, 0);
        this.scene.add(pointLight);
    }

    private createAxes(): void {
        const axesGroup = new THREE.Group();
        
        // X-axis (Along-track)
        const xGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(300, 0, 0)
        ]);
        const xMaterial = new THREE.LineBasicMaterial({ color: 0x4ecdc4 });
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        axesGroup.add(xAxis);
        
        // Y-axis (Radial)
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 300, 0)
        ]);
        const yMaterial = new THREE.LineBasicMaterial({ color: 0xff6b6b });
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        axesGroup.add(yAxis);
        
        // Z-axis (Cross-track)
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 300)
        ]);
        const zMaterial = new THREE.LineBasicMaterial({ color: 0xf7b731 });
        const zAxis = new THREE.Line(zGeometry, zMaterial);
        axesGroup.add(zAxis);
        
        this.scene.add(axesGroup);
    }

    private createGrid(): THREE.GridHelper {
        const gridHelper = new THREE.GridHelper(1000, 20, 0x444444, 0x222222);
        gridHelper.position.y = -200;
        this.scene.add(gridHelper);
        return gridHelper;
    }

    private setupSatelliteSelection(): void {
        this.container.addEventListener('click', (e) => {
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            this.checkSatelliteSelection();
        });
    }

    public createSatelliteMeshes(satellites: Satellite[]): void {
        // Clean up existing meshes
        this.satelliteMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material && Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => mat.dispose());
            } else if (mesh.material) {
                (mesh.material as THREE.Material).dispose();
            }
        });
        
        this.satelliteMeshes = [];
        
        // Create center satellite
        const centerGeometry = new THREE.SphereGeometry(8, 32, 32);
        const centerMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.3
        });
        const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
        this.scene.add(centerMesh);
        this.satelliteMeshes.push(centerMesh);
        
        // Create other satellites
        const useUniformColor = this.uiControls.elements.uniformSatelliteColor.checked;
        const uniformColor = this.uiControls.elements.satelliteColor.value;
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7b731, 0x5f27cd, 0x00d2d3, 0xff9ff3, 0x54a0ff];
        
        for (let i = 1; i < satellites.length; i++) {
            const satGeometry = new THREE.SphereGeometry(6, 32, 32);
            
            let materialColor: number;
            if (useUniformColor) {
                materialColor = parseInt(uniformColor.replace('#', ''), 16);
            } else {
                materialColor = colors[(i - 1) % colors.length];
            }
            
            const satMaterial = new THREE.MeshPhongMaterial({ 
                color: materialColor,
                emissive: materialColor,
                emissiveIntensity: 0.2
            });
            const satMesh = new THREE.Mesh(satGeometry, satMaterial);
            this.scene.add(satMesh);
            this.satelliteMeshes.push(satMesh);
        }
    }

    public updateSatellitePositions(satellites: Satellite[]): void {
        satellites.forEach((sat, index) => {
            const pos = sat.getPosition();
            const scale = 1000;
            // Convert Hill coordinates to Three.js coordinates
            // pos.x = R (Radial), pos.y = S (Along-track), pos.z = W (Cross-track)
            // Three.js: X = S (Along-track), Y = R (Radial), Z = W (Cross-track)
            // this.satelliteMeshes[index].position.set(pos.y * scale, pos.x * scale, pos.z * scale);
            this.satelliteMeshes[index].position.set(pos.z * scale, pos.x * scale, pos.y * scale);
            
            // Highlight selected satellite
            if (index === this.selectedSatelliteIndex) {
                (this.satelliteMeshes[index].material as THREE.MeshPhongMaterial).emissiveIntensity = 0.8;
            } else {
                (this.satelliteMeshes[index].material as THREE.MeshPhongMaterial).emissiveIntensity = 0.2;
            }
            
            // Update trails
            if (this.uiControls.elements.showTrails.checked && index > 0) {
                const trailMax = parseInt(this.uiControls.elements.trailLength.value);
                const color = (this.satelliteMeshes[index].material as THREE.MeshPhongMaterial).color;
                this.trailRenderer.updateTrail(sat, pos, scale, color, trailMax);
            }
        });
    }

    public updateAllSatelliteColors(): void {
        const isUniform = this.uiControls.elements.uniformSatelliteColor.checked;
        const uniformColor = this.uiControls.elements.satelliteColor.value;
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7b731, 0x5f27cd, 0x00d2d3, 0xff9ff3, 0x54a0ff];
        
        for (let i = 1; i < this.satelliteMeshes.length; i++) {
            const mesh = this.satelliteMeshes[i];
            
            if (isUniform) {
                const uniformColorInt = parseInt(uniformColor.replace('#', ''), 16);
                (mesh.material as THREE.MeshPhongMaterial).color.setHex(uniformColorInt);
                (mesh.material as THREE.MeshPhongMaterial).emissive.setHex(uniformColorInt);
            } else {
                const colorIndex = (i - 1) % colors.length;
                (mesh.material as THREE.MeshPhongMaterial).color.setHex(colors[colorIndex]);
                (mesh.material as THREE.MeshPhongMaterial).emissive.setHex(colors[colorIndex]);
            }
        }
    }

    public clearTrails(satellites: Satellite[]): void {
        satellites.forEach(sat => {
            this.trailRenderer.clearTrail(sat);
        });
    }

    private checkSatelliteSelection(): void {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.satelliteMeshes);
        
        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            const index = this.satelliteMeshes.indexOf(clickedMesh as THREE.Mesh);
            
            if (index >= 0) {
                this.selectedSatelliteIndex = index;
                this.updateSelectedSatelliteInfo();
            }
        } else {
            this.selectedSatelliteIndex = -1;
            this.updateSelectedSatelliteInfo();
        }
    }

    private updateSelectedSatelliteInfo(): void {
        // Emit event for main application to handle
        const event = new CustomEvent('satelliteSelected', { 
            detail: { index: this.selectedSatelliteIndex } 
        });
        this.container.dispatchEvent(event);
    }

    public render(): void {
        this.gridHelper.visible = this.uiControls.elements.showGrid.checked;
        this.renderer.render(this.scene, this.camera);
    }

    public updatePlots(satellites: Satellite[]): void {
        this.animationFrameCounter++;
        if (this.animationFrameCounter % 10 === 0) {
            this.plotRenderer.update(satellites);
        }
    }

    public updateCelestialBodies(time: number, simulationStartTime?: Date): void {
        this.celestialBodies.update(time, simulationStartTime);
    }

    public getCelestialBodies(): CelestialBodies {
        return this.celestialBodies;
    }

    public getSelectedSatelliteIndex(): number {
        return this.selectedSatelliteIndex;
    }

    public setSelectedSatelliteIndex(index: number): void {
        this.selectedSatelliteIndex = index;
    }

    public handleResize(): void {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
}