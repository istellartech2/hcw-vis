import * as THREE from 'three';

export class OrbitalPlane {
    private scene: THREE.Scene;
    private orbitalPlane: THREE.Mesh | null = null;
    private lvlhAxes: THREE.Group | null = null;
    private showPlane: boolean = false;
    private showLVLHAxes: boolean = false;
    
    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }
    
    createOrbitalPlane(orbitRadius: number): void {
        // 既存の軌道面があれば削除
        if (this.orbitalPlane) {
            this.scene.remove(this.orbitalPlane);
            if (this.orbitalPlane.geometry) this.orbitalPlane.geometry.dispose();
            if (this.orbitalPlane.material) {
                if (Array.isArray(this.orbitalPlane.material)) {
                    this.orbitalPlane.material.forEach(mat => mat.dispose());
                } else {
                    this.orbitalPlane.material.dispose();
                }
            }
        }
        
        // 軌道面を円形ディスクとして作成
        const planeGeometry = new THREE.RingGeometry(orbitRadius * 0.95, orbitRadius * 1.05, 64);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a9eff,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        
        this.orbitalPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.orbitalPlane.rotation.x = Math.PI / 2; // XZ平面に配置
        this.scene.add(this.orbitalPlane);
        
        // 軌道面の境界線を追加
        const edgeGeometry = new THREE.RingGeometry(orbitRadius * 0.998, orbitRadius * 1.002, 128);
        const edgeMaterial = new THREE.MeshBasicMaterial({
            color: 0x6699ff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edgeMesh.rotation.x = Math.PI / 2;
        this.scene.add(edgeMesh);
    }
    
    createLVLHAxes(): void {
        // 既存のLVLH軸があれば削除
        if (this.lvlhAxes) {
            this.scene.remove(this.lvlhAxes);
            this.disposeLVLHAxes();
        }
        
        this.lvlhAxes = new THREE.Group();
        
        // LVLH座標系の軸を作成
        // L軸 (Local Vertical - Radial方向, 地球中心向き)
        const lAxisGeometry = new THREE.CylinderGeometry(2, 2, 200);
        const lAxisMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff6b6b,
            transparent: true,
            opacity: 0.8
        });
        const lAxis = new THREE.Mesh(lAxisGeometry, lAxisMaterial);
        lAxis.position.set(0, -100, 0); // Y軸負方向（地球向き）
        
        // L軸のラベル
        this.addAxisLabel('R', 0, -200, 0, 0xff6b6b);
        
        // V軸 (Velocity方向 - Along-track)
        const vAxisGeometry = new THREE.CylinderGeometry(2, 2, 200);
        const vAxisMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x4ecdc4,
            transparent: true,
            opacity: 0.8
        });
        const vAxis = new THREE.Mesh(vAxisGeometry, vAxisMaterial);
        vAxis.rotation.z = Math.PI / 2;
        vAxis.position.set(100, 0, 0); // X軸正方向（進行方向）
        
        // V軸のラベル
        this.addAxisLabel('V', 200, 0, 0, 0x4ecdc4);
        
        // H軸 (Cross-track方向)
        const hAxisGeometry = new THREE.CylinderGeometry(2, 2, 200);
        const hAxisMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xf7b731,
            transparent: true,
            opacity: 0.8
        });
        const hAxis = new THREE.Mesh(hAxisGeometry, hAxisMaterial);
        hAxis.rotation.x = Math.PI / 2;
        hAxis.position.set(0, 0, 100); // Z軸正方向（軌道面垂直）
        
        // H軸のラベル
        this.addAxisLabel('H', 0, 0, 200, 0xf7b731);
        
        this.lvlhAxes.add(lAxis);
        this.lvlhAxes.add(vAxis);
        this.lvlhAxes.add(hAxis);
        
        this.scene.add(this.lvlhAxes);
    }
    
    private addAxisLabel(text: string, x: number, y: number, z: number, color: number): void {
        // テキストスプライトでラベルを作成
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 64;
        canvas.height = 64;
        
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = 'Bold 32px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 32, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.9
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(x, y, z);
        sprite.scale.set(30, 30, 1);
        
        if (this.lvlhAxes) {
            this.lvlhAxes.add(sprite);
        }
    }
    
    private disposeLVLHAxes(): void {
        if (this.lvlhAxes) {
            this.lvlhAxes.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                } else if (child instanceof THREE.Sprite) {
                    if (child.material) {
                        child.material.dispose();
                    }
                }
            });
        }
    }
    
    setPlaneVisibility(visible: boolean): void {
        this.showPlane = visible;
        if (this.orbitalPlane) {
            this.orbitalPlane.visible = visible;
        }
    }
    
    setLVLHAxesVisibility(visible: boolean): void {
        this.showLVLHAxes = visible;
        if (this.lvlhAxes) {
            this.lvlhAxes.visible = visible;
        }
    }
    
    update(time: number): void {
        // 軌道面は固定なので更新不要
        // 将来的には軌道の歳差運動などを考慮した回転を追加可能
    }
    
    dispose(): void {
        if (this.orbitalPlane) {
            this.scene.remove(this.orbitalPlane);
            if (this.orbitalPlane.geometry) this.orbitalPlane.geometry.dispose();
            if (this.orbitalPlane.material) {
                if (Array.isArray(this.orbitalPlane.material)) {
                    this.orbitalPlane.material.forEach(mat => mat.dispose());
                } else {
                    this.orbitalPlane.material.dispose();
                }
            }
        }
        
        if (this.lvlhAxes) {
            this.scene.remove(this.lvlhAxes);
            this.disposeLVLHAxes();
        }
    }
}