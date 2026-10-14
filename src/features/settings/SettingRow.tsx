import type { ReactNode } from 'react';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';

/** ラベル + スイッチの1行 */
export function SwitchRow({
    id,
    label,
    description,
    checked,
    disabled,
    onCheckedChange,
}: {
    id: string;
    label: ReactNode;
    description?: ReactNode;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <Field orientation="horizontal" data-disabled={disabled || undefined}>
            <FieldContent>
                <FieldLabel htmlFor={id}>{label}</FieldLabel>
                {description && <FieldDescription>{description}</FieldDescription>}
            </FieldContent>
            <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
        </Field>
    );
}

/** 単位つきラベル */
export function UnitLabel({ children, unit }: { children: ReactNode; unit: string }) {
    return (
        <>
            {children}
            <span className="text-xs font-normal text-muted-foreground">({unit})</span>
        </>
    );
}
