import { CircleHelp, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { useEngine } from '@/engine/EngineContext';
import { appStore } from '@/store/appStore';
import { ScenarioButton } from './ScenarioButton';

/**
 * 右上の学習シナリオ、カメラ操作、ヘルプ。
 * 同じ高さ・配色のツールバーでまとめる。スマホではツールチップ付きのアイコン表示。
 */
export function ViewControls() {
    const engine = useEngine();
    return (
        <div className="glass fixed top-[calc(16px+env(safe-area-inset-top,0px))] right-4 z-10 flex h-12 items-center gap-1 rounded-2xl p-1.5 max-md:right-3">
            <ScenarioButton />
            <div className="flex items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            aria-label="視点をリセット"
                            className="h-9 gap-2 rounded-xl px-3 text-xs font-medium text-fg-muted hover:text-fg max-md:size-9 max-md:px-0"
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
                            size="sm"
                            aria-label="ヘルプ"
                            className="h-9 gap-2 rounded-xl px-3 text-xs font-medium text-fg-muted hover:text-fg max-md:size-9 max-md:px-0"
                            onClick={() => appStore.getState().setUI({ helpOpen: true })}
                        >
                            <CircleHelp />
                            <span className="max-md:hidden">ヘルプ</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        操作方法・ショートカット <Kbd className="ml-1">H</Kbd>
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
