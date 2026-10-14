# J2 摂動モデル

本書では、地球の扁平（J2 項）による摂動を HCW 方程式に取り込む Schweighart-Sedwick（SS）モデルをまとめる。本アプリケーションでは「軌道・力学」タブの「J2 摂動」を有効にすると、このモデルで相対運動を計算する。実装は `src/simulation/HillEquationSolver.ts` にある。

SS モデルは近円軌道かつ相対距離が小さいことを前提とし、J2 の効果を軌道 1 周にわたって平均化した定数係数として取り込む。係数が時間に依存しない（線形時不変）ため、古典的な HCW 方程式と同じ手法で扱える。

## 1. 座標系と記法

| 記号 | 意味 |
| --- | --- |
| ECI | 慣性座標系（Earth-Centered Inertial） |
| LVLH（RSW） | 基準衛星の位置・速度に固定した回転座標系 |
| $\mathbf{r}_c$, $\mathbf{v}_c$ | 基準衛星（chief）の ECI 位置・速度 |
| $\mathbf{x} = [x, y, z]^\top$ | LVLH 座標系での相対位置 |
| $\dot{\mathbf{x}} = [\dot{x}, \dot{y}, \dot{z}]^\top$ | LVLH 座標系での相対速度 |

LVLH 座標系の基底ベクトルは

$$
\hat{\mathbf{e}}_r = \frac{\mathbf{r}_c}{\|\mathbf{r}_c\|},\qquad
\hat{\mathbf{e}}_h = \frac{\mathbf{r}_c \times \mathbf{v}_c}{\|\mathbf{r}_c \times \mathbf{v}_c\|},\qquad
\hat{\mathbf{e}}_t = \hat{\mathbf{e}}_h \times \hat{\mathbf{e}}_r
$$

であり、それぞれ $x$ 軸（Radial）、$z$ 軸（Cross-track）、$y$ 軸（Along-track）に対応する。回転行列 $\mathbf{C}_{\mathrm{ECI} \leftarrow \mathrm{LVLH}} = [\hat{\mathbf{e}}_r\ \hat{\mathbf{e}}_t\ \hat{\mathbf{e}}_h]$ を用いると、微小な相対位置について

$$
\boldsymbol{\rho}_{\mathrm{ECI}} \approx \mathbf{C}_{\mathrm{ECI} \leftarrow \mathrm{LVLH}}\,\boldsymbol{\rho}_{\mathrm{LVLH}}
$$

が成り立つ。座標系の詳細は [座標系と座標変換](coordinate.md) を参照。

## 2. 古典的な HCW 方程式

平均運動を $n = \sqrt{\mu / r_0^3}$（$r_0$: 基準軌道の半径、$\mu$: 地球の重力定数）とすると、古典的な HCW 方程式は次のとおりである。

$$
\begin{aligned}
\ddot{x} - 2n\dot{y} - 3n^2 x &= 0\\
\ddot{y} + 2n\dot{x} &= 0\\
\ddot{z} + n^2 z &= 0
\end{aligned}
$$

## 3. Schweighart-Sedwick モデル

外力を含まない SS モデルの方程式は次のとおりである。

$$
\begin{aligned}
\ddot{x} - 2nc\,\dot{y} - (5c^2 - 2)\,n^2 x &= 0 &&\text{(3.1)}\\
\ddot{y} + 2nc\,\dot{x} &= 0\\
\ddot{z} + (3c^2 - 2)\,n^2 z &= 0
\end{aligned}
$$

$c$ は J2 の効果をまとめた SS 係数であり、補助量 $s$ とともに次式で与えられる。

$$
c = \sqrt{1 + s},\qquad s = \frac{3 J_2 R_e^2}{8 r_0^2}\,(1 + 3\cos^2 i) \tag{3.2}
$$

| 記号 | 意味 | 本アプリケーションの値 |
| --- | --- | --- |
| $J_2$ | 地球の J2 係数 | $1.08262668 \times 10^{-3}$ |
| $R_e$ | 地球の赤道半径 | $6378137.0\ \mathrm{m}$ |
| $i$ | 基準軌道の軌道傾斜角 | 「軌道・力学」タブで設定 |

- $c \to 1$（$s \to 0$）で古典的な HCW 方程式に一致する。
- 面内の係数は $2nc$ と $(5c^2 - 2)\,n^2$ であり、J2 によりコリオリ項と復元項がわずかに補正される。
- 面外の固有角振動数は $\omega_z = n\sqrt{3c^2 - 2} = n\sqrt{1 + 3s}$ となる。

> SS モデルは基準衛星（chief）に対する相対運動を表す。地心に固定した点に対する LVLH 原点そのものの運動とは区別する必要がある。

## 4. 状態方程式

状態を $\mathbf{X} = [x, y, z, \dot{x}, \dot{y}, \dot{z}]^\top$ とすると、式 (3.1) は 1 階の線形常微分方程式 $\dot{\mathbf{X}} = \mathbf{A}\mathbf{X}$ として書ける。

$$
\mathbf{A} =
\begin{bmatrix}
\mathbf{0}_{3 \times 3} & \mathbf{I}_3\\
\mathbf{K} & \mathbf{G}
\end{bmatrix},\qquad
\mathbf{K} = \operatorname{diag}\!\left( (5c^2 - 2)\,n^2,\ 0,\ -(3c^2 - 2)\,n^2 \right),\qquad
\mathbf{G} =
\begin{bmatrix}
0 & 2nc & 0\\
-2nc & 0 & 0\\
0 & 0 & 0
\end{bmatrix}
$$

推力などの加速度 $\mathbf{f} = [f_x, f_y, f_z]^\top$ を加える場合は

$$
\dot{\mathbf{X}} = \mathbf{A}\mathbf{X} + \mathbf{B}\mathbf{f},\qquad
\mathbf{B} = \begin{bmatrix} \mathbf{0}_{3 \times 3} \\ \mathbf{I}_3 \end{bmatrix}
$$

とする。本アプリケーションでは、この右辺を 4 次の Runge-Kutta 法で積分している（`HillEquationSolver.computeDerivatives`）。

## 5. 適用範囲

- 近円軌道（離心率が小さい）で、相対距離が軌道半径に比べて十分小さい場合に有効である。
- 係数を定数として平均化しているため、長期間・高精度の解析には適さない。離心率が大きい場合や長期の解析では、時間変動係数のモデルや楕円軌道向けの線形化（Yamanaka-Ankersen、Gim-Alfriend など）を検討する。
- 面外の式は振動数の補正のみを含み、減衰や節線の差動歳差は表さない。
- SS 係数 $s$ は軌道半径 $r_0$ と軌道傾斜角 $i$ に強く依存する。
- 数値積分の刻み幅は、固有振動数（特に $\omega_z$）に対して十分小さく取る必要がある。

## 6. J2 摂動下でドリフトしない配置

式 (3.1) の第 2 式から $K = \dot{y} + 2nc\,x$ が保存量となり、$K = 0$ を満たす初期状態では面内のドリフトが消える。この条件を用いた初期配置は [J2 安定配置](j2-stable-arrangement.md) にまとめている。

## 参考文献

1. Clohessy, W. H., and Wiltshire, R. S., "Terminal Guidance System for Satellite Rendezvous," *Journal of the Aerospace Sciences*, Vol. 27, No. 9, 1960.
2. Schweighart, S. A., and Sedwick, R. J., "High-Fidelity Linearized J2 Model for Satellite Formation Flight," *Journal of Guidance, Control, and Dynamics*, Vol. 25, No. 6, 2002.
3. Bevilacqua, R., Romano, M., and Curti, F., "Decoupled-natural-dynamics Model for the Relative Motion of two Spacecraft," *Nonlinear Dynamics and Systems Theory*, Vol. 10, No. 1, 2010.
4. Roberts, J., and Roberts, P., "The Development of High Fidelity Linearized J2 Models for Satellite Formation Flying Control," AAS 04-162, 2004.
5. Sullivan, J., Grimberg, S., and D'Amico, S., "Comprehensive Survey and Assessment of Spacecraft Relative Motion Models," *Journal of Guidance, Control, and Dynamics*, Vol. 40, No. 8, 2017.
6. Yamanaka, K., and Ankersen, F., "New State Transition Matrix for Relative Motion on an Arbitrary Elliptical Orbit," *Journal of Guidance, Control, and Dynamics*, Vol. 25, No. 1, 2002.
7. Gim, D.-W., and Alfriend, K. T., "State Transition Matrix of Relative Motion for the Perturbed Noncircular Reference Orbit," *Journal of Guidance, Control, and Dynamics*, Vol. 26, No. 6, 2003.
