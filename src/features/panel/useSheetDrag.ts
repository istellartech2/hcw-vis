import { useRef, useState, type PointerEvent } from 'react';

export type SheetSnap = 'half' | 'full';

/** これ以上ドラッグして離すと次のスナップ位置へ移る (px) */
const SNAP_THRESHOLD_PX = 60;
/** ヘッダーの押下をタップではなくドラッグとみなす移動量 (px) */
const DRAG_START_PX = 6;

/**
 * スマホのボトムシートの縦ドラッグ。上へドラッグで全画面、
 * 下へドラッグで半分 → 閉じる。ドラッグ中の移動量を dragOffset で返す。
 */
export function useSheetDrag(onClose: () => void) {
    const [snap, setSnap] = useState<SheetSnap>('half');
    const [dragOffset, setDragOffset] = useState<number | null>(null);
    const start = useRef<{ y: number; id: number; dragging: boolean } | null>(null);

    const onPointerDown = (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        start.current = { y: e.clientY, id: e.pointerId, dragging: false };
    };

    const onPointerMove = (e: PointerEvent<HTMLElement>) => {
        const s = start.current;
        if (!s || s.id !== e.pointerId) return;
        const dy = e.clientY - s.y;
        if (!s.dragging) {
            if (Math.abs(dy) < DRAG_START_PX) return;
            s.dragging = true;
            e.currentTarget.setPointerCapture(e.pointerId);
        }
        setDragOffset(dy);
    };

    const finish = (e: PointerEvent<HTMLElement>) => {
        const s = start.current;
        start.current = null;
        if (!s || s.id !== e.pointerId || !s.dragging) return;
        const dy = e.clientY - s.y;
        setDragOffset(null);
        if (dy < -SNAP_THRESHOLD_PX) {
            setSnap('full');
        } else if (dy > SNAP_THRESHOLD_PX) {
            if (snap === 'full' && dy < window.innerHeight * 0.45) {
                setSnap('half');
            } else {
                onClose();
                setSnap('half');
            }
        }
    };

    return {
        snap,
        setSnap,
        dragOffset,
        handleProps: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish },
    };
}
