export interface LoadingOptions {
    title?: string;
    message?: string;
    showProgress?: boolean;
    fileSize?: number;
}

export class LoadingIndicator {
    private indicator: HTMLElement;
    private title: HTMLElement;
    private message: HTMLElement;
    private progressContainer: HTMLElement;
    private progressBar: HTMLElement;
    private progressText: HTMLElement;
    private fileSizeText: HTMLElement;
    private currentOptions: LoadingOptions = {};

    constructor() {
        this.indicator = document.getElementById('loading-indicator')!;
        this.title = document.getElementById('loading-title')!;
        this.message = document.getElementById('loading-message')!;
        this.progressContainer = document.getElementById('loading-progress-container')!;
        this.progressBar = document.getElementById('loading-progress-bar')!;
        this.progressText = document.getElementById('loading-progress-text')!;
        this.fileSizeText = document.getElementById('loading-file-size')!;
    }

    show(options: LoadingOptions = {}): void {
        this.currentOptions = {
            title: '読み込み中...',
            message: 'ファイルを処理しています',
            showProgress: false,
            ...options
        };

        this.title.textContent = this.currentOptions.title!;
        this.message.textContent = this.currentOptions.message!;

        if (this.currentOptions.showProgress) {
            this.progressContainer.classList.remove('hidden');
            this.updateProgress(0);
            
            if (this.currentOptions.fileSize) {
                this.fileSizeText.textContent = this.formatFileSize(this.currentOptions.fileSize);
            }
        } else {
            this.progressContainer.classList.add('hidden');
        }

        this.indicator.classList.remove('hidden');
        
        // Add a small delay to ensure the animation starts properly
        requestAnimationFrame(() => {
            this.indicator.style.opacity = '1';
        });
    }

    updateProgress(progress: number): void {
        if (!this.currentOptions.showProgress) return;
        
        const percentage = Math.round(progress * 100);
        this.progressBar.style.width = `${percentage}%`;
        this.progressText.textContent = `${percentage}%`;
    }

    setMessage(message: string): void {
        this.message.textContent = message;
    }

    hide(): void {
        this.indicator.style.opacity = '0';
        
        setTimeout(() => {
            this.indicator.classList.add('hidden');
            this.progressContainer.classList.add('hidden');
            this.progressBar.style.width = '0%';
            this.progressText.textContent = '0%';
            this.fileSizeText.textContent = '';
        }, 300);
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }

    // Convenience methods for common loading scenarios
    showTextureLoading(textureName: string): void {
        this.show({
            title: 'テクスチャ読み込み中',
            message: `${textureName}を読み込んでいます...`,
            showProgress: false
        });
    }

    showModelLoading(fileName: string, fileSize?: number): void {
        this.show({
            title: '3Dモデル読み込み中',
            message: `${fileName}を読み込んでいます...`,
            showProgress: true,
            fileSize
        });
    }

    showProcessing(operation: string): void {
        this.show({
            title: '処理中',
            message: `${operation}を実行しています...`,
            showProgress: false
        });
    }
}