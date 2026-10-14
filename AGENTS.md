# AGENTS.md

このリポジトリで作業する AI コーディングエージェント（Claude Code, Codex など）向けのガイド。
`CLAUDE.md` はこのファイルへのシンボリックリンク（Vite+ の `vp config --agent` と同じ構成）なので、編集はこのファイルに対して行う。

## Commands

ツールチェーンは [Vite+](https://viteplus.dev/)（`vite-plus`、CLI は `vp`）。パッケージマネージャは bun（`bun.lock` から自動判定される）。

```bash
vp install           # 依存関係のインストール（bun install を呼ぶ）
vp dev               # 開発サーバー (http://localhost:3000)
vp check             # フォーマット + lint + 型チェック（vp check --fix で自動修正）
vp test              # テスト (Vitest)
vp run build         # 型チェック + 本番ビルド (dist/)。package.json の build スクリプト
vp preview           # 本番ビルドのプレビュー
```

- `vp build` は Vite のビルドだけを行う組み込みコマンド。CI・Vercel と同じ「型チェック込みのビルド」は `vp run build`（= `bun run build`）
- グローバルの `vp` が無い環境ではプロジェクト内の CLI を `bunx vp <command>` で使う。`package.json` のスクリプトは組み込みコマンドと重複しないもの（`build`）だけ置く
- 設定は `vite.config.ts` に集約（Vite / Vitest `test` / Oxlint `lint` / Oxfmt `fmt`）。`vite` は `@voidzero-dev/vite-plus-core` へエイリアスされている。ツールのバージョンは `vp toolchain` で確認できる
- `@/*` の import エイリアスは `tsconfig.json` の `paths` が唯一の定義（Vite 側は `resolve.tsconfigPaths`）。tsconfig は `src` と `vite.config.ts` を 1 つでまとめて型チェックする
- フォーマット規約: 4 スペース・シングルクォート・120 桁（JSON/HTML/CSS は 2 スペース）。`src/components/ui/` は shadcn 生成コードなので対象外
- Node は `^22.18.0 || ^24.11.0 || >=26` が必要
- 変更後は `vp check` と `vp test` を通すこと

shadcn/ui コンポーネントの追加: `vpx shadcn@latest add <component>`（`src/components/ui/` に生成される）

## Deployment

Vercel（チーム: `interstellar-technologies-inc`）の Git 連携でデプロイする。
`main` への push で本番、PR ごとにプレビューがデプロイされる。
`vercel.json` は Vite プリセット（出力 `dist`、ビルドは `package.json` の `build`）と bun の frozen install だけを指定している。Vercel ダッシュボード側のプリセットは「Other」なので、`vercel.json` を消すとビルドが壊れる点に注意

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
   - `src/formation/` フォーメーション定義・生成（`formationConfig.ts` は設定操作・検証・JSON 入出力、`layerForm.ts` はレイヤー編集フォームの純粋関数、`scenarios.ts` は学習用シナリオのプリセット）。UI 上ではレイヤーを「衛星グループ」と呼ぶ
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

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
