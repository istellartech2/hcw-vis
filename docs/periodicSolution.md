# Clohessy–Wiltshire (Hill) 方程式
周期解と 初期状態 → 積分定数 変換公式まとめ（導出付き）

## 1. 基本設定
座標系：LVLH
* x : Radial（地球中心→主衛星）
* y : Along-track（軌道進行方向）
* z : Cross-track（軌道面法線）
平均運動：n [rad s⁻¹]

## 2. CW 微分方程式

'''
x¨ − 2n y˙ − 3n² x = 0
y¨ + 2n x˙            = 0
z¨ + n² z             = 0
'''

( ˙ は 1 階微分, ¨ は 2 階微分)

## 3. 一般解（積分定数 A–F で表現）

'''
x(t) =  A cos(nt) + B sin(nt) + C
y(t) = −2A sin(nt) + 2B cos(nt) − (3/2) n C t + D
z(t) =  E cos(nt) + F sin(nt)
'''

6 つの定数 A, B, C, D, E, F が自由度。

### 3.1 周期解（ドリフト無し）の条件
ドリフト項を消すには C = 0 が必須。
このとき

'''
x(t) =  A cos(nt) + B sin(nt)
y(t) = −2A sin(nt) + 2B cos(nt) + D
z(t) =  E cos(nt) + F sin(nt)
'''

が 2π/n 毎に完全に繰り返す。

## 4. 初期値 (t = 0) から A–F を求める公式
初期状態を

'''
x0, y0, z0,   xdot0, ydot0, zdot0
'''

とする。

定数	式
B	xdot0 / n
F	zdot0 / n
E	z0
C	2( ydot0 + 2 n x0 ) / n = (2 ydot0)/n + 4 x0
A	x0 − C
D	y0 − 2 B = y0 − 2 xdot0 / n

### 4.1 周期解用の初期値拘束
C = 0 を要求すると

'''
ydot0 = −2 n x0
'''

が必要になる。
その場合

'''
A = x0
B = xdot0 / n
D = y0 − 2 xdot0 / n
E = z0
F = zdot0 / n
'''

で 5 つの自由度に減少。

## 5. 導出の流れ
t = 0 を一般解に代入

'''
x0 = A + C
y0 = 2B + D
z0 = E
'''

速度式（時間微分）を t = 0 で評価

'''
xdot0 = n B
ydot0 = −2 n A − (3/2) n C
zdot0 = n F
'''

6 本の一次方程式を解く

* B と F は速度から直ちに決定
* C は ydot0, x0 から
* A = x0 − C
* D = y0 − 2 B
* E = z0

C = 0 と置けば周期条件および拘束式 ydot0 = −2 n x0 が得られる。

## 6. まとめ
* CW 一般解：上記 (3)。
* 周期解条件：C = 0。
* 初期値→A-F：上記 (4) の表。
* 周期解用初期値拘束：ydot0 = −2 n x0。

このシートを使えば
* 与えられた初期位置・速度から積分定数を即計算
* C = 0 にすればドリフトの無い周期軌道
を簡潔に設計・解析できます。