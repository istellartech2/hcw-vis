import { useEffect, useRef } from 'react';
import { SimulationEngine } from '@/engine/SimulationEngine';

interface ViewportProps {
    onEngineChange: (engine: SimulationEngine | null) => void;
}

/**
 * Three.js を描画するキャンバス。エンジンの生成と破棄を担当する。
 * UI のオーバーレイはこの要素の兄弟として配置し、カメラ操作と干渉しないようにする。
 */
export function Viewport({ onEngineChange }: ViewportProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const engine = new SimulationEngine(containerRef.current!, canvasRef.current!);
        onEngineChange(engine);
        if (import.meta.env.DEV) {
            (window as unknown as { engine?: SimulationEngine }).engine = engine;
        }
        return () => {
            onEngineChange(null);
            engine.dispose();
        };
    }, [onEngineChange]);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 touch-none bg-[radial-gradient(ellipse_at_center,_#0f172a_0%,_#000_100%)]"
        >
            <canvas ref={canvasRef} className="block size-full" />
        </div>
    );
}
