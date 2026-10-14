import { useRef } from 'react';
import { CircleAlert, CircleCheck, ExternalLink, FileUp, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldDescription, FieldGroup, FieldLegend, FieldSeparator, FieldSet } from '@/components/ui/field';
import { useEngine } from '@/engine/EngineContext';
import { useAppStore, type FileStatus } from '@/store/appStore';
import { CSV_SAMPLES } from '@/store/settings';
import { cn } from '@/lib/utils';

const FORMAT_DOC_URL = 'https://github.com/istellartech2/hcw-vis/blob/main/docs/csv-playback-format.md';

function StatusMessage({ status }: { status: FileStatus }) {
    const Icon = status.kind === 'loading' ? Loader2 : status.kind === 'success' ? CircleCheck : CircleAlert;
    return (
        <div
            className={cn(
                'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                status.kind === 'loading' && 'border-sky-500/30 bg-sky-500/10 text-sky-300',
                status.kind === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                status.kind === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive'
            )}
        >
            <Icon className={cn('mt-0.5 size-4 shrink-0', status.kind === 'loading' && 'animate-spin')} />
            <span className="break-all">{status.message}</span>
        </div>
    );
}

export function PlaybackTab() {
    const engine = useEngine();
    const playback = useAppStore((s) => s.playback);
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <FieldGroup>
            <FieldSet>
                <FieldLegend>CSVファイル</FieldLegend>
                <FieldDescription>
                    事前計算した位置・姿勢（6DOF）の時系列を再生します。{' '}
                    <a href={FORMAT_DOC_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5">
                        ファイル形式<ExternalLink className="size-3" />
                    </a>
                </FieldDescription>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void engine.loadCsvFile(file);
                        e.target.value = '';
                    }}
                />
                <Button variant="secondary" className="w-full" onClick={() => inputRef.current?.click()}>
                    <FileUp />
                    CSVファイルを選択
                </Button>
                <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">サンプル:</span>
                    {CSV_SAMPLES.map((sample) => (
                        <Button key={sample.path} variant="link" size="xs" className="h-auto p-0" onClick={() => void engine.loadCsvSample(sample.path)}>
                            {sample.label}
                        </Button>
                    ))}
                </div>
                {playback.fileStatus && <StatusMessage status={playback.fileStatus} />}
            </FieldSet>

            {playback.active && playback.timeRange && (
                <>
                    <FieldSeparator />
                    <FieldSet>
                        <FieldLegend>データ情報</FieldLegend>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                            <dt className="text-muted-foreground">衛星数</dt>
                            <dd className="tabular-nums">{playback.satelliteCount}</dd>
                            <dt className="text-muted-foreground">データ点数</dt>
                            <dd className="tabular-nums">{playback.dataPoints}</dd>
                            <dt className="text-muted-foreground">時間範囲</dt>
                            <dd className="tabular-nums">{playback.timeRange.min.toFixed(1)} – {playback.timeRange.max.toFixed(1)} s</dd>
                        </dl>
                        <FieldDescription>再生操作は画面下部のコントロールから行えます。</FieldDescription>
                        <Button variant="outline" onClick={() => engine.exitPlayback()}>
                            <LogOut />
                            再生モードを終了
                        </Button>
                    </FieldSet>
                </>
            )}
        </FieldGroup>
    );
}
