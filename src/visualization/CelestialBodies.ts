import * as THREE from 'three';
import { Satellite } from '../simulation/Satellite.js';
import { gstime } from 'satellite.js';
import { FrameTransforms } from '../simulation/FrameTransforms.js';
import { LoadingIndicator } from '../ui/LoadingIndicator.js';

export class CelestialBodies {
    private scene: THREE.Scene;
    private earth: THREE.Mesh | null = null;
    private earthGroup: THREE.Group;
    private showEarth: boolean = false;
    private loadingIndicator: LoadingIndicator;
    private latLongLines: THREE.Object3D[] = [];
    
    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.earthGroup = new THREE.Group();
        this.scene.add(this.earthGroup);
        this.loadingIndicator = new LoadingIndicator();
    }
    
    // orbitRadius: m (meters)
    createEarth(orbitRadius: number, textureFile: string = 'earth00.webp'): void {
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
        const EARTH_RADIUS = 6378137; // m（実際の地球半径）
        
        // シーンユニットでの実際の地球半径
        const earthRadiusInScene = EARTH_RADIUS; // m
        
        // 地球の球体ジオメトリ（現実的なサイズ）
        const earthGeometry = new THREE.SphereGeometry(earthRadiusInScene, 64, 64);
        // Align texture orientation with ECEF axes
        // SphereGeometry assumes Y-up, but our ECEF frame uses Z-up.
        // Rotate the geometry so that north becomes +Z and the prime meridian
        // remains on +X.
        earthGeometry.rotateX(Math.PI / 2);
        
        // 地球のテクスチャを読み込み
        const textureLoader = new THREE.TextureLoader();
        
        // Show loading indicator for texture loading
        const textureDisplayName = this.getTextureDisplayName(textureFile);
        this.loadingIndicator.showTextureLoading(textureDisplayName);
        
        // 複数のパスを順番に試行する方式に変更
        const tryLoadTexture = (paths: string[], index: number = 0): void => {
            if (index >= paths.length) {
                console.error(`All texture paths failed: ${paths.join(', ')}`);
                this.loadingIndicator.hide();
                return;
            }
            
            const currentPath = paths[index];
            
            textureLoader.load(currentPath,
                // 成功時
                (texture) => {
                    console.log(`Earth texture loaded successfully from: ${currentPath}`);
                    if (this.earth && this.earth.material) {
                        (this.earth.material as THREE.MeshPhongMaterial).map = texture;
                        (this.earth.material as THREE.MeshPhongMaterial).needsUpdate = true;
                    }
                    this.loadingIndicator.hide();
                },
                // 進行中
                (progress) => {
                    if (progress.lengthComputable) {
                        const percentage = progress.loaded / progress.total;
                        this.loadingIndicator.updateProgress(percentage);
                    }
                },
                // エラー時 - 次のパスを試行
                (error) => {
                    console.warn(`Failed to load texture from ${currentPath}, trying next path...`);
                    tryLoadTexture(paths, index + 1);
                }
            );
        };
        
        // 開発環境判定
        const isDev = import.meta.env?.DEV || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1' ||
                     window.location.port !== '';
        
        // 複数のパスパターンを定義（優先順位順）
        const texturePaths: string[] = [];
        if (isDev) {
            console.log('Development environment detected');
            texturePaths.push(`/public/asset/${textureFile}`);
            texturePaths.push(`./public/asset/${textureFile}`);
        } else {
            console.log('Production environment detected');
            // GitHub Pagesでは public/ ディレクトリの内容が root にコピーされる
            const basePath = window.location.pathname.includes('/hill-equation/') ? '/hill-equation' : '';
            texturePaths.push(`${basePath}/asset/${textureFile}`);
            texturePaths.push(`./asset/${textureFile}`);
            texturePaths.push(`asset/${textureFile}`);
        }
        
        const earthTexture = new THREE.Texture();
        tryLoadTexture(texturePaths);
        
        // 地球のマテリアル（テクスチャ付き）
        const earthMaterial = new THREE.MeshPhongMaterial({
            map: earthTexture,
            emissive: 0x000033,
            emissiveIntensity: 0.05,
            shininess: 10,
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
        // Clear existing lat/long lines
        this.clearLatLongLines();
        
        // 線を地球表面から少し浮かせて見やすくする
        const lineRadius = earthRadius * 1.001;
        
        // 一般的な緯度経度線
        const normalLineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            linewidth: 1
        });
        
        // 経度線（縦線）を追加 - ECEF座標系（X=Greenwich, Y=90°E, Z=North Pole）
        for (let longitude = 0; longitude < 360; longitude += 15) {
            // 本初子午線以外
            if (longitude !== 0) {
                const points: THREE.Vector3[] = [];
                for (let latitude = -90; latitude <= 90; latitude += 3) {
                    // 緯度経度をECEF座標系に変換
                    const lat_rad = latitude * Math.PI / 180;
                    const lon_rad = longitude * Math.PI / 180;
                    
                    // ECEF座標系: X=Greenwich meridian, Z=North pole
                    const x = lineRadius * Math.cos(lat_rad) * Math.cos(lon_rad);  // Greenwich direction
                    const y = lineRadius * Math.cos(lat_rad) * Math.sin(lon_rad);  // 90°E direction  
                    const z = lineRadius * Math.sin(lat_rad);                      // North pole direction
                    
                    points.push(new THREE.Vector3(x, y, z));
                }
                
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, normalLineMaterial.clone());
                this.earth!.add(line);
                this.latLongLines.push(line);
            }
        }
        
        // 緯度線（横線）を追加
        for (let latitude = -60; latitude <= 60; latitude += 15) {
            // 赤道以外
            if (latitude !== 0) {
                const points: THREE.Vector3[] = [];
                for (let longitude = 0; longitude <= 360; longitude += 3) {
                    // 緯度経度をECEF座標系に変換
                    const lat_rad = latitude * Math.PI / 180;
                    const lon_rad = longitude * Math.PI / 180;
                    
                    // ECEF座標系: X=Greenwich meridian, Z=North pole
                    const x = lineRadius * Math.cos(lat_rad) * Math.cos(lon_rad);  // Greenwich direction
                    const y = lineRadius * Math.cos(lat_rad) * Math.sin(lon_rad);  // 90°E direction  
                    const z = lineRadius * Math.sin(lat_rad);                      // North pole direction
                    
                    points.push(new THREE.Vector3(x, y, z));
                }
                
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, normalLineMaterial.clone());
                this.earth!.add(line);
                this.latLongLines.push(line);
            }
        }
        
        // 赤道線を特別に強調（赤色）
        const equatorPoints: THREE.Vector3[] = [];
        for (let longitude = 0; longitude <= 360; longitude += 1) {
            const lon_rad = longitude * Math.PI / 180;
            // 赤道（緯度0°）のECEF座標
            const x = lineRadius * Math.cos(lon_rad);  // Greenwich direction
            const y = lineRadius * Math.sin(lon_rad);  // 90°E direction
            const z = 0;                               // 赤道面（Z=0）
            equatorPoints.push(new THREE.Vector3(x, y, z));
        }
        
        const equatorGeometry = new THREE.BufferGeometry().setFromPoints(equatorPoints);
        const equatorMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            transparent: false,
            opacity: 1.0,
            linewidth: 3
        });
        const equatorLine = new THREE.Line(equatorGeometry, equatorMaterial);
        this.earth!.add(equatorLine);
        this.latLongLines.push(equatorLine);
        
        // グリニッジ子午線を特別に強調（青色）
        const greenwichPoints: THREE.Vector3[] = [];
        for (let latitude = -90; latitude <= 90; latitude += 1) {
            const lat_rad = latitude * Math.PI / 180;
            // グリニッジ子午線（経度0°）のECEF座標
            const x = lineRadius * Math.cos(lat_rad);  // Greenwich direction (経度0°)
            const y = 0;                               // Greenwich meridian (Y=0)
            const z = lineRadius * Math.sin(lat_rad);  // North pole direction
            greenwichPoints.push(new THREE.Vector3(x, y, z));
        }
        
        const greenwichGeometry = new THREE.BufferGeometry().setFromPoints(greenwichPoints);
        const greenwichMaterial = new THREE.LineBasicMaterial({
            color: 0x0000ff,
            transparent: false,
            opacity: 1.0,
            linewidth: 3
        });
        const greenwichLine = new THREE.Line(greenwichGeometry, greenwichMaterial);
        this.earth!.add(greenwichLine);
        this.latLongLines.push(greenwichLine);
        
        // 北極点マーカー（赤い球）
        const northPoleGeometry = new THREE.SphereGeometry(earthRadius * 0.03, 16, 16);
        const northPoleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const northPole = new THREE.Mesh(northPoleGeometry, northPoleMaterial);
        northPole.position.set(0, 0, lineRadius);
        this.earth!.add(northPole);
        this.latLongLines.push(northPole);
        
        // 南極点マーカー（青い球）
        const southPoleGeometry = new THREE.SphereGeometry(earthRadius * 0.03, 16, 16);
        const southPoleMaterial = new THREE.MeshBasicMaterial({ color: 0x0066ff });
        const southPole = new THREE.Mesh(southPoleGeometry, southPoleMaterial);
        southPole.position.set(0, 0, -lineRadius);
        this.earth!.add(southPole);
        this.latLongLines.push(southPole);
        
        // 回転軸を表示（薄い線で北極-南極を結ぶ）
        const axisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, -lineRadius * 1.2),
            new THREE.Vector3(0, 0, lineRadius * 1.2)
        ]);
        const axisMaterial = new THREE.LineBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.5,
            linewidth: 2
        });
        const axisLine = new THREE.Line(axisGeometry, axisMaterial);
        this.earth!.add(axisLine);
        this.latLongLines.push(axisLine);
    }
    
    
    update(time: number, simulationStartTime?: Date): void {
        const baseTime = simulationStartTime ? simulationStartTime.getTime()
                                            : Date.now();
        const t         = new Date(baseTime + time * 1000);
        const ref       = Satellite.getReferenceECIPosition(t);
        if (!ref) return;

        const r0 = new THREE.Vector3(ref.position.x,  ref.position.y,  ref.position.z);
        const v0 = new THREE.Vector3(ref.velocity.x,  ref.velocity.y,  ref.velocity.z);

        // --- 1.  ECEF → RSW 変換行列を生成（物理座標系変換）
        const gmst = gstime(t);
        const { m4: ecefToRsw } = FrameTransforms.ecefToRsw(gmst, r0, v0);

        // --- 2.  RSW → Three.js 変換（描画座標系変換）
        const rswToThree = FrameTransforms.rswToThree;

        // --- 3.  ECEF → Three.js の複合行列
        const finalTransform = new THREE.Matrix4()
            .multiplyMatrices(rswToThree, ecefToRsw);

        // --- 4.  地球オブジェクトの姿勢だけ更新
        if (this.earth) this.earth.setRotationFromMatrix(finalTransform);
    }

    setEarthVisibility(visible: boolean): void {
        this.showEarth = visible;
        if (this.earthGroup) {
            this.earthGroup.visible = visible;
        }
    }
    
    setLatLongGridVisibility(visible: boolean): void {
        this.latLongLines.forEach(line => {
            line.visible = visible;
        });
    }
    
    private clearLatLongLines(): void {
        this.latLongLines.forEach(line => {
            if (this.earth) {
                this.earth.remove(line);
            }
            if (line instanceof THREE.Line || line instanceof THREE.Mesh) {
                if (line.geometry) line.geometry.dispose();
                if (line.material) {
                    if (Array.isArray(line.material)) {
                        line.material.forEach(mat => mat.dispose());
                    } else {
                        line.material.dispose();
                    }
                }
            }
        });
        this.latLongLines = [];
    }
    
    private getTextureDisplayName(textureFile: string): string {
        const textureNames: Record<string, string> = {
            'earth00.webp': 'シンプル地球テクスチャ',
            'earth01.webp': '標準地球テクスチャ',
            'earth03.webp': '淡白地球テクスチャ',
            'earth04.webp': 'ブルーマーブル地球テクスチャ',
            'earth05_highres.webp': '高解像度地球テクスチャ'
        };
        
        return textureNames[textureFile] || `地球テクスチャ (${textureFile})`;
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