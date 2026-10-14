import * as THREE from 'three';
import { gstime } from 'satellite.js';
import { FrameTransforms } from '../simulation/FrameTransforms.js';
import { EARTH_RADIUS, OrbitElementsCalculator, type OrbitalElements } from '../simulation/OrbitElements.js';
import { EARTH_TEXTURE_OPTIONS, type EarthBrightness } from '@/store/settings';
import { disposeObject3D } from './satelliteMeshFactory.js';

/** 明るさごとに地球テクスチャへ掛ける色（暗いほど背景に沈み、衛星が目立つ） */
const EARTH_TINTS: Record<EarthBrightness, number> = {
    dim: 0x46505f,
    normal: 0x8c99ad,
    bright: 0xffffff,
};

/** テクスチャ読み込み中の表示（null で非表示） */
export type LoadingListener = (loading: { title: string; message: string } | null) => void;

const { degToRad } = THREE.MathUtils;
const ecefToThree = new THREE.Matrix4();
const r0 = new THREE.Vector3();
const v0 = new THREE.Vector3();

/** ECEF（X = グリニッジ子午線, Z = 北極）上の緯度経度の点 */
function latLonToEcef(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
    const lat = degToRad(latDeg);
    const lon = degToRad(lonDeg);
    return new THREE.Vector3(
        radius * Math.cos(lat) * Math.cos(lon),
        radius * Math.cos(lat) * Math.sin(lon),
        radius * Math.sin(lat),
    );
}

/** 折れ線（点列）を LineSegments 用の線分の端点列に変換して追加する */
function pushPolyline(segments: THREE.Vector3[], points: THREE.Vector3[]): void {
    for (let i = 1; i < points.length; i++) segments.push(points[i - 1], points[i]);
}

function lineSegments(points: THREE.Vector3[], opacity: number): THREE.LineSegments {
    return new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity }),
    );
}

/** 15° ごとの緯度経度線。赤道とグリニッジ子午線は同系色で少しだけ強調し、自転軸を薄く描く */
function createLatLongGrid(earthRadius: number): THREE.Group {
    // 線を地球表面から少し浮かせて見やすくする
    const r = earthRadius * 1.001;
    const meridian = (lon: number, step: number) => {
        const points: THREE.Vector3[] = [];
        for (let lat = -90; lat <= 90; lat += step) points.push(latLonToEcef(lat, lon, r));
        return points;
    };
    const parallel = (lat: number, step: number) => {
        const points: THREE.Vector3[] = [];
        for (let lon = 0; lon <= 360; lon += step) points.push(latLonToEcef(lat, lon, r));
        return points;
    };

    const normal: THREE.Vector3[] = [];
    for (let lon = 15; lon < 360; lon += 15) pushPolyline(normal, meridian(lon, 3));
    for (let lat = -60; lat <= 60; lat += 15) if (lat !== 0) pushPolyline(normal, parallel(lat, 3));

    const accent: THREE.Vector3[] = [];
    pushPolyline(accent, parallel(0, 1));
    pushPolyline(accent, meridian(0, 1));

    const axis = [new THREE.Vector3(0, 0, -r * 1.2), new THREE.Vector3(0, 0, r * 1.2)];

    return new THREE.Group().add(lineSegments(normal, 0.12), lineSegments(accent, 0.3), lineSegments(axis, 0.15));
}

/**
 * 大気のリム。地球より少し大きい球の裏面に、視線が地表をかすめる高さに応じて
 * 指数的に減衰する光を描く（地平線のすぐ上が最も明るく、上空へ溶けていく）
 */
function createAtmosphere(earthRadius: number): THREE.Mesh {
    const scaleHeight = 30000; // m
    const geometry = new THREE.SphereGeometry(earthRadius + scaleHeight * 6, 128, 64);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            glowColor: { value: new THREE.Color(0x6aa8ff) },
            earthRadius: { value: earthRadius },
            scaleHeight: { value: scaleHeight },
        },
        vertexShader: /* glsl */ `
            #include <common>
            #include <logdepthbuf_pars_vertex>
            varying vec3 vViewPosition;
            varying vec3 vCenter;
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = mvPosition.xyz;
                vCenter = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                gl_Position = projectionMatrix * mvPosition;
                #include <logdepthbuf_vertex>
            }
        `,
        fragmentShader: /* glsl */ `
            #include <logdepthbuf_pars_fragment>
            uniform vec3 glowColor;
            uniform float earthRadius;
            uniform float scaleHeight;
            varying vec3 vViewPosition;
            varying vec3 vCenter;
            void main() {
                #include <logdepthbuf_fragment>
                // 視線（カメラ→画素）と地球中心の最短距離 = 視線が最も地表に近づく高さ
                vec3 dir = normalize(vViewPosition);
                float closest = length(vCenter - dot(vCenter, dir) * dir);
                float altitude = max(closest - earthRadius, 0.0);
                float intensity = exp(-altitude / scaleHeight);
                gl_FragColor = vec4(glowColor, intensity * 0.7);
            }
        `,
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    return new THREE.Mesh(geometry, material);
}

/**
 * 実寸の地球（ECEF で姿勢を合わせる）。原点は基準衛星なので、地球中心は R 軸の負方向（Three.js の -Y）へ
 * 軌道半径ぶん離れた位置に置き、毎フレーム ECEF → RSW → Three.js の回転を与える。
 */
export class CelestialBodies {
    private earth: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
    private latLongGrid: THREE.Group;
    private textureLoader = new THREE.TextureLoader();
    private textureFile: string | null = null;

    constructor(
        scene: THREE.Scene,
        private maxAnisotropy: number,
        private onLoading: LoadingListener,
    ) {
        const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
        // SphereGeometry は Y-up だが ECEF は Z-up なので、北極が +Z・本初子午線が +X になるよう回す
        geometry.rotateX(Math.PI / 2);
        this.earth = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 }));
        this.latLongGrid = createLatLongGrid(EARTH_RADIUS);
        this.earth.add(createAtmosphere(EARTH_RADIUS), this.latLongGrid);
        scene.add(this.earth);
    }

    setOrbitRadius(orbitRadius: number): void {
        this.earth.position.set(0, -orbitRadius, 0);
    }

    setTexture(textureFile: string): void {
        if (textureFile === this.textureFile) return;
        this.textureFile = textureFile;
        const label = EARTH_TEXTURE_OPTIONS.find((option) => option.value === textureFile)?.label ?? textureFile;
        this.onLoading({ title: 'テクスチャ読み込み中', message: `地球テクスチャ（${label}）を読み込んでいます...` });

        // public/ 配下はビルド後もサイトルート（BASE_URL）直下に配置される
        this.textureLoader.load(
            `${import.meta.env.BASE_URL}asset/${textureFile}`,
            (texture) => {
                // 読み込み中に別のテクスチャへ切り替わっていたら捨てる
                if (textureFile !== this.textureFile) {
                    texture.dispose();
                    return;
                }
                // 色テクスチャは sRGB。斜めから見ることが多いので異方性フィルタでぼけを抑える
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = this.maxAnisotropy;
                const material = this.earth.material;
                material.map?.dispose();
                material.map = texture;
                material.needsUpdate = true;
                this.onLoading(null);
            },
            undefined,
            () => {
                console.error(`Failed to load earth texture: ${textureFile}`);
                if (textureFile === this.textureFile) this.onLoading(null);
            },
        );
    }

    setBrightness(brightness: EarthBrightness): void {
        this.earth.material.color.setHex(EARTH_TINTS[brightness]);
    }

    setVisible(visible: boolean): void {
        this.earth.visible = visible;
    }

    setLatLongGridVisible(visible: boolean): void {
        this.latLongGrid.visible = visible;
    }

    /** 地球の姿勢を date 時点の基準軌道に合わせる */
    update(date: Date, elements: OrbitalElements): void {
        if (!this.earth.visible) return;
        const ref = OrbitElementsCalculator.getECIPosition(elements, date);
        if (!ref) return;

        r0.set(ref.position.x, ref.position.y, ref.position.z);
        v0.set(ref.velocity.x, ref.velocity.y, ref.velocity.z);
        // ECEF → RSW（物理座標系）→ Three.js（描画座標系）
        const { m4: ecefToRsw } = FrameTransforms.ecefToRsw(gstime(date), r0, v0);
        this.earth.setRotationFromMatrix(ecefToThree.multiplyMatrices(FrameTransforms.rswToThree, ecefToRsw));
    }

    dispose(): void {
        this.textureFile = null;
        this.earth.material.map?.dispose();
        disposeObject3D(this.earth);
        this.earth.removeFromParent();
    }
}
