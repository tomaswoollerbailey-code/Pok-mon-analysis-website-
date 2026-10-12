import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '../src/lib/analysis';
import { buildDataset } from '../src/lib/build';
import { legacyHashPath, parsePath, routePath, type Route } from '../src/lib/routes';
import { allRoutes, pageMeta } from '../src/lib/seo';
import type { RawTournament } from '../src/lib/types';

const t: RawTournament = {
  source: 'online', id: 'o1', name: 'Test event', date: '2026-10-07', format: 'STANDARD', players: 2, url: '', fetchedAt: '',
  standings: [
    { playerId: 'a', name: 'a', placing: 1, record: { wins: 1, losses: 0, ties: 0 }, archetype: { name: 'Deck Alpha' } },
    { playerId: 'b', name: 'b', placing: 2, record: { wins: 0, losses: 1, ties: 0 }, archetype: { name: 'Deck Beta' } },
  ],
  matches: [{ round: 1, p1: 'a', p2: 'b', winner: 'a' }],
};
const { dataset: d } = buildDataset([t], 'now');

describe('routes', () => {
  it('round-trips every route through its path', () => {
    const routes: Route[] = [{ page: 'meta' }, { page: 'trends' }, { page: 'field' }, { page: 'methodology' }, { page: 'report' }, { page: 'tournaments' }, { page: 'deck', key: 'a b' }, { page: 'tournament', key: 'online-1' }];
    for (const r of routes) expect(parsePath(routePath(r))).toEqual(r);
    expect(routePath({ page: 'deck', key: 'deck-alpha' })).toBe('decks/deck-alpha');
    expect(parsePath('/decks/deck-alpha/')).toEqual({ page: 'deck', key: 'deck-alpha' });
    expect(parsePath('nonsense')).toEqual({ page: 'meta' });
  });

  it('maps old hash links to the new paths', () => {
    expect(legacyHashPath('#/deck/deck-alpha')).toBe('decks/deck-alpha');
    expect(legacyHashPath('#/tournament/online-1')).toBe('tournaments/online-1');
    expect(legacyHashPath('#/matchups')).toBe('matchups');
    expect(legacyHashPath('#/')).toBe('');
    expect(legacyHashPath('')).toBeNull();
    expect(legacyHashPath('#section')).toBeNull();
  });
});

describe('seo', () => {
  it('gives each deck its own title and a stats description', () => {
    const m = pageMeta(d, { page: 'deck', key: 'deck-alpha' });
    expect(m.title).toBe('Deck Alpha deck list, meta share & price · The Crow’s Nest');
    expect(m.description).toContain('50.0% of the online meta');
    expect(m.description.length).toBeLessThan(320);
  });

  it('lists every deck and tournament page, and falls back for unknown keys', () => {
    const routes = allRoutes(d);
    expect(routes.filter((r) => r.page === 'deck')).toHaveLength(d.archetypes.filter((a) => a.key !== 'other').length);
    expect(routes.filter((r) => r.page === 'tournament')).toHaveLength(1);
    expect(pageMeta(d, { page: 'deck', key: 'nope' }).summary).toEqual([]);
    expect(pageMeta(null, { page: 'meta' }).title).toContain('Pokémon TCG meta');
    expect(DEFAULT_FILTERS.source).toBe('online');
  });
});
