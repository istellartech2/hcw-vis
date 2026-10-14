import { useSyncExternalStore } from 'react';

/** UI（パネル・ダイアログ・HUD）の配色。3D シーンの背景とは独立 */
export type UiTheme = 'dark' | 'light';

const STORAGE_KEY = 'hcw-ui-theme';
const listeners = new Set<() => void>();

/** <html data-theme> に適用中のテーマ（初回描画前に index.html が設定する） */
export function getUiTheme(): UiTheme {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function setUiTheme(theme: UiTheme): void {
    document.documentElement.dataset.theme = theme;
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // プライベートモードなどで保存できなくても、このセッションには適用される
    }
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** 現在のテーマと変更関数。どのコンポーネントから変更しても全購読者が再描画される */
export function useUiTheme(): [UiTheme, (theme: UiTheme) => void] {
    return [useSyncExternalStore(subscribe, getUiTheme), setUiTheme];
}
