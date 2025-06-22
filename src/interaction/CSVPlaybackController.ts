import { CSVParser, CSVPlaybackData } from '../simulation/CSVParser.js';
import { PlaybackEngine } from '../simulation/PlaybackEngine.js';
import { UIControls } from './UIControls.js';
import { LoadingIndicator } from '../ui/LoadingIndicator.js';

export class CSVPlaybackController {
    private playbackEngine: PlaybackEngine;
    private uiControls: UIControls;
    private loadingIndicator: LoadingIndicator;
    private isActive: boolean = false;
    private updateCallback?: () => void;

    constructor(uiControls: UIControls, loadingIndicator: LoadingIndicator) {
        this.playbackEngine = new PlaybackEngine();
        this.uiControls = uiControls;
        this.loadingIndicator = loadingIndicator;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // CSV file input
        this.uiControls.elements.csvPlaybackInput.addEventListener('change', (e) => {
            const input = e.target as HTMLInputElement;
            if (input.files && input.files[0]) {
                this.loadCSVFile(input.files[0]);
            }
        });

        // Sample file buttons
        this.uiControls.elements.loadSampleSingle.addEventListener('click', () => {
            this.loadSampleFile('/public/samples/single_satellite_6dof.csv');
        });

        this.uiControls.elements.loadSampleMultiple.addEventListener('click', () => {
            this.loadSampleFile('/public/samples/three_satellite_6dof.csv');
        });

        // Playback controls
        this.uiControls.elements.csvPlayPause.addEventListener('click', () => {
            this.togglePlayPause();
        });

        this.uiControls.elements.csvStop.addEventListener('click', () => {
            this.stop();
        });

        // Time slider
        this.uiControls.elements.csvTimeSlider.addEventListener('input', (e) => {
            const slider = e.target as HTMLInputElement;
            const progress = parseFloat(slider.value) / 100;
            this.seekToProgress(progress);
        });

        // Playback speed
        this.uiControls.elements.csvPlaybackSpeed.addEventListener('change', (e) => {
            const select = e.target as HTMLSelectElement;
            const speed = parseFloat(select.value);
            this.playbackEngine.setPlaybackSpeed(speed);
        });

        // Loop enabled
        this.uiControls.elements.csvLoopEnabled.addEventListener('change', (e) => {
            const checkbox = e.target as HTMLInputElement;
            this.playbackEngine.setLoopEnabled(checkbox.checked);
        });
    }

    private async loadCSVFile(file: File): Promise<void> {
        try {
            this.loadingIndicator.showProcessing(`CSVファイルを読み込み中: ${file.name}`);
            this.updateFileStatus('読み込み中...', 'loading');

            const data = await CSVParser.parseCSVFile(file);
            this.playbackEngine.loadCSVData(data);
            
            this.updateFileStatus(`読み込み完了: ${file.name}`, 'success');
            this.updateDataInfo(data);
            this.showPlaybackControls();
            this.ensureAttitudeVisualization();
            this.activatePlaybackMode();
            
            this.loadingIndicator.hide();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.updateFileStatus(`エラー: ${errorMessage}`, 'error');
            this.hidePlaybackControls();
            this.loadingIndicator.hide();
            console.error('CSV loading error:', error);
        }
    }

    private async loadSampleFile(path: string): Promise<void> {
        try {
            this.loadingIndicator.showProcessing('サンプルファイルを読み込み中...');
            
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to fetch sample file: ${response.statusText}`);
            }
            
            const content = await response.text();
            const data = CSVParser.parseCSVContent(content);
            this.playbackEngine.loadCSVData(data);
            
            const fileName = path.split('/').pop() || 'sample file';
            this.updateFileStatus(`読み込み完了: ${fileName}`, 'success');
            this.updateDataInfo(data);
            this.showPlaybackControls();
            this.ensureAttitudeVisualization();
            this.activatePlaybackMode();
            
            this.loadingIndicator.hide();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.updateFileStatus(`エラー: ${errorMessage}`, 'error');
            this.hidePlaybackControls();
            this.loadingIndicator.hide();
            console.error('Sample file loading error:', error);
        }
    }

    private updateFileStatus(message: string, type: 'loading' | 'success' | 'error'): void {
        this.uiControls.elements.csvFileStatus.classList.remove('hidden');
        this.uiControls.elements.csvStatusText.textContent = message;
        
        const statusElement = this.uiControls.elements.csvFileStatus.querySelector('.status-indicator');
        if (statusElement) {
            statusElement.className = 'status-indicator p-2 rounded-lg text-[13px]';
            switch (type) {
                case 'loading':
                    statusElement.classList.add('bg-blue-500/20', 'text-blue-400', 'border', 'border-blue-500/30');
                    break;
                case 'success':
                    statusElement.classList.add('bg-green-500/20', 'text-green-400', 'border', 'border-green-500/30');
                    break;
                case 'error':
                    statusElement.classList.add('bg-red-500/20', 'text-red-400', 'border', 'border-red-500/30');
                    break;
            }
        }
    }

    private updateDataInfo(data: CSVPlaybackData): void {
        this.uiControls.elements.csvSatelliteCount.textContent = data.satelliteCount.toString();
        this.uiControls.elements.csvDataPoints.textContent = data.satellites[0]?.length.toString() || '0';
        this.uiControls.elements.csvTimeRange.textContent = 
            `${data.timeRange.min.toFixed(1)}-${data.timeRange.max.toFixed(1)}s`;
        
        // Update time slider range
        this.uiControls.elements.csvTimeSlider.min = '0';
        this.uiControls.elements.csvTimeSlider.max = '100';
        this.uiControls.elements.csvTimeSlider.value = '0';
        
        // Update time display
        this.uiControls.elements.csvCurrentTime.textContent = data.timeRange.min.toFixed(1);
        this.uiControls.elements.csvTotalTime.textContent = data.timeRange.max.toFixed(1);
    }

    private showPlaybackControls(): void {
        this.uiControls.elements.csvPlaybackControls.classList.remove('hidden');
    }

    private hidePlaybackControls(): void {
        this.uiControls.elements.csvPlaybackControls.classList.add('hidden');
    }

    private togglePlayPause(): void {
        this.playbackEngine.togglePlayPause();
        this.updatePlayPauseButton();
    }

    private stop(): void {
        this.playbackEngine.stop();
        this.updatePlayPauseButton();
        this.updateTimeDisplay();
    }

    private seekToProgress(progress: number): void {
        const timeRange = this.playbackEngine.getTimeRange();
        if (timeRange) {
            const targetTime = timeRange.min + progress * (timeRange.max - timeRange.min);
            this.playbackEngine.setCurrentTime(targetTime);
            this.updateTimeDisplay();
        }
    }

    private updatePlayPauseButton(): void {
        const state = this.playbackEngine.getState();
        if (state.isPlaying) {
            this.uiControls.elements.csvPlayPause.innerHTML = '⏸ 一時停止';
        } else {
            this.uiControls.elements.csvPlayPause.innerHTML = '▶ 再生';
        }
    }

    private updateTimeDisplay(): void {
        const state = this.playbackEngine.getState();
        const timeRange = this.playbackEngine.getTimeRange();
        
        if (timeRange) {
            this.uiControls.elements.csvCurrentTime.textContent = state.currentTime.toFixed(1);
            
            // Update slider position
            const progress = this.playbackEngine.getCurrentProgress();
            this.uiControls.elements.csvTimeSlider.value = (progress * 100).toString();
        }
    }

    public update(deltaTimeMs: number): void {
        if (!this.isActive) return;
        
        this.playbackEngine.update(deltaTimeMs);
        this.updateTimeDisplay();
        this.updatePlayPauseButton();
        
        if (this.updateCallback) {
            this.updateCallback();
        }
    }

    public activatePlaybackMode(): void {
        this.isActive = true;
        this.updateSatelliteConfigPanel(true);
    }

    public deactivatePlaybackMode(): void {
        this.isActive = false;
        this.playbackEngine.reset();
        this.hidePlaybackControls();
        this.uiControls.elements.csvFileStatus.classList.add('hidden');
        this.updateSatelliteConfigPanel(false);
    }

    private updateSatelliteConfigPanel(playbackMode: boolean): void {
        const configPanel = document.getElementById('satellite-config-panel');
        const configContent = document.getElementById('satellite-config-content');
        const configTitle = configPanel?.querySelector('.section-title');
        
        if (configPanel && configContent && configTitle) {
            if (playbackMode) {
                configTitle.textContent = '📊 CSV再生モード';
                configContent.style.display = 'none';
                
                // Add playback status to the panel
                let playbackStatus = document.getElementById('playback-status');
                if (!playbackStatus) {
                    playbackStatus = document.createElement('div');
                    playbackStatus.id = 'playback-status';
                    playbackStatus.className = 'p-3 text-center text-orange-400 text-sm';
                    playbackStatus.innerHTML = '📊 CSV再生モードが有効です<br><span class="text-xs text-orange-300/80">設定パネルでファイルを変更できます</span>';
                    configPanel.appendChild(playbackStatus);
                }
            } else {
                configTitle.textContent = '🛰️ 衛星配置';
                configContent.style.display = '';
                
                // Remove playback status
                const playbackStatus = document.getElementById('playback-status');
                if (playbackStatus) {
                    playbackStatus.remove();
                }
            }
        }
    }

    public getPlaybackEngine(): PlaybackEngine {
        return this.playbackEngine;
    }

    public isPlaybackActive(): boolean {
        return this.isActive && this.playbackEngine.isLoaded();
    }

    public setUpdateCallback(callback: () => void): void {
        this.updateCallback = callback;
    }

    private ensureAttitudeVisualization(): void {
        // Switch to cube shape to make attitude visible
        const currentShape = this.uiControls.elements.satelliteShape.value;
        if (currentShape === 'sphere') {
            this.uiControls.elements.satelliteShape.value = 'cube';
            
            // Show cube rotation controls
            this.uiControls.elements.cubeRotationControls.style.display = 'block';
            this.uiControls.elements.file3dControls.style.display = 'none';
            
            // Trigger satellite recreation with new shape
            if (this.updateCallback) {
                this.updateCallback();
            }
        }
    }
}