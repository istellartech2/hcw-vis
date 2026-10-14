import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PanelSectionProps {
    title: string;
    icon?: ReactNode;
    /** 見出し右側に置くボタンなど */
    action?: ReactNode;
    collapsible?: boolean;
    defaultOpen?: boolean;
    children: ReactNode;
}

/** サイドパネル内の 1 セクション（見出し + 内容、上に区切り線） */
export function PanelSection({
    title,
    icon,
    action,
    collapsible = false,
    defaultOpen = true,
    children,
}: PanelSectionProps) {
    const [open, setOpen] = useState(defaultOpen);
    const isOpen = !collapsible || open;

    const heading = (
        <span className="flex min-w-0 items-center gap-1.5">
            {icon && <span className="shrink-0 text-fg-subtle [&>svg]:size-3.5">{icon}</span>}
            <span className="truncate text-[13px] font-semibold text-fg">{title}</span>
        </span>
    );

    return (
        <section className="panel-section">
            <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
                {collapsible ? (
                    <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpen((v) => !v)}
                        className="flex flex-1 items-center justify-between gap-2 text-left transition-opacity hover:opacity-80"
                    >
                        {heading}
                        <ChevronDown
                            className={cn('size-3.5 text-fg-muted transition-transform', open && 'rotate-180')}
                        />
                    </button>
                ) : (
                    heading
                )}
                {action && <div className="shrink-0">{action}</div>}
            </div>
            {isOpen && <div className="space-y-2">{children}</div>}
        </section>
    );
}
