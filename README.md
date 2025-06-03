# ヒルの方程式シミュレーター

衛星群の相対運動を3D可視化するWebアプリケーション

## 概要

このアプリケーションは、ヒルの方程式（Hill's Equations）を用いて、円軌道上の主衛星に対する近傍衛星の相対運動をシミュレートし、3D空間で可視化します。LVLH座標系（Local Vertical Local Horizontal）での衛星の動きを観察できます。

## 特徴

- 🛰️ リアルタイム3Dシミュレーション
- 📊 2D投影図（XY、XZ、YZ平面）の同時表示
- 🎮 インタラクティブなカメラコントロール
- ⌨️ キーボードショートカット対応
- 🎨 複数の衛星配置パターン（円形、球形、ランダム、直線、螺旋）
- 🕐 時間スケールの調整機能
- 📈 軌跡表示機能

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

## 使い方

### マウス操作
- **ドラッグ**: カメラを回転
- **スクロール**: ズームイン/アウト

### キーボードショートカット
- `Space`: 一時停止/再開
- `R`: シミュレーションをリセット
- `P`: ランダムな摂動を加える
- `V`: 視点を変更
- `T`: 軌跡表示の切り替え
- `G`: グリッド表示の切り替え
- `A`: カメラ自動回転の切り替え
- `+`/`=`: 時間スケールを増加
- `-`/`_`: 時間スケールを減少
- `H`: ヘルプを表示

### コントロールパネル
- **衛星数**: 2〜10個の衛星を配置
- **配置パターン**: 初期配置の形状を選択
- **軌道半径**: 衛星の初期軌道半径
- **Z方向分散**: 軌道面垂直方向の分散
- **時間スケール**: シミュレーション速度の調整
- **軌跡の長さ**: 表示する軌跡の長さ

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

## プロジェクト構成

```
hill-equation/
├── index.html          # メインHTML
├── src/
│   ├── main.ts        # TypeScriptメインファイル
│   └── styles.css     # スタイルシート
├── server.ts          # Bunサーバー
├── package.json       # プロジェクト設定
├── tsconfig.json      # TypeScript設定
├── docs/
│   └── theory.md     # ヒルの方程式の理論的背景
├── TODO.md           # 今後の実装予定
└── README.md         # このファイル
```

## 使用技術

- **Bun**: JavaScriptランタイム・パッケージマネージャー
- **TypeScript**: 型安全なJavaScript
- **Three.js**: 3Dグラフィックスライブラリ
- **Canvas API**: 2Dプロット描画

## ライセンス

MIT License

## 貢献

Issue報告やプルリクエストを歓迎します。

## 理論的背景

詳細な数学的導出と物理的解釈については、[docs/theory.md](docs/theory.md) を参照してください。

## 参考文献

- Clohessy, W. H. and Wiltshire, R. S., "Terminal Guidance System for Satellite Rendezvous," Journal of the Aerospace Sciences, Vol. 27, No. 9, 1960, pp. 653-658.
- Hill, G. W., "Researches in the Lunar Theory," American Journal of Mathematics, Vol. 1, No. 1, 1878, pp. 5-26.
- Vallado, D. A., "Fundamentals of Astrodynamics and Applications," 4th Edition, Microcosm Press, 2013.