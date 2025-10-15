# 円盤配置アルゴリズム改善検討

## 現状: 六角格子ベースの `hexagonal_disk`
- `src/simulation/OrbitInitializer.ts` の `generateHexagonalDisk` はハニカム格子（軸座標 \((m, n)\)）の点を列挙し、原点からの距離平方 \(r^2 = m^2 + mn + n^2\) と極角 \(\theta = \operatorname{atan2}(y, x)\) でソートします。
- 必要なリング数 \(k\) を \(k = \lceil(-3 + \sqrt{12\,\text{count} - 3})/6\rceil\) で決定し、\(d = (|m| + |n| + |m + n|)/2 \le k\) の範囲で格子点を取得します。
- 上位 `count` 個を円軌道の初期条件式にマッピングすることで、位置と速度を生成しています。
- 格子の最近接距離は一定で角度も 60° 単位にそろいますが、リングごとに六角形の稜線がそのまま投影されるため、円盤としては角張った外形になります。

## 課題
- リング境界で衛星が揃うため、外縁が六角形の花弁状になり「レコード盤」のような滑らかな円に見えません。
- `count` を増やすと外側ほどリング間隔が広がり、外周部が疎に感じられます。

## 改善方針: 等距離・等角度を保つ同心リング配置
- 六角格子が持つ「最近接距離が一定」「角度が等間隔」という性質を残しつつ外周を円に近づけるために、半径一定ステップの同心リングに衛星を配置します。
- 各リングでは弧長間隔がほぼ一定になるよう衛星数を決め、リング同士を半位相ずらしでオフセットして三角格子に近い局所構造を維持します。
- 半径・角度から HCW の初期条件式に代入すれば既存のダイナミクス処理を流用できます。

### 擬似コード
```pseudo
function generateConcentricDisk(count, radius, meanMotion):
    if count <= 0: return []

    spacing = radius / ceil(sqrt(count))   # 目標最近接距離の初期推定
    rings = []
    remaining = count
    level = 0

    while remaining > 0:
        if level == 0:
            rings.append({ radius: 0, nodes: 1 })
            remaining -= 1
        else:
            r = level * spacing
            if r > radius: break
            n = max(6, round((2 * PI * r) / spacing))
            rings.append({ radius: r, nodes: n })
            remaining -= n
        level += 1

    positions = []
    for ringIndex, ring in enumerate(rings):
        if positions.length >= count: break
        deltaTheta = 2 * PI / ring.nodes
        offset = (ringIndex % 2) * (deltaTheta / 2)

        for k in 0 .. ring.nodes-1:
            if positions.length >= count: break
            theta = offset + k * deltaTheta
            r = ring.radius

            x0 = (r / sqrt(5)) * cos(theta)
            y0 = (2 * r / sqrt(5)) * sin(theta)
            z0 = (sqrt(3) * r / sqrt(5)) * cos(theta)

            vx0 = (r * meanMotion / sqrt(5)) * sin(theta)
            vy0 = -(2 * r * meanMotion / sqrt(5)) * cos(theta)
            vz0 = (sqrt(3) * r * meanMotion / sqrt(5)) * sin(theta)

            positions.append({x0, y0, z0, vx0, vy0, vz0})

    return positions
```

### TypeScript への適用例
```ts
private generateConcentricDisk(count: number, radius: number): InitialCondition[] {
    const positions: InitialCondition[] = [];
    if (count <= 0) {
        return positions;
    }

    const spacing = radius / Math.ceil(Math.sqrt(count));
    const sqrt5 = Math.sqrt(5);
    const sqrt3 = Math.sqrt(3);

    interface Ring { radius: number; nodes: number; }
    const rings: Ring[] = [];
    let remaining = count;
    let level = 0;

    while (remaining > 0) {
        if (level === 0) {
            rings.push({ radius: 0, nodes: 1 });
            remaining -= 1;
        } else {
            const r = level * spacing;
            if (r > radius * 1.05) {
                break; // 目標半径を十分超えたら終了
            }
            const nodes = Math.max(6, Math.round((2 * Math.PI * r) / spacing));
            rings.push({ radius: r, nodes });
            remaining -= nodes;
        }
        level += 1;
    }

    for (let ringIdx = 0; ringIdx < rings.length && positions.length < count; ringIdx++) {
        const { radius: r, nodes } = rings[ringIdx];
        const deltaTheta = (2 * Math.PI) / nodes;
        const offset = ringIdx % 2 === 0 ? 0 : deltaTheta / 2;

        for (let node = 0; node < nodes && positions.length < count; node++) {
            const theta = offset + node * deltaTheta;
            const cosTheta = Math.cos(theta);
            const sinTheta = Math.sin(theta);

            const x0 = (r / sqrt5) * cosTheta;
            const y0 = (2 * r / sqrt5) * sinTheta;
            const z0 = (sqrt3 * r / sqrt5) * cosTheta;

            const vx0 = (r * this.n / sqrt5) * sinTheta;
            const vy0 = -(2 * r * this.n / sqrt(5)) * cosTheta;
            const vz0 = (sqrt3 * r * this.n / sqrt(5)) * sinTheta;

            positions.push({ x0, y0, z0, vx0, vy0, vz0 });
        }
    }

    return positions;
}
```

## 実装上の注意
- `spacing` は初期推定なので、シミュレーションでの見た目を確認しながら微調整する余地があります。外周で余剰が出た場合は最外リングの半径を `radius` に合わせてスケールすると揃います。
- リングごとの衛星数を最低 6 以上にすることで、局所的な正三角格子構造を維持し、最近接距離のばらつきを抑えます。
- リングを交互に半位相ずらすことで、隣接リング間でも衛星間距離が `spacing` 付近にそろい、六角格子に近いパターンを保てます。
- Lloyd 緩和などの位置調整を軽くかけると、細かなムラが残った場合でも距離を大きく崩さず整えられます。

## まとめ
- 現状の `hexagonal_disk` は等距離・等角度の性質を持つものの、外形が六角形になるため円盤状に見えにくいことが課題です。
- 同心リング方式を用いると距離と角度の均一性を保ちながら、外周が滑らかな円に近い配置を生成できます。
- `OrbitInitializer` に追加して UI で選択できるようにすれば、六角格子と円盤状格子を用途に応じて切り替える運用が可能です。
