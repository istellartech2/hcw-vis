import { useEffect, useRef, useState } from 'react';
import { formatLatLon } from '@/lib/geoFormat';
import { useUiTheme } from '@/lib/uiTheme';
import { useAppMode, useAppStore } from '@/store/appStore';
import type { GroundTrack, LatLon } from '@/simulation/groundTrack';

/** 背景の世界地図（正距円筒図法。左端が経度 -180°）。小さく表示するので、選択中のテクスチャによらず軽いものを使う */
const MAP_IMAGE_URL = `${import.meta.env.BASE_URL}asset/earth00.webp`;

/** 地図上の位置（0〜1） */
const toX = (longitude: number) => (longitude + 180) / 360;
const toY = (latitude: number) => (90 - latitude) / 180;

function useMapImage(): HTMLImageElement | null {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    useEffect(() => {
        const img = new Image();
        img.onload = () => setImage(img);
        img.src = MAP_IMAGE_URL;
        return () => {
            img.onload = null;
        };
    }, []);
    return image;
}

function drawMap(canvas: HTMLCanvasElement, image: HTMLImageElement | null, track: GroundTrack | null): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const style = getComputedStyle(document.documentElement);
    const token = (name: string) => style.getPropertyValue(name).trim();

    ctx.fillStyle = token('--sunken');
    ctx.fillRect(0, 0, w, h);
    if (image) ctx.drawImage(image, 0, 0, w, h);

    // 30° ごとの経緯線（赤道は少し濃く）
    ctx.strokeStyle = token('--fg');
    ctx.lineWidth = 0.5;
    for (let lon = -150; lon < 180; lon += 30) {
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.moveTo(toX(lon) * w, 0);
        ctx.lineTo(toX(lon) * w, h);
        ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
        ctx.globalAlpha = lat === 0 ? 0.3 : 0.12;
        ctx.beginPath();
        ctx.moveTo(0, toY(lat) * h);
        ctx.lineTo(w, toY(lat) * h);
        ctx.stroke();
    }

    if (track) {
        const strokeTrack = (segments: LatLon[][]) => {
            for (const segment of segments) {
                ctx.beginPath();
                segment.forEach((p, i) => {
                    const x = toX(p.longitude) * w;
                    const y = toY(p.latitude) * h;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
            }
        };
        ctx.strokeStyle = token('--brand');
        ctx.lineWidth = 1.5;
        // これまでの 1 周は実線、これからの 1 周は破線
        ctx.globalAlpha = 0.9;
        ctx.setLineDash([]);
        strokeTrack(track.past);
        ctx.globalAlpha = 0.65;
        ctx.setLineDash([3, 3]);
        strokeTrack(track.future);
        ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
}

/** 基準衛星の現在地。毎フレーム近く変わるので、この小さな要素だけで購読する */
function ReferenceMarker() {
    const position = useAppStore((s) => s.referenceInfo);
    if (!position) return null;
    return (
        <span
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${toX(position.longitude) * 100}%`, top: `${toY(position.latitude) * 100}%` }}
        >
            <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-60" />
            <span className="absolute inset-0 rounded-full border-[1.5px] border-fg bg-brand" />
        </span>
    );
}

function ReferenceLatLon() {
    const text = useAppStore(
        (s) => s.referenceInfo && formatLatLon(s.referenceInfo.latitude, s.referenceInfo.longitude),
    );
    return <span className="num text-fg">{text ?? '—'}</span>;
}

/** 右上のミニマップ。基準衛星の直下点と前後 1 周ずつの地上軌跡を世界地図上に示す（CSV 再生では使わない） */
export function MiniMap() {
    const mode = useAppMode();
    const show = useAppStore((s) => s.display.showMiniMap);
    if (mode === 'csv' || !show) return null;
    return <MiniMapCard />;
}

function MiniMapCard() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const image = useMapImage();
    const track = useAppStore((s) => s.groundTrack);
    const [theme] = useUiTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const draw = () => drawMap(canvas, image, track);
        draw();
        const observer = new ResizeObserver(draw);
        observer.observe(canvas);
        return () => observer.disconnect();
    }, [image, track, theme]);

    return (
        <section
            aria-label="ミニマップ（基準衛星の地上軌跡）"
            className="glass fixed top-[calc(60px+env(safe-area-inset-top,0px))] right-3 z-10 w-60 rounded-[12px] p-1.5 max-md:w-40"
        >
            <div className="relative aspect-[2/1] overflow-hidden rounded-[7px]">
                <canvas ref={canvasRef} className="block size-full" />
                <ReferenceMarker />
            </div>
            <div className="flex items-center justify-between gap-2 px-1 pt-1.5 pb-0.5 text-[11px] max-md:justify-center">
                <span className="text-fg-muted max-md:hidden">基準衛星の直下点</span>
                <ReferenceLatLon />
            </div>
        </section>
    );
}
