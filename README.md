# 🛰️ HCW(Hill-Clohessy-Wiltshire) Equations Visualizer

近接距離にある複数の人工衛星の相対運動を3自由度で可視化するWebアプリケーション。

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-blue)](https://istellartech2.github.io/hcw-vis/)

## 概要

HCW(Hill-Clohessy-Wiltshire) Equations Visualizerは、Hillの方程式（Hill's Equations / Clohessy-Wiltshire方程式）を用いて、複数の衛星の相対運動をシミュレーションし、3D可視化するWebアプリケーションです。HCW方程式がテイラー展開の1次近似（線形化）されたものであり、近似モデルとして使える範囲と、3自由度（姿勢は考慮しない位置のみ）の計算であること、外乱には対応していないことに留意が必要。

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

## 📚 理論的背景

Hillの方程式（Hill-Clohessy-Wiltshire方程式）は、円軌道上の主衛星に対する近傍衛星の相対運動を記述します：

```
ẍ - 2nẏ - 3n²x = 0   (Radial方向)
ÿ + 2nẋ = 0           (Along-track方向)  
z̈ + n²z = 0          (Cross-track方向)
```

詳細な理論については [docs/theory.md](docs/theory.md) を参照してください。
また座標については[docs/corrdinate.md](docs/coordinate.md)を参照。

## 📖 参考文献

- Clohessy, W. H. and Wiltshire, R. S., "Terminal Guidance System for Satellite Rendezvous," Journal of the Aerospace Sciences, Vol. 27, No. 9, 1960
- Hill, G. W., "Researches in the Lunar Theory," American Journal of Mathematics, Vol. 1, No. 1, 1878
- Vallado, D. A., "Fundamentals of Astrodynamics and Applications," 4th Edition, Microcosm Press, 2013

