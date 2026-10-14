import type { ReactNode } from 'react';
import { BookOpen, Camera, Keyboard, Orbit, RotateCcw, Satellite, Settings2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HudPanel } from '@/components/hud-panel';
import { useEngine } from '@/engine/EngineContext';
import { appStore } from '@/store/appStore';

const README_URL = 'https://github.com/istellartech2/hcw-vis/blob/main/README.md';

function ToolbarButton({ label, children, ...props }: { label: string; children: ReactNode } & React.ComponentProps<typeof Button>) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={label} {...props}>
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    );
}

export function TopToolbar() {
    const engine = useEngine();
    const setUI = appStore.getState().setUI;

    return (
        <HudPanel className="flex items-center gap-1 p-1">
            <ToolbarButton label="設定" onClick={() => setUI({ settingsOpen: true })}>
                <Settings2 />
            </ToolbarButton>
            <Button variant="ghost" className="gap-1.5" aria-label="フォーメーション設計" onClick={() => setUI({ formationOpen: true })}>
                <Satellite />
                <span className="hidden sm:inline">フォーメーション</span>
            </Button>

            <DropdownMenu>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="リセット">
                                <RotateCcw />
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">リセット</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="w-60">
                    <DropdownMenuItem onSelect={() => engine.resetPositions()}>
                        <Orbit />
                        衛星を初期位置に戻す
                        <DropdownMenuShortcut>R</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => engine.resetView()}>
                        <Camera />
                        カメラをリセット
                        <DropdownMenuShortcut>V</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => engine.resetFormation()}>
                        <Undo2 />
                        フォーメーションを初期化
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ToolbarButton label="キーボードショートカット" onClick={() => setUI({ helpOpen: true })}>
                <Keyboard />
            </ToolbarButton>
            <ToolbarButton label="ドキュメント" asChild>
                <a href={README_URL} target="_blank" rel="noopener noreferrer">
                    <BookOpen />
                </a>
            </ToolbarButton>
        </HudPanel>
    );
}
