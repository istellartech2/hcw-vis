# 座標系変換の数学的定義

## 概要

Hill's equations simulatorで使用される座標系間の変換について数学的に定義し、それぞれの関係性を明確にする。

## 座標系の定義

### 1. ECI座標系 (Earth-Centered Inertial)

* **原点**: 地球の中心
* **Z軸**: 北極方向（慣性系で固定）
* **X軸**: 春分点方向（慣性系で固定）
* **Y軸**: 右手系を構成する方向
* **特徴**: 慣性座標系のため、地球の自転の影響を受けない

### 2. R-S-W座標系 (Radial‑Along‑track‑Cross‑track)

**別名**: LVLH座標系 (Local Vertical Local Horizontal)、Hill座標系

* **原点**: 基準衛星（主衛星）の位置
* **R軸 (Radial)**: 地球中心から衛星に向かう方向（径方向）
* **S軸 (Along‑track)**: 軌道の進行方向（速度ベクトル方向）
* **W軸 (Cross‑track)**: 軌道面に垂直な方向（角運動量ベクトル方向）

### 3. ECEF座標系 (Earth‑Centered, Earth‑Fixed)

* **原点**: 地球の中心
* **Z軸**: 地球の自転軸（北極方向）
* **X軸**: グリニッジ子午線と赤道の交点方向
* **Y軸**: 右手系を構成する方向
* **特徴**: 地球の自転とともに回転するため、地表面上の点の経度が固定される

### 4. Three.js座標系

* **原点**: シーン中心（基準衛星位置）
* **座標軸**: Three.jsの標準座標系
* **変換**: R‑S‑W座標系から可視化用に変換

---

## 座標変換の数式

### ECI座標系からR‑S‑W座標系への変換

基準衛星のECI座標を $(\mathbf{r}_0, \mathbf{v}_0)$ とし、任意の衛星のECI座標を $(\mathbf{r}, \mathbf{v})$ とする。

#### 1. R‑S‑W座標系の基底ベクトルをECI座標系で表現

$$
\hat{\mathbf{R}} = \frac{\mathbf{r}_0}{\|\mathbf{r}_0\|} \qquad (\text{径方向単位ベクトル})
$$

$$
\hat{\mathbf{W}} = \frac{\mathbf{r}_0 \times \mathbf{v}_0}{\|\mathbf{r}_0 \times \mathbf{v}_0\|} \qquad (\text{角運動量方向単位ベクトル})
$$

$$
\hat{\mathbf{S}} = \hat{\mathbf{W}} \times \hat{\mathbf{R}} \qquad (\text{軌道進行方向単位ベクトル})
$$

#### 2. 変換行列の構築

ECI座標系からR‑S‑W座標系への変換行列 $\mathbf{T}_{\text{ECI}\to\text{RSW}}$:

$$
\mathbf{T}_{\text{ECI}\to\text{RSW}} =
\begin{bmatrix}
\hat{\mathbf{R}}^T\\
\hat{\mathbf{S}}^T\\
\hat{\mathbf{W}}^T
\end{bmatrix}
$$

#### 3. 位置と速度の変換

相対位置ベクトル:

$$
\Delta\mathbf{r}_{\text{ECI}} = \mathbf{r} - \mathbf{r}_0
$$

R‑S‑W座標系での位置:

$$
\mathbf{r}_{\text{RSW}} = \mathbf{T}_{\text{ECI}\to\text{RSW}}\,\Delta\mathbf{r}_{\text{ECI}}
$$

R‑S‑W座標系での速度:

$$
\mathbf{v}_{\text{RSW}} = \mathbf{T}_{\text{ECI}\to\text{RSW}}(\mathbf{v} - \mathbf{v}_0) - \boldsymbol{\Omega} \times \mathbf{r}_{\text{RSW}}
$$

ここで、$\boldsymbol{\Omega}$ は軌道角速度ベクトル:

$$
\boldsymbol{\Omega} = \frac{\mathbf{r}_0 \times \mathbf{v}_0}{\|\mathbf{r}_0\|^2}
$$

---

### ECI座標系からECEF座標系への変換

地球の自転により、地球固定座標系 (ECEF) はECIに対してZ軸回りに時刻依存で回転する。

1. **グリニッジ平均恒星時 (GMST)** を計算し、時角 $\theta_g$ を得る。
2. Z軸回りの回転行列

$$
\mathbf{R}_3(\theta_g) =
\begin{bmatrix}
\cos\theta_g & \sin\theta_g & 0\\
-\sin\theta_g & \cos\theta_g & 0\\
0 & 0 & 1
\end{bmatrix}
$$

3. **ECI→ECEF 変換**

$$
\mathbf{r}_{\text{ECEF}} = \mathbf{R}_3(\theta_g)\,\mathbf{r}_{\text{ECI}}
$$

---

### ECEF座標系からR‑S‑W座標系への変換

ECEF→RSW変換行列は、先に示した二つの行列の積で得られる。

$$
\mathbf{T}_{\text{ECEF}\to\text{RSW}} = \mathbf{T}_{\text{ECI}\to\text{RSW}}\,\mathbf{R}_3(-\theta_g)
$$

> **注**: $\mathbf{R}_3(-\theta_g)$ はECEF→ECIの回転であり、行列計算順序に注意。

これにより、地球固定座標系で与えられた任意の点 $(x_{\text{ECEF}}, y_{\text{ECEF}}, z_{\text{ECEF}})$ が衛星ローカル座標 (R‑S‑W) に直接変換できる。

$$
\mathbf{r}_{\text{RSW}} = \mathbf{T}_{\text{ECEF}\to\text{RSW}}\,\mathbf{r}_{\text{ECEF}}
$$

---

## 地球姿勢のR‑S‑W表現

地球の三軸 (ECEF基底) をR‑S‑W座標系で表すことで、シミュレーション空間において地球の自転を正しく可視化できる。

1. **ECEF単位ベクトルをECIで表現**

$$
\begin{aligned}
\hat{\mathbf{i}}_{\text{E}}^{\text{ECI}} &= \mathbf{R}_3(-\theta_g)\,[1,0,0]^T\\
\hat{\mathbf{j}}_{\text{E}}^{\text{ECI}} &= \mathbf{R}_3(-\theta_g)\,[0,1,0]^T\\
\hat{\mathbf{k}}_{\text{E}}^{\text{ECI}} &= [0,0,1]^T
\end{aligned}
$$

2. **RSW基底への射影**

$$
\begin{aligned}
\hat{\mathbf{i}}_{\text{E}}^{\text{RSW}} &= \mathbf{T}_{\text{ECI}\to\text{RSW}}\,\hat{\mathbf{i}}_{\text{E}}^{\text{ECI}}\\[4pt]
\hat{\mathbf{j}}_{\text{E}}^{\text{RSW}} &= \mathbf{T}_{\text{ECI}\to\text{RSW}}\,\hat{\mathbf{j}}_{\text{E}}^{\text{ECI}}\\[4pt]
\hat{\mathbf{k}}_{\text{E}}^{\text{RSW}} &= \mathbf{T}_{\text{ECI}\to\text{RSW}}\,[0,0,1]^T
\end{aligned}
$$

これら3本のベクトルが、衛星ローカル空間における地球の姿勢（自転軸と経度基準線方向）を表す。

---

## 実装例 (TypeScript)

```ts
import * as THREE from 'three';

/**
 * Build the ECEF → LVLH (RSW) attitude transform.
 *
 * @param gmstRad  Greenwich Mean Sidereal Time [rad] at the current epoch
 * @param r0       Chief-satellite **ECI** position (km)            – THREE.Vector3
 * @param v0       Chief-satellite **ECI** velocity (km s⁻¹)        – THREE.Vector3
 * @returns        {
 *                   m3 : THREE.Matrix3   // ECEF basis → LVLH basis
 *                   m4 : THREE.Matrix4   // same, but 4×4 (for Object3D.matrix)
 *                   q  : THREE.Quaternion// same, as quaternion (for Object3D.quaternion)
 *                 }
 */
export function buildEcefToLvlhTransform(
  gmstRad: number,
  r0: THREE.Vector3,
  v0: THREE.Vector3
) {
  /* ---------- 1.  ECI → LVLH basis ---------- */
  const Rhat = r0.clone().normalize();            //   x_RSW  (R̂)
  const What = r0.clone().cross(v0).normalize();  //   z_RSW  (Ŵ)
  const Shat = What.clone().cross(Rhat);          //   y_RSW  (Ŝ)

  const Te2r = new THREE.Matrix3().set(
    Rhat.x, Rhat.y, Rhat.z,   // first  row
    Shat.x, Shat.y, Shat.z,   // second row
    What.x, What.y, What.z    // third  row
  ); // (ECI → RSW)

  /* ---------- 2.  ECI ↔︎ ECEF rotation ---------- */
  const c = Math.cos(gmstRad);
  const s = Math.sin(gmstRad);

  // ECI → ECEF, rotation about Z
  const Re2f = new THREE.Matrix3().set(
     c,  s, 0,
    -s,  c, 0,
     0,  0, 1
  );

  // We need the opposite direction: ECEF → ECI
  const Rf2e = Re2f.clone().transpose(); // == R3(−gmst)

  /* ---------- 3.  Compose:  ECEF → LVLH ---------- */
  const Tf2r = Te2r.clone().multiply(Rf2e); // (ECI→RSW)·(ECEF→ECI)

  /* ---------- 4.  Export as Matrix3, Matrix4, Quaternion ---------- */
  const m3 = Tf2r;

  const m4 = new THREE.Matrix4().set(
    m3.elements[0], m3.elements[3], m3.elements[6], 0,
    m3.elements[1], m3.elements[4], m3.elements[7], 0,
    m3.elements[2], m3.elements[5], m3.elements[8], 0,
    0,              0,              0,              1
  );

  const q = new THREE.Quaternion().setFromRotationMatrix(m4);

  return { m3, m4, q };
}
```

## How to use it

```ts
// 1. Compute GMST for now (any method you like)
const gmst = currentGmstRad(/* UTC Date */);

// 2. Chief-satellite state in ECI
const r0 = new THREE.Vector3(x_km, y_km, z_km);
const v0 = new THREE.Vector3(vx_kms, vy_kms, vz_kms);

// 3. Build transform
const { m4, q } = buildEcefToLvlhTransform(gmst, r0, v0);

// 4-A. Apply with a matrix:
earthMesh.matrix.copy(m4);
earthMesh.matrixAutoUpdate = false;

// 4-B. …or, if you prefer quaternions:
earthMesh.quaternion.copy(q);
```

---

## HCW方程式との関係

R‑S‑W座標系でのHCW方程式:

$$
\begin{cases}
\ddot{x} - 2n\dot{y} - 3n^2 x = 0 \\
\ddot{y} + 2n\dot{x} = 0\\
\ddot{z} + n^2 z = 0
\end{cases}
$$

ここで、$n$ は基準衛星の軌道平均運動 ($n = \sqrt{\mu/a^3}$)。
