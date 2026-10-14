# 座標系と座標変換

本書では、本アプリケーションで使用する座標系を定義し、座標系間の変換式をまとめる。実装は `src/simulation/FrameTransforms.ts` にある。

## 1. 座標系の定義

### 1.1 ECI 座標系（Earth-Centered Inertial）

| 項目 | 定義 |
| --- | --- |
| 原点 | 地球中心 |
| $X$ 軸 | 春分点方向 |
| $Z$ 軸 | 北極方向 |
| $Y$ 軸 | 右手系を構成する方向 |

慣性座標系であり、地球の自転の影響を受けない。

### 1.2 ECEF 座標系（Earth-Centered, Earth-Fixed）

| 項目 | 定義 |
| --- | --- |
| 原点 | 地球中心 |
| $X$ 軸 | 赤道とグリニッジ子午線の交点方向 |
| $Z$ 軸 | 地球の自転軸（北極方向） |
| $Y$ 軸 | 右手系を構成する方向 |

地球とともに回転するため、地表上の点の座標は時間によらず一定になる。

### 1.3 RSW 座標系（Radial, Along-track, Cross-track）

LVLH 座標系（Local Vertical Local Horizontal）、Hill 座標系とも呼ばれる。HCW 方程式はこの座標系で記述される。

| 項目 | 定義 |
| --- | --- |
| 原点 | 基準衛星の位置 |
| R 軸（Radial） | 地球中心から基準衛星へ向かう方向 |
| S 軸（Along-track） | 軌道面内で R 軸に直交する、軌道の進行方向 |
| W 軸（Cross-track） | 軌道面の法線方向（軌道角運動量ベクトルの向き） |

### 1.4 Three.js 座標系（表示用）

原点はシーン中心（基準衛星の位置）である。R 軸を画面の上方向に取るため、RSW 座標を次のように割り当てる（`FrameTransforms.rswToThree`）。

$$
\begin{bmatrix} X \\ Y \\ Z \end{bmatrix}_{\text{Three.js}}
=
\begin{bmatrix} 0 & 0 & 1 \\ 1 & 0 & 0 \\ 0 & 1 & 0 \end{bmatrix}
\begin{bmatrix} R \\ S \\ W \end{bmatrix}
$$

すなわち $X = W$、$Y = R$、$Z = S$ である。

## 2. ECI 座標系から RSW 座標系への変換

基準衛星の ECI 位置・速度を $(\mathbf{r}_0, \mathbf{v}_0)$、対象衛星の ECI 位置・速度を $(\mathbf{r}, \mathbf{v})$ とする。

### 2.1 基底ベクトル

RSW 座標系の基底ベクトルを ECI 座標系で表すと次のとおりである。

$$
\hat{\mathbf{R}} = \frac{\mathbf{r}_0}{\|\mathbf{r}_0\|},\qquad
\hat{\mathbf{W}} = \frac{\mathbf{r}_0 \times \mathbf{v}_0}{\|\mathbf{r}_0 \times \mathbf{v}_0\|},\qquad
\hat{\mathbf{S}} = \hat{\mathbf{W}} \times \hat{\mathbf{R}}
$$

### 2.2 変換行列

$$
\mathbf{T}_{\text{ECI}\to\text{RSW}} =
\begin{bmatrix}
\hat{\mathbf{R}}^\top\\
\hat{\mathbf{S}}^\top\\
\hat{\mathbf{W}}^\top
\end{bmatrix}
$$

### 2.3 相対位置と相対速度

相対位置は

$$
\boldsymbol{\rho}_{\text{RSW}} = \mathbf{T}_{\text{ECI}\to\text{RSW}}\,(\mathbf{r} - \mathbf{r}_0)
$$

である。RSW 座標系は回転しているため、相対速度には座標系の回転による項が加わる。

$$
\dot{\boldsymbol{\rho}}_{\text{RSW}} = \mathbf{T}_{\text{ECI}\to\text{RSW}}\,(\mathbf{v} - \mathbf{v}_0) - \boldsymbol{\omega} \times \boldsymbol{\rho}_{\text{RSW}},
\qquad
\boldsymbol{\omega} = \begin{bmatrix} 0 \\ 0 \\ \omega \end{bmatrix},\quad
\omega = \frac{\|\mathbf{r}_0 \times \mathbf{v}_0\|}{\|\mathbf{r}_0\|^2}
$$

$\boldsymbol{\omega}$ は RSW 座標系で表した座標系の角速度であり、円軌道では $\omega = n$（平均運動）となる。

## 3. ECI 座標系から ECEF 座標系への変換

ECEF 座標系は ECI 座標系に対して $Z$ 軸まわりに回転している。回転角はグリニッジ平均恒星時（GMST）$\theta_g$ で与えられる（本アプリケーションでは satellite.js の `gstime` で計算する）。

$$
\mathbf{R}_3(\theta_g) =
\begin{bmatrix}
\cos\theta_g & \sin\theta_g & 0\\
-\sin\theta_g & \cos\theta_g & 0\\
0 & 0 & 1
\end{bmatrix},
\qquad
\mathbf{r}_{\text{ECEF}} = \mathbf{R}_3(\theta_g)\,\mathbf{r}_{\text{ECI}}
$$

## 4. ECEF 座標系から RSW 座標系への変換

2 章と 3 章の行列を合成する。$\mathbf{R}_3(-\theta_g) = \mathbf{R}_3(\theta_g)^\top$ は ECEF から ECI への回転である。

$$
\mathbf{T}_{\text{ECEF}\to\text{RSW}} = \mathbf{T}_{\text{ECI}\to\text{RSW}}\,\mathbf{R}_3(-\theta_g)
$$

この行列は姿勢（方向）の変換を表す。ECEF 座標系で与えられたベクトルは $\mathbf{T}_{\text{ECEF}\to\text{RSW}}$ を掛けることで RSW 成分に変換できる。

## 5. 地球の姿勢の表示

ECEF の基底ベクトルを RSW 座標系で表すと、基準衛星から見た地球の姿勢（自転軸と経度の基準方向）が得られる。

$$
\begin{aligned}
\hat{\mathbf{i}}_{\text{E}}^{\text{RSW}} &= \mathbf{T}_{\text{ECEF}\to\text{RSW}}\,[1, 0, 0]^\top\\
\hat{\mathbf{j}}_{\text{E}}^{\text{RSW}} &= \mathbf{T}_{\text{ECEF}\to\text{RSW}}\,[0, 1, 0]^\top\\
\hat{\mathbf{k}}_{\text{E}}^{\text{RSW}} &= \mathbf{T}_{\text{ECEF}\to\text{RSW}}\,[0, 0, 1]^\top
\end{aligned}
$$

本アプリケーションでは、描画のたびに次の手順で地球モデルの姿勢を更新している（`src/visualization/CelestialBodies.ts`）。

1. 現在時刻の基準衛星の ECI 位置・速度と GMST を求める。
2. `FrameTransforms.ecefToRsw` で $\mathbf{T}_{\text{ECEF}\to\text{RSW}}$ を求める（3×3 行列、4×4 行列、クォータニオンを返す）。
3. `FrameTransforms.rswToThree` を左から掛けて ECEF から Three.js への変換とし、地球モデルの回転に設定する。

## 6. HCW 方程式との関係

RSW 座標系の成分を $(x, y, z) = (R, S, W)$ とすると、HCW 方程式は次のように書ける。

$$
\begin{aligned}
\ddot{x} - 2n\dot{y} - 3n^2 x &= 0\\
\ddot{y} + 2n\dot{x} &= 0\\
\ddot{z} + n^2 z &= 0
\end{aligned}
$$

$n = \sqrt{\mu / a^3}$ は基準衛星の平均運動である。詳細は [HCW 方程式の理論](theory.md) を参照。
