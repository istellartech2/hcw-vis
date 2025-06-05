import * as THREE from 'three';

export class CelestialBodies {
    private scene: THREE.Scene;
    private earth: THREE.Mesh | null = null;
    private earthGroup: THREE.Group;
    private sun: THREE.DirectionalLight | null = null;
    private showEarth: boolean = false;
    
    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.earthGroup = new THREE.Group();
        this.scene.add(this.earthGroup);
    }
    
    createEarth(orbitRadius: number): void {
        // 既存の地球があれば削除
        if (this.earth) {
            this.earthGroup.remove(this.earth);
            if (this.earth.geometry) this.earth.geometry.dispose();
            if (this.earth.material) {
                if (Array.isArray(this.earth.material)) {
                    this.earth.material.forEach(mat => mat.dispose());
                } else {
                    this.earth.material.dispose();
                }
            }
        }
        
        // 正確な地球半径と軌道の関係を実装
        const EARTH_RADIUS = 6378.137; // km（実際の地球半径）
        
        // シーンユニットでの実際の地球半径
        const earthRadiusInScene = EARTH_RADIUS; // km
        
        // 地球の球体ジオメトリ（現実的なサイズ）
        const earthGeometry = new THREE.SphereGeometry(earthRadiusInScene, 64, 64);
        
        // 地球のマテリアル（シンプルな青い球体）
        const earthMaterial = new THREE.MeshPhongMaterial({
            color: 0xe0ffff,
            emissive: 0x000033,
            emissiveIntensity: 0.05,
            shininess: 5
        });
        
        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        
        // Hill方程式の座標系における正確な地球位置
        // 原点(0,0,0)は軌道上のターゲット衛星位置
        // 地球中心はY軸負方向（径方向内側）に軌道半径分配置
        this.earth.position.set(0, -orbitRadius, 0);
        
        this.earthGroup.add(this.earth);
        
        // 緯度経度線を追加
        this.addLatitudeLongitudeLines(earthRadiusInScene);
    }
    
    private addLatitudeLongitudeLines(earthRadius: number): void {
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x4444aa,
            transparent: true,
            opacity: 0.3
        });
        
        // 経度線（縦線）を追加
        for (let longitude = 0; longitude < 360; longitude += 15) {
            const points: THREE.Vector3[] = [];
            for (let latitude = -90; latitude <= 90; latitude += 5) {
                const phi = (90 - latitude) * Math.PI / 180;
                const theta = longitude * Math.PI / 180;
                
                const x = earthRadius * Math.sin(phi) * Math.cos(theta);
                const y = earthRadius * Math.cos(phi);
                const z = earthRadius * Math.sin(phi) * Math.sin(theta);
                
                points.push(new THREE.Vector3(x, y, z));
            }
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial.clone());
            this.earth!.add(line);
        }
        
        // 緯度線（横線）を追加
        for (let latitude = -75; latitude <= 75; latitude += 15) {
            const points: THREE.Vector3[] = [];
            for (let longitude = 0; longitude <= 360; longitude += 5) {
                const phi = (90 - latitude) * Math.PI / 180;
                const theta = longitude * Math.PI / 180;
                
                const x = earthRadius * Math.sin(phi) * Math.cos(theta);
                const y = earthRadius * Math.cos(phi);
                const z = earthRadius * Math.sin(phi) * Math.sin(theta);
                
                points.push(new THREE.Vector3(x, y, z));
            }
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial.clone());
            this.earth!.add(line);
        }
        
        // 赤道線を特別に強調
        const equatorPoints: THREE.Vector3[] = [];
        for (let longitude = 0; longitude <= 360; longitude += 2) {
            const theta = longitude * Math.PI / 180;
            const x = earthRadius * Math.cos(theta);
            const y = 0;
            const z = earthRadius * Math.sin(theta);
            equatorPoints.push(new THREE.Vector3(x, y, z));
        }
        
        const equatorGeometry = new THREE.BufferGeometry().setFromPoints(equatorPoints);
        const equatorMaterial = new THREE.LineBasicMaterial({
            color: 0x6666ff,
            transparent: true,
            opacity: 0.6
        });
        const equatorLine = new THREE.Line(equatorGeometry, equatorMaterial);
        this.earth!.add(equatorLine);
    }
    
    
    update(time: number): void {
        // 地球は固定（自転なし、太陽位置変更なし）
    }
    
    setEarthVisibility(visible: boolean): void {
        this.showEarth = visible;
        if (this.earthGroup) {
            this.earthGroup.visible = visible;
        }
    }
    
    dispose(): void {
        if (this.earth) {
            if (this.earth.geometry) this.earth.geometry.dispose();
            if (this.earth.material) {
                if (Array.isArray(this.earth.material)) {
                    this.earth.material.forEach(mat => mat.dispose());
                } else {
                    this.earth.material.dispose();
                }
            }
        }
    }
}