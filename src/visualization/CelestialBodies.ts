import * as THREE from 'three';
import { Satellite } from '../simulation/Satellite.js';
import { gstime } from 'satellite.js';
import { FrameTransforms } from '../simulation/FrameTransforms.js';
import { LoadingIndicator } from '@/engine/LoadingIndicator';

/** 地球テクスチャに掛ける色（少し暗く青みを帯びさせて背景に沈める） */
const EARTH_TINT = 0x46505f;

export class CelestialBodies {
    private scene: THREE.Scene;
    private earth: THREE.Mesh | null = null;
    private atmosphere: THREE.Mesh | null = null;
    private earthGroup: THREE.Group;
    private showEarth: boolean = false;
    private loadingIndicator: LoadingIndicator;
    private latLongLines: THREE.Object3D[] = [];
    private maxAnisotropy: number;

    constructor(scene: THREE.Scene, maxAnisotropy = 1) {
        this.scene = scene;
        this.maxAnisotropy = maxAnisotropy;
        this.earthGroup = new THREE.Group();
        this.scene.add(this.earthGroup);
        this.loadingIndicator = new LoadingIndicator();
    }

    // orbitRadius: m (meters)
    createEarth(orbitRadius: number, textureFile: string = 'earth00.webp'): void {
        // 既存の地球があれば削除
        this.disposeAtmosphere();
        if (this.earth) {
            this.earthGroup.remove(this.earth);
            if (this.earth.geometry) this.earth.geometry.dispose();
            if (this.earth.material) {
                if (Array.isArray(this.earth.material)) {
                    this.earth.material.forEach((mat) => mat.dispose());
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

            textureLoader.load(
                currentPath,
                // 成功時
                (texture) => {
                    console.log(`Earth texture loaded successfully from: ${currentPath}`);
                    // 色テクスチャは sRGB。斜めから見ることが多いので異方性フィルタでぼけを抑える
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.anisotropy = this.maxAnisotropy;
                    if (this.earth && this.earth.material) {
                        (this.earth.material as THREE.MeshStandardMaterial).map = texture;
                        (this.earth.material as THREE.MeshStandardMaterial).needsUpdate = true;
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
                () => {
                    console.warn(`Failed to load texture from ${currentPath}, trying next path...`);
                    tryLoadTexture(paths, index + 1);
                },
            );
        };

        // public/ 配下はビルド後もサイトルート（BASE_URL）直下に配置される
        const texturePaths = [`${import.meta.env.BASE_URL}asset/${textureFile}`];

        const earthTexture = new THREE.Texture();
        tryLoadTexture(texturePaths);

        // 地球のマテリアル（テクスチャ付き）。衛星より目立たないよう少し沈んだ色味にする
        const earthMaterial = new THREE.MeshStandardMaterial({
            map: earthTexture,
            color: EARTH_TINT,
            roughness: 1,
            metalness: 0,
        });

        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);

        // Hill方程式の座標系における正確な地球位置
        // 原点(0,0,0)は軌道上のターゲット衛星位置
        // 地球中心はY軸負方向（径方向内側）に軌道半径分配置
        this.earth.position.set(0, -orbitRadius, 0);

        this.earthGroup.add(this.earth);
        this.earth.add(this.createAtmosphere(earthRadiusInScene));

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
            opacity: 0.12,
        });

        // 経度線（縦線）を追加 - ECEF座標系（X=Greenwich, Y=90°E, Z=North Pole）
        for (let longitude = 0; longitude < 360; longitude += 15) {
            // 本初子午線以外
            if (longitude !== 0) {
                const points: THREE.Vector3[] = [];
                for (let latitude = -90; latitude <= 90; latitude += 3) {
                    // 緯度経度をECEF座標系に変換
                    const lat_rad = (latitude * Math.PI) / 180;
                    const lon_rad = (longitude * Math.PI) / 180;

                    // ECEF座標系: X=Greenwich meridian, Z=North pole
                    const x = lineRadius * Math.cos(lat_rad) * Math.cos(lon_rad); // Greenwich direction
                    const y = lineRadius * Math.cos(lat_rad) * Math.sin(lon_rad); // 90°E direction
                    const z = lineRadius * Math.sin(lat_rad); // North pole direction

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
                    const lat_rad = (latitude * Math.PI) / 180;
                    const lon_rad = (longitude * Math.PI) / 180;

                    // ECEF座標系: X=Greenwich meridian, Z=North pole
                    const x = lineRadius * Math.cos(lat_rad) * Math.cos(lon_rad); // Greenwich direction
                    const y = lineRadius * Math.cos(lat_rad) * Math.sin(lon_rad); // 90°E direction
                    const z = lineRadius * Math.sin(lat_rad); // North pole direction

                    points.push(new THREE.Vector3(x, y, z));
                }

                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, normalLineMaterial.clone());
                this.earth!.add(line);
                this.latLongLines.push(line);
            }
        }

        // 赤道とグリニッジ子午線は同系色で少しだけ強調する
        const accentLineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
        });

        // 赤道線
        const equatorPoints: THREE.Vector3[] = [];
        for (let longitude = 0; longitude <= 360; longitude += 1) {
            const lon_rad = (longitude * Math.PI) / 180;
            // 赤道（緯度0°）のECEF座標
            const x = lineRadius * Math.cos(lon_rad); // Greenwich direction
            const y = lineRadius * Math.sin(lon_rad); // 90°E direction
            const z = 0; // 赤道面（Z=0）
            equatorPoints.push(new THREE.Vector3(x, y, z));
        }

        const equatorGeometry = new THREE.BufferGeometry().setFromPoints(equatorPoints);
        const equatorLine = new THREE.Line(equatorGeometry, accentLineMaterial);
        this.earth!.add(equatorLine);
        this.latLongLines.push(equatorLine);

        // グリニッジ子午線
        const greenwichPoints: THREE.Vector3[] = [];
        for (let latitude = -90; latitude <= 90; latitude += 1) {
            const lat_rad = (latitude * Math.PI) / 180;
            // グリニッジ子午線（経度0°）のECEF座標
            const x = lineRadius * Math.cos(lat_rad); // Greenwich direction (経度0°)
            const y = 0; // Greenwich meridian (Y=0)
            const z = lineRadius * Math.sin(lat_rad); // North pole direction
            greenwichPoints.push(new THREE.Vector3(x, y, z));
        }

        const greenwichGeometry = new THREE.BufferGeometry().setFromPoints(greenwichPoints);
        const greenwichLine = new THREE.Line(greenwichGeometry, accentLineMaterial.clone());
        this.earth!.add(greenwichLine);
        this.latLongLines.push(greenwichLine);

        // 回転軸を表示（薄い線で北極-南極を結ぶ）
        const axisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, -lineRadius * 1.2),
            new THREE.Vector3(0, 0, lineRadius * 1.2),
        ]);
        const axisMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15,
        });
        const axisLine = new THREE.Line(axisGeometry, axisMaterial);
        this.earth!.add(axisLine);
        this.latLongLines.push(axisLine);
    }

    /**
     * 大気のリム。地球より少し大きい球の裏面に、視線が地表をかすめる高さに応じて
     * 指数的に減衰する光を描く（地平線のすぐ上が最も明るく、上空へ溶けていく）
     */
    private createAtmosphere(earthRadius: number): THREE.Mesh {
        const scaleHeight = 30000; // m
        const geometry = new THREE.SphereGeometry(earthRadius + scaleHeight * 6, 128, 64);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                glowColor: { value: new THREE.Color(0x6aa8ff) },
                earthRadius: { value: earthRadius },
                scaleHeight: { value: scaleHeight },
            },
            vertexShader: /* glsl */ `
                #include <common>
                #include <logdepthbuf_pars_vertex>
                varying vec3 vViewPosition;
                varying vec3 vCenter;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPosition = mvPosition.xyz;
                    vCenter = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                    gl_Position = projectionMatrix * mvPosition;
                    #include <logdepthbuf_vertex>
                }
            `,
            fragmentShader: /* glsl */ `
                #include <logdepthbuf_pars_fragment>
                uniform vec3 glowColor;
                uniform float earthRadius;
                uniform float scaleHeight;
                varying vec3 vViewPosition;
                varying vec3 vCenter;
                void main() {
                    #include <logdepthbuf_fragment>
                    // 視線（カメラ→画素）と地球中心の最短距離 = 視線が最も地表に近づく高さ
                    vec3 dir = normalize(vViewPosition);
                    float closest = length(vCenter - dot(vCenter, dir) * dir);
                    float altitude = max(closest - earthRadius, 0.0);
                    float intensity = exp(-altitude / scaleHeight);
                    gl_FragColor = vec4(glowColor, intensity * 0.7);
                }
            `,
            side: THREE.BackSide,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const atmosphere = new THREE.Mesh(geometry, material);
        this.atmosphere = atmosphere;
        return atmosphere;
    }

    update(time: number, simulationStartTime?: Date): void {
        const baseTime = simulationStartTime ? simulationStartTime.getTime() : Date.now();
        const t = new Date(baseTime + time * 1000);
        const ref = Satellite.getReferenceECIPosition(t);
        if (!ref) return;

        const r0 = new THREE.Vector3(ref.position.x, ref.position.y, ref.position.z);
        const v0 = new THREE.Vector3(ref.velocity.x, ref.velocity.y, ref.velocity.z);

        // --- 1.  ECEF → RSW 変換行列を生成（物理座標系変換）
        const gmst = gstime(t);
        const { m4: ecefToRsw } = FrameTransforms.ecefToRsw(gmst, r0, v0);

        // --- 2.  RSW → Three.js 変換（描画座標系変換）
        const rswToThree = FrameTransforms.rswToThree;

        // --- 3.  ECEF → Three.js の複合行列
        const finalTransform = new THREE.Matrix4().multiplyMatrices(rswToThree, ecefToRsw);

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
        this.latLongLines.forEach((line) => {
            line.visible = visible;
        });
    }

    private clearLatLongLines(): void {
        this.latLongLines.forEach((line) => {
            if (this.earth) {
                this.earth.remove(line);
            }
            if (line instanceof THREE.Line || line instanceof THREE.Mesh) {
                if (line.geometry) line.geometry.dispose();
                if (line.material) {
                    if (Array.isArray(line.material)) {
                        line.material.forEach((mat) => mat.dispose());
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
            'earth05_highres.webp': '高解像度地球テクスチャ',
        };

        return textureNames[textureFile] || `地球テクスチャ (${textureFile})`;
    }

    private disposeAtmosphere(): void {
        if (!this.atmosphere) return;
        this.atmosphere.removeFromParent();
        this.atmosphere.geometry.dispose();
        (this.atmosphere.material as THREE.Material).dispose();
        this.atmosphere = null;
    }

    dispose(): void {
        this.disposeAtmosphere();
        if (this.earth) {
            if (this.earth.geometry) this.earth.geometry.dispose();
            if (this.earth.material) {
                if (Array.isArray(this.earth.material)) {
                    this.earth.material.forEach((mat) => mat.dispose());
                } else {
                    this.earth.material.dispose();
                }
            }
        }
    }
}
