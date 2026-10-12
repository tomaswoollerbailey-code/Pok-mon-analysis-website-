import { describe, expect, it } from 'vitest';
import { weeklyReport } from '../src/lib/analysis';
import { buildDataset } from '../src/lib/build';
import { pageMeta } from '../src/lib/seo';
import type { RawTournament } from '../src/lib/types';

/** One event per day: Deck Alpha fades while Deck Beta takes over. */
function event(day: number, alpha: number, beta: number): RawTournament {
  const decks = [...Array(alpha).fill('Deck Alpha'), ...Array(beta).fill('Deck Beta')];
  return {
    source: 'online', id: `o${day}`, name: `Test event ${day}`, date: `2026-10-${String(day).padStart(2, '0')}`, format: 'STANDARD',
    players: decks.length, url: '', fetchedAt: '',
    standings: decks.map((name, i) => ({ playerId: `p${i}`, name: `p${i}`, placing: i + 1, record: { wins: 1, losses: 0, ties: 0 }, archetype: { name } })),
  };
}

describe('weeklyReport', () => {
  const raw = [...[1, 2, 3, 4, 5, 6, 7].map((d) => event(d, 30, 10)), ...[8, 9, 10, 11, 12, 13, 14].map((d) => event(d, 10, 30))];
  const { dataset: d } = buildDataset(raw, 'now');
  const r = weeklyReport(d)!;

  it('covers the latest seven days and compares with the week before', () => {
    expect(r.from).toBe('2026-10-08');
    expect(r.to).toBe('2026-10-14');
    expect(r.events).toBe(7);
    const beta = r.top[0];
    expect(d.archetypes[beta.archetype].name).toBe('Deck Beta');
    expect(beta.share).toBeCloseTo(0.75);
    expect(beta.delta).toBeCloseTo(0.5);
  });

  it('lists risers and fallers and each event winner', () => {
    expect(r.risers.map((m) => d.archetypes[m.archetype].name)).toEqual(['Deck Beta']);
    expect(r.fallers.map((m) => d.archetypes[m.archetype].name)).toEqual(['Deck Alpha']);
    expect(r.winners).toHaveLength(7);
    expect(r.totalEvents).toBe(7);
  });

  it('returns null without events and feeds the page text', () => {
    expect(weeklyReport({ ...d, tournaments: [], results: [], matches: [] })).toBeNull();
    const m = pageMeta(d, { page: 'report' });
    expect(m.title).toContain('2026-10-08 to 2026-10-14');
    expect(m.summary.join(' ')).toContain('Deck Beta led the online meta with 75.0%');
  });
});
