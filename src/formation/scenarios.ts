/**
 * 学習用の衛星配置シナリオ。
 * HCW 方程式の性質（ドリフト・周期軌道・面外振動など）を 1 つずつ観察できる配置をまとめる。
 *
 * 各シナリオは呼ぶたびに新しい設定を返す（レイヤー id が重複しないように）。
 * 観察のポイントは `description` に入れ、パネルに表示する。
 */

import { AXIS_COLORS } from '@/store/settings';
import { FORMATION_FILE_VERSION, type FormationConfig, type FormationLayer } from './FormationTypes';

export interface FormationScenario {
    id: string;
    title: string;
    /** 一覧に表示する 1 行の説明 */
    summary: string;
    /** @param n 基準軌道の平均運動 (rad/s)。初速度を m/s で与えるシナリオが使う */
    build: (n: number) => FormationConfig;
}

// 3D ビューの座標軸と同じ色（R: 赤, S: 緑, W: 青）
const { r: R_COLOR, s: S_COLOR, w: W_COLOR } = AXIS_COLORS;
const GRAY = '#b0b8c4';
const YELLOW = '#f7b731';
const TEAL = '#4ecdc4';
const PURPLE = '#a55eea';
// 符号が負の向きは軸の色を薄くして区別する
const R_LIGHT = '#ffb3b3';
const S_LIGHT = '#9ef0bd';
const W_LIGHT = '#99e6ff';

/** 編集欄で読みやすいよう、初速度を有効数字 3 桁に丸める */
const roundVelocity = (v: number) => Number(v.toPrecision(3));

type LayerSpec = Omit<FormationLayer, 'id' | 'enabled' | 'shape' | 'size' | 'colorMode'> &
    Partial<Pick<FormationLayer, 'shape' | 'size' | 'colorMode'>>;

function layer(spec: LayerSpec): FormationLayer {
    return { id: crypto.randomUUID(), enabled: true, shape: 'sphere', size: 0.8, colorMode: 'uniform', ...spec };
}

function formation(name: string, description: string, layers: LayerSpec[]): FormationConfig {
    return {
        version: FORMATION_FILE_VERSION,
        name,
        description,
        createdAt: new Date().toISOString(),
        layers: layers.map(layer),
    };
}

type Rsw = { r?: number; s?: number; w?: number };
const rsw = (v: Rsw) => ({ r: v.r ?? 0, s: v.s ?? 0, w: v.w ?? 0 });

/** RSW オフセットだけずらして 1 機置く。velocity (m/s) を省くと初速度 0 */
function single(name: string, color: string, offset: Rsw, velocity?: Rsw): LayerSpec {
    return {
        name,
        pattern: 'origin',
        placementMode: 'spacing',
        spacing: 1,
        satelliteCount: 1,
        color,
        rswOffset: rsw(offset),
        ...(velocity && { rswVelocity: rsw(velocity) }),
    };
}

/** HCW 周期解 x = A cos nt + B sin nt, y = −2A sin nt + 2B cos nt + D, z = E cos nt + F sin nt */
function periodic(
    name: string,
    color: string,
    count: number,
    params: { A: number; B?: number; D?: number; E?: number; F?: number },
): LayerSpec {
    const { A, B = 0, D = 0, E = 0, F = 0 } = params;
    return {
        name,
        pattern: 'periodic_orbit',
        placementMode: 'radius',
        // radius は正の値しか受け付けない。periodicParams があるときは使われないので、A の符号はそちらで持つ
        radius: Math.abs(A) || 1,
        satelliteCount: count,
        color,
        zAmplitude: 0,
        periodicParams: { A, B, D, E, F },
    };
}

/** 学習者が順に読む前提で並べる（前のシナリオで見た性質を次のシナリオで使う） */
export const FORMATION_SCENARIOS: readonly FormationScenario[] = [
    {
        id: 'zero-velocity',
        title: '初速度 0 で置くと？',
        summary: 'R・S・W 方向に 10 m ずらした衛星の動きの違い',
        build: () =>
            formation(
                '初速度 0 で置くと？',
                '基準衛星から R・S・W 方向に 10 m ずらし、相対速度 0 で置いています。' +
                    '赤（R）は高度が高く周期が長いため、輪を描きながら後方（−S）へドリフトしていきます。' +
                    '緑（S）は同じ軌道の少し前にいるだけなので、その場にとどまります。' +
                    '青（W）は軌道面がわずかに傾いた状態で、1 周回ごとに軌道面を横切って振動します。',
                [
                    single('R 方向 +10 m', R_COLOR, { r: 10 }),
                    single('S 方向 +10 m', S_COLOR, { s: 10 }),
                    single('W 方向 +10 m', W_COLOR, { w: 10 }),
                ],
            ),
    },
    {
        id: 'grid-drift',
        title: '格子に並べると？',
        summary: '立方格子を初速度 0 で置くと、R の層ごとにずれていく',
        build: () =>
            formation(
                '格子に並べると？',
                '10 m 間隔の 3×3×3 の立方格子を作り、すべて初速度 0 で置いています。' +
                    'R の値が同じ層はそろって同じ動きをし、輪を描きながらドリフトします。' +
                    'R = +10 m の層は 1 周回で約 380 m 後方へ、R = −10 m の層は同じだけ前方へ進みます。' +
                    'R = 0 の層は前後にはずれず、W 方向にずれた衛星が軌道面をはさんで振動するだけです。' +
                    'つまりドリフトするかどうかは R だけで決まり、S や W のずれは関係しません。' +
                    'W 軸の方向（横）から見ると層ごとのずれが、S 軸の方向（真後ろ）から見ると W 方向の振動がよくわかります。',
                [
                    {
                        name: '立方格子（10 m 間隔）',
                        pattern: 'grid',
                        placementMode: 'spacing',
                        spacing: 10,
                        satelliteCount: 1,
                        color: TEAL,
                        size: 0.6,
                    },
                ],
            ),
    },
    {
        id: 'drift-free',
        title: 'ドリフトしない条件',
        summary: 'R 軸上と W 軸上の 3 点ずつで、ドリフトするかを比べる',
        build: () =>
            formation(
                'ドリフトしない条件',
                'R = +10 m、+5 m、−10 m の 3 か所に、灰色（初速度 0）と黄色を 1 機ずつ置いています。' +
                    '灰色は R に比例した速さでドリフトし、+10 m は 1 周回で約 380 m 後方、+5 m はその半分、−10 m は逆に前方へ進みます。' +
                    '黄色には S 方向の初速度 vS = −2n·R（n は平均運動）を与えて周期を基準衛星とそろえてあるので、' +
                    'どれも 2:1 の楕円を描いて元の位置に戻ってきます。これが HCW のドリフト消失条件です。' +
                    '必要な初速度も R に比例し、R がマイナスなら向きが逆になります。' +
                    'R = +10 m と −10 m の黄色は、同じ楕円の反対側を回っています。' +
                    '青は Cross-track（W 軸）上の W = +10 m、+5 m、−10 m に初速度 0 で置いたものです。' +
                    'R = 0 なので vS = −2n·R = 0 となり、初速度 0 のままでドリフト消失条件を満たしています。' +
                    '軌道面をはさんで振動するだけで、前後にはずれていきません。',
                [
                    single('R = +10 m（初速度 0）', GRAY, { r: 10 }),
                    single('R = +5 m（初速度 0）', GRAY, { r: 5 }),
                    single('R = −10 m（初速度 0）', GRAY, { r: -10 }),
                    periodic('R = +10 m（vS = −2n·R）', YELLOW, 1, { A: 10 }),
                    periodic('R = +5 m（vS = −2n·R）', YELLOW, 1, { A: 5 }),
                    periodic('R = −10 m（vS = −2n·R）', YELLOW, 1, { A: -10 }),
                    single('W = +10 m（初速度 0）', W_COLOR, { w: 10 }),
                    single('W = +5 m（初速度 0）', W_COLOR, { w: 5 }),
                    single('W = −10 m（初速度 0）', W_COLOR, { w: -10 }),
                ],
            ),
    },
    {
        id: 'delta-v',
        title: '押す向きで動きはどう変わる？',
        summary: '基準衛星の位置から 6 方向へ、同じ速さで押し出す',
        build: (n) => {
            // R 方向に押したときの楕円の R 振幅が約 5 m になる速さ
            const v = roundVelocity(5 * n);
            return formation(
                '押す向きで動きはどう変わる？',
                `6 機とも基準衛星と同じ位置から、同じ大きさの初速度（約 ${(v * 100).toFixed(2)} cm/s）で押し出しています。` +
                    '緑は前（+S）、薄い緑は後ろ（−S）、赤は上（+R）、薄い赤は地球側（−R）、青と薄い青は ±W への初速度です。' +
                    '前へ押した緑は、速くなった分だけ高度が上がって周期が長くなるため、結果として後方へ下がっていきます（1 周回で約 94 m）。' +
                    '後ろへ押した薄い緑はその逆で、高度が下がって前方へ進みます。' +
                    '上下に押した赤の 2 機は周期が変わらないので、2:1 の楕円を描いて 1 周回ごとに出発点へ戻ってきます。' +
                    '青と薄い青は軌道面の外（±W）へ押したもので、面内の運動とは無関係に W 方向に単振動し、' +
                    '半周回で反対側へ振れて 1 周回で出発点に戻ってきます（軌道面がわずかに傾いただけです）。' +
                    '「前へ進みたければブレーキをかける」という、軌道上ならではの直感に反する動きです。',
                [
                    single('前へ（+S）', S_COLOR, {}, { s: v }),
                    single('後ろへ（−S）', S_LIGHT, {}, { s: -v }),
                    single('上へ（+R）', R_COLOR, {}, { r: v }),
                    single('地球側へ（−R）', R_LIGHT, {}, { r: -v }),
                    single('軌道面の外へ（+W）', W_COLOR, {}, { w: v }),
                    single('軌道面の外へ（−W）', W_LIGHT, {}, { w: -v }),
                ],
            );
        },
    },
    {
        id: 'in-plane-ellipse',
        title: '2:1 の楕円（面内の周期軌道）',
        summary: 'S 方向の幅が R 方向の 2 倍になる相対軌道',
        build: () =>
            formation(
                '2:1 の楕円',
                '軌道面内の周期軌道は、R 方向の振幅 A に対して S 方向の振幅が 2A の楕円になります。' +
                    '黄色は基準衛星を中心とした A = 10 m の楕円で、8 機が同じ楕円上を 1 周回で 1 周します。' +
                    '緑は係数 D で楕円の中心を S 方向に 40 m ずらしたもので、形は同じまま前方に移ります。',
                [
                    periodic('中心の楕円（A = 10 m）', YELLOW, 8, { A: 10 }),
                    periodic('前方にずらした楕円（D = 40 m）', S_COLOR, 6, { A: 5, D: 40 }),
                ],
            ),
    },
    {
        id: 'phase-and-center',
        title: '同じ形の楕円どうしの関係',
        summary: '位相や中心がずれても、衛星どうしの位置関係は保たれる',
        build: () =>
            formation(
                '同じ形の楕円どうしの関係',
                '黄色の 3 機は同じ楕円（A = 10 m）の上に、位相を 120° ずつずらして置いたものです。' +
                    '同じ周期で回るので、追いついたり離れたりせず、楕円の上で等間隔を保ちます。' +
                    '緑の 3 機は、楕円の中心を S 方向に 20 m ずらし、位相は黄色とそろえたものです。' +
                    '2 つの楕円の軌跡は交差しますが、緑はそれぞれ対応する黄色のちょうど 20 m 前を平行に動くだけなので、' +
                    '交差点に同時に来ることはありません（どの 2 機も、一番近づいたときで約 13 m 離れています）。' +
                    'HCW 方程式は線形なので、2 つの周期解の差もまた周期解になります。' +
                    'つまり、ドリフトしない衛星どうしの相対運動もドリフトしません。',
                [
                    periodic('中心の楕円（3 機）', YELLOW, 3, { A: 10 }),
                    periodic('前方にずらした楕円（D = 20 m）', S_COLOR, 3, { A: 10, D: 20 }),
                ],
            ),
    },
    {
        id: 'out-of-plane',
        title: '面外の振動',
        summary: 'W 方向の運動は面内と独立した単振動',
        build: () =>
            formation(
                '面外の振動',
                'W 方向の運動は R・S 方向と独立していて、周期が軌道周期と同じ単振動になります。' +
                    '青は面内の運動がなく W 方向にだけ振動するので、基準衛星の真横を往復します。' +
                    '黄色は小さな面内楕円に W 方向の振動を 90° ずらして足したもので、斜めに傾いた楕円を描きます。',
                [single('W 方向 +15 m', W_COLOR, { w: 15 }), periodic('面内 + 面外', YELLOW, 4, { A: 5, F: 15 })],
            ),
    },
    {
        id: 'circular-formation',
        title: '距離が一定の円軌道',
        summary: '面内の楕円に面外運動を足すと、傾いた円になる',
        build: () =>
            formation(
                '距離が一定の円軌道',
                '灰色は面内の 2:1 楕円で、基準衛星との距離は 10〜20 m の間で変わります。' +
                    '黄色は同じ面内運動に、W 方向の振動（振幅 √3·A）を位相をそろえて足したものです。' +
                    '軌道面が傾いた半径 20 m の円になり、基準衛星との距離が常に一定に保たれます。' +
                    '視点を回して、円盤が R 軸と W 軸の間に傾いていることを確かめてみてください。',
                [
                    periodic('面内の楕円', GRAY, 6, { A: 10 }),
                    {
                        name: '円軌道（半径 20 m）',
                        pattern: 'circular_orbit',
                        placementMode: 'radius',
                        radius: 10,
                        satelliteCount: 6,
                        color: YELLOW,
                        positiveZ: true,
                    },
                ],
            ),
    },
    {
        id: 'projected-circular',
        title: '真上から見ると円になる軌道',
        summary: '距離が一定の円と、S-W 面に映すと円になる軌道を比べる',
        build: () =>
            formation(
                '真上から見ると円になる軌道',
                '黄色は前のシナリオと同じ、基準衛星との距離が常に 20 m の円軌道です（W 方向の振幅は √3·A）。' +
                    '紫は W 方向の振幅を 2A にしたもので、R 軸の方向（真上）から見下ろすと、S-W 面で半径 20 m のきれいな円に見えます。' +
                    'その代わり、基準衛星との 3 次元の距離は 20〜22 m の間で変わります。' +
                    '真上から見た配置を一定にしたいなら紫、3 次元の距離を一定にしたいなら黄色、というように目的で使い分けます。' +
                    '視点を真上と横に切り替えて、2 つの見え方の違いを確かめてみてください。',
                [
                    {
                        name: '距離一定の円（半径 20 m）',
                        pattern: 'circular_orbit',
                        placementMode: 'radius',
                        radius: 10,
                        satelliteCount: 6,
                        color: YELLOW,
                        positiveZ: true,
                    },
                    periodic('真上から見て円（E = 2A）', PURPLE, 6, { A: 10, E: 20 }),
                ],
            ),
    },
    {
        id: 'passive-safety',
        title: 'ぶつからない楕円の選び方',
        summary: 'W 方向の位相しだいで、前後にずれても当たらない軌道になる',
        build: () =>
            formation(
                'ぶつからない楕円の選び方',
                '2 機とも同じ面内楕円（A = 10 m）に W 方向の振動（振幅 10 m）を足し、楕円の中心を前方に 20 m ずらしています。' +
                    'ドリフトなどで、S 方向の位置が予定からずれてしまった状況を想定しています。' +
                    '灰色は W 方向の振動を R 方向と同じ位相で足したもので、R と W が同時に 0 になる瞬間があるため、' +
                    '1 周回に 1 回、基準衛星の位置をまっすぐ通り抜けてしまいます。' +
                    '黄色は W 方向の振動を 90° ずらしたもので、R が 0 になるときは W が最大になるため、' +
                    'S 方向にどれだけずれても、基準衛星から 10 m 以上離れたまま通り過ぎます。' +
                    'S 軸の方向（真後ろ）から見ると、灰色は基準衛星を通る直線、黄色は基準衛星を囲む円に見えます。',
                [
                    periodic('W を同じ位相で足す', GRAY, 1, { A: 10, D: 20, E: 10 }),
                    periodic('W を 90° ずらして足す', YELLOW, 1, { A: 10, D: 20, F: 10 }),
                ],
            ),
    },
    {
        id: 'hold-points',
        title: 'V-bar と R-bar の待機点',
        summary: 'ISS へ向かう補給機が、どこで止まって待てるか',
        build: () =>
            formation(
                'V-bar と R-bar の待機点',
                'ランデブーでは、基準衛星（ISS など）の真後ろの直線を V-bar（−S 軸）、真下の直線を R-bar（−R 軸）と呼びます。' +
                    'どちらにも 3 機ずつ、初速度 0 で置いています。' +
                    '緑（V-bar 上）は基準衛星と同じ軌道の少し後ろにいるだけなので、推力を使わなくてもその場にとどまります。' +
                    'そのため、ドッキング方式の宇宙船（欧州の ATV など）は V-bar 上にいくつかの待機点を設け、' +
                    '止まって状態を確認しながら段階的に近づきます。' +
                    '赤（R-bar 上）は基準衛星より低い軌道にいて周期が短いので、止まっていられずに前方へドリフトし、' +
                    '下に離れるほど速く離れていきます。R-bar 上で止まり続けるには推力で支え続ける必要があります。' +
                    'その代わり、故障で推力が止まっても自然に基準衛星から離れていく安全な性質があるため、' +
                    'ロボットアームでつかまえてもらう補給機（日本の HTV「こうのとり」など）は R-bar の下からゆっくり近づきます。',
                [
                    single('V-bar −5 m', S_COLOR, { s: -5 }),
                    single('V-bar −10 m', S_COLOR, { s: -10 }),
                    single('V-bar −15 m', S_COLOR, { s: -15 }),
                    single('R-bar −5 m', R_COLOR, { r: -5 }),
                    single('R-bar −10 m', R_COLOR, { r: -10 }),
                    single('R-bar −15 m', R_COLOR, { r: -15 }),
                ],
            ),
    },
    {
        id: 'vbar-hops',
        title: 'V-bar 上を進むホップ',
        summary: '待機点から次の待機点へ、2 種類の噴射で移る',
        build: (n) => {
            // −20 m の待機点から 15 m 前の −5 m の待機点へ移る初速度（初期視点に収まる距離）
            const radial = roundVelocity((-n * 15) / 4); // 半周回で S 方向に −4·vR/n 進む
            const along = roundVelocity((-n * 15) / (6 * Math.PI)); // 1 周回で S 方向に −6π·vS/n 進む
            return formation(
                'V-bar 上を進むホップ',
                'V-bar 上の −20 m の待機点（灰色）から、15 m 前の −5 m の待機点（灰色）へ移る 2 つの方法を比べます。' +
                    `赤は地球側（−R）へ約 ${(Math.abs(radial) * 100).toFixed(2)} cm/s 押したもので、少し下にふくらみながら前へ進み、` +
                    'ちょうど半周回で次の待機点に着きます（ここで同じ大きさだけ上向きに噴射すれば止まります）。' +
                    `緑は後ろ（−S）へ約 ${(Math.abs(along) * 100).toFixed(2)} cm/s 押したもので、高度が下がって前へ進み、1 周回で次の待機点に着きます。` +
                    '着いたあとの噴射をしないとどうなるかも見てください。' +
                    '赤は 1 周回で元の待機点に戻ってくるので、到着時の噴射に失敗しても基準衛星には近づきません。' +
                    '緑はそのまま前へ進み続け、基準衛星へ向かってしまいます。' +
                    '実際の接近でも、安全のために R 方向の噴射によるホップがよく使われます。',
                [
                    single('待機点 −20 m', GRAY, { s: -20 }),
                    single('待機点 −5 m', GRAY, { s: -5 }),
                    single('R 方向のホップ（半周回）', R_COLOR, { s: -20 }, { r: radial }),
                    single('S 方向のホップ（1 周回）', S_COLOR, { s: -20 }, { s: along }),
                ],
            );
        },
    },
    {
        id: 'disk',
        title: '円盤状の衛星群',
        summary: '多数の衛星が崩れずに回り続ける配置',
        build: () =>
            formation(
                '円盤状の衛星群',
                '六角格子に並べた衛星に、それぞれ距離一定の円軌道となる初速度を与えています。' +
                    'すべての衛星が同じ周期で回るため、円盤の形を保ったまま 1 周回で 1 回転します。' +
                    '軌道・力学タブで J2 摂動を有効にすると少しずつ形が崩れていきます。' +
                    'さらに「J2 安定配置で初期化」を有効にすると、J2 摂動下でも形が保たれます。',
                [
                    {
                        name: '円盤（六角格子）',
                        pattern: 'hexagonal_disk',
                        placementMode: 'radius',
                        radius: 30,
                        satelliteCount: 37,
                        colorMode: 'random',
                        color: '#4ecdc4',
                        size: 0.6,
                    },
                ],
            ),
    },
    {
        id: 'random-cloud',
        title: 'ランダムな衛星の雲',
        summary: 'ばらばらに放出された衛星は、ほとんどが離れていく',
        build: () =>
            formation(
                'ランダムな衛星の雲',
                '±10 m の範囲にランダムに置いた衛星群です（読み込むたびに配置が変わります）。' +
                    '灰色は速度もランダムなので、多くの衛星がドリフトして雲が広がっていきます。' +
                    '黄色は速度をランダムにしつつドリフト消失条件 vS = −2n·R だけを満たしたもので、雲が広がらずにとどまります。',
                [
                    {
                        name: '速度もランダム',
                        pattern: 'random_position_velocity',
                        placementMode: 'radius',
                        radius: 10,
                        satelliteCount: 20,
                        color: GRAY,
                        size: 0.5,
                    },
                    {
                        name: 'ドリフト消失条件あり',
                        pattern: 'random_periodic',
                        placementMode: 'radius',
                        radius: 10,
                        satelliteCount: 20,
                        color: YELLOW,
                        size: 0.5,
                    },
                ],
            ),
    },
];
