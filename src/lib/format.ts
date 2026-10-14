/** シミュレーション時刻を「1日2時間03分04秒」形式で表示する */
export function formatSimTime(seconds: number): string {
    const total = Math.floor(seconds);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const secs = String(total % 60).padStart(2, '0');

    if (days > 0) return `${days}日${hours}時間${minutes}分${secs}秒`;
    if (hours > 0) return `${hours}時間${minutes}分${secs}秒`;
    return `${minutes}分${secs}秒`;
}

/** 軌道周期（分）を表示用に整形する */
export function formatPeriod(periodMinutes: number): string {
    const hours = Math.floor(periodMinutes / 60);
    if (hours > 0) return `${hours}時間${(periodMinutes % 60).toFixed(1)}分`;
    return `${periodMinutes.toFixed(1)}分`;
}
