import { appStore } from '@/store/appStore';

export interface LoadingOptions {
    title?: string;
    message?: string;
    showProgress?: boolean;
    fileSize?: number;
}

/**
 * ローディング表示の状態をストアに書き込む。
 * 表示そのものは React 側の LoadingOverlay が担当する。
 */
export class LoadingIndicator {
    private showProgress = false;

    show(options: LoadingOptions = {}): void {
        this.showProgress = options.showProgress ?? false;
        appStore.getState().patch({
            loading: {
                title: options.title ?? '読み込み中...',
                message: options.message ?? 'ファイルを処理しています',
                progress: this.showProgress ? 0 : undefined,
                fileSize: options.fileSize,
            },
        });
    }

    updateProgress(progress: number): void {
        const loading = appStore.getState().loading;
        if (!this.showProgress || !loading) return;
        appStore.getState().patch({ loading: { ...loading, progress } });
    }

    setMessage(message: string): void {
        const loading = appStore.getState().loading;
        if (!loading) return;
        appStore.getState().patch({ loading: { ...loading, message } });
    }

    hide(): void {
        appStore.getState().patch({ loading: null });
    }

    showTextureLoading(textureName: string): void {
        this.show({ title: 'テクスチャ読み込み中', message: `${textureName}を読み込んでいます...` });
    }

    showModelLoading(fileName: string, fileSize?: number): void {
        this.show({
            title: '3Dモデル読み込み中',
            message: `${fileName}を読み込んでいます...`,
            showProgress: true,
            fileSize,
        });
    }

    showProcessing(operation: string): void {
        this.show({ title: '処理中', message: `${operation}を実行しています...` });
    }
}
