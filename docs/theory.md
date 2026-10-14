# HCW 方程式の理論

本書では、本アプリケーションが扱う Hill-Clohessy-Wiltshire（HCW）方程式の前提、導出の概略、解析解と相対運動の性質をまとめる。

## 1. 概要

HCW 方程式は、円軌道上を運動する基準衛星（ターゲット、chief）に対する近傍衛星（チェイサー、deputy）の相対運動を記述する線形常微分方程式である。G. W. Hill が月の運動論（1878 年）で導いた式を、W. H. Clohessy と R. S. Wiltshire が 1960 年に衛星のランデブー問題へ適用した。Hill 方程式、Clohessy-Wiltshire（CW）方程式とも呼ばれる。

ランデブー・ドッキング、編隊飛行、軌道上サービスなど、近接運用の解析と誘導制御設計の基礎として広く用いられている。

## 2. 座標系

### 2.1 Hill 座標系（LVLH / RSW）

基準衛星を原点とし、基準衛星の軌道運動とともに回転する右手系である。

| 軸 | 名称 | 向き |
| --- | --- | --- |
| $x$（R） | Radial | 地球中心から基準衛星へ向かう方向（外向きが正） |
| $y$（S） | Along-track | 軌道面内で $x$ 軸に直交し、軌道の進行方向 |
| $z$（W） | Cross-track | 軌道面の法線方向（軌道角運動量ベクトルの向き） |

### 2.2 3D 表示との対応

3D 表示（Three.js）では、R 軸を画面の上方向に取るため、Hill 座標を次のように割り当てている（`src/simulation/FrameTransforms.ts` の `rswToThree`）。

| Three.js | Hill 座標 |
| --- | --- |
| $X$ | W（Cross-track） |
| $Y$ | R（Radial） |
| $Z$ | S（Along-track） |

座標系の詳細と変換式は [座標系と座標変換](coordinate.md) を参照。

## 3. 前提条件

1. 基準衛星は円軌道上を運動する。
2. 近傍衛星と基準衛星の距離は軌道半径に比べて十分小さい（$|\boldsymbol{\rho}| \ll R_0$）。
3. 地球の重力場は点質量による中心力場とする。
4. 外乱力は無視する（必要に応じて外力項として加える）。

## 4. 運動方程式の導出

慣性座標系での 2 体問題の運動方程式

$$
\ddot{\mathbf{r}} = -\frac{\mu}{|\mathbf{r}|^3}\,\mathbf{r}
$$

から出発し、角速度 $\boldsymbol{\Omega}$ で回転する Hill 座標系に移ると、相対位置 $\boldsymbol{\rho} = [x, y, z]^\top$ について

$$
\ddot{\boldsymbol{\rho}} + 2\boldsymbol{\Omega} \times \dot{\boldsymbol{\rho}} + \dot{\boldsymbol{\Omega}} \times \boldsymbol{\rho} + \boldsymbol{\Omega} \times (\boldsymbol{\Omega} \times \boldsymbol{\rho}) = \mathbf{a}_{\mathrm{rel}}
$$

を得る。ここで

- $\boldsymbol{\Omega} = [0, 0, n]^\top$: 軌道角速度ベクトル（円軌道では $\dot{\boldsymbol{\Omega}} = \mathbf{0}$）
- $n = \sqrt{\mu / R_0^3}$: 平均運動
- $\mu = 3.986004418 \times 10^{14}\ \mathrm{m^3/s^2}$: 地球の重力定数
- $R_0$: 基準衛星の軌道半径

である。右辺の重力差 $\mathbf{a}_{\mathrm{rel}}$ を $|\boldsymbol{\rho}| / R_0$ について 1 次まで展開（線形化）すると、HCW 方程式が得られる。

## 5. HCW 方程式

$$
\begin{aligned}
\ddot{x} - 2n\dot{y} - 3n^2x &= a_x &&\text{(Radial)}\\
\ddot{y} + 2n\dot{x} &= a_y &&\text{(Along-track)}\\
\ddot{z} + n^2z &= a_z &&\text{(Cross-track)}
\end{aligned}
$$

$a_x, a_y, a_z$ は推力や外乱による加速度であり、自由運動では 0 とする。各項の物理的意味は次のとおりである。

| 項 | 意味 |
| --- | --- |
| $3n^2 x$ | 重力傾斜（潮汐）と遠心力の合力 |
| $2n\dot{y}$, $2n\dot{x}$ | コリオリ力 |
| $n^2 z$ | 面外方向の復元力 |

## 6. 解析解

初期状態を $(x_0, y_0, z_0, \dot{x}_0, \dot{y}_0, \dot{z}_0)$ とすると、自由運動の解は次のとおりである。

**位置**

$$
\begin{aligned}
x(t) &= -\left(3x_0 + \frac{2\dot{y}_0}{n}\right)\cos nt + \frac{\dot{x}_0}{n}\sin nt + \left(4x_0 + \frac{2\dot{y}_0}{n}\right)\\
y(t) &= \left(6x_0 + \frac{4\dot{y}_0}{n}\right)\sin nt + \frac{2\dot{x}_0}{n}\cos nt - (6nx_0 + 3\dot{y}_0)\,t + \left(y_0 - \frac{2\dot{x}_0}{n}\right)\\
z(t) &= z_0\cos nt + \frac{\dot{z}_0}{n}\sin nt
\end{aligned}
$$

**速度**

$$
\begin{aligned}
\dot{x}(t) &= (3nx_0 + 2\dot{y}_0)\sin nt + \dot{x}_0\cos nt\\
\dot{y}(t) &= (6nx_0 + 4\dot{y}_0)\cos nt - 2\dot{x}_0\sin nt - (6nx_0 + 3\dot{y}_0)\\
\dot{z}(t) &= -nz_0\sin nt + \dot{z}_0\cos nt
\end{aligned}
$$

積分定数による表現と、初期状態から積分定数を求める公式は [周期解と積分定数](periodic-solution.md) にまとめている。

## 7. 相対運動の性質

### 7.1 面内運動（$x$-$y$ 平面）

- $x$（Radial）と $y$（Along-track）の運動は互いに結合している。
- 軌道周期 $2\pi/n$ の周期運動（長軸が $y$ 方向、軸比 2:1 の楕円）に、$y$ 方向の永年項 $-(6nx_0 + 3\dot{y}_0)\,t$ によるドリフトが重なる。
- ドリフトは軌道長半径の差に起因する。$\Delta a = 4x_0 + 2\dot{y}_0/n$ とすると、ドリフト速度は $-\tfrac{3}{2}n\,\Delta a = -(6nx_0 + 3\dot{y}_0)$ である。

### 7.2 面外運動（$z$ 方向）

- 面内運動とは独立している。
- 周期 $2\pi/n$（軌道周期と同じ）の単振動である。

### 7.3 代表的な軌道

**周期軌道（ドリフトなし）**

永年項が消える条件は

$$
\dot{y}_0 = -2nx_0
$$

である。このとき相対軌道は軌道周期ごとに閉じる。

**円軌道（基準衛星からの距離が一定）**

周期条件に加えて $z_0 = \sqrt{3}\,x_0$、$\dot{z}_0 = \sqrt{3}\,\dot{x}_0$ を満たすと、相対軌道は基準衛星を中心とする半径一定の円になる。円の半径 $r$、位相 $\varphi$ を用いると

$$
\begin{aligned}
x_0 &= \frac{r}{2}\cos\varphi, & \dot{x}_0 &= \frac{rn}{2}\sin\varphi,\\
y_0 &= r\sin\varphi, & \dot{y}_0 &= -rn\cos\varphi,\\
z_0 &= \frac{\sqrt{3}\,r}{2}\cos\varphi, & \dot{z}_0 &= \frac{\sqrt{3}\,rn}{2}\sin\varphi
\end{aligned}
$$

と書ける。このとき $x^2 + y^2 + z^2 = r^2$ が常に成り立つ。Radial 方向の振幅は $r/2$ であり、円軌道面は軌道面に対して傾いている。

**V-bar 接近**

基準衛星の進行方向の前後（Along-track 軸上、$x_0 = 0$）から接近する方式である。V-bar 上の点は自由運動でも静止点となるため保持が容易で、ISS への補給機・有人機の最終接近などで用いられる。本アプリケーションでは後方（$-S$）に並べ、基準衛星へ向かう速度を与える。

**R-bar 接近**

基準衛星の真下（地球側、$x_0 < 0$）から Radial 軸に沿って接近する方式である。R-bar 上の点は自由運動では静止せず、軸上を保つには継続的な制御が必要になる。一方で、軌道力学的な減速効果により接近速度を抑えやすい。HTV（こうのとり）は R-bar 接近の後、ISS のロボットアームで把持された。

### 7.4 保存量

HCW 方程式の自由運動には、次の Jacobi 積分に相当する保存量が存在する。

$$
C = \dot{x}^2 + \dot{y}^2 + \dot{z}^2 - 3n^2x^2 + n^2z^2 = \text{const.}
$$

## 8. 適用範囲と制限

1. **相対距離**: 線形化の誤差は相対距離とともに増大する。目安として軌道半径の 1% 程度以下で用いる。
2. **離心率**: 基準軌道は円軌道を仮定している。楕円軌道には Tschauner-Hempel 方程式や Yamanaka-Ankersen の状態遷移行列などの拡張が必要である。
3. **摂動**: 古典的な HCW 方程式は J2 摂動を含まない。本アプリケーションでは Schweighart-Sedwick モデルによる J2 の取り込みを選択できる（[J2 摂動モデル](j2-perturbation.md)）。
4. **非線形効果**: 相対距離や相対速度が大きい場合は精度が低下する。
5. **大気抵抗・太陽輻射圧**: モデル化していない。

## 9. 本アプリケーションでの実装

### 9.1 数値積分

- 4 次の Runge-Kutta 法で状態（位置・速度）を積分する（`src/simulation/HillEquationSolver.ts`）。
- 基本の刻み幅は 0.1 s で、時間倍率が大きいときは描画 1 フレームあたりの計算量を抑えるため刻み幅を広げる（`src/engine/SimulationEngine.ts`）。

### 9.2 配置パターン

衛星グループごとに次の 13 種類の配置パターンを選択できる（`src/formation/layerForm.ts`）。

| 分類 | パターン |
| --- | --- |
| 基本配置 | 単独（1 機）、軸上、立方格子 |
| ランダム | ランダム位置、ランダム位置・速度、ランダム周期軌道 |
| 周期軌道 | 楕円軌道（係数指定）、円軌道 |
| 円盤 | 円盤（六角格子）、円盤（正方格子）、円盤（同心リング） |
| 接近 | V-bar 接近、R-bar 接近 |

円盤配置のアルゴリズムは [円盤配置の生成](disk-orbit.md) を参照。

## 参考文献

1. Hill, G. W., "Researches in the Lunar Theory," *American Journal of Mathematics*, Vol. 1, No. 1, 1878, pp. 5–26.
2. Clohessy, W. H., and Wiltshire, R. S., "Terminal Guidance System for Satellite Rendezvous," *Journal of the Aerospace Sciences*, Vol. 27, No. 9, 1960, pp. 653–658.
3. Vallado, D. A., *Fundamentals of Astrodynamics and Applications*, 4th ed., Microcosm Press, 2013.
4. Alfriend, K. T., et al., *Spacecraft Formation Flying: Dynamics, Control and Navigation*, Elsevier, 2010.
5. Fehse, W., *Automated Rendezvous and Docking of Spacecraft*, Cambridge University Press, 2003.
6. Wiesel, W. E., *Spaceflight Dynamics*, 3rd ed., Aphelion Press, 2010.
