import { HudPanel } from '@/components/hud-panel';

const AXES = [
    { name: 'R', color: '#FF6B6B', label: 'Radial', description: '地心→衛星' },
    { name: 'S', color: '#2ECC71', label: 'Along-track', description: '軌道進行方向' },
    { name: 'W', color: '#00BFFF', label: 'Cross-track', description: '軌道面垂直' },
];

/** RSW 座標軸の凡例（色は RenderingSystem の座標軸と一致させる） */
export function AxesLegend() {
    return (
        <HudPanel className="space-y-1 px-3 py-2 text-xs">
            {AXES.map((axis) => (
                <div key={axis.name} className="flex items-center gap-2">
                    <span className="h-0.5 w-4 rounded" style={{ backgroundColor: axis.color }} />
                    <span className="font-mono font-semibold">{axis.name}</span>
                    <span>{axis.label}</span>
                    <span className="text-muted-foreground">{axis.description}</span>
                </div>
            ))}
        </HudPanel>
    );
}
