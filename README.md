# 🛰️ HCW(Hill-Clohessy-Wiltshire) Equations Visualizer

円軌道上で近接距離（軌道半径の1%以内）にある複数の人工衛星の相対運動を3自由度で可視化するWebアプリケーション。

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-blue)](https://istellartech2.github.io/hcw-vis/)

## 概要

HCW(Hill-Clohessy-Wiltshire) Equations Visualizerは、HCW方程式（Hill's Equations / Clohessy-Wiltshire方程式とも呼ばれる）を用いて、複数の衛星の相対運動をシミュレーションし、3D可視化するWebアプリケーションです。
HCW方程式自体が非線形の運動方程式からテイラー展開の1次近似（線形化）されたものであり、近似モデルとして使える範囲と、3自由度（姿勢は考慮しない位置のみ）の計算であること、外乱には対応していないことに留意が必要。

## 主な特徴

- 各初期配置毎の衛星の相対運動シミュレーション
- 3Dの可視化
- 推力発生や摂動にも対応
- [キーボードショートカット](docs/keyboard-shortcuts.md)対応

## クイックスタート

```bash
# 依存関係のインストール
bun install

# 開発サーバーの起動
bun run dev
```

ブラウザで http://localhost:3000 を開いてください。

### その他のコマンド
```bash
# プロダクションビルド
bun run build

# TypeScriptの型チェック
bun run typecheck
```

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
- **[キーボードショートカット](docs/keyboard-shortcuts.md)** - アプリケーションの操作方法と便利なショートカット一覧
