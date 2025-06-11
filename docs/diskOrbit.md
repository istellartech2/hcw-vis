# 円盤軌道の初期座標について

## 1. 背景と目的

人工衛星の相対運動を解析する際，レコード盤軌道とも呼ばれるLVLH座標上の円軌道に乗る複数機の人工衛星の初期位置を効率よく与える方法が必要になる。ここでは，平面を充填する正六角形タイル（ハニカム格子）を数学的に取り扱い，その各タイル中心を原点からの極座標で取得する手法とアルゴリズムを整理する。得られた離散点を円盤（ディスク）状に配置すれば，円軌道上で等間隔に分布する初期座標セットとして利用できる。

---

## 2. 正六角形タイル張りと座標系

### 2.1 軸座標 (m, n)

* 格子の各中心は整数対 (m, n) で一意に表される。
* m, n は負も含めて全整数が取れる。

### 2.2 直交座標への変換

$$
\begin{aligned}
x &= m + 0.5 \cdot n\\
y &= \frac{\sqrt{3}}{2} \cdot n
\end{aligned}
$$

(一辺 1、flat‑top 配置を想定)

### 2.3 極座標への変換

$$
r = \sqrt{m^2 + mn + n^2}
$$

($\theta$ は $\text{atan2}(y, x)$ で計算)

この変換で中心点は同心六角形状の輪（リング）に分布する。

---

## 3. 距離 (リング番号) と点数

### 3.1 リング距離 d

$$
d = \frac{|m| + |n| + |m + n|}{2}
$$

d は原点から最短で何手進むかを表す。

### 3.2 半径 k 以内の点数 N(k)

$$
N(k) = 1 + 3k(k + 1)
$$

$0 \leq k$ においてリングごとの点数は $6k$、累積点数が上式。

### 3.3 X 個取得に必要な k

$$
k_{\text{min}} = \left\lceil \frac{-3 + \sqrt{12X - 3}}{6} \right\rceil
$$

これで $N(k_{\text{min}})$ 個の格子点が得られ，$N(k_{\text{min}}) \geq X$ を保証。

---

## 4. 極座標リスト取得アルゴリズム

1. 入力 $X$ を受け取る。
2. $k_{\text{min}}$ を計算。
3. 範囲 $m = -k_{\text{min}} \ldots k_{\text{min}}$ でループ。

   * $n$ の有効範囲を $d \leq k_{\text{min}}$ 条件で絞る。
   * 各 $(m, n)$ を配列に保存 (半径平方 $r_{\text{sq}}$ もキャッシュ)。
4. $r_{\text{sq}}$ 昇順 → $\theta$ 昇順にソート。
5. 先頭 $X$ 個を極座標 $(r, \theta)$ に変換して返す。

### 疑似コード抜粋

```pseudocode
function nearest_hex_points_in_polar(X):
    k = ceil( (-3 + sqrt(12*X - 3)) / 6 )
    points = []
    for m in [-k .. k]:
        n_min = max(-k, -m - k)
        n_max = min( k, -m + k)
        for n in [n_min .. n_max]:
            if (|m| + |n| + |m+n|)/2 <= k:
                r_sq = m*m + m*n + n*n
                points.append( (m, n, r_sq) )
    sort points by (r_sq, atan2(y, x))
    return first X elements mapped to (r, theta)
```

計算量は $O(X \log X)$ (ソート支配)。

---

## 5. 円盤軌道への応用

* $r$ を所望の軌道半径 $R_0$ に線形スケールすることで，等方的に広がる円盤上の初期位置集合を構成できる。
* $\theta$ はそのまま真方位角として利用可。
* これに軌道面法線を合わせ込む回転を加えれば，Hill 方程式シミュレーションや離散編隊設計の初期条件として直接使用できる。

極座標がわかっていれば以下の条件の初期状態で座標が得られる。

$$
\begin{aligned}
x_0 &= \frac{r}{\sqrt{5}} \cos(\theta)\\
y_0 &= \frac{2r}{\sqrt{5}} \sin(\theta)\\
z_0 &= \frac{\sqrt{3} r}{\sqrt{5}} \cos(\theta)\\
\frac{dx_0}{dt} &= \frac{rn}{\sqrt{5}} \sin(\theta)\\
\frac{dy_0}{dt} &= -\frac{2rn}{\sqrt{5}} \cos(\theta)\\
\frac{dz_0}{dt} &= \frac{\sqrt{3} rn}{\sqrt{5}} \sin(\theta)
\end{aligned}
$$

---

## 6. 結論

正六角形タイル張りを軸座標で捉え，極座標への変換とリング数計算を組み合わせることで，入力 $X$ 個の「原点から近い」格子点を効率的に抽出できる。この方法を円軌道座標に写像すれば，人工衛星群や粒子シミュレーションの初期配置を簡潔に生成できる。
