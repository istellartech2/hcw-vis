import * as THREE from 'three';
import { Satellite } from '../simulation/Satellite.js';

/**
 * InstancedMeshを使用した高性能な衛星レンダリング
 * 球体・立方体形状専用（GLTF/STLは従来方式にフォールバック）
 */
export class InstancedSatelliteRenderer {
    private scene: THREE.Scene;
    private centerSatelliteMesh: THREE.Mesh; // 基準衛星（白色、個別メッシュ）
    private instancedMesh: THREE.InstancedMesh | null = null; // 一般衛星群
    private satelliteCount: number = 0;

    // インスタンスID → 衛星インデックスのマッピング
    private instanceIdToSatelliteIndex: Map<number, number> = new Map();

    // 元の色配列を保持（選択時のハイライト用）
    private originalColors: number[] = [];

    // 一時オブジェクト（毎フレーム生成を避ける）
    private tempMatrix: THREE.Matrix4 = new THREE.Matrix4();
    private tempPosition: THREE.Vector3 = new THREE.Vector3();
    private tempQuaternion: THREE.Quaternion = new THREE.Quaternion();
    private tempScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
    private tempColor: THREE.Color = new THREE.Color();

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        // 基準衛星（中心、白色）を個別メッシュとして作成
        const centerGeometry = new THREE.SphereGeometry(1, 32, 32);
        const centerMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff
            // 発光なし（外部光源のみで照らす）
        });
        this.centerSatelliteMesh = new THREE.Mesh(centerGeometry, centerMaterial);
        this.scene.add(this.centerSatelliteMesh);
    }

    /**
     * 衛星メッシュを生成
     * @param satelliteCount 衛星数（基準衛星を除く）
     * @param satelliteSize 衛星サイズ
     * @param satelliteShape 形状（'sphere' or 'cube'）
     * @param colors 各衛星の色配列
     */
    createSatellites(
        satelliteCount: number,
        satelliteSize: number,
        satelliteShape: 'sphere' | 'cube',
        colors: number[]
    ): void {
        // 既存のInstancedMeshをクリーンアップ
        this.dispose();

        this.satelliteCount = satelliteCount;
        this.instanceIdToSatelliteIndex.clear();
        this.originalColors = [...colors]; // 元の色を保存

        if (satelliteCount === 0) return;

        // 基準衛星のサイズと形状を更新
        this.updateCenterSatellite(satelliteSize, satelliteShape);

        // ジオメトリ作成
        let geometry: THREE.BufferGeometry;
        if (satelliteShape === 'cube') {
            geometry = new THREE.BoxGeometry(satelliteSize * 2, satelliteSize * 2, satelliteSize * 2);
        } else {
            // 球体: 解像度を下げて頂点数を削減（32 → 16）
            geometry = new THREE.SphereGeometry(satelliteSize, 16, 16);
        }

        // マテリアル作成（カラーはインスタンス属性で制御）
        // 発色を最適化: くすみすぎず、明るすぎない中間の設定
        const material = new THREE.MeshPhongMaterial({
            color: 0xffffff, // instanceColorがベースカラーとして乗算される
            emissive: 0xffffff, // instanceColorが自己発光色としても乗算される
            emissiveIntensity: 0.0 // 発光を抑えて適度な明るさに（0.2→0.1）
        });

        // InstancedMesh生成
        this.instancedMesh = new THREE.InstancedMesh(geometry, material, satelliteCount);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // 動的更新を明示

        // 各インスタンスの初期設定
        for (let i = 0; i < satelliteCount; i++) {
            // instanceId = i に対して、衛星インデックス = i + 1（基準衛星が0）
            this.instanceIdToSatelliteIndex.set(i, i + 1);

            // 初期位置を設定（原点）
            this.tempMatrix.identity();
            this.instancedMesh.setMatrixAt(i, this.tempMatrix);

            // 色を設定
            const color = colors[i % colors.length];
            this.tempColor.setHex(color);
            this.instancedMesh.setColorAt(i, this.tempColor);
        }

        // 変更を反映
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }

        this.scene.add(this.instancedMesh);
    }

    /**
     * 基準衛星のジオメトリとサイズを更新
     */
    private updateCenterSatellite(satelliteSize: number, satelliteShape: 'sphere' | 'cube'): void {
        // 既存ジオメトリを破棄
        this.centerSatelliteMesh.geometry.dispose();

        // 新しいジオメトリを作成
        if (satelliteShape === 'cube') {
            this.centerSatelliteMesh.geometry = new THREE.BoxGeometry(
                satelliteSize * 2,
                satelliteSize * 2,
                satelliteSize * 2
            );
        } else {
            this.centerSatelliteMesh.geometry = new THREE.SphereGeometry(satelliteSize, 32, 32);
        }
    }

    /**
     * 衛星位置・姿勢を更新
     * @param satellites 衛星配列
     * @param rotationR R軸回転（ラジアン）
     * @param rotationS S軸回転（ラジアン）
     * @param selectedIndex 選択中の衛星インデックス（-1なら選択なし）
     */
    updateSatellitePositions(
        satellites: Satellite[],
        rotationR: number,
        rotationS: number,
        selectedIndex: number
    ): void {
        if (!this.instancedMesh || satellites.length === 0) return;

        const scale = 1; // 1m in Hill coords = 1 units in Three.js

        // 基準衛星（index=0）を更新
        const centerPos = satellites[0].getPosition();
        this.centerSatelliteMesh.position.set(
            centerPos.z * scale,
            centerPos.x * scale,
            centerPos.y * scale
        );

        // 基準衛星の回転を適用
        this.centerSatelliteMesh.rotation.set(0, 0, 0);
        this.centerSatelliteMesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotationR);
        this.centerSatelliteMesh.rotateOnAxis(new THREE.Vector3(0, 0, 1), rotationS);

        // 基準衛星のハイライト（選択時は少し大きくする）
        if (selectedIndex === 0) {
            this.centerSatelliteMesh.scale.setScalar(1.3);
        } else {
            this.centerSatelliteMesh.scale.setScalar(1.0);
        }

        // 一般衛星（index >= 1）を更新
        for (let i = 0; i < this.satelliteCount && i + 1 < satellites.length; i++) {
            const sat = satellites[i + 1];
            const pos = sat.getPosition();

            // 位置設定（Hill座標 → Three.js座標変換）
            this.tempPosition.set(pos.z * scale, pos.x * scale, pos.y * scale);

            // 回転設定
            // CSV quaternionがあればそれを使用、なければUI制御の回転を適用
            const satelliteQuaternion = (sat as any).quaternion;
            if (satelliteQuaternion) {
                // CSV quaternion: RSW座標系 → Three.js座標系への変換
                // RSW(x,y,z) -> Three.js(z,x,y)
                this.tempQuaternion.set(
                    satelliteQuaternion.z,  // RSW Z -> Three.js X
                    satelliteQuaternion.x,  // RSW X -> Three.js Y
                    satelliteQuaternion.y,  // RSW Y -> Three.js Z
                    satelliteQuaternion.w
                );
            } else {
                // UI制御の回転を適用
                this.tempQuaternion.identity();
                const rotMatrixY = new THREE.Matrix4().makeRotationY(rotationR);
                const rotMatrixZ = new THREE.Matrix4().makeRotationZ(rotationS);
                this.tempMatrix.identity();
                this.tempMatrix.multiply(rotMatrixY);
                this.tempMatrix.multiply(rotMatrixZ);
                this.tempQuaternion.setFromRotationMatrix(this.tempMatrix);
            }

            // スケールは固定
            this.tempScale.set(1, 1, 1);

            // Matrix4に変換
            this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
            this.instancedMesh.setMatrixAt(i, this.tempMatrix);

            // 色の設定（毎フレーム元の色に戻してから、選択時のみハイライト）
            const originalColor = this.originalColors[i % this.originalColors.length];

            if (selectedIndex === i + 1) {
                // 選択時: 元の色を2倍明るくする（より目立つように）
                this.tempColor.setHex(originalColor);
                this.tempColor.multiplyScalar(2.0);
                this.instancedMesh.setColorAt(i, this.tempColor);
            } else {
                // 非選択時: 元の色を設定
                this.tempColor.setHex(originalColor);
                this.instancedMesh.setColorAt(i, this.tempColor);
            }
        }

        // 行列の更新を反映
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }
    }

    /**
     * 全衛星の色を更新
     * @param colors 新しい色配列
     */
    updateColors(colors: number[]): void {
        if (!this.instancedMesh) return;

        // 元の色配列を更新
        this.originalColors = [...colors];

        for (let i = 0; i < this.satelliteCount; i++) {
            const color = colors[i % colors.length];
            this.tempColor.setHex(color);
            this.instancedMesh.setColorAt(i, this.tempColor);
        }

        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }
    }

    /**
     * instanceIdから衛星インデックスを取得
     */
    getSatelliteIndexFromInstanceId(instanceId: number): number {
        return this.instanceIdToSatelliteIndex.get(instanceId) ?? -1;
    }

    /**
     * InstancedMeshオブジェクトを取得（レイキャスト用）
     */
    getInstancedMesh(): THREE.InstancedMesh | null {
        return this.instancedMesh;
    }

    /**
     * 基準衛星メッシュを取得（レイキャスト用）
     */
    getCenterSatelliteMesh(): THREE.Mesh {
        return this.centerSatelliteMesh;
    }

    /**
     * リソースを解放
     */
    dispose(): void {
        if (this.instancedMesh) {
            this.scene.remove(this.instancedMesh);
            this.instancedMesh.geometry.dispose();
            if (Array.isArray(this.instancedMesh.material)) {
                this.instancedMesh.material.forEach(mat => mat.dispose());
            } else {
                this.instancedMesh.material.dispose();
            }
            this.instancedMesh = null;
        }
    }

    /**
     * 完全なクリーンアップ（基準衛星含む）
     */
    disposeAll(): void {
        this.dispose();

        // 基準衛星のクリーンアップ
        this.scene.remove(this.centerSatelliteMesh);
        this.centerSatelliteMesh.geometry.dispose();
        if (Array.isArray(this.centerSatelliteMesh.material)) {
            this.centerSatelliteMesh.material.forEach(mat => mat.dispose());
        } else {
            this.centerSatelliteMesh.material.dispose();
        }
    }
}
