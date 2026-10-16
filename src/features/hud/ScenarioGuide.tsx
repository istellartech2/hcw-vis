import { useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';
import { FORMATION_SCENARIOS } from '@/formation/scenarios';
import { cn } from '@/lib/utils';
import { selectCurrentScenarioId, useAppMode, useAppStore } from '@/store/appStore';

/**
 * 読み込んだ学習シナリオの観察のポイント（右上、ミニマップの下）。
 * 配置を編集すると説明と動きが合わなくなるので消える（説明は衛星配置タブに残る）。
 */
export function ScenarioGuide() {
    const mode = useAppMode();
    const scenarioId = useAppStore(selectCurrentScenarioId);
    const description = useAppStore((s) => s.formation.description);
    const scenario = FORMATION_SCENARIOS.find((s) => s.id === scenarioId);
    if (mode !== 'simulation' || !scenario || !description) return null;
    // シナリオを読み込み直したら開いた状態に戻す
    return <GuideCard key={scenario.id} title={scenario.title} description={description} />;
}

function GuideCard({ title, description }: { title: string; description: string }) {
    const [open, setOpen] = useState(true);
    return (
        <section aria-label="観察のポイント" className="glass pointer-events-auto rounded-[12px]">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
                <Lightbulb className="size-3.5 shrink-0 text-warning" />
                <span className="min-w-0 flex-1">
                    <span className="block text-[10px] text-fg-subtle">観察のポイント</span>
                    <span className="block truncate text-xs font-medium text-fg">{title}</span>
                </span>
                <ChevronDown
                    className={cn('size-3.5 shrink-0 text-fg-subtle transition-transform', open && 'rotate-180')}
                />
            </button>
            {open && (
                <p className="max-h-[40dvh] overflow-y-auto border-t border-line px-3 pt-2 pb-3 text-xs leading-relaxed text-fg-muted">
                    {description}
                </p>
            )}
        </section>
    );
}
