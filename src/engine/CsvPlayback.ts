import { parseCSVContent, parseCSVFile, type CSVPlaybackData } from '@/simulation/CSVParser';
import { PlaybackEngine } from '@/simulation/PlaybackEngine';
import type { Satellite } from '@/simulation/Satellite';
import { appStore, INITIAL_PLAYBACK } from '@/store/appStore';

/**
 * CSV 再生モードの制御。再生状態はストアの `playback` に反映する。
 */
export class CsvPlayback {
    private engine = new PlaybackEngine();

    /**
     * @param onActivate 新しいCSVが読み込まれ再生モードに入ったときに呼ばれる
     */
    constructor(private onActivate: () => void) {}

    isActive(): boolean {
        return this.engine.isLoaded();
    }

    isPlaying(): boolean {
        return this.engine.isPlaying;
    }

    getCurrentTime(): number {
        return this.engine.currentTime;
    }

    getSatelliteCount(): number {
        return this.engine.getSatelliteCount();
    }

    /** 現在時刻の位置・速度・姿勢を衛星に書き込む */
    applyTo(satellites: Satellite[]): void {
        this.engine.applyTo(satellites);
    }

    loadFile(file: File): Promise<void> {
        return this.load(file.name, () => parseCSVFile(file), `CSVファイルを読み込み中: ${file.name}`);
    }

    loadSample(path: string): Promise<void> {
        const fileName = path.split('/').pop() || 'sample file';
        return this.load(
            fileName,
            async () => {
                const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch sample file: ${response.statusText}`);
                }
                return parseCSVContent(await response.text());
            },
            'サンプルファイルを読み込み中...',
        );
    }

    private async load(fileName: string, read: () => Promise<CSVPlaybackData>, message: string): Promise<void> {
        const store = appStore.getState();
        try {
            store.patch({ loading: { title: '読み込み中', message } });
            store.patchPlayback({ fileStatus: { kind: 'loading', message: '読み込み中...' } });

            const data = await read();
            this.engine.loadCSVData(data);
            // 速度とループは UI の設定を引き継ぐ
            this.engine.setPlaybackSpeed(store.playback.speed);
            this.engine.loopEnabled = store.playback.loop;

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
            store.patch({ loading: null });
        }
    }

    deactivate(): void {
        this.engine.unload();
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
        this.engine.seekToProgress(progress);
        this.syncState();
    }

    setSpeed(speed: number): void {
        this.engine.setPlaybackSpeed(speed);
        appStore.getState().patchPlayback({ speed });
    }

    setLoop(loop: boolean): void {
        this.engine.loopEnabled = loop;
        appStore.getState().patchPlayback({ loop });
    }

    /** 毎フレーム呼ぶ。publish のフレーム（と再生が止まったとき）だけストアへ反映する */
    update(deltaTimeMs: number, publish: boolean): void {
        this.engine.update(deltaTimeMs);
        if (publish || !this.engine.isPlaying) this.syncState();
    }

    private syncState(): void {
        const { playback, patchPlayback } = appStore.getState();
        const isPlaying = this.engine.isPlaying;
        const currentTime = this.engine.currentTime;
        if (playback.isPlaying === isPlaying && playback.currentTime === currentTime) return;
        patchPlayback({ isPlaying, currentTime, progress: this.engine.getCurrentProgress() });
    }
}
