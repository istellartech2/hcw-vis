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
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    aria-label={current ? `学習シナリオ: ${current.title}` : '学習シナリオ'}
                    className="glass h-10 gap-2 rounded-[10px] px-3 text-[13px] text-fg hover:bg-raised-hover hover:text-brand-text max-md:size-10 max-md:px-0"
                >
                    <GraduationCap className="size-4 text-brand-text" />
                    <span className="shrink-0 font-medium max-md:hidden">学習シナリオ</span>
                    {current && (
                        <>
                            <span aria-hidden className="h-4 w-px shrink-0 bg-line-strong max-lg:hidden" />
                            <span className="max-w-56 truncate text-fg-muted max-lg:hidden">{current.title}</span>
                        </>
                    )}
                    <ChevronDown className="size-3.5 text-fg-subtle max-md:hidden" />
                </Button>
            </DialogTrigger>
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
                <ol className="-mx-2 max-h-[60vh] space-y-0.5 overflow-y-auto">
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
                                        'group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-raised focus-visible:bg-raised focus-visible:outline-none',
                                        selected && 'bg-raised',
                                    )}
                                >
                                    <span className="num w-4 shrink-0 text-center text-xs text-fg-subtle">
                                        {index + 1}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-fg">{scenario.title}</span>
                                        <span className="block text-xs text-fg-muted">{scenario.summary}</span>
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
