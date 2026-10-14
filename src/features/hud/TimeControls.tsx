import { Pause, Play, Repeat, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HudPanel } from '@/components/hud-panel';
import { useEngine } from '@/engine/EngineContext';
import { formatSimTime } from '@/lib/format';
import { appStore, useAppStore } from '@/store/appStore';
import { TIME_SCALE_OPTIONS } from '@/store/settings';

function SpeedSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
    return (
        <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
            <SelectTrigger size="sm" className="w-24 border-none bg-transparent shadow-none" aria-label="時間倍率">
                <SelectValue>{value}x</SelectValue>
            </SelectTrigger>
            <SelectContent side="top">
                {TIME_SCALE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function SimulationTimeControls() {
    const engine = useEngine();
    const paused = useAppStore((s) => s.paused);
    const simTime = useAppStore((s) => s.simTime);
    const timeScale = useAppStore((s) => s.simulation.timeScale);

    return (
        <HudPanel className="flex items-center gap-1 p-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={paused ? '再開' : '一時停止'} onClick={() => engine.togglePause()}>
                        {paused ? <Play /> : <Pause />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{paused ? '再開' : '一時停止'} (Space)</TooltipContent>
            </Tooltip>
            <span className="min-w-28 px-1 text-center font-mono text-sm tabular-nums data-paused:text-muted-foreground" data-paused={paused || undefined}>
                {formatSimTime(simTime)}
            </span>
            <SpeedSelect value={timeScale} onChange={(v) => appStore.getState().setSimulation({ timeScale: v })} />
        </HudPanel>
    );
}

function CsvTransportControls() {
    const engine = useEngine();
    const playback = useAppStore((s) => s.playback);
    const paused = useAppStore((s) => s.paused);

    return (
        <HudPanel className="flex w-[min(36rem,calc(100vw-1.5rem))] items-center gap-2 p-1.5">
            <Badge variant="secondary" className="hidden sm:inline-flex">CSV</Badge>
            <Button variant="ghost" size="icon" aria-label={playback.isPlaying ? '一時停止' : '再生'} onClick={() => engine.togglePlaybackPlay()}>
                {playback.isPlaying ? <Pause /> : <Play />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="停止" onClick={() => engine.stopPlayback()}>
                <Square />
            </Button>
            <Slider
                className="min-w-0 flex-1"
                min={0}
                max={1}
                step={0.001}
                value={[playback.progress]}
                onValueChange={([progress]) => engine.seekPlayback(progress)}
                aria-label="再生位置"
            />
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {Math.round(playback.currentTime)} / {Math.round(playback.timeRange?.max ?? 0)} s
            </span>
            <Toggle size="sm" pressed={playback.loop} onPressedChange={(loop) => engine.setPlaybackLoop(loop)} aria-label="ループ再生">
                <Repeat />
            </Toggle>
            <SpeedSelect value={playback.speed} onChange={(v) => engine.setPlaybackSpeed(v)} />
            {paused && <Badge variant="outline">停止中</Badge>}
        </HudPanel>
    );
}

export function TimeControls() {
    const csvActive = useAppStore((s) => s.playback.active);
    return csvActive ? <CsvTransportControls /> : <SimulationTimeControls />;
}
