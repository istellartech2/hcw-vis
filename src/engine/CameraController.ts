import * as THREE from 'three';

export class CameraController {
    private camera: THREE.PerspectiveCamera;
    private container: HTMLElement;
    private mouseX: number = 0;
    private mouseY: number = 0;
    private mouseDown: boolean = false;
    // Initial camera position configuration
    // Position camera so that blue (X) and green (Z) axes point left
    // Scale=1: 1m = 1 unit, 10m range needs ~45 unit distance at FOV 50°
    private readonly INITIAL_CAMERA_DISTANCE: number = 45;
    private readonly INITIAL_CAMERA_PHI: number = Math.PI / 3;
    private readonly INITIAL_CAMERA_THETA: number = (Math.PI * 4) / 5;
    private cameraPhi: number = this.INITIAL_CAMERA_PHI;
    private cameraTheta: number = this.INITIAL_CAMERA_THETA;
    private cameraDistance: number = this.INITIAL_CAMERA_DISTANCE;
    private pinchStartDistance: number | null = null;
    private initialCameraDistance: number = this.INITIAL_CAMERA_DISTANCE;

    private signal?: AbortSignal;

    constructor(camera: THREE.PerspectiveCamera, container: HTMLElement, signal?: AbortSignal) {
        this.camera = camera;
        this.container = container;
        this.signal = signal;
        this.setupMouseControls();
    }

    private listen<K extends keyof HTMLElementEventMap>(
        type: K,
        handler: (e: HTMLElementEventMap[K]) => void,
        options: AddEventListenerOptions = {},
    ): void {
        this.container.addEventListener(type, handler, { ...options, signal: this.signal });
    }

    private setupMouseControls(): void {
        this.listen('mousedown', (e) => {
            this.mouseDown = true;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        this.listen(
            'touchstart',
            (e) => {
                if (!this.isInteractiveTarget(e.target)) {
                    e.preventDefault();
                }
                if (e.touches.length === 1) {
                    this.mouseDown = true;
                    this.mouseX = e.touches[0].clientX;
                    this.mouseY = e.touches[0].clientY;
                } else if (e.touches.length === 2) {
                    this.mouseDown = false;
                    this.pinchStartDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
                    this.initialCameraDistance = this.cameraDistance;
                }
            },
            { passive: false },
        );

        this.listen('mousemove', (e) => {
            if (this.mouseDown) {
                const deltaX = e.clientX - this.mouseX;
                const deltaY = e.clientY - this.mouseY;
                this.cameraTheta -= deltaX * 0.01;
                this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi + deltaY * 0.01));
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
            }
        });

        this.listen(
            'touchmove',
            (e) => {
                if (!this.isInteractiveTarget(e.target)) {
                    e.preventDefault();
                }
                if (e.touches.length === 1 && this.mouseDown) {
                    const deltaX = e.touches[0].clientX - this.mouseX;
                    const deltaY = e.touches[0].clientY - this.mouseY;
                    this.cameraTheta -= deltaX * 0.01;
                    this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi + deltaY * 0.01));
                    this.mouseX = e.touches[0].clientX;
                    this.mouseY = e.touches[0].clientY;
                } else if (e.touches.length === 2 && this.pinchStartDistance !== null) {
                    const newDist = this.getTouchDistance(e.touches[0], e.touches[1]);
                    const scale = this.pinchStartDistance / newDist;
                    this.cameraDistance = this.initialCameraDistance * scale;
                    this.cameraDistance = Math.max(5, Math.min(2000, this.cameraDistance));
                }
            },
            { passive: false },
        );

        // キャンバス外でボタンを離してもドラッグ状態が残らないよう window で受ける
        window.addEventListener(
            'mouseup',
            () => {
                this.mouseDown = false;
            },
            { signal: this.signal },
        );

        this.listen(
            'touchend',
            (e) => {
                if (!this.isInteractiveTarget(e.target)) {
                    e.preventDefault();
                }
                this.mouseDown = false;
                this.pinchStartDistance = null;
            },
            { passive: false },
        );

        this.listen('wheel', (e) => {
            this.cameraDistance *= 1 + e.deltaY * 0.001;
            this.cameraDistance = Math.max(1, Math.min(1000, this.cameraDistance));
        });
    }

    private getTouchDistance(t1: Touch, t2: Touch): number {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private isInteractiveTarget(target: EventTarget | null): boolean {
        if (!(target instanceof HTMLElement)) {
            return false;
        }
        return (
            target.closest('button') !== null ||
            target.closest('input') !== null ||
            target.closest('select') !== null ||
            target.closest('textarea') !== null
        );
    }

    public syncWithCameraPosition(): void {
        const { x, y, z } = this.camera.position;
        this.cameraDistance = Math.sqrt(x * x + y * y + z * z);
        if (this.cameraDistance === 0) return;
        this.cameraPhi = Math.acos(y / this.cameraDistance);
        this.cameraTheta = Math.atan2(x, z);
    }

    public updateCameraPosition(): void {
        this.camera.position.x = Math.sin(this.cameraTheta) * Math.sin(this.cameraPhi) * this.cameraDistance;
        this.camera.position.y = Math.cos(this.cameraPhi) * this.cameraDistance;
        this.camera.position.z = Math.cos(this.cameraTheta) * Math.sin(this.cameraPhi) * this.cameraDistance;
        this.camera.lookAt(0, 0, 0);
    }

    public resetView(): void {
        // 縦長画面では水平方向の画角が狭くなるので、少し引いて全体を収める
        const { clientWidth, clientHeight } = this.container;
        const portrait = clientHeight > 0 && clientWidth < clientHeight;
        this.cameraDistance = this.INITIAL_CAMERA_DISTANCE * (portrait ? 1.4 : 1);
        this.cameraPhi = this.INITIAL_CAMERA_PHI;
        this.cameraTheta = this.INITIAL_CAMERA_THETA;
        this.updateCameraPosition();
    }

    public handleResize(): void {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
    }
}
