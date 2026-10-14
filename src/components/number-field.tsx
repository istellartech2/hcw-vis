import { useEffect, useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

type NumberFieldProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
    value: number;
    onValueChange: (value: number) => void;
};

/**
 * 数値入力。編集中の文字列（"-" や "0." など）を保持しつつ、
 * 有限な数値になったときだけ onValueChange を呼ぶ。
 */
export function NumberField({ value, onValueChange, onBlur, ...props }: NumberFieldProps) {
    const [text, setText] = useState(String(value));

    useEffect(() => {
        setText((current) => (parseFloat(current) === value ? current : String(value)));
    }, [value]);

    return (
        <Input
            type="number"
            inputMode="decimal"
            value={text}
            onChange={(e) => {
                setText(e.target.value);
                const parsed = parseFloat(e.target.value);
                if (Number.isFinite(parsed)) onValueChange(parsed);
            }}
            onBlur={(e) => {
                setText(String(value));
                onBlur?.(e);
            }}
            {...props}
        />
    );
}
