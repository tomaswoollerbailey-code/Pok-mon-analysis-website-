import { useRef } from 'react';

export const SERIES_SLOTS = 8;
export const seriesVar = (slot: number) => `var(--series-${slot + 1})`;

/**
 * Colour follows the entity: an archetype keeps its slot while it stays on
 * screen, and newcomers take the first free slot, so filtering never repaints
 * the survivors.
 */
export function useStableSlots(ids: number[]): Map<number, number> {
  const ref = useRef(new Map<number, number>());
  const prev = ref.current;
  const next = new Map<number, number>();
  for (const id of ids) if (prev.has(id)) next.set(id, prev.get(id)!);
  const used = new Set(next.values());
  for (const id of ids) {
    if (next.has(id)) continue;
    let slot = 0;
    while (used.has(slot)) slot++;
    next.set(id, slot);
    used.add(slot);
  }
  ref.current = next;
  return next;
}

/** Diverging fill for a win rate: blue above 50%, red below, neutral grey at 50%. */
export function divergingFill(winRate: number): string {
  const t = Math.min(1, Math.abs(winRate - 0.5) / 0.25); // saturates at 25%/75%
  const pole = winRate >= 0.5 ? 'var(--div-pos)' : 'var(--div-neg)';
  return `color-mix(in oklab, ${pole} ${Math.round(t * 85)}%, var(--div-mid))`;
}
