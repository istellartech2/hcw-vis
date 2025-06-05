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

基準衛星のECI座標を \$(\mathbf r\_0, \mathbf v\_0)\$ とし、任意の衛星のECI座標を \$(\mathbf r, \mathbf v)\$ とする。

#### 1. R‑S‑W座標系の基底ベクトルをECI座標系で表現

```math
\hat{\mathbf R} = \frac{\mathbf r_0}{\|\mathbf r_0\|} \qquad (\text{径方向単位ベクトル})

\hat{\mathbf W} = \frac{\mathbf r_0 \times \mathbf v_0}{\|\mathbf r_0 \times \mathbf v_0\|} \qquad (\text{角運動量方向単位ベクトル})

\hat{\mathbf S} = \hat{\mathbf W} \times \hat{\mathbf R} \qquad (\text{軌道進行方向単位ベクトル})
```

#### 2. 変換行列の構築

ECI座標系からR‑S‑W座標系への変換行列 \$\mathbf T\_{\text{ECI}\to\text{RSW}}\$:

```math
\mathbf T_{\text{ECI}\to\text{RSW}} =
\begin{bmatrix}
\hat{\mathbf R}^T\\
\hat{\mathbf S}^T\\
\hat{\mathbf W}^T
\end{bmatrix}
```

#### 3. 位置と速度の変換

相対位置ベクトル:

```math
\Delta\mathbf r_{\text{ECI}} = \mathbf r - \mathbf r_0
```

R‑S‑W座標系での位置:

```math
\mathbf r_{\text{RSW}} = \mathbf T_{\text{ECI}\to\text{RSW}}\,\Delta\mathbf r_{\text{ECI}}
```

R‑S‑W座標系での速度:

```math
\mathbf v_{\text{RSW}} = \mathbf T_{\text{ECI}\to\text{RSW}}(\mathbf v - \mathbf v_0)\;\; -\;\; \boldsymbol\Omega \times \mathbf r_{\text{RSW}}
```

ここで、\$\boldsymbol\Omega\$ は軌道角速度ベクトル:

```math
\boldsymbol\Omega = \frac{\mathbf r_0 \times \mathbf v_0}{\|\mathbf r_0\|^2}
```

---

### ECI座標系からECEF座標系への変換

地球の自転により、地球固定座標系 (ECEF) はECIに対してZ軸回りに時刻依存で回転する。

1. **グリニッジ平均恒星時 (GMST)** を計算し、時角 \$\theta\_g\$ を得る。
2. Z軸回りの回転行列

```math
\mathbf R_3(\theta_g) =
\begin{bmatrix}
\cos\theta_g & \sin\theta_g & 0\\
-\sin\theta_g & \cos\theta_g & 0\\
0 & 0 & 1
\end{bmatrix}
```

3. **ECI→ECEF 変換**

```math
\mathbf r_{\text{ECEF}} = \mathbf R_3(\theta_g)\,\mathbf r_{\text{ECI}}
```

---

### ECEF座標系からR‑S‑W座標系への変換

ECEF→RSW変換行列は、先に示した二つの行列の積で得られる。

```math
\mathbf T_{\text{ECEF}\to\text{RSW}} = \mathbf T_{\text{ECI}\to\text{RSW}}\,\mathbf R_3(-\theta_g)
```

> **注**: \$\mathbf R\_3(-\theta\_g)\$ はECEF→ECIの回転であり、行列計算順序に注意。

これにより、地球固定座標系で与えられた任意の点 \$(x\_{\text{ECEF}},y\_{\text{ECEF}},z\_{\text{ECEF}})\$ が衛星ローカル座標 (R‑S‑W) に直接変換できる。

```math
\mathbf r_{\text{RSW}} = \mathbf T_{\text{ECEF}\to\text{RSW}}\,\mathbf r_{\text{ECEF}}
```

---

## 地球姿勢のR‑S‑W表現

地球の三軸 (ECEF基底) をR‑S‑W座標系で表すことで、シミュレーション空間において地球の自転を正しく可視化できる。

1. **ECEF単位ベクトルをECIで表現**

```math
\hat{\mathbf i}_{\text{E}}^{\text{ECI}} = \mathbf R_3(-\theta_g)\,[1,0,0]^T\\
\hat{\mathbf j}_{\text{E}}^{\text{ECI}} = \mathbf R_3(-\theta_g)\,[0,1,0]^T\\
\hat{\mathbf k}_{\text{E}}^{\text{ECI}} = [0,0,1]^T
```

2. **RSW基底への射影**

```math
\begin{aligned}
\hat{\mathbf i}_{\text{E}}^{\text{RSW}} &= \mathbf T_{\text{ECI}\to\text{RSW}}\,\hat{\mathbf i}_{\text{E}}^{\text{ECI}}\\[4pt]
\hat{\mathbf j}_{\text{E}}^{\text{RSW}} &= \mathbf T_{\text{ECI}\to\text{RSW}}\,\hat{\mathbf j}_{\text{E}}^{\text{ECI}}\\[4pt]
\hat{\mathbf k}_{\text{E}}^{\text{RSW}} &= \mathbf T_{\text{ECI}\to\text{RSW}}\,[0,0,1]^T
\end{aligned}
```

これら3本のベクトルが、衛星ローカル空間における地球の姿勢（自転軸と経度基準線方向）を表す。

---

## 実装例 (TypeScript)

```ts
/**
 * gmst: グリニッジ平均恒星時 [rad]
 * r0, v0: 基準衛星のECI位置・速度 (Vector3)
 */
function buildTransformMatrices(gmst: number, r0: Vector3, v0: Vector3) {
    // === ECI→RSW ===
    const Rhat = r0.normalize();
    const What = r0.clone().cross(v0).normalize();
    const Shat = What.clone().cross(Rhat);
    const Te2r = new Matrix3().set(
        Rhat.x, Rhat.y, Rhat.z,
        Shat.x, Shat.y, Shat.z,
        What.x, What.y, What.z
    );

    // === ECI→ECEF (Z軸回転) ===
    const c = Math.cos(gmst), s = Math.sin(gmst);
    const R3 = new Matrix3().set(
         c,  s, 0,
        -s,  c, 0,
         0,  0, 1
    );

    // === ECEF→RSW ===
    const Tecef2rsw = Te2r.clone().multiply(R3.transpose()); // R3^T = R3(-gmst)
    return { Te2r, Tecef2rsw };
}
```

---

## Hill方程式との関係

R‑S‑W座標系でのHill方程式:

```math
\begin{cases}
\ddot x - 2n\dot y - 3n^2 x = 0 \\
\ddot y + 2n\dot x = 0\\
\ddot z + n^2 z = 0
\end{cases}
```

ここで、\$n\$ は基準衛星の軌道平均運動 (\$n = \sqrt{\mu/a^3}\$)。

---

## 参考文献

* Vallado, D. A. (2013). *Fundamentals of Astrodynamics and Applications*.
* Curtis, H. D. (2013). *Orbital Mechanics for Engineering Students*.
* Montenbruck, O., & Gill, E. (2000). *Satellite Orbits: Models, Methods and Applications*.
* Wertz, J. R. (2001). *Spacecraft Attitude Determination and Control*.
