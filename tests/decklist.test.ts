import { describe, expect, it } from 'vitest';
import { parseDeckText } from '../src/lib/decktext';
import { commonLists, deckText, listCards, topLists } from '../src/lib/decklist';
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

const d = { tournaments: [{ date: '2026-10-01', players: 50 }, { date: '2026-10-08', players: 50 }, { date: '2026-10-09', players: 50 }] } as unknown as Dataset;
const al = (rows: ListRow[]) => ({ cards, lists: rows }) as unknown as ArchetypeLists;

describe('topLists', () => {
  it('keeps the top cut, newest event first then best placing', () => {
    const l = al([...lists, [2, 1, []]]);
    expect(topLists(d, l, [true, true, true], 8).map((r) => [r[0], r[1]])).toEqual([[2, 1], [2, 5], [1, 2], [0, 1]]);
    expect(topLists(d, l, [true, true, true], 1)).toHaveLength(2);
    expect(topLists(d, l, [false, true, false], 8)).toHaveLength(1);
  });
});

describe('commonLists', () => {
  it('groups identical lists (printings merged), most played first', () => {
    // lists[1] has the same cards as lists[0] once its two Alpha printings are merged.
    const g = commonLists(d, al(lists), [true, true, true]);
    expect(g.map((x) => x.count)).toEqual([2, 1]);
    expect(g[0]).toMatchObject({ events: 2, best: 1 });
    expect(g[0].row).toBe(lists[0]);
  });
});
