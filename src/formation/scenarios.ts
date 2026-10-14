/**
 * 学習用の衛星配置シナリオ。
 * HCW 方程式の性質（ドリフト・周期軌道・面外振動など）を 1 つずつ観察できる配置をまとめる。
 *
 * 各シナリオは呼ぶたびに新しい設定を返す（レイヤー id が重複しないように）。
 * 観察のポイントは `description` に入れ、パネルに表示する。
 */

import { FORMATION_FILE_VERSION, type FormationConfig, type FormationLayer } from './FormationTypes';

export interface FormationScenario {
    id: string;
    title: string;
    /** 一覧に表示する 1 行の説明 */
    summary: string;
    build: () => FormationConfig;
}

// 3D ビューの座標軸と同じ色（R: 赤, S: 緑, W: 青）
const R_COLOR = '#ff6b6b';
const S_COLOR = '#2ecc71';
const W_COLOR = '#00bfff';
const GRAY = '#b0b8c4';
const YELLOW = '#f7b731';

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

/** RSW オフセットだけずらして 1 機置く（初速度 0） */
function single(name: string, color: string, offset: { r?: number; s?: number; w?: number }): LayerSpec {
    return {
        name,
        pattern: 'origin',
        placementMode: 'spacing',
        spacing: 1,
        satelliteCount: 1,
        color,
        rswOffset: { r: offset.r ?? 0, s: offset.s ?? 0, w: offset.w ?? 0 },
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
        radius: A,
        satelliteCount: count,
        color,
        zAmplitude: 0,
        periodicParams: { A, B, D, E, F },
    };
}

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
        id: 'drift-free',
        title: 'ドリフトしない条件',
        summary: '同じ位置から、初速度だけ変えた 2 機を比べる',
        build: () =>
            formation(
                'ドリフトしない条件',
                '2 機とも R 方向 +10 m から出発します。' +
                    '灰色は初速度 0 のため、周回ごとに約 190 m ずつ後方へドリフトします。' +
                    '黄色は S 方向に初速度 vS = −2n·R を与えてあり（n は平均運動）、周期を基準衛星とそろえているので、' +
                    '2:1 の楕円を描いて元の位置に戻ってきます。これが HCW のドリフト消失条件です。',
                [single('初速度 0', GRAY, { r: 10 }), periodic('vS = −2n·R', YELLOW, 1, { A: 10 })],
            ),
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
        id: 'approach',
        title: 'V-bar と R-bar からの接近',
        summary: '進行方向の後ろと地球側からの接近の違い',
        build: () =>
            formation(
                'V-bar と R-bar からの接近',
                '緑は進行方向の後方（V-bar, −S）、赤は地球側（R-bar, −R）から、基準衛星へ向かう速度を与えています。' +
                    '同じように「近づく向き」に押しても、HCW の R・S 方向の結合（コリオリ力に相当する項）によって' +
                    '経路は直線にならず、それぞれ違う向きに曲がっていきます。' +
                    'ここでの初速度は目安の値で、ちょうど基準衛星に到達するように計算したものではありません。',
                [
                    {
                        name: 'V-bar（後方）',
                        pattern: 'vbar_approach',
                        placementMode: 'radius',
                        radius: 30,
                        satelliteCount: 3,
                        color: S_COLOR,
                    },
                    {
                        name: 'R-bar（地球側）',
                        pattern: 'rbar_approach',
                        placementMode: 'radius',
                        radius: 30,
                        satelliteCount: 3,
                        color: R_COLOR,
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
