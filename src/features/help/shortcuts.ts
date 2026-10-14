export interface ShortcutGroup {
    title: string;
    items: Array<{ keys: string[]; label: string }>;
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        title: 'シミュレーション',
        items: [
            { keys: ['Space'], label: '一時停止 / 再開' },
            { keys: ['R'], label: 't = 0 に戻す（衛星を初期配置へ）' },
            { keys: ['+'], label: '時間倍率を上げる' },
            { keys: ['-'], label: '時間倍率を下げる' },
            { keys: ['F'], label: '衛星配置を開く' },
        ],
    },
    {
        title: '表示',
        items: [
            { keys: ['V'], label: '視点をリセット' },
            { keys: ['G'], label: 'グリッド表示の切り替え' },
            { keys: ['E'], label: '地球表示の切り替え' },
            { keys: ['H'], label: 'このヘルプを表示' },
        ],
    },
    {
        title: '衛星選択時',
        items: [
            { keys: ['T'], label: '推力付加' },
            { keys: ['P'], label: '位置変更' },
            { keys: ['↑', '↓'], label: 'S軸方向に ±0.001 m/s' },
            { keys: ['←', '→'], label: 'R軸方向に ±0.001 m/s' },
            { keys: ['Shift', '↑ / ↓'], label: 'W軸方向に ±0.001 m/s' },
            { keys: ['Esc'], label: '選択解除' },
        ],
    },
    {
        title: 'マウス',
        items: [
            { keys: ['クリック'], label: '衛星を選択' },
            { keys: ['ドラッグ'], label: 'カメラ回転' },
            { keys: ['スクロール'], label: 'ズーム' },
        ],
    },
];
