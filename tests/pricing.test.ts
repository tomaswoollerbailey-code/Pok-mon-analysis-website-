import { describe, expect, it } from 'vitest';
import { buildDataset } from '../src/lib/build';
import { convert, formatMoney, listCost, tcgplayerMassEntry } from '../src/lib/pricing';
import type { PricesFile, RawTournament } from '../src/lib/types';

const t: RawTournament = {
  source: 'online', id: 't', name: 't', date: '2026-10-01', format: 'STANDARD', players: 2, url: '', fetchedAt: '',
  standings: [
    { playerId: 'a', name: 'a', placing: 1, archetype: { name: 'Charizard' }, decklist: [
      { category: 'pokemon', name: 'Charizard ex', set: 'OBF', number: '125', count: 2 },
      { category: 'trainer', name: 'Rare Candy', count: 4 },
      { category: 'energy', name: 'Fire Energy', count: 4 },
    ] },
    { playerId: 'b', name: 'b', placing: 2, archetype: { name: 'Charizard' }, decklist: [
      { category: 'pokemon', name: 'Charizard ex', set: 'PAF', number: '54', count: 3 },
      { category: 'trainer', name: 'Rare Candy', count: 4 },
    ] },
  ],
};
const prices: PricesFile = {
  fetchedAt: '2026-10-12T06:00:00Z',
  cards: {
    'p|Charizard ex|OBF|125': { usd: 10, eur: 9, tcgplayerId: '111' },
    'p|Charizard ex|PAF|54': { usd: 20, eur: 18 },
    't|Rare Candy': { usd: 0.5, eur: 0.4, tcgplayerId: '222' },
  },
  fx: { date: '2026-10-11', source: 'test', usd: { EUR: 0.9, MYR: 4.5 } },
};
const { dataset: d, lists } = buildDataset([t], 'now', undefined, prices);
const l = lists[0];

describe('pricing', () => {
  it('prices lists and leaves unknown cards unpriced', () => {
    expect(listCost(l.cards, l.lists[0])).toEqual({ usd: 22, eur: 19.6, unpricedUsd: 4, unpricedEur: 4, copies: 10 });
  });

  it('uses the cheapest printing when asked', () => {
    expect(listCost(l.cards, l.lists[1], true).usd).toBe(32); // 3×10 + 4×0.5
    expect(listCost(l.cards, l.lists[1]).usd).toBe(62);
  });

  it('stores a median archetype price, skipping lists with many unpriced cards', () => {
    expect(d.archetypes[0].price).toEqual({ usd: 62, eur: 55.6, lists: 1 });
    expect(d.prices).toEqual({ asOf: prices.fetchedAt, fx: prices.fx });
  });

  it('builds a TCGplayer mass-entry link', () => {
    const m = tcgplayerMassEntry(l.cards, l.lists[0]);
    expect(decodeURIComponent(m.url)).toBe('https://www.tcgplayer.com/massentry?productline=Pokemon&c=2-111||4-222');
    expect(m.missing).toBe(4);
  });

  it('converts and formats currencies', () => {
    expect(convert({ usd: 10, eur: 9 }, 'myr', prices.fx)).toBe(45);
    expect(convert({ usd: 10 }, 'eur', prices.fx)).toBeUndefined();
    expect(formatMoney(12.5, 'usd')).toBe('$12.50');
    expect(formatMoney(undefined, 'eur')).toBe('—');
  });
});
