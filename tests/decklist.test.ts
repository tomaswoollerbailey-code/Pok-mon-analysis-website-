import { describe, expect, it } from 'vitest';
import { parseDeckText } from '../src/lib/decktext';
import { averageList, deckText, listCards, topLists } from '../src/lib/decklist';
import type { ArchetypeLists, CardInfo, Dataset, ListRow } from '../src/lib/types';

const cards: CardInfo[] = [
  { category: 'pokemon', name: 'Alpha ex', set: 'AAA', number: '1' },
  { category: 'pokemon', name: 'Alpha ex', set: 'BBB', number: '7' }, // second printing
  { category: 'trainer', name: 'Test Ball', set: 'CCC', number: '10' },
  { category: 'trainer', name: 'Spare Tech', set: 'CCC', number: '11' },
  { category: 'energy', name: 'Basic Test Energy', set: 'EEE', number: '2' },
];
// Three 10-card lists (a real deck has 60; the maths is the same).
const lists: ListRow[] = [
  [0, 1, [[0, 3], [2, 4], [4, 3]]],
  [1, 2, [[0, 2], [1, 1], [2, 4], [4, 3]]],
  [2, 5, [[1, 3], [2, 3], [3, 1], [4, 3]]],
];

describe('averageList', () => {
  const avg = averageList(cards, lists)!;
  it('rounds average copies to a full deck and merges printings', () => {
    expect(avg.lists).toBe(3);
    expect(avg.cards.reduce((s, c) => s + c.count, 0)).toBe(10);
    const alpha = avg.cards.find((c) => c.name === 'Alpha ex')!;
    expect(alpha).toMatchObject({ count: 3, inclusion: 1, set: 'AAA' }); // AAA has 5 copies vs BBB's 4
    expect(avg.cards.find((c) => c.name === 'Test Ball')!.count).toBe(4); // 11/3 = 3.67
    expect(avg.cards.find((c) => c.name === 'Spare Tech')).toBeUndefined(); // 1/3 rounds away
    expect(avg.cards.map((c) => c.category)).toEqual(['pokemon', 'trainer', 'energy']);
  });
  it('returns null with no lists', () => expect(averageList(cards, [])).toBeNull());
});

describe('deckText', () => {
  it('writes the TCG Live format and round-trips through the importer', () => {
    const list = listCards(cards, lists[2]);
    const text = deckText(list);
    expect(text).toContain('Pokémon: 3\n3 Alpha ex BBB 7');
    expect(text).toContain('Trainer: 4\n3 Test Ball CCC 10\n1 Spare Tech CCC 11');
    expect(text).toContain('Total Cards: 10');
    expect(parseDeckText(text).map((c) => [c.count, c.name, c.set, c.number])).toEqual(list.map((c) => [c.count, c.name, c.set, c.number]));
  });
});

describe('topLists', () => {
  it('orders by placing, then newest', () => {
    const d = { tournaments: [{ date: '2026-10-01', players: 50 }, { date: '2026-10-08', players: 50 }, { date: '2026-10-09', players: 50 }] } as unknown as Dataset;
    const l = { lists: [...lists, [2, 1, []] as ListRow] } as unknown as ArchetypeLists;
    expect(topLists(d, l, [true, true, true]).map((r) => [r[0], r[1]])).toEqual([[2, 1], [0, 1], [1, 2], [2, 5]]);
    expect(topLists(d, l, [false, true, false])).toHaveLength(1);
  });
});
