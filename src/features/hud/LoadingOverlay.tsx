import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

export function LoadingOverlay() {
    const loading = useAppStore((s) => s.loading);
    if (!loading) return null;

    return (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(12px+env(safe-area-inset-top,0px))] z-50 flex justify-center">
            <div role="status" className="glass flex w-72 items-start gap-3 rounded-xl p-3 text-fg">
                <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium">{loading.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{loading.message}</p>
                    {loading.progress !== undefined && (
                        <div className="space-y-1 pt-1">
                            <div className="h-1 overflow-hidden rounded-full bg-sunken">
                                <div
                                    className="h-full bg-primary transition-[width]"
                                    style={{ width: `${Math.round(loading.progress * 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                                <span>{Math.round(loading.progress * 100)}%</span>
                                {loading.fileSize !== undefined && <span>{formatFileSize(loading.fileSize)}</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
