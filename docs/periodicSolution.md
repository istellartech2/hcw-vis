# Hill-Clohessy–Wiltshire (HCW) 方程式
周期解と 初期状態 → 積分定数 変換公式まとめ（導出付き）

## 1. 基本設定
座標系：LVLH
* $x$ : Radial（地球中心→主衛星）
* $y$ : Along-track（軌道進行方向）
* $z$ : Cross-track（軌道面法線）
平均運動：$n$ [rad s$^{-1}$]

## 2. CW 微分方程式

$$
\begin{aligned}
\ddot{x} - 2n\dot{y} - 3n^2 x &= 0\\
\ddot{y} + 2n\dot{x} &= 0\\
\ddot{z} + n^2 z &= 0
\end{aligned}
$$

($\dot{}$ は 1 階微分, $\ddot{}$ は 2 階微分)

## 3. 一般解（積分定数 $A$–$F$ で表現）

$$
\begin{aligned}
x(t) &= A \cos(nt) + B \sin(nt) + C\\
y(t) &= -2A \sin(nt) + 2B \cos(nt) - \frac{3}{2} n C t + D\\
z(t) &= E \cos(nt) + F \sin(nt)
\end{aligned}
$$

6 つの定数 $A$, $B$, $C$, $D$, $E$, $F$ が自由度。

### 3.1 周期解（ドリフト無し）の条件
ドリフト項を消すには $C = 0$ が必須。
このとき

$$
\begin{aligned}
x(t) &= A \cos(nt) + B \sin(nt)\\
y(t) &= -2A \sin(nt) + 2B \cos(nt) + D\\
z(t) &= E \cos(nt) + F \sin(nt)
\end{aligned}
$$

が $2\pi/n$ 毎に完全に繰り返す。

## 4. 初期値 ($t = 0$) から $A$–$F$ を求める公式
初期状態を

$$
x_0, y_0, z_0, \quad \dot{x}_0, \dot{y}_0, \dot{z}_0
$$

とする。

| 定数 | 式 |
| --- | --- |
| $B$ | $\dot{x}_0 / n$ |
| $F$ | $\dot{z}_0 / n$ |
| $E$ | $z_0$ |
| $C$ | $2(\dot{y}_0 + 2nx_0)/n = 2\dot{y}_0/n + 4x_0$ |
| $A$ | $x_0 - C$ |
| $D$ | $y_0 - 2B = y_0 - 2\dot{x}_0/n$ |

### 4.1 周期解用の初期値拘束
$C = 0$ を要求すると

$$
\dot{y}_0 = -2nx_0
$$

が必要になる。
その場合

$$
\begin{aligned}
A &= x_0\\
B &= \dot{x}_0 / n\\
D &= y_0 - 2\dot{x}_0 / n\\
E &= z_0\\
F &= \dot{z}_0 / n
\end{aligned}
$$

で 5 つの自由度に減少。

## 5. 導出の流れ
$t = 0$ を一般解に代入

$$
\begin{aligned}
x_0 &= A + C\\
y_0 &= 2B + D\\
z_0 &= E
\end{aligned}
$$

速度式（時間微分）を $t = 0$ で評価

$$
\begin{aligned}
\dot{x}_0 &= nB\\
\dot{y}_0 &= -2nA - \frac{3}{2}nC\\
\dot{z}_0 &= nF
\end{aligned}
$$

6 本の一次方程式を解く

* $B$ と $F$ は速度から直ちに決定
* $C$ は $\dot{y}_0$, $x_0$ から
* $A = x_0 - C$
* $D = y_0 - 2B$
* $E = z_0$

$C = 0$ と置けば周期条件および拘束式 $\dot{y}_0 = -2nx_0$ が得られる。

## 6. まとめ
* HCW 一般解：上記 (3)。
* 周期解条件：$C = 0$。
* 初期値→$A$-$F$：上記 (4) の表。
* 周期解用初期値拘束：$\dot{y}_0 = -2nx_0$。

このシートを使えば
* 与えられた初期位置・速度から積分定数を即計算
* $C = 0$ にすればドリフトの無い周期軌道
を簡潔に設計・解析できます。