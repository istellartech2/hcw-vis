# 円盤配置の生成

本書では、配置パターン「円盤（六角格子）」「円盤（正方格子）」「円盤（同心リング）」で用いる初期配置の生成アルゴリズムをまとめる。実装は `src/simulation/patterns/` にある。

| パターン | 格子点の生成 | 実装 |
| --- | --- | --- |
| 円盤（六角格子） | 六角格子（ハニカム格子）を原点から近い順に抽出 | `latticePoints.ts` の `generateHexLatticePoints` |
| 円盤（正方格子） | 正方格子を原点から近い順に抽出 | `latticePoints.ts` の `generateSquareLatticePoints` |
| 円盤（同心リング） | 同心円上に等間隔に配置 | `diskPatterns.ts` の `generateConcentricDisk` |

## 1. 背景と目的

HCW 方程式の円軌道解（基準衛星からの距離が一定の相対軌道）は、大きさのパラメータ $\rho$ と位相 $\theta$ の 2 つで表される。したがって、平面上の点 $(\rho, \theta)$ の集合を用意すれば、それぞれを円軌道解に対応させることで、基準衛星のまわりを円盤状に周回する衛星群の初期状態が得られる。

衛星を円盤内にむらなく並べるため、平面を充填する格子（六角格子または正方格子）の点を原点から近い順に必要数だけ取り出し、極座標に変換して用いる。

## 2. 六角格子の座標系

### 2.1 軸座標

六角格子の各点は整数の組 $(p, q)$（軸座標）で一意に表される。$p, q$ は負を含む任意の整数を取る。

### 2.2 直交座標と極座標

最近傍間隔を 1 とすると、直交座標は

$$
x = p + \frac{q}{2},\qquad y = \frac{\sqrt{3}}{2}\,q
$$

であり、極座標は

$$
\rho = \sqrt{p^2 + pq + q^2},\qquad \theta = \operatorname{atan2}(y, x)
$$

となる。

## 3. リングと点数

### 3.1 リング番号

原点からの格子上の最短手数（リング番号）は

$$
d = \frac{|p| + |q| + |p + q|}{2}
$$

である。リング番号 $d$ が等しい点は、原点を中心とする六角形上に並ぶ。

### 3.2 リング $k$ 以内の点数

リング $d$（$d \ge 1$）上の点数は $6d$ であり、リング $k$ 以内の点数の合計は

$$
N(k) = 1 + 3k(k + 1)
$$

である。

### 3.3 $X$ 点を得るのに必要なリング数

$N(k) \ge X$ を満たす最小の $k$ は

$$
k_{\min} = \left\lceil \frac{-3 + \sqrt{12X - 3}}{6} \right\rceil
$$

である。

## 4. 原点から近い順の抽出

リング番号の順に点を取り出すと、配置の外縁は六角形になる。外縁を円形に近づけるため、次の手順でユークリッド距離の順に抽出する。

1. $k_{\min}$ を求め、余裕を持たせて $k_{\min} + 1$ までのリングの点をすべて列挙する（点数は $N(k_{\min} + 1)$）。
2. 各点の $\rho$ と $\theta$ を計算する。
3. $\rho$ の昇順（$\rho$ が等しい場合は $\theta$ の昇順）に並べ替える。
4. 先頭から $X$ 点を採用する。

$X$ 点目の $\rho$ が円盤の実効半径となり、六角形の角だけが残ることを避けられる。計算量は並べ替えが支配的で $O(X \log X)$ である。

```pseudocode
function hex_disk_points(X):
    if X <= 0: return []
    k = ceil((-3 + sqrt(12 * X - 3)) / 6)
    candidates = []
    for ring in [0 .. k + 1]:
        candidates.extend(enumerate_ring(ring))
    for pt in candidates:
        pt.x = pt.p + 0.5 * pt.q
        pt.y = sqrt(3) / 2 * pt.q
        pt.rho = sqrt(pt.x^2 + pt.y^2)
        pt.theta = atan2(pt.y, pt.x)
    sort candidates by (rho, theta)
    return first X candidates
```

## 5. 正方格子への拡張

六角格子では各点の最近傍が 6 方向にあるが、最近傍を 4 方向とする正方格子の配置が望ましい場合もある。

### 5.1 座標

各点は整数の組 $(i, j)$ で表し、直交座標は $(x, y) = (i, j)$、最近傍間隔は 1 とする。極座標は

$$
\rho = \sqrt{i^2 + j^2},\qquad \theta = \operatorname{atan2}(j, i)
$$

である。

### 5.2 抽出手順

上下左右の 4 近傍をたどる単純な幅優先探索ではマンハッタン距離の順になり、配置がひし形になる。そこで、$\rho$ を優先度とする優先度付きキュー（最小ヒープ）を用いて展開する。

1. 原点 $(0, 0)$ をキューに追加する。
2. $\rho$ が最小の点を取り出して採用する。
3. その 4 近傍のうち未訪問の点をキューに追加する。
4. $X$ 点を採用するまで 2–3 を繰り返す。

採用順はユークリッド距離の昇順になるため、外縁はほぼ円形になる。

```pseudocode
function square_disk_points(X):
    if X <= 0: return []
    heap = PriorityQueue(order by (rho, theta))
    visited = {(0, 0)}
    push(heap, (0, 0))
    points = []
    while |points| < X:
        pt = pop_min(heap)
        points.append(pt)
        for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nb = (pt.i + dx, pt.j + dy)
            if nb not in visited:
                visited.add(nb)
                push(heap, nb)
    return points
```

## 6. 同心リング配置

同心リング配置では格子を用いず、中心の 1 点と、半径がリング間隔 $\Delta$ ずつ大きくなる同心円上に衛星を並べる。

- 半径 $\rho_\ell = \ell\,\Delta$ のリングに置く点数は、円周をリング間隔で割った値 $\operatorname{round}(2\pi\rho_\ell / \Delta)$（最小 6）とする。最後のリングは残りの点数で打ち切る。
- 各リングでは等角度間隔に配置し、奇数番目のリングは角度を半ピッチずらす。

## 7. スケーリング

格子点は最近傍間隔 1 で生成されるため、ユーザーの指定に応じて実寸に変換する。

| モード | 変換 |
| --- | --- |
| 半径指定（radius） | 採用した点の最大距離 $\rho_{\max}$ が指定半径 $R$ になるよう、$\rho \mapsto \rho\,R / \rho_{\max}$ と線形に拡大縮小する。 |
| 間隔指定（spacing） | 指定した衛星間隔 $S$ を掛け、$\rho \mapsto \rho\,S$ とする。円盤の半径は衛星数から自動的に決まる。 |

同心リング配置では、間隔指定のときは $\Delta = S$ とし、半径指定のときは衛星数から $\Delta$ を決め、半径を $R$ 以下に制限する。

> ここでの $R$ と $S$ は、8 章のパラメータ $\rho$ に対する値である。8 章の写像は平面上の距離を $2/\sqrt{5} \approx 0.894$ 倍に縮めるため、3 次元空間での実際の円盤半径と衛星間隔は、それぞれ $2R/\sqrt{5}$、$2S/\sqrt{5}$ になる。

## 8. 円軌道の初期状態への変換

円盤上の点 $(\rho, \theta)$ は、HCW 方程式の円軌道解の初期状態に次のように対応させる（$n$ は平均運動）。

$$
\begin{aligned}
x_0 &= \frac{\rho}{\sqrt{5}}\cos\theta, & \dot{x}_0 &= \frac{\rho n}{\sqrt{5}}\sin\theta,\\
y_0 &= \frac{2\rho}{\sqrt{5}}\sin\theta, & \dot{y}_0 &= -\frac{2\rho n}{\sqrt{5}}\cos\theta,\\
z_0 &= \frac{\sqrt{3}\,\rho}{\sqrt{5}}\cos\theta, & \dot{z}_0 &= \frac{\sqrt{3}\,\rho n}{\sqrt{5}}\sin\theta
\end{aligned}
$$

このとき $x^2 + y^2 + z^2 = \tfrac{4}{5}\rho^2$ が常に成り立つ。すなわち各衛星は基準衛星から一定の距離 $2\rho/\sqrt{5}$ を保って周回し、衛星群全体は軌道面に対して傾いた円盤として回転する。平面上の点 $(\rho\cos\theta, \rho\sin\theta)$ から初期位置 $(x_0, y_0, z_0)$ への写像は相似変換（倍率 $2/\sqrt{5}$）であるため、格子点の並びは形を保ったまま円盤上に写される。

[HCW 方程式の理論](theory.md) 7.3 節の円の半径 $r$ とは $r = 2\rho/\sqrt{5}$ の関係にある。

J2 安定配置を有効にした場合は、$\dot{y}_0$ に Schweighart-Sedwick 係数 $c$ を掛けて $\dot{y}_0 = -2\rho n c\cos\theta / \sqrt{5}$ とする（[J2 安定配置](j2-stable-arrangement.md)）。

## 9. まとめ

格子点を原点から近い順に抽出して極座標に変換し、HCW 方程式の円軌道解に対応させることで、基準衛星のまわりを円盤状に周回する衛星群の初期状態を、衛星数によらず簡潔に生成できる。
