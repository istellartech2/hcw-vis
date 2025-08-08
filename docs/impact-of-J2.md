
# J2を考慮したHill（Clohessy–Wiltshire, HCW）方程式（LVLH）

**目的**: 近円軌道（chief＝目標機）まわりの近傍相対運動を、LVLH（Local Vertical Local Horizontal; RIC/RSW）座標系で **J2（地球の扁平による2次帯状調和）** を一次近似で取り入れた線形方程式としてまとめ、最終的にTypeScript実装へ落とし込める形に整理する。

> 本ノートは、HCWの拡張として著名な **Schweighart–Sedwick（SS）モデル** を採用し、**近円軌道・小相対距離** を前提とする。係数は **時間不変（LTI）** で、実装が容易という利点がある。

---

## 1. 座標系と記法

* **ECI**: 慣性座標系（Earth-Centered Inertial）。
* **LVLH**（= RSW/RIC）: chief の位置・速度に固着した回転座標系。

  * $\hat{\mathbf{e}}_r$（Radial, x軸）: 地心→chief 方向（局所鉛直）。
  * $\hat{\mathbf{e}}_t$（Along-track, y軸）: 軌道接線方向（速度方向）。
  * $\hat{\mathbf{e}}_h$（Cross-track, z軸）: $\hat{\mathbf{e}}_r \times \hat{\mathbf{e}}_t$（軌道法線）。

chief の位置・速度を $\mathbf{r}_c, \mathbf{v}_c$ とすると、

$\hat{\mathbf{e}}_r = \frac{\mathbf{r}_c}{\|\mathbf{r}_c\|},\qquad \hat{\mathbf{e}}_h = \frac{\mathbf{r}_c\times\mathbf{v}_c}{\|\mathbf{r}_c\times\mathbf{v}_c\|},\qquad \hat{\mathbf{e}}_t = \hat{\mathbf{e}}_h\times\hat{\mathbf{e}}_r.$

回転行列 $C_{\mathrm{ECI}\leftarrow\mathrm{LVLH}}=[\hat{\mathbf{e}}_r\ \hat{\mathbf{e}}_t\ \hat{\mathbf{e}}_h]$ により、微小相対位置 $\boldsymbol{\rho}_{\mathrm{LVLH}}$ と ECI ベクトルの関係は

$\boldsymbol{\rho}_{\mathrm{ECI}} \approx C_{\mathrm{ECI}\leftarrow\mathrm{LVLH}}\,\boldsymbol{\rho}_{\mathrm{LVLH}}.$

以降、相対座標を $\mathbf{x}=[x,\,y,\,z]^\top$、相対速度を $\dot{\mathbf{x}}=[\dot{x},\,\dot{y},\,\dot{z}]^\top$ とする（すべて LVLH 成分）。

---

## 2. 基本: J2 なしの HCW（近円軌道）

円軌道角速度 $n=\sqrt{\mu/r_0^3}$（$r_0$: chief の半径＝近円軌道の代表半径、$\mu$: 地球重力定数）とすると、古典的 HCW は

$$
\begin{aligned}
\ddot{x}-2n\,\dot{y}-3n^2 x &= 0,\\
\ddot{y}+2n\,\dot{x} &= 0,\\
\ddot{z}+n^2 z &= 0.
\end{aligned}
$$

---

## 3. J2 を考慮した SS（Schweighart–Sedwick）モデル

J2 により chief の平面内・面外の摂動（節線歳差・近点移動など）を、**平均化された定数係数** として HCW に組み込む。SS モデルの無入力（摂動差加速度を 0 とおいた同次）形は、

$$
\boxed{\begin{aligned}
\ddot{x} - 2\,n\,c\,\dot{y} - \bigl(5c^2-2\bigr)\,n^2\,x &= 0,\\[2pt]
\ddot{y} + 2\,n\,c\,\dot{x} &= 0,\\[2pt]
\ddot{z} + \bigl(3c^2-2\bigr)\,n^2\,z &= 0.
\end{aligned}}
$$

ここで、$c$ は J2 の効果をまとめた **SS 係数**、$s$ はその補助量：

$$
\boxed{\quad c=\sqrt{1+s},\qquad s = \frac{3J_2 R_e^\,2}{8\,r_0^{\,2}}\,\bigl(1+3\cos^2 i\bigr).\quad}
$$

* $J_2$: 地球 J2 係数、$R_e$: 地球平均半径、$i$: chief 軌道傾斜角。
* **平面内**の係数は $a=2nc$, $b=(5c^2-2)n^2$ と書け、古典 HCW（$c\to 1$）に一致する。
* **面外**の固有振動数は $\omega_z = n\sqrt{3c^2-2}= n\sqrt{1+3s}$。

> 注: SS モデルは「**target（chief）に対する相対運動**」を直接表す。J2 を含む LVLH 原点の運動（地心固定点に対する運動）とは区別される。

---

## 4. 一次形式（実装用の 1次常微分方程式）

状態 $\mathbf{X} = [x,\,y,\,z,\,\dot{x},\,\dot{y},\,\dot{z}]^\top$ に対し、同次系は $\dot{\mathbf{X}} = A\,\mathbf{X}$ と書ける。

$$
A = \begin{bmatrix}
\mathbf{0}_{3\times3} & I_{3}\cr
K & C
\end{bmatrix},\qquad
K=\mathrm{diag}\bigl( (5c^2-2)n^2,\ 0,\ - (3c^2-2)n^2\bigr),\quad
C=\begin{bmatrix}
0 & 2nc & 0\\
-2nc & 0 & 0\\
0 & 0 & 0
\end{bmatrix}.
$$

（符号は $\ddot{x}=2nc\,\dot{y}+(5c^2-2)n^2x$、$\ddot{y}=-2nc\,\dot{x}$、$\ddot{z}=-(3c^2-2)n^2z$ に対応。）

外力（差加速度）$\mathbf{f}=[f_x,f_y,f_z]^\top$ を入れる場合は $\dot{\mathbf{X}}=A\mathbf{X}+B\,\mathbf{f}$、$B=\begin{bmatrix}\mathbf{0}_{3\times3}\\I_3\end{bmatrix}$。

---

## 5. 適用範囲と精度の注意

* **近円軌道**（偏心小）で **相対距離が chief 半径に対して十分小** の場合。
* 係数が一定のため、**長期・高精度** には向かない。大きな偏心や長期運用は、時間変動係数モデル（J2 を時間依存で扱う手法）や楕円版線形化（Yamanaka–Ankersen, Gim–Alfriend 等）を検討。
* 面外（z）の式は **周波数補正のみ**（減衰は含まない）。傾斜角によって $\omega_z$ が変化する。

---

## 6. 実装（TypeScript）

### 6.1 定数・SS係数の計算

```ts
// 地球定数（SI）
export const MU_EARTH = 3.986004418e14; // [m^3/s^2]
export const R_EARTH = 6378137.0;       // [m]
export const J2 = 1.08262668e-3;        // [-]

export type SSParams = {
  r0: number;      // chief 代表半径 [m]（近円軌道なら a≈r0）
  inc: number;     // 軌道傾斜角 [rad]
};

export function meanMotion({ r0 }: SSParams): number {
  return Math.sqrt(MU_EARTH / (r0 ** 3));
}

export function ssCoefficient({ r0, inc }: SSParams): { s: number; c: number } {
  const s = (3 * J2 * (R_EARTH ** 2) / (8 * r0 ** 2)) * (1 + 3 * Math.cos(inc) ** 2);
  const c = Math.sqrt(1 + s);
  return { s, c };
}
```

### 6.2 右辺関数（同次・外力付き）

```ts
export type State = [number, number, number, number, number, number];
export type Accel = [number, number, number];

export function rhsSS(t: number, X: State, p: SSParams, u?: Accel): State {
  const n = meanMotion(p);
  const { c } = ssCoefficient(p);
  const [x, y, z, vx, vy, vz] = X;
  const fx = u?.[0] ?? 0;
  const fy = u?.[1] ?? 0;
  const fz = u?.[2] ?? 0;

  const ddx =  2 * n * c * vy + (5 * c * c - 2) * (n * n) * x + fx;
  const ddy = -2 * n * c * vx + fy;
  const ddz = -(3 * c * c - 2) * (n * n) * z + fz;

  return [vx, vy, vz, ddx, ddy, ddz];
}
```

### 6.3 単純なRK4ステップ（例）

```ts
export function rk4Step(
  f: (t: number, X: State) => State,
  t: number,
  X: State,
  h: number
): State {
  const k1 = f(t, X);
  const X2 = X.map((xi, i) => xi + 0.5 * h * k1[i]) as State;
  const k2 = f(t + 0.5 * h, X2);
  const X3 = X.map((xi, i) => xi + 0.5 * h * k2[i]) as State;
  const k3 = f(t + 0.5 * h, X3);
  const X4 = X.map((xi, i) => xi + h * k3[i]) as State;
  const k4 = f(t + h, X4);
  const out = X.map((xi, i) => xi + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) as State;
  return out;
}
```

### 6.4 使用例（同次系の伝播）

```ts
const params: SSParams = { r0: (6378e3 + 600e3), inc: 98 * Math.PI/180 };
let X: State = [100, 0, 0, 0, 0.05, 0]; // 初期相対状態（LVLH）
let t = 0, dt = 1.0; // [s]

for (let k = 0; k < 6000; k++) {
  const f = (tt: number, XX: State) => rhsSS(tt, XX, params);
  X = rk4Step(f, t, X, dt);
  t += dt;
}
```

> 実機適用では、ECI→LVLH の初期変換、また LVLH→ECI の復元、基準軌道の更新・摂動入力（差加速度）の扱い等を組み合わせる。

---

## 7. 実装時のコツ（要点）

1. **初期条件の整合**: ECI の 2 衛星状態から LVLH 相対状態（$x,\dot{x},\dots$）へ正しく変換する。chief の $\hat{\mathbf{e}}_r,\hat{\mathbf{e}}_t,\hat{\mathbf{e}}_h$ をその時刻の $\mathbf{r}_c,\mathbf{v}_c$ から構成する。
2. **代表半径 $r_0$**: 近円軌道なら $r_0\approx a$。SS 係数の $s$ は $r_0$ に強く依存。
3. **時間刻み**: $n$ オーダの固有周波数（特に $\omega_z$）を十分サンプリング。
4. **外乱（差加速度）**: 空気抵抗差・推力・SRP 等を $\mathbf{f}$ に入れると制御・駅間運用が可能。
5. **有効範囲の見極め**: 偏心・長期・高度変化が大きい場合は、時間変動係数モデル（J2 を平均化しない手法）や楕円版（Yamanaka–Ankersen, Gim–Alfriend）へ切替え。

---

## 8. 参考式（確認用）

* 平面内の一般形（平面内 4次状態 $[x,\,y,\,\dot{x},\,\dot{y}]$）:

  $$
  \dot{\mathbf{x}} = A_{\mathrm{in}}\,\mathbf{x},\quad
  A_{\mathrm{in}} = \begin{bmatrix}
  0 & 0 & 1 & 0\\
  0 & 0 & 0 & 1\\
  (5c^2-2)n^2 & 0 & 0 & 2nc\\
  0 & 0 & -2nc & 0
  \end{bmatrix}.
  $$
* 面外は $\ddot{z}+\omega_z^2 z=0$, $\omega_z^2=(3c^2-2)n^2$。

---

## 9. 参考文献（主要原典・周辺）

* Clohessy, W. H., and Wiltshire, R. S., “Terminal Guidance System for Satellite Rendezvous,” *Journal of the Aerospace Sciences*, 27(9), 1960.
* Schweighart, S. A., and Sedwick, R. J., “High-Fidelity Linearized J2 Model for Satellite Formation Flight,” *Journal of Guidance, Control, and Dynamics*, 25(6), 2002.
* Bevilacqua, R., Romano, M., and Curti, F., “Decoupled-natural-dynamics Model for the Relative Motion of two Spacecraft,” *Nonlinear Dynamics and Systems Theory*, 10(1), 2010.（SS 係数 $c$ と $a,b$ の明示式）
* Roberts, J., and Roberts, P., “The Development of High Fidelity Linearized J2 Models for Satellite Formation Flying Control,” AAS 04-162, 2004.
* Sullivan, B., Grimberg, S., D’Amico, S., “Comprehensive Survey and Assessment of Spacecraft Relative Motion Models,” *Journal of Guidance, Control, and Dynamics*, 2017.
* （楕円版の参考）Yamanaka, K., and Ankersen, F., “New State Transition Matrix for Relative Motion Under J2 Perturbation and Elliptic Orbits,” *Journal of Guidance, Control, and Dynamics*, 2002; Gim, D., and Alfriend, K. T., 2003.

---

### 付記

* ここでの $c, s$ の定義は、SS モデルの平均化に従う近円・小相対距離の一次近似。高度や傾斜角に応じて $c$ が 1 から僅かにずれ、$x$・$z$ の「バネ係数」と「コリオリ係数」が補正される、と理解すると実装上の勘所が掴みやすい。
