# 🛰️ ヒルの方程式の理論的背景

## 📖 概要

Hill-Clohessy-Wiltshire方程式（HCW Equations）は、円軌道上を運動する主衛星（ターゲット）に対する、近傍の追跡衛星（チェイサー）の相対運動を記述する線形微分方程式です。これらの方程式は、1878年にHillによって導出され、1960年にClohessyとWiltshireによって衛星のランデブー問題に適用され、Hillの方程式もしくはClohessy-Wiltshire（CW）方程式とも呼ばれます。

現代の宇宙ミッションにおいて、国際宇宙ステーション（ISS）への補給ミッション、衛星の編隊飛行、軌道上サービシングなどで広く活用されています。

## 座標系の定義

### LVLH座標系（Local Vertical Local Horizontal）

ターゲット衛星を原点とする右手系座標系：

- **x軸（Radial）**: 地心からターゲット衛星への方向（外向き正）
- **y軸（Along-track）**: 軌道面内でx軸に垂直、軌道進行方向に近い方向
- **z軸（Cross-track）**: 軌道面に垂直、x軸とy軸の外積方向（軌道角運動量ベクトル方向）

### Three.jsとの座標軸の違い

**重要**: Three.jsと物理学/宇宙工学では軸定義が異なります：

| 軸 | 物理学/宇宙工学 | Three.js |
|---|---|---|
| 上方向 | z軸正 | y軸正 |
| 前方向 | y軸正 | -z軸負 |
| 右方向 | x軸正 | x軸正 |

**座標変換**: 物理座標 → Three.js座標
- x_three = x_physics
- y_three = z_physics  
- z_three = -y_physics

## 基本仮定

1. ターゲット衛星は完全な円軌道上を運動
2. チェイサーはターゲットの近傍に存在（|r| << R₀）
3. 地球の重力場は中心力場
4. 摂動力は無視できる

## 運動方程式の導出

### 慣性座標系から回転座標系への変換

慣性座標系での運動方程式から始めて、LVLH座標系（回転座標系）への変換を行います：

$$
\ddot{\mathbf{r}}_i = -\frac{\mu}{|\mathbf{r}|^3} \cdot \mathbf{r}
$$

LVLH座標系での相対位置ベクトルを $\boldsymbol{\rho} = [x, y, z]^T$ とすると：

$$
\ddot{\boldsymbol{\rho}} + 2\boldsymbol{\Omega} \times \dot{\boldsymbol{\rho}} + \dot{\boldsymbol{\Omega}} \times \boldsymbol{\rho} + \boldsymbol{\Omega} \times (\boldsymbol{\Omega} \times \boldsymbol{\rho}) = \mathbf{a}_{rel}
$$

ここで：
- $\boldsymbol{\Omega} = [0, 0, n]^T$ は軌道角速度ベクトル
- $n = \sqrt{\mu/R_0^3}$ は平均運動（軌道角速度）
- $\mu = 3.986004418 \times 10^{14}$ m$^3$/s$^2$ は地球の重力定数
- $R_0$ はターゲット衛星の軌道半径

### 線形化過程

相対距離が軌道半径に比べて十分小さい（$|\boldsymbol{\rho}| \ll R_0$）という仮定の下で、重力勾配項を展開し線形化を行います。

## ヒルの方程式（Clohessy-Wiltshire方程式）

最終的に得られる線形微分方程式：

$$
\begin{aligned}
\ddot{x} - 2n\dot{y} - 3n^2x &= a_x \quad \text{(Radial方向)}\\
\ddot{y} + 2n\dot{x} &= a_y \quad \text{(Along-track方向)}\\
\ddot{z} + n^2z &= a_z \quad \text{(Cross-track方向)}
\end{aligned}
$$

ここで、$a_x$, $a_y$, $a_z$ は摂動加速度。無摂動の場合（$a_x = a_y = a_z = 0$）：

$$
\begin{aligned}
\ddot{x} - 2n\dot{y} - 3n^2x &= 0 \quad \text{(Radial方向)}\\
\ddot{y} + 2n\dot{x} &= 0 \quad \text{(Along-track方向)}\\
\ddot{z} + n^2z &= 0 \quad \text{(Cross-track方向)}
\end{aligned}
$$

### 各項の物理的意味

- **$3n^2x$**: 重力勾配項（潮汐力）
- **$2n\dot{y}$, $2n\dot{x}$**: コリオリ力項
- **$n^2z$**: Cross-track方向の復元力

## 解析解

### 初期条件

$t = 0$ での初期条件：
- 位置: $(x_0, y_0, z_0)$
- 速度: $(\dot{x}_0, \dot{y}_0, \dot{z}_0)$

### 厳密解

初期条件 $\mathbf{y}_0 = (x_0, y_0, z_0, \dot{x}_0, \dot{y}_0, \dot{z}_0)^T$ に対する解は次のように表される：

**位置の解**:
$$
\begin{aligned}
x(t) &= -(3x_0 + 2\dot{y}_0/n)\cos(nt) + (\dot{x}_0/n)\sin(nt) + (4x_0 + 2\dot{y}_0/n)\\
y(t) &= (6x_0 + 4\dot{y}_0/n)\sin(nt) + (2\dot{x}_0/n)\cos(nt) - (6nx_0 + 3\dot{y}_0)t + (y_0 - 2\dot{x}_0/n)\\
z(t) &= z_0\cos(nt) + (\dot{z}_0/n)\sin(nt)
\end{aligned}
$$

**速度の解**:
$$
\begin{aligned}
\dot{x}(t) &= (3nx_0 + 2\dot{y}_0)\sin(nt) + \dot{x}_0\cos(nt)\\
\dot{y}(t) &= (6nx_0 + 4\dot{y}_0)\cos(nt) - 2\dot{x}_0\sin(nt) - (6nx_0 + 3\dot{y}_0)\\
\dot{z}(t) &= -nz_0\sin(nt) + \dot{z}_0\cos(nt)
\end{aligned}
$$

## 物理的解釈

### 運動の特性

1. **面内運動（x-y平面）**
   - $x$方向（径方向）と$y$方向（軌道進行方向）の運動は結合
   - $y$方向に永年項（secular term）$-6nx_0t - 3\dot{y}_0t$ によるドリフトが発生
   - 周期的な楕円運動が重畳（周期$2\pi/n$）
   - 相対的な半長軸の差 $\Delta a = (4x_0 + 2\dot{y}_0/n)$ により、ドリフト率 $a\Delta n = -(3/2)n\Delta a = -(6nx_0 + 3\dot{y}_0)$

2. **面外運動（z方向）**
   - 他の方向と独立（デカップル）
   - 単純な調和振動
   - 周期 $T = 2\pi/n$（軌道周期と同じ）

### 特殊な軌道

1. **周期軌道**
   - ドリフトなしで閉軌道を描く特殊な初期条件
   - 条件: $\dot{y}_0 = -2nx_0$

2. **円軌道**
   - 条件: $\dot{y}_0 = -2nx_0$, $z_0 = \sqrt{3}x_0$, $\dot{z}_0 = \sqrt{3}\dot{x}_0$
   - 半径 $\rho$ のパラメータ化
     $$
     \begin{aligned}
     x_0 &= \frac{\rho}{\sqrt{5}} \cos(\varphi)\\
     \dot{x}_0 &= \frac{\rho n}{\sqrt{5}} \sin(\varphi)\\
     y_0 &= \frac{2\rho}{\sqrt{5}} \sin(\varphi)\\
     \dot{y}_0 &= -\frac{2\rho n}{\sqrt{5}} \cos(\varphi)\\
     z_0 &= \frac{\sqrt{3} \rho}{\sqrt{5}} \cos(\varphi)\\
     \dot{z}_0 &= \frac{\sqrt{3} \rho n}{\sqrt{5}} \sin(\varphi)
     \end{aligned}
     $$



3. **V-bar軌道（Velocity Vector Bar）**
   - 速度ベクトル方向（Y軸、Along-track）からの接近軌道
   - 宇宙ステーション後方から接近する安全な軌道パターン
   - 制御失敗時に自然に離れる特性により安全性が高い
   - SpaceX Dragon、Soyuz宇宙船のISSへの接近で使用
   - 初期条件例: $x_0 = 0$, $y_0 < 0$（後方配置），適切な接近速度$\dot{y}_0 > 0$

4. **R-bar軌道（Radial Bar）**
   - 径方向（X軸、Radial）からの接近軌道
   - 宇宙ステーション真下（地球側）からの直接接近
   - より直接的だが軌道力学的に不安定
   - 精密な制御と継続的な推力が必要
   - 初期条件例: $x_0 < 0$（下方配置）, $y_0 = 0$, ヒルの方程式結合項を考慮した$\dot{y}_0 = -2nx_0$

### エネルギーと積分

相対運動系では以下の積分が存在：
- Jacobi積分: $C = n^2(3x^2 - z^2) - 2(\dot{x}^2 + \dot{y}^2 + \dot{z}^2)$

## 🚀 応用

### 宇宙ミッション
- **ISS補給ミッション**: SpaceX Dragon、Northrop Grumman Cygnus
- **有人宇宙船**: Soyuz、SpaceX Crew Dragon、Boeing Starliner
- **衛星の編隊飛行**: 地球観測衛星群、GPS衛星
- **軌道上サービシング**: 衛星の燃料補給、修理、寿命延長
- **宇宙デブリ除去**: Active Debris Removal (ADR) ミッション
- **科学ミッション**: 宇宙望遠鏡の精密配置制御

### 実際のミッション事例
1. **SpaceX Dragon (2012-)**: V-bar軌道でのISS接近
2. **Soyuz宇宙船 (1967-)**: 高速ランデブーでのV-bar接近
3. **ESA ATV (2008-2014)**: 自動ランデブー・ドッキングシステム
4. **日本のHTV/HTV-X**: ロボットアームによるキャプチャ方式

### 制御への応用
ヒルの方程式の線形性により、最適制御理論の適用が容易：
- インパルス制御
- 連続推力制御
- 燃料最適化
- LQR制御

## 制限事項と適用範囲

1. **有効範囲**: 相対距離が軌道半径の約1%以下
2. **軌道離心率**: 円軌道のみ（楕円軌道には修正が必要）
3. **摂動**: J2項などの摂動効果は含まれない
4. **非線形効果**: 大きな相対運動では精度が低下
5. **高度**: 低軌道での大気抵抗は考慮されない

## 💻 本シミュレーターでの実装

### 数値積分手法
- **Runge-Kutta 4次法**: 高精度な数値積分
- **適応的時間ステップ**: 計算負荷とと精度のバランス
- **リアルタイム可視化**: Three.jsによる60FPSレンダリング

### 実装されている軌道パターン
1. **基本パターン**: 軸上、格子、ランダム配置
2. **解析的パターン**: 楕円軌道、円軌道
3. **実用パターン**: V-bar軌道、R-bar軌道
4. **カスタマイズ**: Z軸振幅調整、配置範囲変更


## 📚 参考文献

1. **Clohessy, W. H. and Wiltshire, R. S.**, "Terminal Guidance System for Satellite Rendezvous," *Journal of the Aerospace Sciences*, Vol. 27, No. 9, 1960, pp. 653-658.

2. **Hill, G. W.**, "Researches in the Lunar Theory," *American Journal of Mathematics*, Vol. 1, No. 1, 1878, pp. 5-26.

3. **Vallado, D. A.**, "Fundamentals of Astrodynamics and Applications," 4th Edition, Microcosm Press, 2013.

4. **Alfriend, K. T., et al.**, "Spacecraft Formation Flying: Dynamics, Control and Navigation," Elsevier, 2010.

5. **Fehse, W.**, "Automated Rendezvous and Docking of Spacecraft," Cambridge University Press, 2003.

6. **Wiesel, W. E.**, "Spaceflight Dynamics," 3rd Edition, Aphelion Press, 2010.
