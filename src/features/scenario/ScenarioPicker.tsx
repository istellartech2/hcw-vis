import { useState } from 'react';
import { ChevronRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { FORMATION_SCENARIOS, type FormationScenario } from '@/formation/scenarios';

/** 学習用シナリオの一覧。選ぶと現在の配置をそのシナリオに置き換える */
export function ScenarioPicker({ onSelect }: { onSelect: (scenario: FormationScenario) => void }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-fg-muted">
                    <GraduationCap />
                    学習用シナリオから選ぶ
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>学習用シナリオ</DialogTitle>
                    <DialogDescription>
                        HCW 方程式の性質を 1 つずつ確かめられる配置です。選ぶと現在の配置が置き換わります。
                    </DialogDescription>
                </DialogHeader>
                <ol className="-mx-2 max-h-[60vh] space-y-0.5 overflow-y-auto">
                    {FORMATION_SCENARIOS.map((scenario, index) => (
                        <li key={scenario.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    onSelect(scenario);
                                    setOpen(false);
                                }}
                                className="group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-raised focus-visible:bg-raised focus-visible:outline-none"
                            >
                                <span className="num w-4 shrink-0 text-center text-xs text-fg-subtle">{index + 1}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-fg">{scenario.title}</span>
                                    <span className="block text-xs text-fg-muted">{scenario.summary}</span>
                                </span>
                                <ChevronRight className="size-4 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                        </li>
                    ))}
                </ol>
            </DialogContent>
        </Dialog>
    );
}
