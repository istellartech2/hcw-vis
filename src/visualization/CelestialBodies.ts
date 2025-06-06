import * as THREE from 'three';
import { Satellite } from '../models/Satellite.js';
import * as satellite from 'satellite.js';

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
        // 線を地球表面から少し浮かせて見やすくする
        const lineRadius = earthRadius * 1.005;
        
        // 一般的な緯度経度線
        const normalLineMaterial = new THREE.LineBasicMaterial({
            color: 0x88aaff,
            transparent: true,
            opacity: 0.7,
            linewidth: 1
        });
        
        // 経度線（縦線）を追加 - ECEF座標系準拠（Z軸が北極）
        for (let longitude = 0; longitude < 360; longitude += 15) {
            // 本初子午線以外
            if (longitude !== 0) {
                const points: THREE.Vector3[] = [];
                for (let latitude = -90; latitude <= 90; latitude += 3) {
                    const phi = (90 - latitude) * Math.PI / 180;
                    const theta = longitude * Math.PI / 180;
                    
                    const x = lineRadius * Math.sin(phi) * Math.cos(theta);
                    const y = lineRadius * Math.sin(phi) * Math.sin(theta);
                    const z = lineRadius * Math.cos(phi);
                    
                    points.push(new THREE.Vector3(x, y, z));
                }
                
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, normalLineMaterial.clone());
                this.earth!.add(line);
            }
        }
        
        // 緯度線（横線）を追加
        for (let latitude = -60; latitude <= 60; latitude += 15) {
            // 赤道以外
            if (latitude !== 0) {
                const points: THREE.Vector3[] = [];
                for (let longitude = 0; longitude <= 360; longitude += 3) {
                    const phi = (90 - latitude) * Math.PI / 180;
                    const theta = longitude * Math.PI / 180;
                    
                    const x = lineRadius * Math.sin(phi) * Math.cos(theta);
                    const y = lineRadius * Math.sin(phi) * Math.sin(theta);
                    const z = lineRadius * Math.cos(phi);
                    
                    points.push(new THREE.Vector3(x, y, z));
                }
                
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, normalLineMaterial.clone());
                this.earth!.add(line);
            }
        }
        
        // 赤道線を特別に強調（オレンジ）
        const equatorPoints: THREE.Vector3[] = [];
        for (let longitude = 0; longitude <= 360; longitude += 1) {
            const theta = longitude * Math.PI / 180;
            const x = lineRadius * Math.cos(theta);
            const y = lineRadius * Math.sin(theta);
            const z = 0;
            equatorPoints.push(new THREE.Vector3(x, y, z));
        }
        
        const equatorGeometry = new THREE.BufferGeometry().setFromPoints(equatorPoints);
        const equatorMaterial = new THREE.LineBasicMaterial({
            color: 0xff4500,
            transparent: false,
            opacity: 1.0,
            linewidth: 3
        });
        const equatorLine = new THREE.Line(equatorGeometry, equatorMaterial);
        this.earth!.add(equatorLine);
        
        // グリニッジ子午線を特別に強調（赤色）
        const greenwichPoints: THREE.Vector3[] = [];
        for (let latitude = -90; latitude <= 90; latitude += 1) {
            const phi = (90 - latitude) * Math.PI / 180;
            const x = lineRadius * Math.sin(phi);
            const y = 0;
            const z = lineRadius * Math.cos(phi);
            greenwichPoints.push(new THREE.Vector3(x, y, z));
        }
        
        const greenwichGeometry = new THREE.BufferGeometry().setFromPoints(greenwichPoints);
        const greenwichMaterial = new THREE.LineBasicMaterial({
            color: 0xff3333,
            transparent: false,
            opacity: 1.0,
            linewidth: 3
        });
        const greenwichLine = new THREE.Line(greenwichGeometry, greenwichMaterial);
        this.earth!.add(greenwichLine);
        
        // 北極点マーカー（赤い球）
        const northPoleGeometry = new THREE.SphereGeometry(earthRadius * 0.03, 16, 16);
        const northPoleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const northPole = new THREE.Mesh(northPoleGeometry, northPoleMaterial);
        northPole.position.set(0, 0, lineRadius);
        this.earth!.add(northPole);
        
        // 南極点マーカー（青い球）
        const southPoleGeometry = new THREE.SphereGeometry(earthRadius * 0.03, 16, 16);
        const southPoleMaterial = new THREE.MeshBasicMaterial({ color: 0x0066ff });
        const southPole = new THREE.Mesh(southPoleGeometry, southPoleMaterial);
        southPole.position.set(0, 0, -lineRadius);
        this.earth!.add(southPole);
        
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
    }
    
    
    update(time: number, simulationStartTime?: Date): void {
        const baseTime = simulationStartTime ? simulationStartTime.getTime()
                                            : Date.now();
        const t         = new Date(baseTime + time * 1000);
        const ref       = Satellite.getReferenceECIPosition(t);
        if (!ref) return;

        const r0 = new THREE.Vector3(ref.position.x,  ref.position.y,  ref.position.z);
        const v0 = new THREE.Vector3(ref.velocity.x,  ref.velocity.y,  ref.velocity.z);

        // --- 1.  ECEF → RSW 変換行列を生成
        const gmst = satellite.gstime(t);
        const { m4: ecefToRsw } = this.buildEcefToLvlhTransform(gmst, r0, v0);

        // --- 2.  RSW → Three.js 変換（行列は row-major で記入）
        const rswToThree = new THREE.Matrix4().set(
            /* row 1 */ 0, 0, 1, 0,   // W → +X
            /* row 2 */-1, 0, 0, 0,   // R → -Y
            /* row 3 */ 0,-1, 0, 0,   // S → -Z
            /* row 4 */ 0, 0, 0, 1
        );

        // --- 3.  ECEF → Three.js の複合行列
        const finalTransform = new THREE.Matrix4()
            .multiplyMatrices(rswToThree, ecefToRsw);

        // --- 4.  地球オブジェクトの姿勢だけ更新
        if (this.earth) this.earth.setRotationFromMatrix(finalTransform);
    }

    /**
     * ECEF → RSW の 3×3・4×4・Quaternion を返す
     */
    private buildEcefToLvlhTransform(
        gmstRad: number,
        rECI: THREE.Vector3,
        vECI: THREE.Vector3
    ) {
        /* --- 1. ECI → RSW 基底 --- */s
        const Rhat = rECI.clone().normalize();            // +R (inward)
        const What = rECI.clone().cross(vECI).normalize(); // +W
        const Shat = What.clone().cross(Rhat);             // +S

        const Te2r = new THREE.Matrix3().set(
            Rhat.x, Rhat.y, Rhat.z,
            Shat.x, Shat.y, Shat.z,
            What.x, What.y, What.z
        ); // ECI → RSW

        /* --- 2. ECI ↔ ECEF --- */
        const c = Math.cos(gmstRad), s = Math.sin(gmstRad);
        const Re2f = new THREE.Matrix3().set(  c,  s, 0,
                                            -s,  c, 0,
                                            0,  0, 1 ); // ECI → ECEF
        const Rf2e = Re2f.clone().transpose();             // ECEF → ECI

        /* --- 3. 合成 (ECEF → RSW) --- */
        const Tf2r = Te2r.clone().multiply(Rf2e);          // RSW ← ECEF

        /* --- 4. 型変換 --- */
        const m4 = new THREE.Matrix4().set(
            Tf2r.elements[0], Tf2r.elements[3], Tf2r.elements[6], 0,
            Tf2r.elements[1], Tf2r.elements[4], Tf2r.elements[7], 0,
            Tf2r.elements[2], Tf2r.elements[5], Tf2r.elements[8], 0,
            0,                 0,                 0,              1
        );
        const q = new THREE.Quaternion().setFromRotationMatrix(m4);
        return { m3: Tf2r, m4, q };
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