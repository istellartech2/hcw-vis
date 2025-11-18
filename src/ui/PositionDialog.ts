export class PositionDialog {
    private dialog: HTMLElement;
    private inputR: HTMLInputElement;
    private inputS: HTMLInputElement;
    private inputW: HTMLInputElement;
    private applyCallback: ((values: { r: number; s: number; w: number }) => void) | null = null;

    constructor() {
        // Create dialog element
        this.dialog = document.createElement('div');
        this.dialog.id = 'position-dialog';
        this.dialog.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 16px;
            border-radius: 10px;
            font-size: 12px;
            display: none;
            border: 2px solid rgba(255, 158, 74, 0.5);
            backdrop-filter: blur(10px);
            min-width: 280px;
            z-index: 1000;
        `;

        // Create dialog content
        this.dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <strong style="font-size: 14px;">位置変更</strong>
                <button id="position-dialog-close" style="
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                ">✕</button>
            </div>
            <div style="margin-bottom: 8px; opacity: 0.8; font-size: 11px;">
                各軸の位置変更量を入力してください (m)
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center; margin-bottom: 12px;">
                <label>R軸:</label>
                <input type="number" id="position-input-r" step="0.1" value="0" style="
                    width: 100%;
                    padding: 4px 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    border-radius: 4px;
                    font-size: 12px;
                ">
                <label>S軸:</label>
                <input type="number" id="position-input-s" step="0.1" value="0" style="
                    width: 100%;
                    padding: 4px 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    border-radius: 4px;
                    font-size: 12px;
                ">
                <label>W軸:</label>
                <input type="number" id="position-input-w" step="0.1" value="0" style="
                    width: 100%;
                    padding: 4px 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    border-radius: 4px;
                    font-size: 12px;
                ">
            </div>
            <button id="position-dialog-apply" style="
                width: 100%;
                padding: 8px;
                background: rgba(255, 158, 74, 0.8);
                border: 1px solid rgba(255, 158, 74, 1);
                color: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: bold;
            ">適用</button>
        `;

        // Append to canvas container
        document.getElementById('canvas-container')!.appendChild(this.dialog);

        // Get input elements
        this.inputR = document.getElementById('position-input-r') as HTMLInputElement;
        this.inputS = document.getElementById('position-input-s') as HTMLInputElement;
        this.inputW = document.getElementById('position-input-w') as HTMLInputElement;

        // Setup event listeners
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Close button
        document.getElementById('position-dialog-close')!.addEventListener('click', () => {
            this.hide();
        });

        // Apply button
        document.getElementById('position-dialog-apply')!.addEventListener('click', () => {
            this.apply();
        });

        // Enter key to apply
        [this.inputR, this.inputS, this.inputW].forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.apply();
                }
            });
        });
    }

    private apply(): void {
        if (this.applyCallback) {
            const values = {
                r: parseFloat(this.inputR.value) || 0,
                s: parseFloat(this.inputS.value) || 0,
                w: parseFloat(this.inputW.value) || 0
            };
            this.applyCallback(values);
        }
        this.hide();
    }

    show(): void {
        // Reset values
        this.inputR.value = '0';
        this.inputS.value = '0';
        this.inputW.value = '0';

        // Show dialog
        this.dialog.style.display = 'block';

        // Focus first input
        setTimeout(() => {
            this.inputR.focus();
            this.inputR.select();
        }, 100);
    }

    hide(): void {
        this.dialog.style.display = 'none';
    }

    isVisible(): boolean {
        return this.dialog.style.display === 'block';
    }

    setApplyCallback(callback: (values: { r: number; s: number; w: number }) => void): void {
        this.applyCallback = callback;
    }
}
