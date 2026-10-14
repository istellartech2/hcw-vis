# HCW Visualizer

Hill-Clohessy-Wiltshire（HCW）方程式にもとづいて、円軌道上で近接する複数衛星の相対運動を 3D で可視化する Web アプリケーションです。

**デモ:** <https://hcw-vis.vercel.app>

## 概要

HCW 方程式（Hill 方程式、Clohessy-Wiltshire 方程式とも呼ばれます）は、円軌道を周回する基準衛星のまわりにある衛星の相対運動を、基準衛星に固定した回転座標系（Hill 座標系 / LVLH 座標系）で記述する線形微分方程式です。本アプリケーションでは、任意の初期配置から相対運動を数値積分し、その軌跡をブラウザ上でインタラクティブに確認できます。

本アプリケーションのモデルには次の前提があります。

- 非線形の運動方程式を 1 次近似（線形化）したモデルであり、相対距離が軌道半径のおおむね 1% 以内の範囲で有効です。
- 基準軌道は円軌道を仮定しています。
- 位置のみを扱う 3 自由度の計算です（姿勢は計算しません）。
- 大気抵抗や太陽輻射圧などの外乱力はモデル化していません。J2 摂動は Schweighart-Sedwick モデルによる拡張として選択できます。

## 主な機能

| 機能 | 内容 |
| --- | --- |
| シミュレーション | 13 種類の配置パターン（軸上・格子・周期軌道・円軌道・円盤・V-bar / R-bar 接近など）を「衛星グループ」として組み合わせて初期配置を作成し、HCW 方程式で相対運動を計算します。設定の変更は即座に 3D 表示へ反映されます。 |
| 学習シナリオ | 「ドリフトしない条件」「面外の振動」など、相対運動の基本的な性質を確認できるプリセットを用意しています。 |
| 力学モデル | J2 摂動（Schweighart-Sedwick 方程式）、J2 摂動下でドリフトしない初期配置、全衛星へのランダムな速度摂動の付加、衛星間の衝突検出（弾性衝突）に対応しています。 |
| 操作 | 選択した衛星への推力（Δv）付加と位置変更ができます。 |
| 基準軌道 | 高度・軌道傾斜角などの基準軌道を変更でき、地球を合わせて表示できます。 |
| CSV 再生 | 外部ツールで計算した位置・姿勢（6 自由度）の時系列データを読み込んで再生します。形式は [CSV 再生フォーマット](docs/csv-playback-format.md) を参照してください。 |

キーボードショートカット（[一覧](docs/keyboard-shortcuts.md)）とスマートフォン表示にも対応しています。

## 使い方

1. 左上のメニューから設定パネルを開き、パネル上部でモード（**シミュレーション** / **CSV 再生**）を選択します。
   - シミュレーション: 「衛星配置」「軌道・力学」「表示」タブ
   - CSV 再生: 「CSV データ」「表示」タブ
2. 画面下部の再生バーで、再生 / 一時停止、時間倍率の変更、t = 0 への巻き戻しを行います。
3. 右上の「学習シナリオ」からプリセットを読み込めます。視点のリセットとヘルプ（ショートカット一覧）も右上にあります。
4. 衛星をクリックして選択すると、推力付加や位置変更を行えます。

## ドキュメント

| ドキュメント | 内容 |
| --- | --- |
| [HCW 方程式の理論](docs/theory.md) | 運動方程式の導出、解析解、相対運動の性質、適用範囲 |
| [周期解と積分定数](docs/periodic-solution.md) | 一般解の積分定数と初期状態の対応、ドリフトしない条件 |
| [座標系と座標変換](docs/coordinate.md) | ECI・ECEF・RSW（LVLH）・Three.js 座標系の定義と変換 |
| [円盤配置の生成](docs/disk-orbit.md) | 六角格子・正方格子を用いた円盤状の初期配置アルゴリズム |
| [J2 摂動モデル](docs/j2-perturbation.md) | Schweighart-Sedwick 方程式による J2 摂動の取り込み |
| [J2 安定配置](docs/j2-stable-arrangement.md) | J2 摂動下でドリフトしない初期条件 |
| [CSV 再生フォーマット](docs/csv-playback-format.md) | CSV 再生モードで読み込むファイルの仕様 |
| [キーボードショートカット](docs/keyboard-shortcuts.md) | 操作方法とショートカット一覧 |
| [satellite.js の利用](docs/satellitejs-guide.md) | 本プロジェクトでの satellite.js の使い方 |

## 開発

### 必要環境

- Node.js `^22.18.0 || ^24.11.0 || >=26`
- [Vite+](https://viteplus.dev/)（CLI: `vp`）
- [Bun](https://bun.sh/)（パッケージマネージャ）

Vite+ のグローバル CLI は次のコマンドでインストールできます（macOS / Linux）。

```bash
curl -fsSL https://vite.plus | bash
```

### セットアップと開発サーバー

```bash
vp install     # 依存関係のインストール
vp dev         # 開発サーバーの起動（http://localhost:3000）
```

### 検証とビルド

```bash
vp check       # フォーマット・lint・型チェック（--fix で自動修正）
vp test        # テスト（Vitest）
vp run build   # 型チェックと本番ビルド（dist/）
vp preview     # 本番ビルドのプレビュー
```

グローバルの `vp` を導入しない場合は、`bun install` の後に `bunx vp dev` のようにプロジェクト内の CLI を使用できます。

### 技術スタック

- Vite+ 1.2（Vite 8 / Vitest 5 / Oxlint / Oxfmt）
- React 19 / TypeScript
- Tailwind CSS v4 / shadcn/ui / lucide-react
- zustand（状態管理）
- Three.js / satellite.js

アーキテクチャ（UI とシミュレーションエンジンの分離方針など）は [AGENTS.md](AGENTS.md) にまとめています。

### ディレクトリ構成

```
src/
├── simulation/     HCW ソルバ、軌道要素、座標変換、衝突、CSV パーサ
├── formation/      衛星配置（フォーメーション）の定義・生成・学習シナリオ
├── visualization/  Three.js による描画
├── engine/         シミュレーションエンジン（メインループ、カメラ、CSV 再生）
├── store/          アプリケーション状態（zustand）
└── features/       React UI（パネル、HUD、ヘルプ）
docs/               理論・仕様ドキュメント
public/samples/     CSV 再生用サンプルデータ
script/             補助スクリプト（MAT ファイルから CSV への変換）
```

### デプロイ

Vercel の Git 連携でデプロイしています。`main` ブランチへの push で本番環境が、Pull Request ごとにプレビュー環境が更新されます。ビルド設定は `vercel.json` にあります。
