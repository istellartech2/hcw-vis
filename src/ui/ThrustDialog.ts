export class ThrustDialog {
    private dialog: HTMLElement;
    private inputR: HTMLInputElement;
    private inputS: HTMLInputElement;
    private inputW: HTMLInputElement;
    private applyCallback: ((values: { r: number; s: number; w: number }) => void) | null = null;

    constructor() {
        // Create dialog element
        this.dialog = document.createElement('div');
        this.dialog.id = 'thrust-dialog';
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
            border: 2px solid rgba(74, 158, 255, 0.5);
            backdrop-filter: blur(10px);
            min-width: 280px;
            z-index: 1000;
        `;

        // Create dialog content
        this.dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <strong style="font-size: 14px;">推力付加</strong>
                <button id="thrust-dialog-close" style="
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
                各軸の増速量を入力してください (m/s)
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center; margin-bottom: 12px;">
                <label>R軸:</label>
                <input type="number" id="thrust-input-r" step="0.0001" value="0" style="
                    width: 100%;
                    padding: 4px 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    border-radius: 4px;
                    font-size: 12px;
                ">
                <label>S軸:</label>
                <input type="number" id="thrust-input-s" step="0.0001" value="0" style="
                    width: 100%;
                    padding: 4px 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    border-radius: 4px;
                    font-size: 12px;
                ">
                <label>W軸:</label>
                <input type="number" id="thrust-input-w" step="0.0001" value="0" style="
                    width: 100%;
                    padding: 4px 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    border-radius: 4px;
                    font-size: 12px;
                ">
            </div>
            <button id="thrust-dialog-apply" style="
                width: 100%;
                padding: 8px;
                background: rgba(74, 158, 255, 0.8);
                border: 1px solid rgba(74, 158, 255, 1);
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
        this.inputR = document.getElementById('thrust-input-r') as HTMLInputElement;
        this.inputS = document.getElementById('thrust-input-s') as HTMLInputElement;
        this.inputW = document.getElementById('thrust-input-w') as HTMLInputElement;

        // Setup event listeners
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // ダイアログ内のクリックイベントが container に伝播しないようにする
        this.dialog.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Close button
        document.getElementById('thrust-dialog-close')!.addEventListener('click', () => {
            this.hide();
        });

        // Apply button
        document.getElementById('thrust-dialog-apply')!.addEventListener('click', () => {
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

    show(defaultValue: number = 0.001): void {
        // Set default values
        this.inputR.value = defaultValue.toString();
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
