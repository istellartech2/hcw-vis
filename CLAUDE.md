# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

ツールチェーンは [Vite+](https://viteplus.dev/)（`vite-plus`、CLI は `vp`）。パッケージマネージャは bun。

```bash
bun install          # 依存関係のインストール
bun run dev          # 開発サーバー (http://localhost:3000) = vp dev
bun run check        # フォーマット + lint + 型チェック = vp check（--fix で自動修正）
bun run test         # テスト (Vitest) = vp test
bun run build        # 型チェック + 本番ビルド (dist/) = vp check --no-fmt && vp build
bun run preview      # 本番ビルドのプレビュー
```

- 設定は `vite.config.ts` に集約（Vite / Vitest `test` / Oxlint `lint` / Oxfmt `fmt`）。`vite` は `@voidzero-dev/vite-plus-core` へエイリアスされている
- フォーマット規約: 4 スペース・シングルクォート・120 桁（JSON/HTML/CSS は 2 スペース）。`src/components/ui/` は shadcn 生成コードなので対象外
- Node は `^22.18.0 || ^24.11.0 || >=26` が必要

shadcn/ui コンポーネントの追加: `bunx shadcn@latest add <component>`（`src/components/ui/` に生成される）

## Deployment

Vercel（チーム: `interstellar-technologies-inc`）の Git 連携でデプロイする。
`main` への push で本番、PR ごとにプレビューがデプロイされる。ビルド設定は `vercel.json`。

## Architecture Overview

Hill-Clohessy-Wiltshire (HCW) 方程式による衛星の相対運動を 3D 可視化する Web アプリ。

UI（React）とシミュレーション（Three.js + 物理計算）を **状態ストア** と **エンジンのコマンド** だけで接続している。
デザインを変更するときは `src/features/` と `src/components/` だけを触ればよく、エンジン側は変更不要。

```
React UI (features/*)  ──コマンド呼び出し──▶  SimulationEngine (engine/)
        ▲                                         │
        └──── useAppStore(selector) ◀── appStore ◀┘  テレメトリ書き込み
                                         ▲
                        設定変更 setDisplay / setSimulation（エンジンが購読して反映）
```

### Layers

1. **Domain / 3D（フレームワーク非依存、DOM に触れない）**
   - `src/simulation/` HCW ソルバ、軌道要素、座標変換、CSV パーサ、再生エンジン
   - `src/formation/` フォーメーション定義・生成（`formationConfig.ts` は設定操作・検証・JSON 入出力、`layerForm.ts` はレイヤー編集フォームの純粋関数）。UI 上ではレイヤーを「衛星グループ」と呼ぶ
   - `src/collision/` 衝突検出・応答
   - `src/visualization/` Three.js の描画（`RenderingSystem` は表示設定を `getDisplay()` 経由で受け取る）

2. **Engine** `src/engine/`
   - `SimulationEngine.ts` シーン・メインループ・物理積分を管理。UI からは public メソッド（`resetPositions`, `applyDeltaV`, `applyOrbit`, `loadCsvFile` …）を呼ぶ
   - `CsvPlayback.ts` CSV 再生モード、`CameraController.ts` カメラ操作、`LoadingIndicator.ts` ローディング状態
   - `EngineContext.tsx` React から `useEngine()` でエンジンを取得

3. **State** `src/store/`
   - `appStore.ts` zustand の vanilla store。React では `useAppStore(selector)`、エンジンでは `appStore.getState()`
     - `display` / `simulation`: UI が書き、エンジンが購読
     - `formation`: UI が `updateFormation` で書き、すぐ `engine.resetPositions()` を呼んで反映する（編集画面 `LayerEditor` は入力のたびに自動反映）
     - `simTime` / `referenceInfo` / `selected` / `playback` / `loading`: エンジンが書き、UI が表示
     - `ui`: パネル・ダイアログの開閉状態
   - `settings.ts` 設定の型・既定値・選択肢

4. **UI** `src/features/` (React + shadcn/ui + Tailwind CSS v4)
   - `viewport/` キャンバスとエンジンの生成・破棄
   - `panel/`（左サイドパネル。スマホではボトムシート。最上部でモード「シミュレーション / CSV 再生」を切り替え、モードごとにタブが変わる）
     - シミュレーション: `scenario/FormationSection`（衛星配置）, `scenario/OrbitTab`（軌道・力学）, `display/`（表示）
     - CSV 再生: `csv/`（CSV データ）, `display/`（表示）
     - モードは `useAppMode()`（`playback.active` が真なら常に csv、そうでなければ `ui.mode`）
   - `hud/`（再生バー・選択衛星カードなど 3D ビュー上の浮遊 UI）, `help/`
   - `src/components/` 直下はパネル用の共通部品（`panel-section.tsx`, `controls.tsx`）
   - `src/components/ui/` は shadcn/ui の生成コード（button/slider/sonner はトークンに合わせて調整済み）

### デザイン
兄弟リポジトリ [constellation-vis](https://github.com/istellartech2/constellation-vis) とデザインシステムを共有している。
- 色は `src/index.css` の意味ベースのトークン（`bg-surface`, `bg-raised`, `bg-sunken`, `text-fg-muted`, `border-line`, `bg-brand` …）を使い、生の gray/hex は使わない。shadcn の変数もこのトークンに対応づけている
- UI テーマは `<html data-theme="dark|light">`（`src/lib/uiTheme.ts`）。3D シーンの背景とは独立
- フォントは Inter / JetBrains Mono（数値は `num` ユーティリティで等幅表示）
- レイアウト: 左上メニュー（現在のモードを表示）→ 左パネル（モード切替 + タブ）、右上に視点リセット、下中央に再生バー（`glass` ユーティリティ）

### Technology Stack
- Vite+ 1.2 (Vite 8 / Vitest 5 / Oxlint / Oxfmt) / React 19 / TypeScript
- Tailwind CSS v4 / shadcn/ui (Radix, nova preset) / lucide-react
- zustand（状態管理）
- Three.js 0.160 / satellite.js 6

### Key Concepts
- テストは `src/**/*.test.ts`（Vitest、`import { describe, it, expect } from 'vite-plus/test'`）
- HCW equations model relative motion between satellites in close proximity (within 1% of orbital radius)
- The simulation operates in 3DOF (position only, no attitude); CSV playback supports 6DOF (position + quaternion)
- Hill 座標 (R, S, W) → Three.js 座標は X=W, Y=R, Z=S
