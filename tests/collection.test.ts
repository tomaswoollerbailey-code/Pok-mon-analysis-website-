import { describe, expect, it } from 'vitest';
import { normaliseCardName } from '../src/lib/cardname';
import { closestList, listCompletion, mergeCollection, missingAsText, ownedByName } from '../src/lib/collection';
import { detectColumns, parseCsv, rowsToCollection } from '../src/lib/csv';
import { parseDeckText } from '../src/lib/decktext';
import type { ArchetypeLists } from '../src/lib/types';

describe('normaliseCardName', () => {
  it.each([
    ["Boss’s Orders (Ghetsis) - 172/182", "boss's orders"],
    ['Charizard ex - 125/197', 'charizard ex'],
    ['Ultra Ball [Reverse Holo]', 'ultra ball'],
    ['Basic Fire Energy', 'fire energy'],
    ['Pokégear 3.0', 'pokegear 3.0'],
    ['Pikachu ex 057/191', 'pikachu ex'],
  ])('%s', (a, b) => expect(normaliseCardName(a)).toBe(b));
});

describe('parseCsv', () => {
  it('handles quotes, BOM, CRLF and semicolons', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\r\n\r\n')).toEqual([['a', 'b'], ['x, y', 'he said "hi"']]);
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

// Header layouts below are illustrative of the kinds of columns apps export, not exact copies.
describe('detectColumns + rowsToCollection', () => {
  it('reads a portfolio-style export with a category column', () => {
    const rows = parseCsv([
      'Portfolio Name,Category,Set,Product Name,Card Number,Rarity,Quantity,Market Price',
      'Main,Pokemon,Twilight Masquerade,Teal Mask Ogerpon ex,025/167,Double Rare,3,10.64',
      'Main,Magic: The Gathering,Bloomburrow,Lightning Bolt,1,Common,4,1.00',
      'Main,Pokemon,Scarlet & Violet,Booster Box,,Sealed,1,150',
    ].join('\n'));
    const map = detectColumns(rows[0]);
    expect(map).toEqual({ quantity: 6, name: 3, set: 2, number: 4, game: 1 });
    const res = rowsToCollection(rows.slice(1), map);
    expect(res.otherGames).toBe(1);
    expect(res.cards[0]).toEqual({ name: 'Teal Mask Ogerpon ex', set: 'Twilight Masquerade', number: '025', qty: 3 });
  });

  it('prefers a simple-name column and set codes', () => {
    const map = detectColumns(['Quantity', 'Name', 'Simple Name', 'Set', 'Set Code', 'Card Number', 'Printing']);
    expect(map).toMatchObject({ quantity: 0, name: 2, set: 4, number: 5 });
  });

  it('defaults quantity to 1 and skips blank names', () => {
    const map = detectColumns(['Card Name', 'Set']);
    expect(rowsToCollection([['Rare Candy', 'SVI'], ['', 'SVI']], map)).toEqual({ cards: [{ name: 'Rare Candy', set: 'SVI', qty: 1 }], skipped: 1, otherGames: 0 });
  });
});

describe('parseDeckText', () => {
  it('reads PTCG Live exports', () => {
    expect(parseDeckText('Pokémon: 2\n2 Charizard ex OBF 125\n\nTrainer: 4\n4 Rare Candy SVI 191\nEnergy: 5\n5 Basic Fire Energy SVE 2\n\nTotal Cards: 11')).toEqual([
      { category: 'pokemon', name: 'Charizard ex', count: 2, set: 'OBF', number: '125' },
      { category: 'trainer', name: 'Rare Candy', count: 4, set: 'SVI', number: '191' },
      { category: 'energy', name: 'Basic Fire Energy', count: 5, set: 'SVE', number: '2' },
    ]);
  });
});

describe('completion', () => {
  const lists: ArchetypeLists = {
    archetype: { key: 'zard', name: 'Charizard' },
    cards: [
      { category: 'pokemon', name: 'Charizard ex', set: 'OBF', number: '125' },
      { category: 'trainer', name: 'Rare Candy' },
      { category: 'energy', name: 'Fire Energy' },
      { category: 'trainer', name: "Boss's Orders" },
    ],
    lists: [
      [0, 1, [[0, 3], [1, 4], [2, 5]]],
      [0, 2, [[0, 2], [1, 4], [3, 2], [2, 4]]],
    ],
  };
  const owned = ownedByName(mergeCollection(
    [{ name: 'Charizard ex - 125/197', qty: 1 }, { name: 'Charizard ex', set: 'PAF', number: '54', qty: 1 }],
    [{ name: 'Rare Candy', qty: 2 }, { name: 'Rare Candy', qty: 2 }, { name: 'Boss’s Orders', qty: 2 }],
  ));

  it('counts any printing and caps at what the list needs', () => {
    expect(owned.get('charizard ex')).toBe(2);
    expect(owned.get('rare candy')).toBe(4);
    const c = listCompletion(lists, lists.lists[0], owned, false);
    expect(c).toMatchObject({ total: 12, owned: 6 });
    expect(c.missing.map((m) => [m.name, m.need - m.have])).toEqual([['Charizard ex', 1], ['Fire Energy', 5]]);
    expect(listCompletion(lists, lists.lists[0], owned, true).owned).toBe(11);
  });

  it('picks the closest real list', () => {
    const best = closestList(lists, owned, { assumeBasicEnergy: true })!;
    expect(best.row[1]).toBe(2);
    expect(best.completion.pct).toBe(1);
  });

  it('writes the missing cards as deck text', () => {
    expect(missingAsText(listCompletion(lists, lists.lists[0], owned, false).missing)).toBe('Pokémon: 1\n1 Charizard ex\n\nEnergy: 5\n5 Fire Energy');
  });
});
