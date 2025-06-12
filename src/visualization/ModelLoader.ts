import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export class ModelLoader {
    private gltfLoader: GLTFLoader;
    private stlLoader: STLLoader;
    private loadedModels: Map<string, THREE.Group | THREE.Mesh>;

    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.stlLoader = new STLLoader();
        this.loadedModels = new Map();
    }

    async loadModel(file: File): Promise<THREE.Group | THREE.Mesh> {
        const fileName = file.name.toLowerCase();
        const fileURL = URL.createObjectURL(file);

        try {
            let model: THREE.Group | THREE.Mesh;

            if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
                model = await this.loadGLTF(fileURL);
            } else if (fileName.endsWith('.stl')) {
                model = await this.loadSTL(fileURL);
            } else {
                throw new Error('Unsupported file format. Please use .glb, .gltf, or .stl files.');
            }

            // Store the model for reuse
            this.loadedModels.set(file.name, model);

            // Clean up the object URL
            URL.revokeObjectURL(fileURL);

            return model;
        } catch (error) {
            URL.revokeObjectURL(fileURL);
            throw error;
        }
    }

    private loadGLTF(url: string): Promise<THREE.Group> {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                url,
                (gltf) => {
                    const model = gltf.scene;
                    
                    // Center the model
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.sub(center);
                    
                    // Scale to unit size
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 1 / maxDim;
                    model.scale.setScalar(scale);
                    
                    resolve(model);
                },
                undefined,
                (error) => {
                    console.error('Error loading GLTF model:', error);
                    reject(new Error('Failed to load GLTF model'));
                }
            );
        });
    }

    private loadSTL(url: string): Promise<THREE.Mesh> {
        return new Promise((resolve, reject) => {
            this.stlLoader.load(
                url,
                (geometry) => {
                    // Create material for STL
                    const material = new THREE.MeshPhongMaterial({
                        color: 0xcccccc,
                        specular: 0x111111,
                        shininess: 200
                    });

                    const mesh = new THREE.Mesh(geometry, material);
                    
                    // Center the geometry
                    geometry.computeBoundingBox();
                    const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
                    geometry.translate(-center.x, -center.y, -center.z);
                    
                    // Scale to unit size
                    const size = geometry.boundingBox!.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 1 / maxDim;
                    mesh.scale.setScalar(scale);
                    
                    resolve(mesh);
                },
                undefined,
                (error) => {
                    console.error('Error loading STL model:', error);
                    reject(new Error('Failed to load STL model'));
                }
            );
        });
    }

    getLoadedModel(fileName: string): THREE.Group | THREE.Mesh | undefined {
        return this.loadedModels.get(fileName);
    }

    clearCache(): void {
        this.loadedModels.clear();
    }
}