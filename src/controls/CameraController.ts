import * as THREE from 'three';

export class CameraController {
    private camera: THREE.PerspectiveCamera;
    private container: HTMLElement;
    private mouseX: number = 0;
    private mouseY: number = 0;
    private mouseDown: boolean = false;
    private cameraPhi: number = Math.PI / 3;
    private cameraTheta: number = Math.PI / 4;
    private cameraDistance: number = 400;
    private pinchStartDistance: number | null = null;
    private initialCameraDistance: number = 400;
    private viewMode: number = 0;

    constructor(camera: THREE.PerspectiveCamera, container: HTMLElement) {
        this.camera = camera;
        this.container = container;
        this.setupMouseControls();
    }

    private setupMouseControls(): void {
        this.container.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.mouseDown = true;
                this.mouseX = e.touches[0].clientX;
                this.mouseY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                this.mouseDown = false;
                this.pinchStartDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
                this.initialCameraDistance = this.cameraDistance;
            }
        });

        this.container.addEventListener('mousemove', (e) => {
            if (this.mouseDown) {
                const deltaX = e.clientX - this.mouseX;
                const deltaY = e.clientY - this.mouseY;
                this.cameraTheta -= deltaX * 0.01;
                this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi + deltaY * 0.01));
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
            }
        });

        this.container.addEventListener('touchmove', (e) => {
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
                this.cameraDistance = Math.max(200, Math.min(2000, this.cameraDistance));
            }
        }, { passive: false });

        this.container.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });

        this.container.addEventListener('touchend', () => {
            this.mouseDown = false;
            this.pinchStartDistance = null;
        });

        this.container.addEventListener('wheel', (e) => {
            this.cameraDistance *= (1 + e.deltaY * 0.001);
            this.cameraDistance = Math.max(200, Math.min(2000, this.cameraDistance));
        });
    }

    private getTouchDistance(t1: Touch, t2: Touch): number {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
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

    public changeView(): void {
        this.viewMode = (this.viewMode + 1) % 4;
        switch(this.viewMode) {
            case 0:
                this.cameraDistance = 400;
                this.cameraPhi = Math.PI / 4;
                this.cameraTheta = 0;
                break;
            case 1:
                this.cameraDistance = 400;
                this.cameraPhi = 0.1;
                this.cameraTheta = 0;
                break;
            case 2:
                this.cameraDistance = 400;
                this.cameraPhi = Math.PI / 2;
                this.cameraTheta = 0;
                break;
            case 3:
                this.cameraDistance = 400;
                this.cameraPhi = Math.PI / 3;
                this.cameraTheta = Math.PI / 4;
                break;
        }
    }

    public handleResize(): void {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
    }
}