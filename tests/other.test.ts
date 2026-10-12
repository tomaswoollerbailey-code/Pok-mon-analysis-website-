import { describe, expect, it } from 'vitest';
import { buildDataset } from '../src/lib/build';
import type { PricesFile, RawTournament } from '../src/lib/types';

describe('the catch-all "Other" deck', () => {
  const t: RawTournament = {
    source: 'online', id: 't', name: 't', date: '2026-10-01', format: 'STANDARD', players: 2, url: '', fetchedAt: '',
    standings: [
      { playerId: 'a', name: 'a', placing: 1, archetype: { name: 'Other', icons: ['substitute'] }, decklist: [{ category: 'trainer', name: 'Rare Candy', count: 4 }] },
      { playerId: 'b', name: 'b', placing: 2, archetype: { name: 'Charizard', icons: ['charizard'] }, decklist: [{ category: 'trainer', name: 'Rare Candy', count: 4 }] },
    ],
  };
  const prices: PricesFile = { fetchedAt: 'now', cards: { 't|Rare Candy': { usd: 1, eur: 1 } } };
  const { dataset } = buildDataset([t], 'now', undefined, prices);
  const other = dataset.archetypes.find((a) => a.key === 'other')!;

  it('has no sprites (the site draws its own icon) and no price', () => {
    expect(other.icons).toBeUndefined();
    expect(other.price).toBeUndefined();
    expect(other.rotation?.status).toBe('unknown');
  });

  it('real decks keep their sprites and prices', () => {
    const zard = dataset.archetypes.find((a) => a.key === 'charizard')!;
    expect(zard.icons).toEqual(['charizard']);
    expect(zard.price).toEqual({ usd: 4, eur: 4, lists: 1 });
  });
});
