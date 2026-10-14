import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

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
                </div>
            </div>
        </div>
    );
}
