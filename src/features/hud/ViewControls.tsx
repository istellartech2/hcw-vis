import type { ReactNode } from 'react';
import { Camera, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEngine } from '@/engine/EngineContext';
import { appStore } from '@/store/appStore';

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={label}
                    className="text-fg-muted hover:text-brand-text"
                    onClick={onClick}
                >
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{label}</TooltipContent>
        </Tooltip>
    );
}

/** 右上の視点リセットとヘルプ */
export function ViewControls() {
    const engine = useEngine();
    return (
        <div className="glass fixed top-[calc(12px+env(safe-area-inset-top,0px))] right-3 z-10 flex flex-col gap-0.5 rounded-[10px] p-1">
            <IconButton label="視点をリセット (V)" onClick={() => engine.resetView()}>
                <Camera />
            </IconButton>
            <IconButton
                label="キーボードショートカット (H)"
                onClick={() => appStore.getState().setUI({ helpOpen: true })}
            >
                <Keyboard />
            </IconButton>
        </div>
    );
}
