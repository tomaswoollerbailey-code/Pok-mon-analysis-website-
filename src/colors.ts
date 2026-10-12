/** Diverging fill for a win rate: blue above 50%, red below, neutral grey at 50%. */
export function divergingFill(winRate: number): string {
  const t = Math.min(1, Math.abs(winRate - 0.5) / 0.25); // saturates at 25%/75%
  const pole = winRate >= 0.5 ? 'var(--div-pos)' : 'var(--div-neg)';
  return `color-mix(in oklab, ${pole} ${Math.round(t * 85)}%, var(--div-mid))`;
}
