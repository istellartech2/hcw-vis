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
import { useEngine } from '@/engine/EngineContext';
import { loadScenario } from '@/features/scenario/loadScenario';
import { FORMATION_SCENARIOS } from '@/formation/scenarios';
import { useAppMode, useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

/**
 * 上部中央の学習シナリオボタン（シミュレーションモードのみ）。
 * 読み込んだシナリオを編集していない間は、その名前を表示する。
 */
export function ScenarioButton() {
    const engine = useEngine();
    const mode = useAppMode();
    const currentId = useAppStore((s) =>
        s.loadedScenario && s.loadedScenario.config === s.formation ? s.loadedScenario.id : null,
    );
    const [open, setOpen] = useState(false);
    const picked = useRef(false);

    if (mode !== 'simulation') return null;
    const current = FORMATION_SCENARIOS.find((s) => s.id === currentId);

    return (
        <div className="hud-top-center">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        className="glass h-10 max-w-[min(28rem,calc(100vw-260px))] gap-2 rounded-[10px] px-3 text-[13px] text-fg hover:bg-raised-hover hover:text-brand-text max-md:max-w-[calc(100vw-24px)]"
                    >
                        <GraduationCap className="size-4 text-brand-text" />
                        <span className="shrink-0 font-medium">学習シナリオ</span>
                        {current && (
                            <>
                                <span aria-hidden className="h-4 w-px shrink-0 bg-line-strong" />
                                <span className="truncate text-fg-muted">{current.title}</span>
                            </>
                        )}
                        <ChevronDown className="size-3.5 text-fg-subtle" />
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
                            つずつ確かめられる配置です。選ぶと現在の配置が置き換わり、観察のポイントが衛星配置タブに表示されます。
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
                                            loadScenario(engine, scenario);
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
        </div>
    );
}
