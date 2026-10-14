# 🛰️ HCW(Hill-Clohessy-Wiltshire) Equations Visualizer

円軌道上で近接距離（軌道半径の1%以内）にある複数の人工衛星の相対運動を3自由度で可視化するWebアプリケーション。

## 概要

HCW(Hill-Clohessy-Wiltshire) Equations Visualizerは、HCW方程式（Hill's Equations / Clohessy-Wiltshire方程式とも呼ばれる）を用いて、複数の衛星の相対運動をシミュレーションし、3D可視化するWebアプリケーションです。
HCW方程式自体が非線形の運動方程式からテイラー展開の1次近似（線形化）されたものであり、近似モデルとして使える範囲と、3自由度（姿勢は考慮しない位置のみ）の計算であること、外乱には対応していないことに留意が必要。

## 主な特徴

- **シミュレーションモード**: 衛星グループ（軸上・格子・円軌道・円盤軌道など 13 種類の配置パターン）を組み合わせて初期配置を作り、HCW 方程式で相対運動を計算。変更はすぐ 3D に反映
- **CSV 再生モード**: 外部で計算した位置・姿勢（6DOF）の時系列を読み込んで再生（[形式](docs/csv-playback-format.md)）
- J2 摂動（Schweighart-Sedwick 方程式）、J2 安定配置、推力付加・外乱・衝突
- 基準軌道（高度・軌道傾斜角など）の変更と地球表示
- [キーボードショートカット](docs/keyboard-shortcuts.md)・スマホ表示に対応

## 画面の使い方

- 左上のメニューから設定パネルを開き、最上部で **シミュレーション / CSV 再生** を切り替える
  - シミュレーション: 「衛星配置」「軌道・力学」「表示」タブ
  - CSV 再生: 「CSV データ」「表示」タブ
- 下中央の再生バー: 再生 / 一時停止、時間倍率、⏮ で t = 0 に戻す
- 右上: 視点リセット、ヘルプ（ショートカット一覧）
- 衛星をクリックすると選択され、推力付加や位置変更ができる

## 開発

ツールチェーンは [Vite+](https://viteplus.dev/)（CLI は `vp`）、パッケージマネージャは [Bun](https://bun.sh/) です。
Vite+ のグローバル CLI が未導入なら先にインストールしてください（macOS / Linux）。

```bash
curl -fsSL https://vite.plus | bash
```

```bash
vp install     # 依存関係のインストール
vp dev         # 開発サーバー → http://localhost:3000
```

```bash
vp check       # フォーマット・lint・型チェック（--fix で自動修正）
vp test        # テスト（Vitest）
vp run build   # 型チェック + 本番ビルド（dist/）
vp preview     # ビルド結果のプレビュー
```

グローバルの `vp` を入れない場合は `bun install` / `bun run dev` / `bun run build` などでも同じように動きます。

### 技術スタック

Vite+ 1.2（Vite 8 / Vitest 5 / Oxlint / Oxfmt）/ React 19 / TypeScript / Tailwind CSS v4 / shadcn/ui / zustand / Three.js / satellite.js

UI とシミュレーションエンジンの分離方針などの設計は [AGENTS.md](AGENTS.md) を参照してください（`CLAUDE.md` は同じファイルへのリンクです）。

### デプロイ

Vercel（Interstellar Technologies チーム）の Git 連携でデプロイされます。`main` への push で本番、Pull Request ごとにプレビュー環境が作成されます。ビルド設定は `vercel.json`。

## 📚 ドキュメント

### 理論的背景

HCW方程式（Hill-Clohessy-Wiltshire equations）は、円軌道上の主衛星に対する近傍衛星の相対運動を記述します：

$$
\begin{aligned}
\ddot{x} - 2n\dot{y} - 3n^2x &= 0 \quad \text{(Radial方向)}\\
\ddot{y} + 2n\dot{x} &= 0 \quad \text{(Along-track方向)}\\
\ddot{z} + n^2z &= 0 \quad \text{(Cross-track方向)}
\end{aligned}
$$

### 詳細ドキュメント

- **[理論的背景](docs/theory.md)** - HCW方程式の詳細な理論、導出過程、物理的意味、実際の宇宙ミッションでの応用例
- **[座標系変換](docs/coordinate.md)** - ECI、ECEF、LVLH座標系間の変換公式と実装例
- **[周期解と解析解](docs/periodicSolution.md)** - HCW方程式の解析解、周期軌道の条件、初期値から積分定数への変換公式
- **[円盤軌道の初期配置](docs/diskOrbit.md)** - 正六角形タイル張りを用いた衛星群の初期配置アルゴリズム
- **[J2 摂動の影響](docs/impact-of-J2.md)** / **[J2 安定配置](docs/j2-stable-arrangement.md)** - Schweighart-Sedwick 方程式と J2 下でドリフトしない初期条件
- **[CSV 再生フォーマット](docs/csv-playback-format.md)** - CSV 再生モードで読み込むファイルの形式
- **[キーボードショートカット](docs/keyboard-shortcuts.md)** - アプリケーションの操作方法と便利なショートカット一覧
