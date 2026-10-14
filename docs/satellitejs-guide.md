# satellite.js の利用

本書では、本プロジェクトにおける [satellite.js](https://github.com/shashwatak/satellite-js)（v6）の用途と使い方をまとめる。

HCW 方程式による相対運動の計算そのものには satellite.js を使用しない。satellite.js は、基準衛星の絶対位置（ECI 座標・緯度経度高度）と地球の自転角を求め、地球の表示と基準軌道の情報表示に用いる。

## 1. 用途

| 用途 | 使用する関数 | 実装 |
| --- | --- | --- |
| 基準軌道の要素から SGP4 レコードを作成 | `twoline2satrec` | `src/simulation/OrbitElements.ts` |
| 基準衛星の ECI 位置・速度を計算 | `propagate` | `src/simulation/OrbitElements.ts` |
| 緯度・経度・高度への変換 | `gstime`、`eciToGeodetic`、`degreesLat`、`degreesLong` | `src/simulation/OrbitElements.ts` |
| 地球の自転角（GMST）の計算 | `gstime` | `src/visualization/CelestialBodies.ts` |

## 2. 処理の流れ

### 2.1 SGP4 レコードの作成

基準軌道の軌道要素（軌道傾斜角、昇交点赤経、離心率、近地点引数、平均近点角、平均運動）から TLE 形式の 2 行を組み立て、`twoline2satrec` に渡す（`OrbitElementsCalculator.createSatelliteRecord`）。

```ts
import * as satellite from 'satellite.js';

const satrec = satellite.twoline2satrec(line1, line2);
```

> 1 行目（元期、B* などを含む行）は固定のテンプレートを使用し、2 行目のみ軌道要素から生成している。そのため、得られる位置は実在の衛星の軌道を再現するものではなく、地球の表示と基準軌道の概略を示すためのものである。

### 2.2 ECI 位置・速度と緯度経度高度

```ts
const result = satellite.propagate(satrec, date);   // ECI 位置 [km]・速度 [km/s]
const gmst = satellite.gstime(date);                // グリニッジ平均恒星時 [rad]
const geodetic = satellite.eciToGeodetic(result.position, gmst);

const latitudeDeg = satellite.degreesLat(geodetic.latitude);
const longitudeDeg = satellite.degreesLong(geodetic.longitude);
const altitudeKm = geodetic.height;
```

satellite.js は距離を km、速度を km/s で返す。本プロジェクトでは `OrbitElementsCalculator.getECIPosition` で m、m/s に換算して使用する。

### 2.3 地球の姿勢

描画のたびに、現在時刻の GMST と基準衛星の ECI 位置・速度から ECEF → RSW の変換行列を求め、地球モデルの姿勢を更新する。変換式は [座標系と座標変換](coordinate.md) を参照。

```ts
import { gstime } from 'satellite.js';

const gmst = gstime(t);
const { m4: ecefToRsw } = FrameTransforms.ecefToRsw(gmst, r0, v0);
```

## 3. 注意事項

- `propagate` は伝播に失敗すると位置・速度を返さない場合がある。呼び出し側では戻り値を確認すること（`getECIPosition` は失敗時に `null` を返す）。
- satellite.js の ECI 座標系は TEME（True Equator, Mean Equinox）である。本プロジェクトの表示用途では J2000 との差は無視している。

## 参考

- satellite.js: <https://github.com/shashwatak/satellite-js>
- Vallado, D. A., Crawford, P., Hujsak, R., and Kelso, T. S., "Revisiting Spacetrack Report #3," AIAA 2006-6753, 2006.
