import { CircleHelp, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { useEngine } from '@/engine/EngineContext';
import { appStore } from '@/store/appStore';

/**
 * 右上のカメラ操作とヘルプ。
 * 再生バーの「t = 0 に戻す」と混同しないよう、視点リセットは文字付きで表示する（スマホはアイコンのみ）。
 */
export function ViewControls() {
    const engine = useEngine();
    return (
        <div className="glass fixed top-[calc(12px+env(safe-area-inset-top,0px))] right-3 z-10 flex items-center gap-0.5 rounded-[10px] p-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label="視点をリセット"
                        className="text-fg-muted hover:text-brand-text max-md:size-8 max-md:px-0"
                        onClick={() => engine.resetView()}
                    >
                        <Focus />
                        <span className="max-md:hidden">視点リセット</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    カメラを初期の向き・距離に戻す <Kbd className="ml-1">V</Kbd>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="ヘルプ"
                        className="size-8 text-fg-muted hover:text-brand-text"
                        onClick={() => appStore.getState().setUI({ helpOpen: true })}
                    >
                        <CircleHelp />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    操作方法・ショートカット <Kbd className="ml-1">H</Kbd>
                </TooltipContent>
            </Tooltip>
        </div>
    );
}
