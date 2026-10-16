import { useRef, useState } from 'react';
import { Check, ChevronDown, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FORMATION_SCENARIOS, type FormationScenario } from '@/formation/scenarios';
import { circularMeanMotion } from '@/simulation/OrbitElements';
import { appStore, selectCurrentScenarioId, useAppMode, useAppStore } from '@/store/appStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * 学習用シナリオを読み込んで再生を始める。トーストの「元に戻す」で直前の配置に戻せる。
 * 一時停止したまま読み込むと t = 0 で止まって見えるので、再生を始めて動きを見せる。
 */
function loadScenario(scenario: FormationScenario): void {
    // 初速度を m/s で指定するシナリオがあるので、いまの軌道高度の平均運動を渡す
    const config = scenario.build(circularMeanMotion(appStore.getState().orbit.altitudeKm));
    const undo = appStore.getState().replaceFormation({
        formation: config,
        formationFile: null,
        loadedScenario: { id: scenario.id, config },
        paused: false,
    });
    toast(`「${scenario.title}」を読み込みました`, { action: { label: '元に戻す', onClick: undo } });
}

/**
 * 右上の学習シナリオボタン（シミュレーションモードのみ）。位置は ViewControls が決める。
 * 読み込んだシナリオを編集していない間は、その名前を表示する（狭い画面ではアイコンだけ）。
 */
export function ScenarioButton() {
    const mode = useAppMode();
    const currentId = useAppStore(selectCurrentScenarioId);
    const [open, setOpen] = useState(false);
    const picked = useRef(false);

    if (mode !== 'simulation') return null;
    const current = FORMATION_SCENARIOS.find((s) => s.id === currentId);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <Button
                            variant="ghost"
                            aria-label={current ? `学習シナリオ: ${current.title}` : '学習シナリオ'}
                            className="h-9 gap-2 rounded-xl px-3 text-xs font-medium text-fg-muted hover:bg-raised-hover hover:text-fg max-md:size-9 max-md:px-0"
                        >
                            <GraduationCap className="size-4" />
                            <span className="shrink-0 font-medium max-md:hidden">学習シナリオ</span>
                            {current && (
                                <>
                                    <span aria-hidden className="h-4 w-px shrink-0 bg-line-strong max-xl:hidden" />
                                    <span className="max-w-56 truncate text-fg-muted max-xl:hidden">
                                        {current.title}
                                    </span>
                                </>
                            )}
                            <ChevronDown className="size-3.5 text-fg-subtle max-md:hidden" />
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">学習シナリオ{current ? `: ${current.title}` : 'を選ぶ'}</TooltipContent>
            </Tooltip>
            <DialogContent
                className="sm:max-w-lg"
                // 選んで閉じたときはトリガーにフォーカスを戻さない。戻すと Space（再生／一時停止）がボタン操作に取られる
                onCloseAutoFocus={(e) => {
                    if (picked.current) e.preventDefault();
                    picked.current = false;
                }}
            >
                <DialogHeader>
                    <DialogTitle>学習シナリオ</DialogTitle>
                    <DialogDescription>
                        HCW 方程式の性質を 1
                        つずつ確かめられる配置です。選ぶと現在の配置が置き換わり、観察のポイントが画面右上に表示されます。
                    </DialogDescription>
                </DialogHeader>
                <ol className="max-h-[60vh] space-y-2 overflow-y-auto">
                    {FORMATION_SCENARIOS.map((scenario, index) => {
                        const selected = scenario.id === currentId;
                        return (
                            <li key={scenario.id}>
                                <button
                                    type="button"
                                    aria-current={selected || undefined}
                                    onClick={() => {
                                        picked.current = true;
                                        loadScenario(scenario);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        'group flex w-full items-center gap-3 rounded-xl border border-line px-3 py-3 text-left transition-colors hover:border-line-strong hover:bg-raised focus-visible:outline-2 focus-visible:outline-brand',
                                        selected && 'border-brand/30 bg-brand-soft',
                                    )}
                                >
                                    <span className="num flex size-8 shrink-0 items-center justify-center rounded-lg bg-raised text-xs text-fg-muted">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-fg">{scenario.title}</span>
                                        <span className="mt-1 block text-xs leading-relaxed text-fg-muted">
                                            {scenario.summary}
                                        </span>
                                    </span>
                                    {selected && <Check className="size-4 shrink-0 text-brand-text" />}
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </DialogContent>
        </Dialog>
    );
}
