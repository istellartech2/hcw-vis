/**
 * サイドパネル用のコンパクトな入力部品。
 * 長い説明は常時表示せず HelpTip（ⓘ）に寄せて、狭いパネルでも縦に伸びないようにする。
 */

import { useId, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** ⓘ アイコン。ホバー・フォーカスで説明を表示する */
export function HelpTip({ children }: { children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label="説明を表示"
                    className="inline-flex p-0.5 text-fg-subtle transition-colors hover:text-fg-muted"
                >
                    <Info className="size-3" />
                </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-xs leading-relaxed">{children}</TooltipContent>
        </Tooltip>
    );
}

/** ラベル + スイッチの 1 行 */
export function ToggleRow({
    label,
    help,
    checked,
    disabled,
    onCheckedChange,
}: {
    label: ReactNode;
    help?: ReactNode;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    const id = useId();
    return (
        <div className={cn('flex min-h-7 items-center justify-between gap-3', disabled && 'opacity-50')}>
            <span className="inline-flex items-center gap-0.5 text-[13px] text-fg">
                <label htmlFor={id}>{label}</label>
                {help && <HelpTip>{help}</HelpTip>}
            </span>
            <Switch id={id} size="sm" checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
        </div>
    );
}

/** 2〜4 個の排他的な選択肢 */
export function SegmentedControl<T extends string>({
    value,
    options,
    onChange,
    ariaLabel,
}: {
    value: T;
    options: ReadonlyArray<{ value: T; label: ReactNode }>;
    onChange: (value: T) => void;
    ariaLabel: string;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className="flex w-full gap-1 rounded-lg border border-line bg-sunken p-[3px]"
        >
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors [&_svg]:size-3.5',
                            selected ? 'bg-seg-active text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

/** 1 行に収まるラベル + スライダー + 値 */
export function SliderRow({
    label,
    value,
    min,
    max,
    step,
    format = String,
    disabled,
    onChange,
}: {
    label: ReactNode;
    value: number;
    min: number;
    max: number;
    step: number;
    format?: (value: number) => string;
    disabled?: boolean;
    onChange: (value: number) => void;
}) {
    return (
        <label className={cn('flex items-center gap-2', disabled && 'opacity-50')}>
            <span className="w-20 shrink-0 text-xs text-fg-muted">{label}</span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value))}
                className="min-w-0 flex-1"
            />
            <span className="num w-14 shrink-0 text-right text-xs text-fg-muted">{format(value)}</span>
        </label>
    );
}

/** パネル内の小さな数値入力に付けるクラス */
export const COMPACT_INPUT_CLASS = 'num h-7 bg-sunken pr-9 text-xs md:text-xs dark:bg-sunken';

/** 入力欄の右端に単位を重ねて表示する */
export function WithUnit({ unit, children }: { unit: string; children: ReactNode }) {
    return (
        <span className="relative block min-w-0 flex-1">
            {children}
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-fg-subtle">
                {unit}
            </span>
        </span>
    );
}
