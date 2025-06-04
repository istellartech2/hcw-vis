# 🛰️ ヒルの方程式シミュレーター

衛星群の相対運動を3D可視化するWebアプリケーション

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-blue)](https://your-username.github.io/hill-equation/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.160+-green)](https://threejs.org/)

## 📖 概要

このアプリケーションは、ヒルの方程式（Hill's Equations / Clohessy-Wiltshire方程式）を用いて、円軌道上の主衛星に対する近傍衛星の相対運動をシミュレートし、3D空間で可視化します。LVLH座標系（Local Vertical Local Horizontal）での衛星の動きを観察し、実際の宇宙ミッションで使用される軌道パターンを学習できます。

## ✨ 特徴

- 🛰️ **リアルタイム3Dシミュレーション** - Three.jsによる高品質な3D可視化
- 🎮 **インタラクティブな操作** - マウス・キーボードによる直感的な制御
- 🚀 **実用的な軌道パターン** - 実際のミッションで使用される軌道
- 🎨 **多様な初期配置パターン** - 軸上、格子、楕円軌道、円軌道、ランダム配置など

## 必要環境

- [Bun](https://bun.sh/) v1.0以上
- モダンブラウザ（Chrome、Firefox、Safari、Edge）

## インストールと起動

```bash
# 依存関係のインストール
bun install

# 開発サーバーの起動
bun run dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

## 技術仕様

### ヒルの方程式

円軌道上の主衛星に対する近傍衛星の相対運動は、以下の線形化されたヒルの方程式（Clohessy-Wiltshire方程式）に従います：

```
ẍ - 2nẏ - 3n²x = 0   (Radial方向)
ÿ + 2nẋ = 0           (Along-track方向)  
z̈ + n²z = 0          (Cross-track方向)
```

**パラメータ**:
- `n = √(μ/R₀³)`: 主衛星の平均運動（軌道角速度）
- `μ = 3.986004418 × 10¹⁴ m³/s²`: 地球の重力定数
- `R₀`: 主衛星の軌道半径

**物理的意味**:
- `3n²x`: 重力勾配項（潮汐力）
- `2nẏ, 2nẋ`: コリオリ力項
- `n²z`: Cross-track方向の復元力

### 座標系

LVLH座標系（Local Vertical Local Horizontal）を使用：

- **X軸（赤）**: Radial（径方向） - 地心からターゲット衛星に向かう方向（外向き正）
- **Y軸（緑）**: Along-track（軌道進行方向） - ターゲット衛星の速度ベクトル方向
- **Z軸（青）**: Cross-track（軌道面垂直方向） - 軌道角運動量ベクトル方向

**重要**: Three.jsの表示では物理座標系から以下の変換を適用：
- x_display = x_physics
- y_display = z_physics  
- z_display = -y_physics

## 🏗️ プロジェクト構成

```
hill-equation/
├── index.html                    # メインHTML
├── src/
│   ├── main.ts                  # TypeScriptメインファイル
│   ├── styles.css               # スタイルシート
│   ├── models/
│   │   └── Satellite.ts         # 衛星オブジェクトクラス
│   ├── physics/
│   │   ├── HillEquationSolver.ts # ヒルの方程式数値積分
│   │   └── OrbitInitializer.ts   # 初期配置生成クラス
│   ├── ui/
│   │   └── UIControls.ts        # UIコントロール管理
│   └── visualization/
│       ├── PlotRenderer.ts      # 2Dプロット描画
│       └── TrailRenderer.ts     # 軌跡描画
├── docs/
│   └── theory.md               # ヒルの方程式の理論的背景
├── server.ts                   # Bun開発サーバー
├── package.json               # プロジェクト設定
├── tsconfig.json             # TypeScript設定（開発用）
├── tsconfig.prod.json        # TypeScript設定（ビルド用）
├── TODO.md                   # 今後の実装予定
└── README.md                 # このファイル
```

## 📚 理論的背景

詳細な数学的導出と物理的解釈については、[docs/theory.md](docs/theory.md) を参照してください。

## 📖 参考文献

- Clohessy, W. H. and Wiltshire, R. S., "Terminal Guidance System for Satellite Rendezvous," Journal of the Aerospace Sciences, Vol. 27, No. 9, 1960, pp. 653-658.
- Hill, G. W., "Researches in the Lunar Theory," American Journal of Mathematics, Vol. 1, No. 1, 1878, pp. 5-26.
- Vallado, D. A., "Fundamentals of Astrodynamics and Applications," 4th Edition, Microcosm Press, 2013.