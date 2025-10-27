/**
 * フォーメーション設計UIのコントローラー
 */

import { FormationManager } from './FormationManager.js';
import { FormationGenerator } from './FormationGenerator.js';
import type { FormationLayer, FormationConfig } from './FormationTypes.js';
import type { Satellite } from '../simulation/Satellite.js';
export type { FormationManager };

export class FormationUIController {
    private manager: FormationManager;
    private generator: FormationGenerator;
    private modal: HTMLElement;
    private layersContainer: HTMLElement;
    private layerEditorModal: HTMLElement;
    private currentEditingLayerId: string | null = null;
    private onPreviewCallback?: (satellites: Satellite[]) => void;

    constructor(meanMotion: number) {
        this.manager = new FormationManager();
        this.generator = new FormationGenerator(meanMotion);

        this.modal = document.getElementById('formation-designer-modal')!;
        this.layersContainer = document.getElementById('formation-layers-container')!;
        this.layerEditorModal = document.getElementById('layer-editor-modal')!;

        this.setupEventListeners();
        this.setupLayerEditorListeners();
        this.manager.onChange(() => this.updateUI());
    }

    /**
     * 平均運動を更新
     */
    updateMeanMotion(meanMotion: number): void {
        this.generator.updateMeanMotion(meanMotion);
    }

    /**
     * J2安定配置の設定を更新
     */
    setJ2StableArrangement(enabled: boolean, ssCoefficient: number): void {
        this.generator.setJ2StableArrangement(enabled, ssCoefficient);
    }

    /**
     * プレビューコールバックを設定
     */
    setOnPreview(callback: (satellites: Satellite[]) => void): void {
        this.onPreviewCallback = callback;
    }

    /**
     * モーダルを開く
     */
    open(): void {
        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        this.updateUI();
    }

    /**
     * モーダルを閉じる
     */
    close(): void {
        this.modal.classList.add('hidden');
        this.modal.classList.remove('flex');
    }

    /**
     * イベントリスナーのセットアップ
     */
    private setupEventListeners(): void {
        // Close button
        document.getElementById('formation-close')!.addEventListener('click', () => this.close());

        // Add layer button
        document.getElementById('formation-add-layer')!.addEventListener('click', () => {
            this.manager.addLayer();
        });

        // JSON export
        document.getElementById('formation-json-export')!.addEventListener('click', () => {
            this.exportJSON();
        });

        // JSON import
        document.getElementById('formation-json-import')!.addEventListener('click', () => {
            document.getElementById('formation-json-input')!.click();
        });

        document.getElementById('formation-json-input')!.addEventListener('change', (e) => {
            this.importJSON(e as Event);
        });

        // Preview
        document.getElementById('formation-preview')!.addEventListener('click', () => {
            this.preview();
        });

        // Formation name/description
        document.getElementById('formation-name')!.addEventListener('input', (e) => {
            this.manager.setName((e.target as HTMLInputElement).value);
        });

        document.getElementById('formation-description')!.addEventListener('input', (e) => {
            this.manager.setDescription((e.target as HTMLInputElement).value);
        });
    }

    /**
     * UIを更新
     */
    private updateUI(): void {
        const config = this.manager.getConfig();

        // Update formation info
        (document.getElementById('formation-name') as HTMLInputElement).value = config.name;
        (document.getElementById('formation-description') as HTMLInputElement).value = config.description || '';

        // Update total satellites
        const total = this.manager.getTotalSatelliteCount() + 1; // +1 for center satellite
        document.getElementById('formation-total-satellites')!.textContent = `合計: ${total} 個`;

        // Update layers list
        this.renderLayers(config.layers);
    }

    /**
     * レイヤーリストを描画
     */
    private renderLayers(layers: FormationLayer[]): void {
        if (layers.length === 0) {
            this.layersContainer.innerHTML = '<div class="text-center text-orange-300/50 py-8">レイヤーを追加してください</div>';
            return;
        }

        this.layersContainer.innerHTML = layers.map((layer, index) =>
            this.createLayerCard(layer, index)
        ).join('');

        // Attach event listeners to layer cards
        layers.forEach((layer, index) => {
            this.attachLayerCardEvents(layer.id, index);
        });
    }

    /**
     * レイヤーカードのHTMLを生成
     */
    private createLayerCard(layer: FormationLayer, index: number): string {
        const shapeText = {
            'sphere': '球体',
            'cube': '立方体',
            'box': '直方体',
            '3dfile': '3Dファイル'
        }[layer.shape] || '球体';

        const patternText = {
            'axis': '軸上-速度0',
            'grid': '格子-速度0',
            'random_position': 'ランダム-速度0',
            'random_position_velocity': 'ランダム',
            'random_periodic': 'ランダム-周期解',
            'periodic_orbit': '楕円軌道',
            'circular_orbit': '円軌道',
            'hexagonal_disk': '円盤軌道（六角格子）',
            'square_lattice_disk': '円盤軌道（正方格子）',
            'concentric_disk': '円盤軌道（同心リング）',
            'vbar_approach': 'V-bar軌道',
            'rbar_approach': 'R-bar軌道'
        }[layer.pattern];

        const placementText = layer.placementMode === 'radius'
            ? `範囲: ${layer.radius}m`
            : `間隔: ${layer.spacing}m`;

        return `
            <div class="layer-card p-4 bg-white/[0.04] border border-orange-500/15 rounded-xl hover:bg-white/[0.06] hover:border-orange-500/25 transition-all cursor-pointer" data-layer-id="${layer.id}">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <input type="checkbox" id="layer-enabled-${layer.id}" ${layer.enabled ? 'checked' : ''} class="w-5 h-5 cursor-pointer accent-orange-500 layer-checkbox" onclick="event.stopPropagation()">
                        <span class="text-white text-sm font-semibold">${layer.name}</span>
                        <span class="layer-color-indicator w-6 h-6 rounded-full border-2 border-white/30" style="background-color: ${layer.color}"></span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="layer-move-up px-2 py-1 text-orange-400 text-xs hover:bg-orange-500/20 rounded" onclick="event.stopPropagation()" ${index === 0 ? 'disabled' : ''}>▲</button>
                        <button class="layer-move-down px-2 py-1 text-orange-400 text-xs hover:bg-orange-500/20 rounded" onclick="event.stopPropagation()">▼</button>
                        <button class="layer-delete px-2 py-1 text-orange-400 text-xs hover:bg-orange-500/20 rounded" onclick="event.stopPropagation()">🗑️</button>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2 text-xs text-orange-300/80">
                    <div><span class="text-orange-400/60">パターン:</span> ${patternText}</div>
                    <div><span class="text-orange-400/60">配置:</span> ${placementText}</div>
                    <div><span class="text-orange-400/60">衛星数:</span> ${layer.satelliteCount}個</div>
                    <div><span class="text-orange-400/60">形状:</span> ${shapeText}</div>
                    <div><span class="text-orange-400/60">サイズ:</span> ${layer.size}m</div>
                    ${layer.shape === 'box' && layer.boxRatios ? `<div><span class="text-orange-400/60">比率:</span> ${layer.boxRatios.x}:${layer.boxRatios.y}:${layer.boxRatios.z}</div>` : '<div></div>'}
                </div>
            </div>
        `;
    }

    /**
     * レイヤーカードのイベントリスナーをアタッチ
     */
    private attachLayerCardEvents(layerId: string, index: number): void {
        const card = this.layersContainer.querySelector(`[data-layer-id="${layerId}"]`)!;

        // Make entire card clickable to edit (except checkbox and buttons)
        card.addEventListener('click', () => {
            this.openLayerEditor(layerId);
        });

        // Enabled toggle
        card.querySelector(`#layer-enabled-${layerId}`)!.addEventListener('change', () => {
            this.manager.toggleLayerEnabled(layerId);
        });

        // Move up
        card.querySelector('.layer-move-up')!.addEventListener('click', () => {
            this.manager.moveLayerUp(layerId);
        });

        // Move down
        card.querySelector('.layer-move-down')!.addEventListener('click', () => {
            this.manager.moveLayerDown(layerId);
        });

        // Delete
        card.querySelector('.layer-delete')!.addEventListener('click', () => {
            if (confirm(`レイヤー "${this.manager.getLayers().find(l => l.id === layerId)?.name}" を削除しますか？`)) {
                this.manager.removeLayer(layerId);
            }
        });
    }

    /**
     * レイヤー編集モーダルを開く
     */
    private openLayerEditor(layerId: string): void {
        const layer = this.manager.getLayers().find(l => l.id === layerId);
        if (!layer) return;

        this.currentEditingLayerId = layerId;

        // Populate form with layer data
        (document.getElementById('layer-edit-name') as HTMLInputElement).value = layer.name;
        (document.getElementById('layer-edit-pattern') as HTMLSelectElement).value = layer.pattern;
        (document.getElementById('layer-edit-placement-mode') as HTMLSelectElement).value = layer.placementMode;
        (document.getElementById('layer-edit-count') as HTMLInputElement).value = String(layer.satelliteCount);
        (document.getElementById('layer-edit-shape') as HTMLSelectElement).value = layer.shape;
        (document.getElementById('layer-edit-size') as HTMLInputElement).value = String(layer.size);
        (document.getElementById('layer-edit-color-mode') as HTMLSelectElement).value = layer.colorMode || 'uniform';
        (document.getElementById('layer-edit-color') as HTMLInputElement).value = layer.color;
        (document.getElementById('layer-edit-color-text') as HTMLInputElement).value = layer.color;

        // Placement mode specific fields
        if (layer.placementMode === 'radius') {
            (document.getElementById('layer-edit-radius') as HTMLInputElement).value = String(layer.radius || 10);
            (document.getElementById('layer-edit-spacing') as HTMLInputElement).value = String(layer.spacing || 1);
        } else {
            (document.getElementById('layer-edit-radius') as HTMLInputElement).value = String(layer.radius || 10);
            (document.getElementById('layer-edit-spacing') as HTMLInputElement).value = String(layer.spacing || 1);
        }

        // Box ratios
        if (layer.shape === 'box' && layer.boxRatios) {
            (document.getElementById('layer-edit-box-x') as HTMLInputElement).value = String(layer.boxRatios.x);
            (document.getElementById('layer-edit-box-y') as HTMLInputElement).value = String(layer.boxRatios.y);
            (document.getElementById('layer-edit-box-z') as HTMLInputElement).value = String(layer.boxRatios.z);
        } else {
            (document.getElementById('layer-edit-box-x') as HTMLInputElement).value = '1';
            (document.getElementById('layer-edit-box-y') as HTMLInputElement).value = '1';
            (document.getElementById('layer-edit-box-z') as HTMLInputElement).value = '1';
        }

        // Rotation
        if (layer.rotation) {
            (document.getElementById('layer-edit-rotation-r') as HTMLInputElement).value = String(layer.rotation.r);
            (document.getElementById('layer-edit-rotation-s') as HTMLInputElement).value = String(layer.rotation.s);
        } else {
            (document.getElementById('layer-edit-rotation-r') as HTMLInputElement).value = '0';
            (document.getElementById('layer-edit-rotation-s') as HTMLInputElement).value = '0';
        }

        // Pattern-specific parameters
        // Z amplitude
        (document.getElementById('layer-edit-zamplitude') as HTMLInputElement).value = String(layer.zAmplitude ?? 0);

        // Periodic parameters
        if (layer.periodicParams) {
            const A = layer.periodicParams.A;
            // Display ratios (B/A, D/A, E/A, F/A) in the UI, matching satellite config panel behavior
            (document.getElementById('layer-edit-param-b') as HTMLInputElement).value = String(A !== 0 ? layer.periodicParams.B / A : 1);
            (document.getElementById('layer-edit-param-d') as HTMLInputElement).value = String(A !== 0 ? layer.periodicParams.D / A : 0);
            (document.getElementById('layer-edit-param-e') as HTMLInputElement).value = String(A !== 0 ? layer.periodicParams.E / A : 0);
            (document.getElementById('layer-edit-param-f') as HTMLInputElement).value = String(A !== 0 ? layer.periodicParams.F / A : 0);
            this.updateEccentricity();
        } else {
            (document.getElementById('layer-edit-param-b') as HTMLInputElement).value = '1';
            (document.getElementById('layer-edit-param-d') as HTMLInputElement).value = '0';
            (document.getElementById('layer-edit-param-e') as HTMLInputElement).value = '0';
            (document.getElementById('layer-edit-param-f') as HTMLInputElement).value = '0';
            this.updateEccentricity();
        }

        // Positive Z
        (document.getElementById('layer-edit-positivez') as HTMLInputElement).checked = layer.positiveZ ?? true;

        // Update conditional fields visibility
        this.updateLayerEditorFieldsVisibility();

        // Show modal
        this.layerEditorModal.classList.remove('hidden');
        this.layerEditorModal.classList.add('flex');
    }

    /**
     * レイヤー編集モーダルを閉じる
     */
    private closeLayerEditor(): void {
        this.currentEditingLayerId = null;
        this.layerEditorModal.classList.add('hidden');
        this.layerEditorModal.classList.remove('flex');
    }

    /**
     * レイヤー編集フォームのフィールド表示を更新
     */
    private updateLayerEditorFieldsVisibility(): void {
        const placementMode = (document.getElementById('layer-edit-placement-mode') as HTMLSelectElement).value;
        const shape = (document.getElementById('layer-edit-shape') as HTMLSelectElement).value;
        const pattern = (document.getElementById('layer-edit-pattern') as HTMLSelectElement).value;
        const colorMode = (document.getElementById('layer-edit-color-mode') as HTMLSelectElement).value;

        // Color mode - show/hide color picker based on mode
        if (colorMode === 'uniform') {
            document.getElementById('layer-edit-color-picker-group')!.style.display = 'flex';
        } else {
            document.getElementById('layer-edit-color-picker-group')!.style.display = 'none';
        }

        // Patterns that only use radius (not spacing)
        const isRandomPattern = pattern === 'random_position' || pattern === 'random_position_velocity' || pattern === 'random_periodic';
        const isOrbitPattern = pattern === 'periodic_orbit' || pattern === 'circular_orbit';
        const usesOnlyRadius = isRandomPattern || isOrbitPattern;

        if (usesOnlyRadius) {
            // For patterns that only use radius: hide placement mode and spacing, but show radius
            document.getElementById('layer-edit-placement-mode-group')!.style.display = 'none';
            document.getElementById('layer-edit-radius-group')!.style.display = 'block';
            document.getElementById('layer-edit-spacing-group')!.style.display = 'none';
        } else {
            // Show placement mode for other patterns
            document.getElementById('layer-edit-placement-mode-group')!.style.display = 'block';

            // Placement mode
            if (placementMode === 'radius') {
                document.getElementById('layer-edit-radius-group')!.style.display = 'block';
                document.getElementById('layer-edit-spacing-group')!.style.display = 'none';
            } else {
                document.getElementById('layer-edit-radius-group')!.style.display = 'none';
                document.getElementById('layer-edit-spacing-group')!.style.display = 'block';
            }
        }

        // Shape-specific fields
        if (shape === 'box') {
            document.getElementById('layer-edit-box-ratios-group')!.style.display = 'block';
            document.getElementById('layer-edit-rotation-group')!.style.display = 'block';
        } else if (shape === 'cube') {
            document.getElementById('layer-edit-box-ratios-group')!.style.display = 'none';
            document.getElementById('layer-edit-rotation-group')!.style.display = 'block';
        } else {
            document.getElementById('layer-edit-box-ratios-group')!.style.display = 'none';
            document.getElementById('layer-edit-rotation-group')!.style.display = 'none';
        }

        // Pattern-specific fields
        // Z amplitude for periodic_orbit
        if (pattern === 'periodic_orbit') {
            document.getElementById('layer-edit-zamplitude-group')!.style.display = 'block';
            document.getElementById('layer-edit-periodic-group')!.style.display = 'block';
            document.getElementById('layer-edit-positivez-group')!.style.display = 'none';
        }
        // Positive Z for circular_orbit
        else if (pattern === 'circular_orbit') {
            document.getElementById('layer-edit-zamplitude-group')!.style.display = 'none';
            document.getElementById('layer-edit-periodic-group')!.style.display = 'none';
            document.getElementById('layer-edit-positivez-group')!.style.display = 'block';
        }
        // No pattern-specific fields for other patterns
        else {
            document.getElementById('layer-edit-zamplitude-group')!.style.display = 'none';
            document.getElementById('layer-edit-periodic-group')!.style.display = 'none';
            document.getElementById('layer-edit-positivez-group')!.style.display = 'none';
        }
    }

    /**
     * レイヤー編集を保存
     */
    private saveLayerEdits(): void {
        if (!this.currentEditingLayerId) return;

        const name = (document.getElementById('layer-edit-name') as HTMLInputElement).value;
        const pattern = (document.getElementById('layer-edit-pattern') as HTMLSelectElement).value as any;
        const placementMode = (document.getElementById('layer-edit-placement-mode') as HTMLSelectElement).value as 'radius' | 'spacing';
        const count = parseInt((document.getElementById('layer-edit-count') as HTMLInputElement).value, 10);
        const shape = (document.getElementById('layer-edit-shape') as HTMLSelectElement).value as 'sphere' | 'cube' | 'box' | '3dfile';
        const size = parseFloat((document.getElementById('layer-edit-size') as HTMLInputElement).value);
        const colorMode = (document.getElementById('layer-edit-color-mode') as HTMLSelectElement).value as 'uniform' | 'random';
        const color = (document.getElementById('layer-edit-color') as HTMLInputElement).value;

        const updates: Partial<FormationLayer> = {
            name,
            pattern,
            placementMode,
            satelliteCount: count,
            shape,
            size,
            colorMode,
            color
        };

        // Placement mode specific
        const isRandomPattern = pattern === 'random_position' || pattern === 'random_position_velocity' || pattern === 'random_periodic';

        if (isRandomPattern) {
            // Random patterns always use radius
            updates.radius = parseFloat((document.getElementById('layer-edit-radius') as HTMLInputElement).value);
            updates.spacing = undefined;
            updates.placementMode = 'radius'; // Force radius mode for random patterns
        } else if (placementMode === 'radius') {
            updates.radius = parseFloat((document.getElementById('layer-edit-radius') as HTMLInputElement).value);
            updates.spacing = undefined;
        } else {
            updates.spacing = parseFloat((document.getElementById('layer-edit-spacing') as HTMLInputElement).value);
            updates.radius = undefined;
        }

        // Box ratios
        if (shape === 'box') {
            updates.boxRatios = {
                x: parseFloat((document.getElementById('layer-edit-box-x') as HTMLInputElement).value) || 1,
                y: parseFloat((document.getElementById('layer-edit-box-y') as HTMLInputElement).value) || 1,
                z: parseFloat((document.getElementById('layer-edit-box-z') as HTMLInputElement).value) || 1
            };
        } else {
            updates.boxRatios = undefined;
        }

        // Rotation (for cube and box)
        if (shape === 'cube' || shape === 'box') {
            updates.rotation = {
                r: parseFloat((document.getElementById('layer-edit-rotation-r') as HTMLInputElement).value) || 0,
                s: parseFloat((document.getElementById('layer-edit-rotation-s') as HTMLInputElement).value) || 0
            };
        } else {
            updates.rotation = undefined;
        }

        // Pattern-specific parameters
        if (pattern === 'periodic_orbit') {
            // For periodic orbit, always use radius (read directly from field)
            const radiusValue = parseFloat((document.getElementById('layer-edit-radius') as HTMLInputElement).value) || 10;
            updates.radius = radiusValue;
            updates.spacing = undefined;
            updates.placementMode = 'radius';

            updates.zAmplitude = parseFloat((document.getElementById('layer-edit-zamplitude') as HTMLInputElement).value) || 0;

            // B, D, E, F are ratios (like in satellite config panel), multiply by A to get actual values
            const A = radiusValue;
            const ratioB = parseFloat((document.getElementById('layer-edit-param-b') as HTMLInputElement).value) || 1;
            const ratioD = parseFloat((document.getElementById('layer-edit-param-d') as HTMLInputElement).value) || 0;
            const ratioE = parseFloat((document.getElementById('layer-edit-param-e') as HTMLInputElement).value) || 0;
            const ratioF = parseFloat((document.getElementById('layer-edit-param-f') as HTMLInputElement).value) || 0;

            updates.periodicParams = {
                A: A,
                B: A * ratioB,  // Multiply ratio by A to get actual value
                D: A * ratioD,  // Multiply ratio by A to get actual value
                E: A * ratioE,  // Multiply ratio by A to get actual value
                F: A * ratioF   // Multiply ratio by A to get actual value
            };
            updates.positiveZ = undefined;
        } else if (pattern === 'circular_orbit') {
            // For circular orbit, always use radius
            const radiusValue = parseFloat((document.getElementById('layer-edit-radius') as HTMLInputElement).value) || 10;
            updates.radius = radiusValue;
            updates.spacing = undefined;
            updates.placementMode = 'radius';

            updates.positiveZ = (document.getElementById('layer-edit-positivez') as HTMLInputElement).checked;
            updates.zAmplitude = undefined;
            updates.periodicParams = undefined;
        } else {
            updates.zAmplitude = undefined;
            updates.periodicParams = undefined;
            updates.positiveZ = undefined;
        }

        // Update layer
        this.manager.updateLayer(this.currentEditingLayerId, updates);

        // Close modal
        this.closeLayerEditor();
    }

    /**
     * 離心率を更新（楕円軌道パラメータ用）
     */
    private updateEccentricity(): void {
        const B = parseFloat((document.getElementById('layer-edit-param-b') as HTMLInputElement)?.value) || 1;
        const D = parseFloat((document.getElementById('layer-edit-param-d') as HTMLInputElement)?.value) || 0;
        const E = parseFloat((document.getElementById('layer-edit-param-e') as HTMLInputElement)?.value) || 0;
        const F = parseFloat((document.getElementById('layer-edit-param-f') as HTMLInputElement)?.value) || 0;

        // Calculate eccentricity: e = sqrt((D-2)^2 + E^2) / 2
        const eccentricity = Math.sqrt(Math.pow(D - 2, 2) + Math.pow(E, 2)) / 2;

        const eccentricityDisplay = document.getElementById('layer-edit-eccentricity');
        if (eccentricityDisplay) {
            eccentricityDisplay.textContent = eccentricity.toFixed(4);
        }
    }

    /**
     * レイヤー編集モーダルのイベントリスナーをセットアップ
     */
    private setupLayerEditorListeners(): void {
        // Close button
        document.getElementById('layer-editor-close')!.addEventListener('click', () => {
            this.closeLayerEditor();
        });

        // Cancel button
        document.getElementById('layer-editor-cancel')!.addEventListener('click', () => {
            this.closeLayerEditor();
        });

        // Save button
        document.getElementById('layer-editor-save')!.addEventListener('click', () => {
            this.saveLayerEdits();
        });

        // Placement mode change
        document.getElementById('layer-edit-placement-mode')!.addEventListener('change', () => {
            this.updateLayerEditorFieldsVisibility();
        });

        // Shape change
        document.getElementById('layer-edit-shape')!.addEventListener('change', () => {
            this.updateLayerEditorFieldsVisibility();
        });

        // Pattern change
        document.getElementById('layer-edit-pattern')!.addEventListener('change', () => {
            this.updateLayerEditorFieldsVisibility();
        });

        // Color mode change
        document.getElementById('layer-edit-color-mode')!.addEventListener('change', () => {
            this.updateLayerEditorFieldsVisibility();
        });

        // Periodic parameter changes (update eccentricity in real-time)
        ['layer-edit-param-b', 'layer-edit-param-d', 'layer-edit-param-e', 'layer-edit-param-f'].forEach(id => {
            document.getElementById(id)!.addEventListener('input', () => {
                this.updateEccentricity();
            });
        });

        // Color input sync
        const colorInput = document.getElementById('layer-edit-color') as HTMLInputElement;
        const colorTextInput = document.getElementById('layer-edit-color-text') as HTMLInputElement;

        colorInput.addEventListener('input', () => {
            colorTextInput.value = colorInput.value;
        });

        colorTextInput.addEventListener('input', () => {
            const value = colorTextInput.value;
            if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                colorInput.value = value;
            }
        });

        // Close on background click
        this.layerEditorModal.addEventListener('click', (e) => {
            if (e.target === this.layerEditorModal) {
                this.closeLayerEditor();
            }
        });
    }

    /**
     * JSON エクスポート
     */
    private exportJSON(): void {
        const json = this.manager.exportToJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.manager.getConfig().name}_formation.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * JSON インポート
     */
    private importJSON(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const result = this.manager.importFromJSON(content);

            if (result.valid) {
                alert('フォーメーションを読み込みました');
                this.updateUI();
            } else {
                alert(`エラー:\n${result.errors.join('\n')}`);
            }
        };
        reader.readAsText(file);

        // Reset input
        input.value = '';
    }

    /**
     * プレビュー
     */
    private preview(): void {
        const config = this.manager.getConfig();
        const satellites = this.generator.generateSatellites(config);

        if (this.onPreviewCallback) {
            // This callback replaces all satellites with formation satellites
            this.onPreviewCallback(satellites);
        }

        // Close modal after preview
        this.close();
    }

    /**
     * フォーメーション設定を取得
     */
    getConfig(): FormationConfig {
        return this.manager.getConfig();
    }

    /**
     * FormationManagerを取得
     */
    getManager(): FormationManager {
        return this.manager;
    }

    /**
     * 衛星を生成
     */
    generateSatellites(): Satellite[] {
        return this.generator.generateSatellites(this.manager.getConfig());
    }
}
