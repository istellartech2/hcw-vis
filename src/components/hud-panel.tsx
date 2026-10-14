import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** 3D ビュー上に重ねる半透明パネルの共通スタイル */
export function HudPanel({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            className={cn(
                'pointer-events-auto rounded-xl border border-border/60 bg-background/70 text-foreground shadow-lg backdrop-blur-md',
                className,
            )}
            {...props}
        />
    );
}
