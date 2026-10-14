import { useRef } from 'react';
import { CircleAlert, CircleCheck, ExternalLink, FileUp, Loader2, LogOut, Shapes, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InfoGrid, SegmentedControl, SliderRow } from '@/components/controls';
import { PanelSection } from '@/components/panel-section';
import { useEngine } from '@/engine/EngineContext';
import { appStore, useAppStore, type FileStatus } from '@/store/appStore';
import { CSV_SAMPLES, type SatelliteShape } from '@/store/settings';
import { cn } from '@/lib/utils';

const FORMAT_DOC_URL = 'https://github.com/istellartech2/hcw-vis/blob/main/docs/csv-playback-format.md';

/** 再生: 事前計算した 6DOF 時系列（CSV）の再生 */
export function PlaybackTab() {
    const active = useAppStore((s) => s.playback.active);
    return (
        <div>
            <CsvFileSection />
            {active && <CsvDataSection />}
            <ShapeSection />
        </div>
    );
}

function StatusMessage({ status }: { status: FileStatus }) {
    const Icon = status.kind === 'loading' ? Loader2 : status.kind === 'success' ? CircleCheck : CircleAlert;
    return (
        <div
            className={cn(
                'flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs',
                status.kind === 'loading' && 'border-info/30 bg-info-soft text-fg',
                status.kind === 'success' && 'border-success/30 bg-success-soft text-fg',
                status.kind === 'error' && 'border-danger/40 bg-danger-soft text-danger',
            )}
        >
            <Icon
                className={cn(
                    'mt-0.5 size-3.5 shrink-0',
                    status.kind === 'loading' && 'animate-spin text-info',
                    status.kind === 'success' && 'text-success',
                )}
            />
            <span className="break-all">{status.message}</span>
        </div>
    );
}

function CsvFileSection() {
    const engine = useEngine();
    const fileStatus = useAppStore((s) => s.playback.fileStatus);
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <PanelSection
            title="CSV ファイル"
            icon={<FileUp />}
            action={
                <Button variant="link" size="xs" className="h-auto px-0 text-fg-muted" asChild>
                    <a href={FORMAT_DOC_URL} target="_blank" rel="noopener noreferrer">
                        形式
                        <ExternalLink />
                    </a>
                </Button>
            }
        >
            <p className="text-xs text-fg-muted">事前計算した位置・姿勢（6DOF）の時系列を読み込んで再生します。</p>
            <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void engine.loadCsvFile(file);
                    e.target.value = '';
                }}
            />
            <Button variant="secondary" className="w-full" onClick={() => inputRef.current?.click()}>
                <FileUp />
                CSV ファイルを選択
            </Button>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs text-fg-subtle">サンプル</span>
                {CSV_SAMPLES.map((sample) => (
                    <Button
                        key={sample.path}
                        variant="link"
                        size="xs"
                        className="h-auto px-0 text-brand-text"
                        onClick={() => void engine.loadCsvSample(sample.path)}
                    >
                        {sample.label}
                    </Button>
                ))}
            </div>
            {fileStatus && <StatusMessage status={fileStatus} />}
        </PanelSection>
    );
}

function CsvDataSection() {
    const engine = useEngine();
    const playback = useAppStore((s) => s.playback);

    return (
        <PanelSection title="読み込んだデータ" icon={<Table2 />}>
            <div className="rounded-lg border border-line bg-sunken px-2.5 py-2">
                <InfoGrid
                    rows={[
                        ['衛星数', playback.satelliteCount],
                        ['データ点数', playback.dataPoints],
                        [
                            '時間範囲',
                            playback.timeRange
                                ? `${playback.timeRange.min.toFixed(1)} – ${playback.timeRange.max.toFixed(1)} s`
                                : '—',
                        ],
                    ]}
                />
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => engine.exitPlayback()}>
                <LogOut />
                再生をやめてシミュレーションに戻る
            </Button>
        </PanelSection>
    );
}

function ShapeSection() {
    const shape = useAppStore((s) => s.display.satelliteShape);
    const size = useAppStore((s) => s.display.satelliteSize);
    const setDisplay = appStore.getState().setDisplay;

    return (
        <PanelSection title="衛星の形状" icon={<Shapes />}>
            <p className="text-xs text-fg-muted">
                CSV の衛星にはフォーメーションの形状情報がないため、ここで指定します。
            </p>
            <SegmentedControl<SatelliteShape>
                ariaLabel="衛星の形状"
                value={shape === '3dfile' ? 'cube' : shape}
                options={[
                    { value: 'sphere', label: '球' },
                    { value: 'cube', label: '立方体（姿勢を表示）' },
                ]}
                onChange={(satelliteShape) => setDisplay({ satelliteShape })}
            />
            <SliderRow
                label="大きさ"
                min={0.1}
                max={5}
                step={0.1}
                value={size}
                format={(v) => `${v.toFixed(1)} m`}
                onChange={(satelliteSize) => setDisplay({ satelliteSize })}
            />
        </PanelSection>
    );
}
