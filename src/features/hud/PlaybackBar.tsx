import { ChevronsLeft, ChevronsRight, Pause, Play, Repeat, RotateCcw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEngine } from '@/engine/EngineContext';
import { formatSimTime } from '@/lib/format';
import { appStore, useAppStore } from '@/store/appStore';
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
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-brand-fg transition-colors hover:bg-brand-hover focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
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
function SpeedStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
    const index = Math.max(0, SPEEDS.indexOf(value));
    const step = (delta: number) => onChange(SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, index + delta))]);
    return (
        <div className="flex items-center">
            <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-fg-muted"
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
                className="rounded-full text-fg-muted"
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
    const periodMinutes = useAppStore((s) => s.referenceInfo?.orbit.periodMinutes);
    const orbits = periodMinutes ? simTime / (periodMinutes * 60) : null;

    return (
        <>
            <PlayButton playing={!paused} onToggle={() => engine.togglePause()} />
            <SpeedStepper value={timeScale} onChange={(v) => appStore.getState().setSimulation({ timeScale: v })} />
            <Divider />
            <div className="num min-w-[7.5rem] text-xs leading-tight" aria-label="シミュレーション経過時間">
                <div className={cn('font-medium text-fg', paused && 'text-fg-muted')}>{formatSimTime(simTime)}</div>
                <div className="text-fg-subtle">{orbits === null ? '—' : `${orbits.toFixed(2)} 周回`}</div>
            </div>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-fg-muted"
                        aria-label="初期位置に戻す"
                        onClick={() => engine.resetPositions()}
                    >
                        <RotateCcw />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>初期位置に戻す (R)</TooltipContent>
            </Tooltip>
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
                className="mx-1 w-[min(16rem,30vw)]"
                min={0}
                max={1}
                step={0.001}
                value={[playback.progress]}
                onValueChange={([progress]) => engine.seekPlayback(progress)}
                aria-label="再生位置"
            />
            <span className="num shrink-0 text-xs text-fg-muted">
                <span className="text-fg">{playback.currentTime.toFixed(0)}</span> / {max.toFixed(0)} s
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
            <SpeedStepper value={playback.speed} onChange={(v) => engine.setPlaybackSpeed(v)} />
        </>
    );
}

/** 画面下中央の再生コントロール。CSV 再生中は再生位置のシークに切り替わる */
export function PlaybackBar() {
    const csvActive = useAppStore((s) => s.playback.active);
    return (
        <div
            role="group"
            aria-label="再生コントロール"
            className="hud-bottom-center glass flex items-center justify-between gap-1.5 rounded-full py-[5px] pr-2 pl-[5px] text-fg select-none max-md:justify-between"
        >
            {csvActive ? <CsvBar /> : <SimulationBar />}
        </div>
    );
}
