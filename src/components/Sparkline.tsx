/** A tiny weekly-share line. Colour follows the direction of the change (up, down or flat). */
export function Sparkline({ values, trend, width = 72, height = 22 }: {
  values: (number | null)[];
  trend: 'up' | 'down' | 'flat';
  width?: number;
  height?: number;
}) {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null);
  if (pts.length < 2) return <svg className="spark" width={width} height={height} aria-hidden />;
  const max = Math.max(...pts.map((p) => p[1]), 0.0001);
  const x = (i: number) => 1 + (i / (values.length - 1)) * (width - 2);
  const y = (v: number) => height - 2 - (v / max) * (height - 4);
  const d = pts.map(([i, v], k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const [li, lv] = pts[pts.length - 1];
  return (
    <svg className={`spark ${trend}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(li)} cy={y(lv)} r="2.2" fill="currentColor" />
    </svg>
  );
}

/** Change in share as signed percentage points, e.g. "+1.2 pts". */
export function Delta({ value }: { value: number }) {
  const pts = value * 100;
  const dir = trendOf(value);
  return <span className={`delta ${dir}`}>{dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•'} {Math.abs(pts).toFixed(1)} pts</span>;
}

export const trendOf = (delta: number): 'up' | 'down' | 'flat' => (delta >= 0.0005 ? 'up' : delta <= -0.0005 ? 'down' : 'flat');
