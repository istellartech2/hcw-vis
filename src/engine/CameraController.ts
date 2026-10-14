import * as THREE from 'three';

// 青（X）と緑（Z）の軸が左を向く初期視点。1 m = 1 単位で、10 m の範囲が FOV 50° に収まる距離
const INITIAL_DISTANCE = 45;
const INITIAL_PHI = Math.PI / 3;
const INITIAL_THETA = (Math.PI * 4) / 5;

/** 原点を注視する球面座標カメラ。ドラッグで回転、ホイール・ピンチで拡大縮小 */
export class CameraController {
    private phi = INITIAL_PHI;
    private theta = INITIAL_THETA;
    private distance = INITIAL_DISTANCE;
    private dragging = false;
    private lastX = 0;
    private lastY = 0;
    private pinchStartDistance: number | null = null;
    private distanceAtPinchStart = INITIAL_DISTANCE;

    constructor(
        private camera: THREE.PerspectiveCamera,
        private container: HTMLElement,
        private signal?: AbortSignal,
    ) {
        this.setupControls();
    }

    private listen<K extends keyof HTMLElementEventMap>(
        type: K,
        handler: (e: HTMLElementEventMap[K]) => void,
        options: AddEventListenerOptions = {},
    ): void {
        this.container.addEventListener(type, handler, { ...options, signal: this.signal });
    }

    private startDrag(x: number, y: number): void {
        this.dragging = true;
        this.lastX = x;
        this.lastY = y;
    }

    private drag(x: number, y: number): void {
        if (!this.dragging) return;
        this.theta -= (x - this.lastX) * 0.01;
        this.phi = THREE.MathUtils.clamp(this.phi + (y - this.lastY) * 0.01, 0.1, Math.PI - 0.1);
        this.lastX = x;
        this.lastY = y;
    }

    private setupControls(): void {
        this.listen('mousedown', (e) => this.startDrag(e.clientX, e.clientY));
        this.listen('mousemove', (e) => this.drag(e.clientX, e.clientY));
        // キャンバス外でボタンを離してもドラッグ状態が残らないよう window で受ける
        window.addEventListener('mouseup', () => (this.dragging = false), { signal: this.signal });
        this.listen('wheel', (e) => {
            this.distance = THREE.MathUtils.clamp(this.distance * (1 + e.deltaY * 0.001), 1, 1000);
        });

        // タッチ: 1 本指で回転、2 本指でピンチ。ページのスクロールやズームは止める
        const pinchDistance = (e: TouchEvent) =>
            Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const passive = { passive: false };
        this.listen(
            'touchstart',
            (e) => {
                e.preventDefault();
                if (e.touches.length === 1) {
                    this.startDrag(e.touches[0].clientX, e.touches[0].clientY);
                } else if (e.touches.length === 2) {
                    this.dragging = false;
                    this.pinchStartDistance = pinchDistance(e);
                    this.distanceAtPinchStart = this.distance;
                }
            },
            passive,
        );
        this.listen(
            'touchmove',
            (e) => {
                e.preventDefault();
                if (e.touches.length === 1) {
                    this.drag(e.touches[0].clientX, e.touches[0].clientY);
                } else if (e.touches.length === 2 && this.pinchStartDistance !== null) {
                    const scale = this.pinchStartDistance / pinchDistance(e);
                    this.distance = THREE.MathUtils.clamp(this.distanceAtPinchStart * scale, 5, 2000);
                }
            },
            passive,
        );
        this.listen(
            'touchend',
            (e) => {
                e.preventDefault();
                this.dragging = false;
                this.pinchStartDistance = null;
            },
            passive,
        );
    }

    updateCameraPosition(): void {
        this.camera.position.setFromSphericalCoords(this.distance, this.phi, this.theta);
        this.camera.lookAt(0, 0, 0);
    }

    resetView(): void {
        // 縦長画面では水平方向の画角が狭くなるので、少し引いて全体を収める
        const { clientWidth, clientHeight } = this.container;
        const portrait = clientHeight > 0 && clientWidth < clientHeight;
        this.distance = INITIAL_DISTANCE * (portrait ? 1.4 : 1);
        this.phi = INITIAL_PHI;
        this.theta = INITIAL_THETA;
        this.updateCameraPosition();
    }
}
