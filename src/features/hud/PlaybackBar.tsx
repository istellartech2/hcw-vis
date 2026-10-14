import { ChevronsLeft, ChevronsRight, FileUp, Pause, Play, Repeat, SkipBack, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEngine } from '@/engine/EngineContext';
import { formatSimTime } from '@/lib/format';
import { orbitPeriodMinutes } from '@/simulation/OrbitElements';
import { appStore, useAppMode, useAppStore } from '@/store/appStore';
import { TIME_SCALE_OPTIONS } from '@/store/settings';
import { cn } from '@/lib/utils';

const SPEEDS = TIME_SCALE_OPTIONS.map((o) => o.value);

/** 再生／一時停止。ブランド色の丸ボタン */
function PlayButton({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
    const label = playing ? '一時停止' : '再生';
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    onClick={onToggle}
                    className={cn(
                        'inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                        // 停止中は塗りを外して見た目でも区別する（アイコンの違いだけだと気づきにくい）
                        playing
                            ? 'bg-brand text-brand-fg hover:bg-brand-hover'
                            : 'bg-raised text-brand ring-1 ring-brand ring-inset hover:bg-sunken',
                    )}
                >
                    {playing ? (
                        <Pause className="size-4 fill-current" />
                    ) : (
                        <Play className="size-4 translate-x-px fill-current" />
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent>{label} (Space)</TooltipContent>
        </Tooltip>
    );
}

/** « 180× » の速度ステッパー */
function SpeedStepper({
    value,
    onChange,
    compactOnMobile = false,
}: {
    value: number;
    onChange: (value: number) => void;
    /** スマホ幅では « » を隠して倍率の選択だけにする */
    compactOnMobile?: boolean;
}) {
    const index = Math.max(0, SPEEDS.indexOf(value));
    const step = (delta: number) => onChange(SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, index + delta))]);
    return (
        <div className="flex shrink-0 items-center">
            <Button
                variant="ghost"
                size="icon"
                className={cn('rounded-full text-fg-muted', compactOnMobile && 'max-md:hidden')}
                aria-label="遅くする (-)"
                disabled={index === 0}
                onClick={() => step(-1)}
            >
                <ChevronsLeft />
            </Button>
            <select
                aria-label="時間倍率"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="num w-16 cursor-pointer appearance-none rounded-md bg-transparent py-1 text-center text-[13px] font-medium text-fg [text-align-last:center] hover:bg-raised-hover focus-visible:outline-2 focus-visible:outline-brand"
            >
                {TIME_SCALE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-surface-solid text-fg">
                        {o.value}×
                    </option>
                ))}
            </select>
            <Button
                variant="ghost"
                size="icon"
                className={cn('rounded-full text-fg-muted', compactOnMobile && 'max-md:hidden')}
                aria-label="速くする (+)"
                disabled={index === SPEEDS.length - 1}
                onClick={() => step(1)}
            >
                <ChevronsRight />
            </Button>
        </div>
    );
}

function Divider() {
    return <div aria-hidden className="mx-1 my-1.5 w-px self-stretch bg-line-strong" />;
}

function SimulationBar() {
    const engine = useEngine();
    const paused = useAppStore((s) => s.paused);
    const simTime = useAppStore((s) => s.simTime);
    const timeScale = useAppStore((s) => s.simulation.timeScale);
    const periodMinutes = useAppStore((s) => orbitPeriodMinutes(s.orbit.altitudeKm));
    const orbits = simTime / (periodMinutes * 60);

    return (
        <>
            <PlayButton playing={!paused} onToggle={() => engine.togglePause()} />
            <SpeedStepper value={timeScale} onChange={(v) => appStore.getState().setSimulation({ timeScale: v })} />
            <Divider />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-fg-muted"
                        aria-label="t = 0 に戻す"
                        onClick={() => engine.resetPositions()}
                    >
                        <SkipBack className="fill-current" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>t = 0 に戻す（衛星を初期配置へ） (R)</TooltipContent>
            </Tooltip>
            <div className="num min-w-[7.5rem] text-xs leading-tight" aria-label="シミュレーション経過時間">
                <div className={cn('font-medium text-fg', paused && 'text-fg-muted')}>{formatSimTime(simTime)}</div>
                {paused ? (
                    <div className="font-medium text-warning">一時停止中</div>
                ) : (
                    <div className="text-fg-subtle">{`${orbits.toFixed(2)} 周回`}</div>
                )}
            </div>
        </>
    );
}

function CsvBar() {
    const engine = useEngine();
    const playback = useAppStore((s) => s.playback);
    const max = playback.timeRange?.max ?? 0;

    return (
        <>
            <PlayButton playing={playback.isPlaying} onToggle={() => engine.togglePlaybackPlay()} />
            <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-fg-muted"
                aria-label="停止して先頭へ"
                onClick={() => engine.stopPlayback()}
            >
                <Square className="size-3.5 fill-current" />
            </Button>
            <Slider
                className="mx-1 min-w-16 flex-1 md:w-64 md:flex-[0_1_auto]"
                min={0}
                max={1}
                step={0.001}
                value={[playback.progress]}
                onValueChange={([progress]) => engine.seekPlayback(progress)}
                aria-label="再生位置"
            />
            <span className="num shrink-0 text-xs text-fg-muted">
                <span className="text-fg">{playback.currentTime.toFixed(0)}</span>
                <span className="max-md:hidden"> / {max.toFixed(0)}</span> s
            </span>
            <Divider />
            <Button
                variant="ghost"
                size="icon"
                aria-pressed={playback.loop}
                aria-label="ループ再生"
                className={cn('rounded-full text-fg-subtle', playback.loop && 'bg-brand-soft text-brand-text')}
                onClick={() => engine.setPlaybackLoop(!playback.loop)}
            >
                <Repeat />
            </Button>
            <SpeedStepper value={playback.speed} onChange={(v) => engine.setPlaybackSpeed(v)} compactOnMobile />
        </>
    );
}

/** CSV 再生モードを選んだが、まだファイルを読み込んでいないとき */
function CsvEmptyBar() {
    return (
        <>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-text">
                CSV
            </span>
            <span className="px-1 text-xs text-fg-muted">ファイル未読み込み</span>
            <Button
                size="sm"
                className="rounded-full"
                onClick={() => appStore.getState().setUI({ panelOpen: true, panelTab: 'csv' })}
            >
                <FileUp />
                開く
            </Button>
        </>
    );
}

/** 画面下中央の再生コントロール。CSV 再生モードでは再生位置のシークに切り替わる */
export function PlaybackBar() {
    const mode = useAppMode();
    const csvActive = useAppStore((s) => s.playback.active);
    return (
        <div
            role="group"
            aria-label="再生コントロール"
            className="hud-bottom-center glass flex items-center justify-between gap-1.5 rounded-full py-[5px] pr-2 pl-[5px] text-fg select-none max-md:justify-between"
        >
            {csvActive ? <CsvBar /> : mode === 'csv' ? <CsvEmptyBar /> : <SimulationBar />}
        </div>
    );
}
