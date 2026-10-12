import { describe, expect, it } from 'vitest';
import { cardUsage, DEFAULT_FILTERS, matchupMatrix, metaSummary, metaTrend, weekStart, type Filters } from '../src/lib/analysis';
import { archetypeKey } from '../src/lib/archetype';
import { buildDataset } from '../src/lib/build';
import type { RawStanding, RawTournament } from '../src/lib/types';

const st = (id: string, placing: number, deck: string | null, w = 0, l = 0, t = 0, decklist?: RawStanding['decklist']): RawStanding => ({
  playerId: id, name: id, placing, record: { wins: w, losses: l, ties: t }, archetype: deck ? { name: deck } : null, ...(decklist ? { decklist } : {}),
});

const online: RawTournament = {
  source: 'online', id: 'o1', name: 'Online', date: '2026-10-07', format: 'STANDARD', players: 4, url: '', fetchedAt: '',
  standings: [
    st('a', 1, 'Charizard Pidgeot', 3, 0, 0, [{ category: 'pokemon', name: 'Charizard ex', set: 'OBF', number: '125', count: 3 }, { category: 'trainer', name: 'Rare Candy', count: 4 }]),
    st('b', 2, 'Gardevoir ex', 2, 1, 0, [{ category: 'trainer', name: 'Rare Candy', count: 3 }]),
    st('c', 3, 'Charizard  Pidgeot', 1, 1, 1, [{ category: 'pokemon', name: 'Charizard ex', set: 'OBF', number: '125', count: 2 }]),
    st('d', 4, null, 0, 3, 0),
  ],
  matches: [
    { round: 1, p1: 'a', p2: 'b', winner: 'a' },
    { round: 1, p1: 'c', p2: 'd', winner: 'c' }, // unknown archetype → dropped
    { round: 2, p1: 'b', p2: 'c', winner: 'tie' },
    { round: 2, p1: 'a', p2: 'c', winner: 'a' }, // mirror → dropped
    { round: 3, p1: 'b', p2: null, winner: 'b' }, // bye → dropped
  ],
};
const offline: RawTournament = {
  source: 'offline', id: 'f1', name: 'Regional', date: '2026-09-28', format: 'STANDARD', players: 20, url: '', fetchedAt: '',
  standings: [st('0', 1, 'Gardevoir ex'), st('1', 9, 'Gardevoir ex'), st('2', 12, 'Charizard Pidgeot')],
};

const { dataset: d, lists } = buildDataset([offline, online], 'now');
const idx = (name: string) => d.archetypes.findIndex((a) => a.key === archetypeKey(name));
const F = (over: Partial<Filters> = {}): Filters => ({ ...DEFAULT_FILTERS, ...over });

describe('buildDataset', () => {
  it('merges archetype spellings and orders tournaments newest first', () => {
    expect(d.archetypes.map((a) => a.name).sort()).toEqual(['Charizard Pidgeot', 'Gardevoir ex']);
    expect(d.tournaments.map((t) => t.key)).toEqual(['online-o1', 'offline-f1']);
    expect(d.results).toHaveLength(7);
  });

  it('keeps only non-mirror matches between known archetypes', () => {
    const z = idx('Charizard Pidgeot'), g = idx('Gardevoir ex');
    expect(d.matches).toEqual([[0, z, g, 1], [0, g, z, 0]]);
  });
});

describe('metaSummary', () => {
  it('computes share, conversion and win rate for one source', () => {
    const m = metaSummary(d, F({ source: 'online', topCut: 'top8' }));
    expect(m).toMatchObject({ tournaments: 1, players: 4, identified: 3, topCutSlots: 3 });
    const zard = m.rows.find((r) => r.archetype === idx('Charizard Pidgeot'))!;
    expect(zard).toMatchObject({ players: 2, topCut: 2, wins: 1, losses: 0, ties: 1, wins1st: 1 });
    expect(zard.share).toBeCloseTo(2 / 3);
    expect(zard.conversion).toBe(1);
    expect(zard.winRate).toBeCloseTo(1.5 / 2); // from non-mirror pairings: beat Gardevoir, tied once
    const gard = m.rows.find((r) => r.archetype === idx('Gardevoir ex'))!;
    expect(gard.winRate).toBeCloseTo(0.5 / 2);
  });

  it('never mixes sources', () => {
    const m = metaSummary(d, F({ source: 'offline' }));
    expect(m).toMatchObject({ tournaments: 1, players: 3 });
    expect(m.rows.every((r) => r.winRate == null)).toBe(true); // in-person events have no pairings
  });

  it('filters by source and top 10%', () => {
    const m = metaSummary(d, F({ source: 'offline', topCut: 'top10pct' }));
    expect(m.tournaments).toBe(1);
    expect(m.topCutSlots).toBe(1); // 10% of 20 = 2 → only placing 1 qualifies
  });
});

describe('metaTrend', () => {
  it('buckets by ISO week', () => {
    expect(weekStart('2026-10-11')).toBe('2026-10-05');
    expect(weekStart('2026-10-05')).toBe('2026-10-05');
    const online = metaTrend(d, F({ source: 'online' }), [idx('Gardevoir ex')]);
    expect(online.weeks).toEqual(['2026-10-05']);
    expect(online.series[0].values[0]).toBeCloseTo(1 / 3);
    const offline = metaTrend(d, F({ source: 'offline' }), [idx('Gardevoir ex')]);
    expect(offline.weeks).toEqual(['2026-09-28']);
    expect(offline.series[0].values[0]).toBeCloseTo(2 / 3);
  });
});

describe('matchupMatrix', () => {
  it('is symmetric', () => {
    const z = idx('Charizard Pidgeot'), g = idx('Gardevoir ex');
    const m = matchupMatrix(d, F(), [z, g]);
    expect(m[0][1]).toMatchObject({ wins: 1, losses: 0, ties: 1, games: 2, winRate: 0.75 });
    expect(m[1][0]).toMatchObject({ wins: 0, losses: 1, ties: 1, games: 2, winRate: 0.25 });
    expect(m[0][0].games).toBe(0);
  });
});

describe('cardUsage', () => {
  it('computes inclusion and average copies', () => {
    const l = lists.find((x) => x.archetype.key === 'charizard-pidgeot')!;
    const u = cardUsage(d, l, F(), false);
    expect(u.lists).toBe(2);
    const zard = u.cards.find((c) => l.cards[c.card].name === 'Charizard ex')!;
    expect(zard).toMatchObject({ inclusion: 1, avgCount: 2.5 });
    const candy = u.cards.find((c) => l.cards[c.card].name === 'Rare Candy')!;
    expect(candy.inclusion).toBe(0.5);
  });
});

describe('auto top cut', () => {
  it('uses Top 8 online and in Japan, Top 10% in person', async () => {
    const { resolveCut, cutLabel } = await import('../src/lib/analysis');
    expect(resolveCut('auto', 'online')).toBe('top8');
    expect(resolveCut('auto', 'japan')).toBe('top8');
    expect(resolveCut('auto', 'offline')).toBe('top10pct');
    expect(resolveCut('top32', 'offline')).toBe('top32');
    expect(cutLabel({ topCut: 'auto', source: 'offline' })).toBe('Top 10%');
  });
});
