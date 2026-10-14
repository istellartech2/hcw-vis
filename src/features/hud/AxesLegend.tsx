import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { AXIS_COLORS } from '@/store/settings';

const AXES = [
    { name: 'R', color: AXIS_COLORS.r, label: 'Radial', description: '地心→衛星' },
    { name: 'S', color: AXIS_COLORS.s, label: 'Along-track', description: '進行方向' },
    { name: 'W', color: AXIS_COLORS.w, label: 'Cross-track', description: '軌道面垂直' },
];

/** RSW 座標軸の凡例（色は 3D の座標軸と共有） */
export function AxesLegend() {
    // パネルを開くと再生バーが右へずれるので、十分広い画面でなければ重ならないよう隠す
    const panelOpen = useAppStore((s) => s.ui.panelOpen);
    return (
        <div
            className={cn(
                'glass fixed right-3 bottom-[calc(14px+env(safe-area-inset-bottom,0px))] z-10 hidden space-y-0.5 rounded-[10px] px-2.5 py-2 text-[11px]',
                panelOpen ? '2xl:block' : 'lg:block',
            )}
        >
            {AXES.map((axis) => (
                <div key={axis.name} className="flex items-center gap-2">
                    <span className="h-0.5 w-3.5 rounded" style={{ backgroundColor: axis.color }} />
                    <span className="num w-2 font-semibold text-fg">{axis.name}</span>
                    <span className="text-fg-muted">{axis.label}</span>
                    <span className="text-fg-subtle">{axis.description}</span>
                </div>
            ))}
        </div>
    );
}
