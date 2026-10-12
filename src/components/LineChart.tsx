import { useMemo, useState, type ReactNode } from 'react';
import { seriesVar } from '../colors';
import { useTooltip } from './Tooltip';

export interface LineSeries {
  id: number;
  label: string;
  slot: number;
  values: (number | null)[];
}

const W = 760, H = 320;

/** Multi-series line chart with a crosshair tooltip and end-of-line direct labels. */
export function LineChart({ x, series, xLabel, yFormat }: {
  x: string[];
  series: LineSeries[];
  xLabel: (v: string) => string;
  yFormat: (v: number) => string;
}) {
  const { ref, show, hide, node } = useTooltip();
  // Direct-label only small sets; larger sets rely on the legend.
  const direct = series.length <= 4;
  const M = { top: 12, right: direct ? 150 : 16, bottom: 28, left: 44 };
  const [hover, setHover] = useState<number | null>(null);
  const [yMax, yStep] = useMemo(() => {
    const m = Math.max(0.01, ...series.flatMap((s) => s.values.filter((v): v is number => v != null)));
    const step = m > 0.4 ? 0.1 : m > 0.2 ? 0.05 : m > 0.08 ? 0.02 : 0.01;
    return [Math.ceil(m / step) * step, step];
  }, [series]);
  const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
  const px = (i: number) => M.left + (x.length > 1 ? (i / (x.length - 1)) * iw : iw / 2);
  const py = (v: number) => M.top + ih - (v / yMax) * ih;
  const ticks = Array.from({ length: Math.round(yMax / yStep) + 1 }, (_, i) => i * yStep);
  const xTickEvery = Math.max(1, Math.ceil(x.length / 8));

  const path = (vals: (number | null)[]) => {
    let d = '', pen = false;
    vals.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  // Direct labels at each line's last point, nudged apart to avoid collisions.
  const labels = useMemo(() => {
    const ls = series.map((s) => {
      let i = s.values.length - 1;
      while (i >= 0 && s.values[i] == null) i--;
      return { s, y: i >= 0 ? py(s.values[i]!) : M.top };
    }).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ls.length; i++) if (ls[i].y - ls[i - 1].y < 14) ls[i].y = ls[i - 1].y + 14;
    return ls;
  }, [series, yMax, direct]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - svg.left) / svg.width) * W;
    const i = Math.max(0, Math.min(x.length - 1, Math.round(((rel - M.left) / iw) * (x.length - 1))));
    setHover(i);
    const rows: ReactNode = (
      <>
        <div className="tip-title">Week of {xLabel(x[i])}</div>
        {[...series].sort((a, b) => (b.values[i] ?? -1) - (a.values[i] ?? -1)).map((s) => (
          <div className="tip-row" key={s.id}>
            <span className="swatch" style={{ background: seriesVar(s.slot) }} />
            <span>{s.label}</span>
            <span className="tip-val">{s.values[i] == null ? '—' : yFormat(s.values[i]!)}</span>
          </div>
        ))}
      </>
    );
    show(e, rows);
  };

  return (
    <div className="chart-box" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className="line-chart" onMouseMove={onMove} onMouseLeave={() => { setHover(null); hide(); }} role="img" aria-label="Meta share by week">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left + iw} y1={py(t)} y2={py(t)} className={t === 0 ? 'axis' : 'grid'} />
            <text x={M.left - 8} y={py(t)} className="tick" textAnchor="end" dominantBaseline="middle">{yFormat(t)}</text>
          </g>
        ))}
        {x.map((v, i) => (i % xTickEvery === 0 || i === x.length - 1) && (
          <text key={v} x={px(i)} y={H - 8} className="tick" textAnchor="middle">{xLabel(v)}</text>
        ))}
        {hover != null && <line x1={px(hover)} x2={px(hover)} y1={M.top} y2={M.top + ih} className="crosshair" />}
        {series.map((s) => (
          <path key={s.id} d={path(s.values)} fill="none" stroke={seriesVar(s.slot)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {series.map((s) => s.values.map((v, i) => {
          const isolated = v != null && s.values[i - 1] == null && s.values[i + 1] == null;
          const show = v != null && (hover === i || isolated);
          return show ? <circle key={`${s.id}-${i}`} cx={px(i)} cy={py(v!)} r={4} fill={seriesVar(s.slot)} className="marker" /> : null;
        }))}
        {direct && labels.map(({ s, y }) => (
          <g key={s.id}>
            <line x1={M.left + iw + 6} x2={M.left + iw + 16} y1={y} y2={y} stroke={seriesVar(s.slot)} strokeWidth={2} strokeLinecap="round" />
            <text x={M.left + iw + 20} y={y} className="direct-label" dominantBaseline="middle">{s.label.length > 18 ? `${s.label.slice(0, 17)}…` : s.label}</text>
          </g>
        ))}
      </svg>
      {node}
    </div>
  );
}
