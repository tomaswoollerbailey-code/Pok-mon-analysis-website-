import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, fieldWinRates, shrunk } from '../src/lib/analysis';
import type { Dataset } from '../src/lib/types';

// A beats B 8-2, B beats C 8-2, C beats A 8-2 (rock-paper-scissors).
const games = (a: number, b: number, wins: number, losses: number) => [
  ...Array.from({ length: wins }, () => [0, a, b, 1] as [number, number, number, 1]),
  ...Array.from({ length: losses }, () => [0, a, b, -1] as [number, number, number, -1]),
];
const d: Dataset = {
  generatedAt: '', results: [],
  archetypes: [{ key: 'a', name: 'A' }, { key: 'b', name: 'B' }, { key: 'c', name: 'C' }],
  tournaments: [{ key: 't', source: 'online', id: 't', name: 't', date: '2026-10-01', format: 'STANDARD', players: 64, url: '' }],
  matches: [...games(0, 1, 8, 2), ...games(1, 2, 8, 2), ...games(2, 0, 8, 2)],
};

describe('fieldWinRates', () => {
  it('shrinks small samples toward 50%', () => {
    expect(shrunk(1, 0, 0)).toBeCloseTo(6 / 11);
    expect(shrunk(0, 0, 0)).toBe(0.5);
  });

  it('rewards the counter to the most popular deck', () => {
    // A field that is mostly B: A (which beats B) comes first, C (which loses to B) last.
    const r = fieldWinRates(d, DEFAULT_FILTERS, [{ archetype: 1, share: 0.8 }, { archetype: 2, share: 0.2 }], 0, [0, 1, 2]);
    expect(r.map((x) => x.archetype)).toEqual([0, 1, 2]);
    const a = r[0];
    expect(a.expected).toBeCloseTo(0.8 * shrunk(8, 2, 0) + 0.2 * shrunk(2, 8, 0));
    expect(a.coverage).toBeCloseTo(1);
  });

  it('counts mirrors as 50% and uses overall win rate for the rest of the field', () => {
    const [b] = fieldWinRates(d, DEFAULT_FILTERS, [{ archetype: 1, share: 0.5 }], 0.5, [1]);
    expect(b.vs[0].winRate).toBe(0.5);
    expect(b.vsOther).toBeCloseTo(shrunk(10, 10, 0)); // 2+8 wins, 8+2 losses
    expect(b.expected).toBeCloseTo(0.25 + 0.5 * shrunk(10, 10, 0));
  });
});
