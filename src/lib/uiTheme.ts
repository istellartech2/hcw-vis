import { useCallback, useState } from 'react';

/** UI（パネル・ダイアログ・HUD）の配色。3D シーンの背景とは独立 */
export type UiTheme = 'dark' | 'light';

const STORAGE_KEY = 'hcw-ui-theme';

/** <html data-theme> に適用中のテーマ（初回描画前に index.html が設定する） */
export function getUiTheme(): UiTheme {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function applyUiTheme(theme: UiTheme): void {
    document.documentElement.dataset.theme = theme;
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // プライベートモードなどで保存できなくても、このセッションには適用される
    }
}

export function useUiTheme(): [UiTheme, (theme: UiTheme) => void] {
    const [theme, setTheme] = useState<UiTheme>(getUiTheme);
    const update = useCallback((next: UiTheme) => {
        applyUiTheme(next);
        setTheme(next);
    }, []);
    return [theme, update];
}
