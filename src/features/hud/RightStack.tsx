import { MiniMap } from './MiniMap';
import { ScenarioGuide } from './ScenarioGuide';

/**
 * 右上の操作ボタン（ViewControls）の下に、ミニマップと学習シナリオの観察のポイントを縦に並べる。
 * 列そのものは 3D ビューの操作を邪魔しないよう、中のカードだけがポインタを受け取る。
 */
export function RightStack() {
    return (
        <div className="pointer-events-none fixed top-[calc(76px+env(safe-area-inset-top,0px))] right-4 z-10 flex w-64 flex-col gap-3 max-md:right-3 max-md:w-[min(20rem,calc(100vw-24px))]">
            <MiniMap />
            <ScenarioGuide />
        </div>
    );
}
