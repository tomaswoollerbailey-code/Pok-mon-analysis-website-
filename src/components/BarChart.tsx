import type { ReactNode } from 'react';
import { useTooltip } from './Tooltip';

export interface Bar {
  id: string | number;
  label: string;
  value: number;
  valueLabel: string;
  href?: string;
  tip: ReactNode;
}

/** Horizontal single-series bar chart. One colour (slot 1); identity is carried by the row label. */
export function BarChart({ bars, max }: { bars: Bar[]; max?: number }) {
  const { ref, show, hide, node } = useTooltip();
  const top = max ?? Math.max(...bars.map((b) => b.value), 0) * 1.05;
  return (
    <div className="bar-chart" ref={ref} onMouseLeave={hide}>
      {bars.map((b) => (
        <div
          key={b.id}
          className="bar-row"
          onMouseMove={(e) => show(e, b.tip)}
          onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); show({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }, b.tip); }}
          onBlur={hide}
        >
          {b.href ? <a className="bar-label" href={b.href}>{b.label}</a> : <span className="bar-label">{b.label}</span>}
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${top ? (b.value / top) * 100 : 0}%` }} />
          </div>
          <span className="bar-value">{b.valueLabel}</span>
        </div>
      ))}
      {node}
    </div>
  );
}
