import { useRef } from 'react';
import { CircleAlert, CircleCheck, ExternalLink, FileUp, Info, Loader2, Shapes, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InfoGrid, SegmentedControl, SliderRow } from '@/components/controls';
import { PanelSection } from '@/components/panel-section';
import { useEngine } from '@/engine/EngineContext';
import { appStore, useAppStore, type FileStatus } from '@/store/appStore';
import { CSV_SAMPLES, type SatelliteShape } from '@/store/settings';
import { cn } from '@/lib/utils';

const FORMAT_DOC_URL = 'https://github.com/istellartech2/hcw-vis/blob/main/docs/csv-playback-format.md';

/** CSV 再生モードのデータ: 事前計算した 6DOF 時系列（CSV）の読み込みと衛星の見た目 */
export function CsvTab() {
    const active = useAppStore((s) => s.playback.active);
    return (
        <div>
            {!active && <CsvModeIntro />}
            <CsvFileSection />
            {active && <CsvDataSection />}
            {active && <ShapeSection />}
        </div>
    );
}

function CsvModeIntro() {
    return (
        <div className="mt-1 mb-3 flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-3 py-2.5 text-xs text-fg">
            <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
            <div className="space-y-1">
                <p className="font-medium">CSV 再生モード</p>
                <p className="text-fg-muted">
                    HCW 方程式による計算の代わりに、外部で計算した位置・姿勢（6DOF）の時系列を再生します。
                    衛星配置・軌道の設定は使いません。ファイルを読み込むと再生が始まります。
                </p>
            </div>
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
    const active = useAppStore((s) => s.playback.active);
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
            <Button
                variant={active ? 'secondary' : 'default'}
                className="w-full"
                onClick={() => inputRef.current?.click()}
            >
                <FileUp />
                {active ? '別の CSV ファイルを開く' : 'CSV ファイルを開く'}
            </Button>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs text-fg-subtle">サンプルで試す</span>
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
        </PanelSection>
    );
}

function ShapeSection() {
    const shape = useAppStore((s) => s.display.satelliteShape);
    const size = useAppStore((s) => s.display.satelliteSize);
    const setDisplay = appStore.getState().setDisplay;

    return (
        <PanelSection title="衛星の形状" icon={<Shapes />}>
            <p className="text-xs text-fg-muted">CSV には形状の情報がないため、ここで指定します。</p>
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
