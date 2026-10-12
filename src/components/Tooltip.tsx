import { useCallback, useRef, useState, type ReactNode } from 'react';

export interface TipState { x: number; y: number; content: ReactNode }

/** Hover layer: positions a tooltip inside a relative container, flipping near the right edge. */
export function useTooltip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const show = useCallback((e: { clientX: number; clientY: number }, content: ReactNode) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, content });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  const node = tip ? (
    <div
      className="tooltip"
      role="status"
      style={{
        left: tip.x,
        top: tip.y,
        transform: `translate(${tip.x > (ref.current?.clientWidth ?? 0) * 0.6 ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
    >
      {tip.content}
    </div>
  ) : null;
  return { ref, show, hide, node };
}
