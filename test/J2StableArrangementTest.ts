/**
 * J2安定配置の数値検証テスト
 *
 * このテストでは、J2摂動を考慮した場合の安定配置が
 * 複数軌道周期にわたってドリフトしないことを検証します。
 */

import { HillEquationSolver } from '../src/simulation/HillEquationSolver.js';
import { OrbitInitializer } from '../src/simulation/OrbitInitializer.js';
import { Satellite } from '../src/simulation/Satellite.js';

export class J2StableArrangementTest {

    /**
     * テスト1: SS係数の計算が正しいことを確認
     */
    static test1_SSCoefficientCalculation() {
        console.log("=== テスト1: SS係数の計算 ===");

        // LEO軌道のパラメータ（高度400km）
        const altitude = 400000; // m
        const R_EARTH = 6378137.0; // m
        const r0 = R_EARTH + altitude;
        const inclination = 51.6 * Math.PI / 180; // ISS軌道傾斜角
        const n = Math.sqrt(3.986004418e14 / (r0 ** 3)); // 平均運動

        const solver = new HillEquationSolver(n);
        solver.setOrbitParameters(r0, inclination);
        solver.setJ2Perturbation(true);

        const coeff = solver.getSSCoefficient();
        console.log(`基準軌道半径: ${r0.toFixed(0)} m`);
        console.log(`軌道傾斜角: ${(inclination * 180 / Math.PI).toFixed(2)}°`);
        console.log(`平均運動 n: ${n.toFixed(8)} rad/s`);
        console.log(`SS係数 s: ${coeff.s.toFixed(8)}`);
        console.log(`SS係数 c: ${coeff.c.toFixed(8)}`);

        // 検証: c > 1 であること（J2摂動による補正）
        if (coeff.c > 1.0 && coeff.c < 1.01) {
            console.log("✓ SS係数が妥当な範囲内（1.0 < c < 1.01）");
            return true;
        } else {
            console.error(`✗ SS係数が範囲外: c = ${coeff.c}`);
            return false;
        }
    }

    /**
     * テスト2: 初期速度検証関数が正しく動作することを確認
     */
    static test2_InitialVelocityVerification() {
        console.log("\n=== テスト2: 初期速度検証関数 ===");

        const altitude = 400000;
        const R_EARTH = 6378137.0;
        const r0 = R_EARTH + altitude;
        const inclination = 51.6 * Math.PI / 180;
        const n = Math.sqrt(3.986004418e14 / (r0 ** 3));

        const solver = new HillEquationSolver(n);
        solver.setOrbitParameters(r0, inclination);
        solver.setJ2Perturbation(true);

        const x0 = 100.0; // m
        const vy0_stable = solver.computeStableVy0(x0);

        console.log(`x0 = ${x0} m`);
        console.log(`安定な vy0 = ${vy0_stable.toFixed(6)} m/s`);
        console.log(`-2ncx0 = ${(-2 * n * solver.getSSCoefficientC() * x0).toFixed(6)} m/s`);

        // 検証
        const isValid = solver.verifyStableInitialVelocity(x0, vy0_stable, 1e-9);
        if (isValid) {
            console.log("✓ 初期速度検証関数が正しく動作");
            return true;
        } else {
            console.error("✗ 初期速度検証関数が失敗");
            return false;
        }
    }

    /**
     * テスト3: ドリフト定数が0になることを確認
     */
    static test3_DriftConstantZero() {
        console.log("\n=== テスト3: ドリフト定数 K = 0 ===");

        const altitude = 400000;
        const R_EARTH = 6378137.0;
        const r0 = R_EARTH + altitude;
        const inclination = 51.6 * Math.PI / 180;
        const n = Math.sqrt(3.986004418e14 / (r0 ** 3));

        const solver = new HillEquationSolver(n);
        solver.setOrbitParameters(r0, inclination);
        solver.setJ2Perturbation(true);

        const x0 = 50.0;
        const vy0 = solver.computeStableVy0(x0);
        const K = solver.computeDriftConstant(x0, vy0);

        console.log(`ドリフト定数 K = ${K.toFixed(12)} m/s`);

        if (Math.abs(K) < 1e-9) {
            console.log("✓ ドリフト定数が十分小さい（< 1e-9）");
            return true;
        } else {
            console.error(`✗ ドリフト定数が大きすぎる: ${K}`);
            return false;
        }
    }

    /**
     * テスト4: J2安定配置の円盤配置で複数軌道周期のドリフトを検証
     */
    static test4_MultiOrbitDriftVerification() {
        console.log("\n=== テスト4: 複数軌道周期のドリフト検証 ===");

        const altitude = 400000;
        const R_EARTH = 6378137.0;
        const r0 = R_EARTH + altitude;
        const inclination = 51.6 * Math.PI / 180;
        const n = Math.sqrt(3.986004418e14 / (r0 ** 3));
        const T = 2 * Math.PI / n; // 軌道周期

        console.log(`軌道周期: ${(T / 60).toFixed(2)} 分`);

        const solver = new HillEquationSolver(n);
        solver.setOrbitParameters(r0, inclination);
        solver.setJ2Perturbation(true);

        const initializer = new OrbitInitializer(n);
        initializer.setJ2StableArrangement(true, solver.getSSCoefficientC());

        // 六角格子パターンで7個の衛星を生成（中心 + 6個）
        const positions = initializer.generatePositions('hexagonal_disk', 7, 100, 0);

        console.log(`生成された衛星数: ${positions.length}`);

        // 各衛星の初期状態を検証
        let allValid = true;
        positions.forEach((pos, i) => {
            const K = solver.computeDriftConstant(pos.x0, pos.vy0);
            if (Math.abs(K) > 1e-6) {
                console.error(`✗ 衛星${i}: ドリフト定数が大きい K = ${K.toFixed(9)}`);
                allValid = false;
            }
        });

        if (!allValid) {
            console.error("✗ 一部の衛星でドリフト定数が閾値を超えています");
            return false;
        }

        console.log("✓ すべての衛星の初期ドリフト定数が十分小さい");

        // 数値積分で5周期シミュレーション
        const numOrbits = 5;
        const dt = T / 100; // 1周期を100ステップで分割
        const totalSteps = Math.floor(numOrbits * T / dt);

        console.log(`シミュレーション: ${numOrbits}周期、${totalSteps}ステップ`);

        // 中心以外の衛星でテスト（1番目の衛星）
        const testPos = positions[1];
        const satellite = new Satellite(
            testPos.x0, testPos.y0, testPos.z0,
            testPos.vx0, testPos.vy0, testPos.vz0,
            '#ffffff'
        );

        const initialX = satellite.x;
        const initialY = satellite.y;

        // 数値積分
        for (let step = 0; step < totalSteps; step++) {
            solver.rungeKutta4Step(satellite, dt);
        }

        const finalX = satellite.x;
        const finalY = satellite.y;

        const driftX = Math.abs(finalX - initialX);
        const driftY = Math.abs(finalY - initialY);
        const maxRadius = 100; // 初期配置の最大半径

        console.log(`初期位置: x=${initialX.toFixed(3)}, y=${initialY.toFixed(3)} m`);
        console.log(`最終位置: x=${finalX.toFixed(3)}, y=${finalY.toFixed(3)} m`);
        console.log(`X方向ドリフト: ${driftX.toFixed(6)} m`);
        console.log(`Y方向ドリフト: ${driftY.toFixed(6)} m`);

        // ドリフト閾値: 初期半径の1%
        const threshold = maxRadius * 0.01;

        if (driftX < threshold && driftY < threshold) {
            console.log(`✓ ${numOrbits}周期後のドリフトが閾値以下（< ${threshold.toFixed(3)} m）`);
            return true;
        } else {
            console.error(`✗ ドリフトが閾値を超えています（閾値: ${threshold.toFixed(3)} m）`);
            return false;
        }
    }

    /**
     * テスト5: J2摂動なしとの比較
     */
    static test5_CompareWithoutJ2() {
        console.log("\n=== テスト5: J2摂動なしとの比較 ===");

        const altitude = 400000;
        const R_EARTH = 6378137.0;
        const r0 = R_EARTH + altitude;
        const inclination = 51.6 * Math.PI / 180;
        const n = Math.sqrt(3.986004418e14 / (r0 ** 3));
        const T = 2 * Math.PI / n;

        // J2摂動なしのソルバー
        const solverNoJ2 = new HillEquationSolver(n);
        solverNoJ2.setJ2Perturbation(false);

        // J2摂動ありのソルバー
        const solverWithJ2 = new HillEquationSolver(n);
        solverWithJ2.setOrbitParameters(r0, inclination);
        solverWithJ2.setJ2Perturbation(true);

        const x0 = 100.0;
        const vy0_noJ2 = solverNoJ2.computeStableVy0(x0);
        const vy0_withJ2 = solverWithJ2.computeStableVy0(x0);

        console.log(`J2なし: vy0 = ${vy0_noJ2.toFixed(6)} m/s`);
        console.log(`J2あり: vy0 = ${vy0_withJ2.toFixed(6)} m/s`);
        console.log(`差: ${(vy0_withJ2 - vy0_noJ2).toFixed(6)} m/s`);
        console.log(`相対差: ${((vy0_withJ2 / vy0_noJ2 - 1) * 100).toFixed(4)}%`);

        // SS係数cの効果を確認
        const c = solverWithJ2.getSSCoefficientC();
        console.log(`SS係数 c = ${c.toFixed(8)}`);
        console.log(`理論的な速度比 = ${c.toFixed(8)}`);

        if (Math.abs(vy0_withJ2 / vy0_noJ2 - c) < 1e-6) {
            console.log("✓ 速度比がSS係数と一致");
            return true;
        } else {
            console.error("✗ 速度比がSS係数と一致しない");
            return false;
        }
    }

    /**
     * すべてのテストを実行
     */
    static runAllTests() {
        console.log("╔════════════════════════════════════════════════════╗");
        console.log("║  J2安定配置 数値検証テスト                        ║");
        console.log("╚════════════════════════════════════════════════════╝\n");

        const results = [
            this.test1_SSCoefficientCalculation(),
            this.test2_InitialVelocityVerification(),
            this.test3_DriftConstantZero(),
            this.test4_MultiOrbitDriftVerification(),
            this.test5_CompareWithoutJ2()
        ];

        console.log("\n╔════════════════════════════════════════════════════╗");
        console.log("║  テスト結果サマリー                                ║");
        console.log("╚════════════════════════════════════════════════════╝");

        const passed = results.filter(r => r).length;
        const total = results.length;

        console.log(`\n合格: ${passed}/${total}`);

        if (passed === total) {
            console.log("\n🎉 すべてのテストが合格しました！");
        } else {
            console.warn(`\n⚠️  ${total - passed}個のテストが失敗しました`);
        }

        return passed === total;
    }
}

// ブラウザ環境でグローバルに公開
if (typeof window !== 'undefined') {
    (window as any).J2StableArrangementTest = J2StableArrangementTest;
}
