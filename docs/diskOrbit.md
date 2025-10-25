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

## 5. 中心からの配置順序の決定

六角格子をそのまま切り取ると、外縁が正六角形に近いまま残ってしまう。そこで一度「必要数より多め」に格子点を生成し、**ユークリッド距離でソートしたのちに中心から順番に切り出す**ことで、境界が円形に近いディスクを得る。

### 5.1 リングの過サンプリング

1. $N(k) = 1 + 3k(k+1)$ から $N(k) \ge X$ を満たす最小 $k_{\text{min}}$ を算出。
2. 円形クリッピングの自由度を確保するため、$k_{\text{min}} + 1$ までのリングをすべて列挙（合計点数は $N(k_{\text{min}}+1)$）。

### 5.2 円形クリッピング

1. 各格子点 $(q, r)$ を直交座標 $(x, y)$ に変換し、$\rho = \sqrt{x^2 + y^2}$ を計算。
2. $\rho$ 昇順（同値なら極角 $\theta = \text{atan2}(y, x)$ 昇順）で並び替え。
3. 先頭 $X$ 点を採用。$X$ 点目の $\rho$ が自然と「ディスクの実効半径」になるため、六角形の角だけが余分に残る状況を避けられる。

### 5.3 スケーリング戦略（radius / spacing）

* **radius モード**: 採用点の最大距離 $\rho_{\max}$ を求め、ユーザー指定の半径 $R$ に合わせて $\rho \mapsto \rho\,(R/\rho_{\max})$ で線形スケールする。
* **spacing モード**: 六角格子の単位長は最近傍間隔 1 に相当するため、$\rho \mapsto \rho\,S$ としてユーザー指定の衛星間隔 $S$ を直接適用する。これにより、ディスク半径は必要衛星数から自動的に決まる。

アルゴリズム全体の疑似コードは以下の通り。

```pseudocode
function disk_points_from_hex(X):
    if X <= 0: return []
    k = ceil((-3 + sqrt(12*X - 3)) / 6)
    candidates = []
    for ring in [0 .. k+1]:
        candidates.extend(enumerate_ring(ring))
    for p in candidates:
        p.x = p.q + 0.5*p.r
        p.y = sqrt(3)/2 * p.r
        p.rho = sqrt(p.x^2 + p.y^2)
        p.theta = atan2(p.y, p.x)
    sort candidates by (rho, theta)
    return first X candidates
```

こうして得た「中心から近い順の六角格子点」を円軌道の基準式（節 5.3, 6 参照）で変換すれば、見た目も円盤状に広がる編隊初期状態が得られる。

---

## 6. 円盤軌道への応用

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

## 7. 結論

正六角形タイル張りを軸座標で捉え，極座標への変換とリング数計算を組み合わせることで，入力 $X$ 個の「原点から近い」格子点を効率的に抽出できる。この方法を円軌道座標に写像すれば，人工衛星群や粒子シミュレーションの初期配置を簡潔に生成できる。
