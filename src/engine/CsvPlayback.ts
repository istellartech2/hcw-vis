import { CSVParser, type CSVPlaybackData } from '@/simulation/CSVParser';
import { PlaybackEngine } from '@/simulation/PlaybackEngine';
import { appStore, INITIAL_PLAYBACK } from '@/store/appStore';
import { LoadingIndicator } from './LoadingIndicator';

/**
 * CSV 再生モードの制御。再生状態はストアの `playback` に反映する。
 */
export class CsvPlayback {
    private engine = new PlaybackEngine();
    private loadingIndicator = new LoadingIndicator();
    private active = false;
    private onActivate: () => void;

    /**
     * @param onActivate 新しいCSVが読み込まれ再生モードに入ったときに呼ばれる
     */
    constructor(onActivate: () => void) {
        this.onActivate = onActivate;
    }

    getEngine(): PlaybackEngine {
        return this.engine;
    }

    isActive(): boolean {
        return this.active && this.engine.isLoaded();
    }

    getCurrentTime(): number {
        return this.engine.getState().currentTime;
    }

    async loadFile(file: File): Promise<void> {
        await this.load(file.name, () => CSVParser.parseCSVFile(file), `CSVファイルを読み込み中: ${file.name}`);
    }

    async loadSample(path: string): Promise<void> {
        const fileName = path.split('/').pop() || 'sample file';
        await this.load(
            fileName,
            async () => {
                const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch sample file: ${response.statusText}`);
                }
                return CSVParser.parseCSVContent(await response.text());
            },
            'サンプルファイルを読み込み中...',
        );
    }

    private async load(
        fileName: string,
        read: () => Promise<CSVPlaybackData>,
        processingMessage: string,
    ): Promise<void> {
        const store = appStore.getState();
        try {
            this.loadingIndicator.showProcessing(processingMessage);
            store.patchPlayback({ fileStatus: { kind: 'loading', message: '読み込み中...' } });

            const data = await read();
            // reset() で初期化されるため、読み込みのたびに UI 側の設定を反映する
            this.engine.setPlaybackSpeed(store.playback.speed);
            this.engine.setLoopEnabled(store.playback.loop);
            this.engine.loadCSVData(data);
            this.active = true;

            store.patchPlayback({
                active: true,
                fileStatus: { kind: 'success', message: `読み込み完了: ${fileName}` },
                timeRange: data.timeRange,
                satelliteCount: data.satelliteCount,
                dataPoints: data.satellites[0]?.length ?? 0,
            });
            this.syncState();
            this.onActivate();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            store.patchPlayback({ fileStatus: { kind: 'error', message: `エラー: ${message}` } });
            console.error('CSV loading error:', error);
        } finally {
            this.loadingIndicator.hide();
        }
    }

    deactivate(): void {
        this.active = false;
        this.engine.reset();
        const { speed, loop } = appStore.getState().playback;
        appStore.getState().patch({ playback: { ...INITIAL_PLAYBACK, speed, loop } });
    }

    togglePlayPause(): void {
        this.engine.togglePlayPause();
        this.syncState();
    }

    stop(): void {
        this.engine.stop();
        this.syncState();
    }

    seekToProgress(progress: number): void {
        const timeRange = this.engine.getTimeRange();
        if (!timeRange) return;
        this.engine.setCurrentTime(timeRange.min + progress * (timeRange.max - timeRange.min));
        this.syncState();
    }

    setSpeed(speed: number): void {
        this.engine.setPlaybackSpeed(speed);
        appStore.getState().patchPlayback({ speed });
    }

    setLoop(loop: boolean): void {
        this.engine.setLoopEnabled(loop);
        appStore.getState().patchPlayback({ loop });
    }

    /** 毎フレーム呼ぶ。再生モードでなければ何もしない */
    update(deltaTimeMs: number, publish: boolean): boolean {
        if (!this.active) return false;
        this.engine.update(deltaTimeMs);
        if (publish) this.syncState();
        return true;
    }

    private syncState(): void {
        const state = this.engine.getState();
        appStore.getState().patchPlayback({
            isPlaying: state.isPlaying,
            currentTime: state.currentTime,
            progress: this.engine.getCurrentProgress(),
        });
    }
}
