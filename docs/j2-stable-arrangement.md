# J2 安定配置

本書では、J2 摂動を含む Schweighart-Sedwick（SS）モデルの下で、相対運動が面内にドリフトしない初期条件（J2 安定配置）を導く。

## 1. 目的と前提

- [J2 摂動モデル](j2-perturbation.md) の SS 方程式を前提とする。
- 本書でいう J2 安定配置とは、SS 方程式の解に現れる線形成長項（ドリフト）を初期状態で打ち消し、有界な周期解だけが残るようにした配置を指す。
- 古典的な HCW 方程式の周期条件 $\dot{y}_0 = -2nx_0$ を J2 摂動下に拡張したものにあたる。

記号は $n$（平均運動）、$c$（SS 係数、[J2 摂動モデル](j2-perturbation.md) の式 (3.2)）、$s$（補助量）、$\omega_p$、$\omega_z$ を用いる。低軌道では $1 < c^2 < 2$ が成り立つため、$\omega_p = n\sqrt{2 - c^2}$ と $\omega_z = n\sqrt{3c^2 - 2}$ はいずれも実数である。

## 2. SS 方程式

外力を含まない SS 方程式は次のとおりである。

$$
\begin{aligned}
\ddot{x} - 2nc\,\dot{y} - (5c^2 - 2)\,n^2 x &= 0\\
\ddot{y} + 2nc\,\dot{x} &= 0\\
\ddot{z} + (3c^2 - 2)\,n^2 z &= 0
\end{aligned}
$$

ここで $c = \sqrt{1 + s}$、$s = \dfrac{3 J_2 R_e^2}{8 r_0^2}(1 + 3\cos^2 i)$ である。$c \to 1$ で古典的な HCW 方程式に一致する。

## 3. 面内の解とドリフト定数

第 2 式を時間で積分すると、次の量が保存されることがわかる。

$$
K \equiv \dot{y} + 2nc\,x = \text{const.}
$$

$\dot{y} = K - 2nc\,x$ を第 1 式に代入すると

$$
\ddot{x} + (2 - c^2)\,n^2 x = 2nc\,K
$$

となり、その解は

$$
x(t) = A\cos\omega_p t + B\sin\omega_p t + C_x,\qquad
C_x = \frac{2c}{(2 - c^2)\,n}\,K,\qquad
\omega_p = n\sqrt{2 - c^2}
$$

である。これを $\dot{y} = K - 2nc\,x$ に代入して積分すると

$$
y(t) = -\frac{2nc}{\omega_p}A\sin\omega_p t + \frac{2nc}{\omega_p}B\cos\omega_p t + \frac{2 - 5c^2}{2 - c^2}\,K\,t + D
$$

を得る。$K \neq 0$ のときに限り、$y$ に時間に比例する項（ドリフト）が現れる。$K = 0$ であれば $C_x = 0$ となり、$x$ と $y$ はいずれも純粋な周期運動になる。古典的な HCW 方程式における積分定数 $C$ とドリフト項 $-\tfrac{3}{2}nCt$ の役割を、$K$ が担っている。

## 4. 零ドリフト条件

初期状態 $(x_0, y_0, z_0, \dot{x}_0, \dot{y}_0, \dot{z}_0)$ について $K = \dot{y}_0 + 2nc\,x_0$ であるから、

$$
\dot{y}_0 = -2nc\,x_0
$$

を満たせば $K = 0$ となり、J2 摂動下でも面内のドリフトは生じない。これは古典的な周期条件 $\dot{y}_0 = -2nx_0$ に係数 $c$ を掛けた形であり、$c \to 1$ で古典的な条件に戻る。

面外の運動は

$$
z(t) = E\cos\omega_z t + F\sin\omega_z t,\qquad \omega_z = n\sqrt{3c^2 - 2}
$$

の単振動のままであり、$E = z_0$、$F = \dot{z}_0 / \omega_z$ である。

## 5. 本アプリケーションでの実装

| 項目 | 内容 | 実装 |
| --- | --- | --- |
| SS 係数の計算 | J2 摂動が有効なとき、基準軌道の半径と軌道傾斜角から $s$ と $c$ を計算する。無効なときは $c = 1$。 | `HillEquationSolver.getSSCoefficient` |
| 初期速度の計算 | $\dot{y}_0 = -2nc\,x_0$ を返す。 | `HillEquationSolver.computeStableVy0` |
| 条件の検証 | ドリフト定数 $K = \dot{y} + 2nc\,x$ を計算し、許容誤差（既定 $10^{-6}$ m/s）以内かを判定する。 | `HillEquationSolver.computeDriftConstant`、`verifyStableInitialVelocity` |
| 配置への適用 | 円盤系の配置パターン（六角格子・正方格子・同心リング）で、円軌道解の $\dot{y}_0$ に $c$ を掛ける。 | `src/simulation/patterns/diskPatterns.ts` |
| UI | 「軌道・力学」タブの「J2 安定配置で初期化」。切り替えると衛星を再配置する。 | `src/features/scenario/OrbitTab.tsx` |

$c$ は J2 摂動が有効なときだけ 1 と異なる値を取るため、J2 安定配置の効果が現れるのは「J2 摂動」と「J2 安定配置で初期化」をともに有効にした場合である。

## 6. まとめ

1. SS モデルでは $K = \dot{y} + 2nc\,x$ が保存量であり、$K = 0$ が零ドリフト条件である。
2. したがって、J2 安定配置は初期状態で $\dot{y}_0 = -2nc\,x_0$ を満たす配置である。
3. 古典的な HCW 方程式の周期解にもとづく配置は、$\dot{y}_0$ に係数 $c$ を掛けるだけで J2 摂動下でも有界な相対軌道になる。
