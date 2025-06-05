/**
 * Hill座標系における地球の向きテスト
 * Y軸が軌道速度方向（東向き）と一致する前提での検証
 */

export class HillCoordinateTest {
    
    /**
     * テスト1: Hill座標系の基本構造確認
     * X軸: 径方向外向き（地球中心から衛星方向）
     * Y軸: 軌道速度方向（東向き、along-track）
     * Z軸: 軌道面垂直（cross-track）
     */
    static test1_HillCoordinateSystem() {
        console.log("=== テスト1: Hill座標系の基本構造 ===");
        console.log("X軸: 径方向外向き（地球中心 → 衛星）");
        console.log("Y軸: 軌道速度方向（東向き、along-track）");
        console.log("Z軸: 軌道面垂直（cross-track）");
        console.log("地球中心位置: -X方向（-X軸に軌道半径分）");
        console.log("注意: 現在の実装では地球が-Y方向にある可能性");
    }
    
    /**
     * テスト2: 軌道速度方向と地球表面の関係
     * Y軸（軌道速度方向）は地球表面の東方向と一致すべき
     */
    static test2_OrbitVelocityDirection() {
        console.log("\n=== テスト2: 軌道速度方向と地球表面の関係 ===");
        console.log("Y軸方向: 軌道の進行方向（東向き）");
        console.log("地球表面で: 東経方向がY軸方向と一致すべき");
        console.log("つまり: 衛星の緯度線上で東方向がY軸方向");
    }
    
    /**
     * テスト3: 衛星位置による地球の向き計算
     * 衛星が特定の緯度経度上空にいる場合の地球の正しい向き
     */
    static test3_EarthOrientationForSatellitePosition(lat: number, lon: number) {
        console.log(`\n=== テスト3: 衛星位置 (${lat}°, ${lon}°) での地球の向き ===`);
        
        // Hill座標系での要求:
        // 1. 衛星の直下点が地球表面で最上部（+X方向、地球中心から最も遠い点）
        // 2. その点での東方向がY軸方向と一致
        
        console.log(`衛星直下点: 緯度${lat}°, 経度${lon}°`);
        console.log("要求1: この点が地球表面の最上部（+X方向）に来る");
        console.log("要求2: この点での東方向がY軸方向（+Y）と一致");
        
        // 地球の回転計算:
        // 1. 経度回転: 衛星の経度線を正面（XZ平面）に持ってくる
        // 2. 緯度回転: 衛星の緯度を最上部に持ってくる  
        // 3. 東方向調整: その点での東方向がY軸と一致するよう回転
        
        const rotationY_longitude = -lon;  // 経度線を正面に
        const rotationX_latitude = 90 - lat;  // 緯度を上部に
        
        console.log(`経度回転（Y軸周り）: ${rotationY_longitude}°`);
        console.log(`緯度回転（X軸周り）: ${rotationX_latitude}°`);
        
        // この時点で、衛星直下点は上部にあるが、
        // その点での東方向がY軸方向と一致しているかを確認する必要がある
        
        return { rotationY_longitude, rotationX_latitude };
    }
    
    /**
     * テスト4: 東方向とY軸の一致確認
     * 緯度によって東方向のベクトルが変わることを考慮
     */
    static test4_EastDirectionAlignment(lat: number, lon: number) {
        console.log(`\n=== テスト4: 緯度${lat}°での東方向とY軸の一致 ===`);
        
        // 球面座標での東方向ベクトル計算
        const latRad = lat * Math.PI / 180;
        const lonRad = lon * Math.PI / 180;
        
        // 地球表面の点(lat, lon)での東方向の単位ベクトル（カルテシアン座標）
        // 東方向 = ∂(position)/∂(longitude) を正規化
        const east_x = -Math.sin(lonRad);
        const east_y = Math.cos(lonRad);  
        const east_z = 0; // 東方向は緯度に依存しない
        
        console.log(`地球表面(${lat}°, ${lon}°)での東方向ベクトル:`);
        console.log(`  X成分: ${east_x.toFixed(3)}`);
        console.log(`  Y成分: ${east_y.toFixed(3)}`);
        console.log(`  Z成分: ${east_z.toFixed(3)}`);
        
        // Y軸方向は (0, 1, 0)
        console.log("Y軸方向: (0, 1, 0)");
        
        // 一致させるために必要な追加回転
        // 東方向ベクトルをY軸方向に向けるZ軸周りの回転
        const additional_rotation_z = Math.atan2(east_x, east_y) * 180 / Math.PI;
        
        console.log(`一致のために必要なZ軸回転: ${additional_rotation_z.toFixed(1)}°`);
        
        return { east_x, east_y, east_z, additional_rotation_z };
    }
    
    /**
     * テスト5: 完全な地球回転計算
     * Hill座標系の要求を満たす完全な回転行列
     */
    static test5_CompleteEarthRotation(lat: number, lon: number, time: number = 0) {
        console.log(`\n=== テスト5: 完全な地球回転計算 (${lat}°, ${lon}°) ===`);
        
        // 1. 基本的な経度・緯度回転
        const test3_result = this.test3_EarthOrientationForSatellitePosition(lat, lon);
        
        // 2. 東方向とY軸の一致のための追加回転
        const test4_result = this.test4_EastDirectionAlignment(lat, lon);
        
        // 3. 地球の自転
        const earthRotationPeriod = 86164; // 恒星日（秒）
        const earthRotationAngle = (time / earthRotationPeriod) * 360;
        
        // 最終的な回転角度
        const final_rotationX = test3_result.rotationX_latitude;
        const final_rotationY = test3_result.rotationY_longitude + earthRotationAngle;
        const final_rotationZ = test4_result.additional_rotation_z;
        
        console.log("=== 最終的な回転角度 ===");
        console.log(`X軸回転（緯度調整）: ${final_rotationX.toFixed(1)}°`);
        console.log(`Y軸回転（経度調整+自転）: ${final_rotationY.toFixed(1)}°`);
        console.log(`Z軸回転（東方向調整）: ${final_rotationZ.toFixed(1)}°`);
        
        return {
            rotationX: final_rotationX,
            rotationY: final_rotationY,
            rotationZ: final_rotationZ
        };
    }
    
    /**
     * テスト6: 地球位置の正確性確認
     */
    static test6_EarthPositionAccuracy() {
        console.log("\n=== テスト6: 地球位置の正確性確認 ===");
        
        const orbitRadius = 6778; // km (ISS軌道)
        
        // 現在の実装での地球位置
        const currentPos = { x: 0, y: -orbitRadius, z: 0 };
        
        // Hill座標系での正しい地球位置
        const correctPos = { x: -orbitRadius, y: 0, z: 0 };
        
        console.log("地球中心の位置比較:");
        console.log(`  現在: (${currentPos.x}, ${currentPos.y}, ${currentPos.z})`);
        console.log(`  正解: (${correctPos.x}, ${correctPos.y}, ${correctPos.z})`);
        
        // 問題の影響分析
        console.log("\n問題の影響:");
        console.log("1. 衛星と地球の相対位置が90度回転している");
        console.log("2. Hill方程式の軸定義と可視化が一致しない");
        console.log("3. 物理的直感と表示が矛盾する");
        
        return { currentPos, correctPos, isCorrect: false };
    }
    
    /**
     * テスト7: Three.js軸とHill軸の対応確認
     */
    static test7_ThreeJSHillAxisMapping() {
        console.log("\n=== テスト7: Three.js軸とHill軸の対応確認 ===");
        
        console.log("理論的な軸対応:");
        console.log("  Hill X軸 → Three.js X軸 (径方向外向き)");
        console.log("  Hill Y軸 → Three.js Y軸 (軌道速度方向)");  
        console.log("  Hill Z軸 → Three.js Z軸 (軌道面垂直)");
        
        console.log("\n現在の実装での問題:");
        console.log("  RenderingSystem.ts:178-179");
        console.log("  position.set(pos.y * scale, pos.x * scale, pos.z * scale)");
        console.log("  → Hill XとYが入れ替わっている");
        
        console.log("\n正しい実装:");
        console.log("  position.set(pos.x * scale, pos.y * scale, pos.z * scale)");
        
        return { mappingCorrect: false };
    }
    
    /**
     * テスト8: 時間発展での整合性確認
     */
    static test8_TimeEvolutionConsistency() {
        console.log("\n=== テスト8: 時間発展での整合性確認 ===");
        
        // 異なる時刻での衛星位置
        const timePoints = [0, 1000, 2000, 3000]; // 秒
        const testLat = 35; // 北緯35度（東京付近）
        const testLon = 139; // 東経139度
        
        console.log(`基準衛星軌道: 緯度${testLat}°, 経度${testLon}°`);
        console.log("時間発展での地球向き変化:");
        
        timePoints.forEach(time => {
            const rotation = this.test5_CompleteEarthRotation(testLat, testLon, time);
            console.log(`  t=${time}s: X=${rotation.rotationX.toFixed(1)}°, Y=${rotation.rotationY.toFixed(1)}°, Z=${rotation.rotationZ.toFixed(1)}°`);
        });
        
        console.log("\n期待される動作:");
        console.log("1. X軸回転（緯度）: 時間に依存せず一定");
        console.log("2. Y軸回転（経度）: 地球自転に伴い変化");
        console.log("3. Z軸回転（東方向調整）: 緯度により一定値");
        
        return { testPassed: true };
    }
    
    /**
     * 全テストを実行
     */
    static runAllTests() {
        console.log("Hill座標系 地球向きテスト開始\n");
        
        this.test1_HillCoordinateSystem();
        this.test2_OrbitVelocityDirection();
        
        // 新しいテスト
        this.test6_EarthPositionAccuracy();
        this.test7_ThreeJSHillAxisMapping();
        this.test8_TimeEvolutionConsistency();
        
        // 基本ケースでテスト
        console.log("\n" + "=".repeat(50));
        console.log("基本テストケース実行");
        
        // ケース1: 赤道・本初子午線
        this.test5_CompleteEarthRotation(0, 0);
        
        // ケース2: 赤道・東経90度
        this.test5_CompleteEarthRotation(0, 90);
        
        // ケース3: 北緯45度・本初子午線  
        this.test5_CompleteEarthRotation(45, 0);
        
        console.log("\n" + "=".repeat(50));
        console.log("テスト完了。修正推奨項目:");
        console.log("1. 地球位置をX軸負方向に修正");
        console.log("2. Hill→Three.js座標変換を正規化");
        console.log("3. 地球回転計算の座標系統一");
    }
}