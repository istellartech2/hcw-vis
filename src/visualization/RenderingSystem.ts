import * as THREE from 'three';
import { Satellite } from '../simulation/Satellite.js';
import { TrailRenderer } from './TrailRenderer.js';
import { CelestialBodies } from './CelestialBodies.js';
import { UIControls } from '../interaction/UIControls.js';
import { ModelLoader } from './ModelLoader.js';

export class RenderingSystem {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private container: HTMLElement;
    private satelliteMeshes: (THREE.Mesh | THREE.Group)[] = [];
    private gridHelper: THREE.GridHelper;
    private axesGroup: THREE.Group;
    private trailRenderer: TrailRenderer;
    private celestialBodies: CelestialBodies;
    private uiControls: UIControls;
    private animationFrameCounter: number = 0;
    private modelLoader: ModelLoader;
    private loadedModel: THREE.Group | THREE.Mesh | null = null;
    
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
        this.celestialBodies = new CelestialBodies(this.scene);
        this.modelLoader = new ModelLoader();
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.setupRenderer();
        this.setupLighting();
        this.axesGroup = this.createAxes();
        this.gridHelper = this.createGrid();
        this.setupSatelliteSelection();
    }

    private setupRenderer(): void {
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // Note: Initial camera position is managed by CameraController
        // This is just a fallback position
        this.camera.lookAt(0, 0, 0);
    }

    private setupLighting(): void {
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 100, 50);
        this.scene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0xff7f50, 0.5);
        pointLight.position.set(0, 0, 0);
        this.scene.add(pointLight);
    }

    private createAxes(): THREE.Group {
        const axesGroup = new THREE.Group();
        
        // X-axis (Along-track)
        const xGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(15, 0, 0)  // 15m axis for 10m range
        ]);
        const xMaterial = new THREE.LineBasicMaterial({ color: 0x00BFFF });
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        axesGroup.add(xAxis);
        
        // Y-axis (Radial)
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 15, 0)  // 15m axis for 10m range
        ]);
        const yMaterial = new THREE.LineBasicMaterial({ color: 0xFF6B6B });
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        axesGroup.add(yAxis);
        
        // Z-axis (Cross-track)
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 15)  // 15m axis for 10m range
        ]);
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x2ECC71 });
        const zAxis = new THREE.Line(zGeometry, zMaterial);
        axesGroup.add(zAxis);
        
        this.scene.add(axesGroup);
        axesGroup.visible = this.uiControls.elements.showAxes.checked;
        return axesGroup;
    }

    private createGrid(): THREE.GridHelper {
        // Grid adapted for 10m range with 1x scaling
        // Size: 30 units = 30m total, Divisions: 30 = 1m per division
        // Subtle colors for background reference
        const gridHelper = new THREE.GridHelper(30, 30, 0x777777);
        gridHelper.position.y = -10;  // Just below origin level
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
        this.satelliteMeshes.forEach(meshOrGroup => {
            this.scene.remove(meshOrGroup);
            
            // If it's a group (3D model), traverse and dispose all children
            if (meshOrGroup instanceof THREE.Group) {
                meshOrGroup.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        if (mesh.geometry) mesh.geometry.dispose();
                        if (mesh.material) {
                            if (Array.isArray(mesh.material)) {
                                mesh.material.forEach(mat => mat.dispose());
                            } else {
                                mesh.material.dispose();
                            }
                        }
                    }
                });
            } else if ((meshOrGroup as THREE.Mesh).isMesh) {
                // Standard mesh cleanup
                const mesh = meshOrGroup as THREE.Mesh;
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(mat => mat.dispose());
                    } else {
                        mesh.material.dispose();
                    }
                }
            }
        });
        
        this.satelliteMeshes = [];
        
        // Get satellite size and shape from UI controls
        const satelliteSize = parseFloat(this.uiControls.elements.satelliteSize.value);
        const satelliteShape = this.uiControls.elements.satelliteShape.value;
        
        // Create center satellite
        let centerMesh: THREE.Mesh | THREE.Group;
        
        if (satelliteShape === '3dfile' && this.loadedModel) {
            // Clone the loaded model for the center satellite
            centerMesh = this.loadedModel.clone();
            
            // Apply white material to make it distinguishable
            centerMesh.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.material = new THREE.MeshPhongMaterial({
                        color: 0xffffff,
                        emissive: 0xffffff,
                        emissiveIntensity: 0.3
                    });
                }
            });
            
            // Scale the model based on satellite size
            centerMesh.scale.setScalar(satelliteSize);
        } else {
            // Create standard geometry
            const centerGeometry = satelliteShape === 'cube' 
                ? new THREE.BoxGeometry(satelliteSize * 2, satelliteSize * 2, satelliteSize * 2)
                : new THREE.SphereGeometry(satelliteSize, 32, 32);
            const centerMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 0.3
            });
            centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
        }
        
        this.scene.add(centerMesh);
        this.satelliteMeshes.push(centerMesh);
        
        // Create other satellites
        const useUniformColor = this.uiControls.elements.uniformSatelliteColor.checked;
        const uniformColor = this.uiControls.elements.satelliteColor.value;
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7b731, 0x5f27cd, 0x00d2d3, 0xff9ff3, 0x54a0ff];
        
        for (let i = 1; i < satellites.length; i++) {
            let satMesh: THREE.Mesh | THREE.Group;
            
            if (satelliteShape === '3dfile' && this.loadedModel) {
                // Clone the loaded model for each satellite
                satMesh = this.loadedModel.clone();
                
                // Determine the color for this satellite
                let materialColor: number;
                if (useUniformColor) {
                    materialColor = parseInt(uniformColor.replace('#', ''), 16);
                } else {
                    materialColor = colors[(i - 1) % colors.length];
                }
                
                // Apply colored material to the model
                satMesh.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        mesh.material = new THREE.MeshPhongMaterial({
                            color: materialColor,
                            emissive: materialColor,
                            emissiveIntensity: 0.2
                        });
                    }
                });
                
                // Scale the model based on satellite size
                satMesh.scale.setScalar(satelliteSize);
            } else {
                // Create standard geometry
                const satGeometry = satelliteShape === 'cube' 
                    ? new THREE.BoxGeometry(satelliteSize * 2, satelliteSize * 2, satelliteSize * 2)
                    : new THREE.SphereGeometry(satelliteSize, 32, 32);
                
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
                satMesh = new THREE.Mesh(satGeometry, satMaterial);
            }
            
            this.scene.add(satMesh);
            this.satelliteMeshes.push(satMesh);
        }
    }

    public updateSatellitePositions(satellites: Satellite[]): void {
        const satelliteShape = this.uiControls.elements.satelliteShape.value;
        const isCube = satelliteShape === 'cube';
        const is3DFile = satelliteShape === '3dfile';
        
        let rotationR = 0;
        let rotationS = 0;
        
        if (isCube) {
            rotationR = parseFloat(this.uiControls.elements.cubeRotationR.value) * Math.PI / 180;
            rotationS = parseFloat(this.uiControls.elements.cubeRotationS.value) * Math.PI / 180;
        } else if (is3DFile) {
            rotationR = parseFloat(this.uiControls.elements.file3dRotationR.value) * Math.PI / 180;
            rotationS = parseFloat(this.uiControls.elements.file3dRotationS.value) * Math.PI / 180;
        }
        
        satellites.forEach((sat, index) => {
            const pos = sat.getPosition();
            const scale = 1; // 1m in Hill coords = 1 units in Three.js
            // Convert Hill coordinates to Three.js coordinates
            // pos.x = R (Radial), pos.y = S (Along-track), pos.z = W (Cross-track)
            // Three.js: X = S (Along-track), Y = R (Radial), Z = W (Cross-track)
            // this.satelliteMeshes[index].position.set(pos.y * scale, pos.x * scale, pos.z * scale);
            this.satelliteMeshes[index].position.set(pos.z * scale, pos.x * scale, pos.y * scale);
            
            // Apply rotation for cubes and 3D files
            if (isCube || is3DFile) {
                // Reset rotation first
                this.satelliteMeshes[index].rotation.set(0, 0, 0);
                
                // Check if satellite has CSV quaternion data
                const satelliteQuaternion = (sat as any).quaternion;
                if (satelliteQuaternion) {
                    // Apply quaternion from CSV data (body2RSW rotation)
                    // CSV quaternion: body frame to RSW frame rotation
                    // RSW: X=R(radial), Y=S(along-track), Z=W(cross-track)
                    // Three.js: X=W(cross-track), Y=R(radial), Z=S(along-track)
                    
                    // Transform quaternion from RSW to Three.js coordinate system
                    // Mapping: RSW(x,y,z) -> Three.js(z,x,y)
                    const transformedQuat = new THREE.Quaternion(
                        satelliteQuaternion.z,  // RSW Z -> Three.js X
                        satelliteQuaternion.x,  // RSW X -> Three.js Y
                        satelliteQuaternion.y,  // RSW Y -> Three.js Z
                        satelliteQuaternion.w   // W component stays the same
                    );
                    
                    this.satelliteMeshes[index].quaternion.copy(transformedQuat);
                } else {
                    // Use UI controls for manual rotation (normal simulation mode)
                    // Apply rotations in Hill coordinate frame
                    // Hill to Three.js mapping: X=W, Y=R, Z=S
                    // R axis rotation (Radial axis) -> Y axis in Three.js
                    this.satelliteMeshes[index].rotateOnAxis(new THREE.Vector3(0, 1, 0), rotationR);
                    
                    // S axis rotation (Along-track axis) -> Z axis in Three.js
                    this.satelliteMeshes[index].rotateOnAxis(new THREE.Vector3(0, 0, 1), rotationS);
                }
            }
            
            // Highlight selected satellite
            const mesh = this.satelliteMeshes[index];
            const intensity = index === this.selectedSatelliteIndex ? 0.8 : 0.2;
            
            if (is3DFile && this.loadedModel) {
                // For 3D models, traverse and update all materials
                mesh.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const meshChild = child as THREE.Mesh;
                        if (meshChild.material && (meshChild.material as THREE.MeshPhongMaterial).emissiveIntensity !== undefined) {
                            (meshChild.material as THREE.MeshPhongMaterial).emissiveIntensity = intensity;
                        }
                    }
                });
            } else {
                // For standard geometries
                if ((mesh as THREE.Mesh).material && ((mesh as THREE.Mesh).material as THREE.MeshPhongMaterial).emissiveIntensity !== undefined) {
                    ((mesh as THREE.Mesh).material as THREE.MeshPhongMaterial).emissiveIntensity = intensity;
                }
            }
            
            // Update trails
            if (this.uiControls.elements.showTrails.checked && index > 0) {
                const trailMax = parseInt(this.uiControls.elements.trailLength.value);
                let color: THREE.Color = new THREE.Color(0xffffff); // Initialize with default
                
                if (is3DFile && this.loadedModel) {
                    // For 3D models, get color from the first mesh child
                    mesh.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh) {
                            const meshChild = child as THREE.Mesh;
                            if (meshChild.material && (meshChild.material as THREE.MeshPhongMaterial).color) {
                                color = (meshChild.material as THREE.MeshPhongMaterial).color;
                                return; // Exit traverse once we found a color
                            }
                        }
                    });
                } else {
                    // For standard geometries
                    color = ((this.satelliteMeshes[index] as THREE.Mesh).material as THREE.MeshPhongMaterial).color;
                }
                
                this.trailRenderer.updateTrail(sat, pos, scale, color, trailMax);
            }
        });
    }

    public updateAllSatelliteColors(): void {
        const isUniform = this.uiControls.elements.uniformSatelliteColor.checked;
        const uniformColor = this.uiControls.elements.satelliteColor.value;
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7b731, 0x5f27cd, 0x00d2d3, 0xff9ff3, 0x54a0ff];
        const is3DFile = this.uiControls.elements.satelliteShape.value === '3dfile';
        
        for (let i = 1; i < this.satelliteMeshes.length; i++) {
            const mesh = this.satelliteMeshes[i];
            
            let colorToSet: number;
            if (isUniform) {
                colorToSet = parseInt(uniformColor.replace('#', ''), 16);
            } else {
                const colorIndex = (i - 1) % colors.length;
                colorToSet = colors[colorIndex];
            }
            
            if (is3DFile && this.loadedModel) {
                // For 3D models, traverse and update all materials
                mesh.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const meshChild = child as THREE.Mesh;
                        if (meshChild.material && (meshChild.material as THREE.MeshPhongMaterial).color) {
                            (meshChild.material as THREE.MeshPhongMaterial).color.setHex(colorToSet);
                            (meshChild.material as THREE.MeshPhongMaterial).emissive.setHex(colorToSet);
                        }
                    }
                });
            } else {
                // For standard geometries
                ((mesh as THREE.Mesh).material as THREE.MeshPhongMaterial).color.setHex(colorToSet);
                ((mesh as THREE.Mesh).material as THREE.MeshPhongMaterial).emissive.setHex(colorToSet);
            }
        }
    }

    public clearTrails(satellites: Satellite[]): void {
        satellites.forEach(sat => {
            this.trailRenderer.clearTrail(sat);
        });
    }

    private checkSatelliteSelection(): void {
        try {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            // Use recursive intersection to handle Groups
            const intersects = this.raycaster.intersectObjects(this.satelliteMeshes, true);
            
            if (intersects.length > 0) {
                const clickedObject = intersects[0].object;
                
                // Find which satellite mesh/group contains the clicked object
                let index = -1;
                for (let i = 0; i < this.satelliteMeshes.length; i++) {
                    const satelliteMesh = this.satelliteMeshes[i];
                    if (satelliteMesh === clickedObject || 
                        (satelliteMesh instanceof THREE.Group && this.isChildOf(clickedObject, satelliteMesh))) {
                        index = i;
                        break;
                    }
                }
                
                if (index >= 0 && index < this.satelliteMeshes.length) {
                    this.selectedSatelliteIndex = index;
                    console.log(`Selected satellite ${index}`);
                    this.updateSelectedSatelliteInfo();
                } else {
                    console.warn(`Invalid satellite index: ${index}`);
                }
            } else {
                this.selectedSatelliteIndex = -1;
                this.updateSelectedSatelliteInfo();
            }
        } catch (error) {
            console.error('Error in satellite selection:', error);
            this.selectedSatelliteIndex = -1;
            this.updateSelectedSatelliteInfo();
        }
    }
    
    private isChildOf(object: THREE.Object3D, parent: THREE.Object3D): boolean {
        let current = object.parent;
        while (current) {
            if (current === parent) return true;
            current = current.parent;
        }
        return false;
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
        this.axesGroup.visible = this.uiControls.elements.showAxes.checked;
        this.renderer.render(this.scene, this.camera);
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
    
    public updateSatelliteSize(satellites: Satellite[]): void {
        // Recreate satellite meshes with new size
        this.createSatelliteMeshes(satellites);
    }

    public setSelectedSatelliteIndex(index: number): void {
        this.selectedSatelliteIndex = index;
    }

    public handleResize(): void {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    public async loadFile3D(file: File): Promise<void> {
        try {
            this.loadedModel = await this.modelLoader.loadModel(file);
            
            // Trigger recreation of satellites with the new model
            const resetButton = document.getElementById('resetButton') as HTMLButtonElement;
            if (resetButton) {
                resetButton.click();
            }
        } catch (error) {
            console.error('Failed to load 3D model:', error);
            alert('Failed to load 3D model. Please ensure the file is a valid .glb, .gltf, or .stl file.');
            
            // Reset to sphere shape on error
            this.uiControls.elements.satelliteShape.value = 'sphere';
            this.uiControls.elements.file3dControls.style.display = 'none';
            
            const resetButton = document.getElementById('resetButton') as HTMLButtonElement;
            if (resetButton) {
                resetButton.click();
            }
        }
    }
}
