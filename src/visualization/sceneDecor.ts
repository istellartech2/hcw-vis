import * as THREE from 'three';

/**
 * 3D シーンの装飾（グリッド・座標軸）。中心から外側へフェードさせて、
 * 境界のはっきりした板ではなく空間に溶け込む見た目にする。
 */

const GRID_COLOR = new THREE.Color(0xc8d2e0);

/** 中心からの距離 d（0〜1 に正規化）に対する不透明度。端で 0 になる */
function radialFade(d: number): number {
    const t = Math.min(1, d);
    return (1 - t * t) ** 2;
}

/**
 * XZ 平面上の正方形グリッド（1 本の LineSegments）。
 * 各線を細かく分割し、頂点アルファで中心から外側へフェードさせる。
 */
function createFadingLines(halfSize: number, step: number, opacity: number, skip?: number): THREE.LineSegments {
    const positions: number[] = [];
    const colors: number[] = [];
    const segments = 48;

    const push = (x: number, z: number) => {
        positions.push(x, 0, z);
        const alpha = opacity * radialFade(Math.hypot(x, z) / halfSize);
        colors.push(GRID_COLOR.r, GRID_COLOR.g, GRID_COLOR.b, alpha);
    };

    const count = Math.round(halfSize / step);
    for (let i = -count; i <= count; i++) {
        if (skip && i % skip === 0) continue;
        const c = i * step;
        for (let k = 0; k < segments; k++) {
            const a = -halfSize + (2 * halfSize * k) / segments;
            const b = -halfSize + (2 * halfSize * (k + 1)) / segments;
            push(a, c);
            push(b, c);
            push(c, a);
            push(c, b);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
    return new THREE.LineSegments(geometry, material);
}

/** 1 m 間隔の副線と 5 m 間隔の主線を重ねたグリッド */
export function createGrid(halfSize = 20): THREE.Group {
    const group = new THREE.Group();
    group.add(createFadingLines(halfSize, 1, 0.07, 5));
    group.add(createFadingLines(halfSize, 5, 0.18));
    return group;
}

/** 原点から伸びる座標軸 1 本（線 + 先端の小さなコーン） */
function createAxis(direction: THREE.Vector3, color: string, length: number): THREE.Group {
    const group = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 });
    const tipLength = length * 0.04;
    const end = direction.clone().multiplyScalar(length - tipLength);
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), end]), lineMaterial));

    const tip = new THREE.Mesh(
        new THREE.ConeGeometry(tipLength * 0.35, tipLength, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
    );
    tip.position.copy(direction).multiplyScalar(length - tipLength / 2);
    tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    group.add(tip);
    return group;
}

/** RSW 座標軸（Three.js: X=W, Y=R, Z=S） */
export function createAxes(colors: { r: string; s: string; w: string }, length = 15): THREE.Group {
    const group = new THREE.Group();
    group.add(createAxis(new THREE.Vector3(1, 0, 0), colors.w, length));
    group.add(createAxis(new THREE.Vector3(0, 1, 0), colors.r, length));
    group.add(createAxis(new THREE.Vector3(0, 0, 1), colors.s, length));
    return group;
}
