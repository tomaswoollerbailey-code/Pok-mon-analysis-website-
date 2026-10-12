import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDate, parseDecklist, parseStandings, parseTournamentHeader, parseTournamentList } from '../src/lib/limitless/offline';

const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

describe('parseDate', () => {
  it.each([
    ['2026-09-20', '2026-09-20'],
    ['20 Sep 26', '2026-09-20'],
    ['20th September 2026', '2026-09-20'],
    ['Aug 3, 2026', '2026-08-03'],
    ['nonsense', null],
  ])('%s', (input, out) => expect(parseDate(input)).toBe(out));
});

describe('parseTournamentList', () => {
  it('reads data attributes and falls back to cells', () => {
    const list = parseTournamentList(fx('offline-list.html'));
    expect(list).toEqual([
      { id: '501', name: 'Test Regional A', date: '2026-09-20', players: 812, format: 'STANDARD', country: 'US', url: 'https://limitlesstcg.com/tournaments/501' },
      { id: '499', name: 'Test Cup B', date: '2026-08-03', players: 1204, country: 'GB', url: 'https://limitlesstcg.com/tournaments/499' },
    ]);
  });
});

describe('parseStandings', () => {
  it('maps columns by header and extracts deck + list', () => {
    const s = parseStandings(fx('offline-standings.html'));
    expect(s).toHaveLength(3);
    expect(s[0]).toMatchObject({ name: 'Player One', placing: 1, country: 'US', archetype: { id: '281', name: 'charizard pidgeot' }, listId: '9001' });
    expect(s[1]).toMatchObject({ name: 'Player Two', placing: 2, country: 'CA', archetype: { id: '300', name: 'Gardevoir ex' } });
    expect(s[1].listId).toBeUndefined();
    expect(s[2]).toMatchObject({ archetype: { name: 'Other' }, record: { wins: 10, losses: 2, ties: 1 } });
  });

  it('reads the header box', () => {
    expect(parseTournamentHeader(fx('offline-standings.html'))).toEqual({ name: 'Test Regional A', date: '2026-09-20', players: 812, format: 'STANDARD' });
  });
});

describe('parseDecklist', () => {
  it('reads card columns', () => {
    expect(parseDecklist(fx('offline-decklist.html'))).toEqual([
      { category: 'pokemon', name: 'Charizard ex', count: 3, set: 'OBF', number: '125' },
      { category: 'pokemon', name: 'Pidgey', count: 1, set: 'MEW', number: '16' },
      { category: 'trainer', name: 'Rare Candy', count: 4 },
      { category: 'energy', name: 'Fire Energy', count: 5 },
    ]);
  });

  it('falls back to a text export', () => {
    const html = '<textarea>Pokémon: 1\n2 Charizard ex OBF 125\nTrainer: 1\n4 Rare Candy\n</textarea>';
    expect(parseDecklist(html)).toEqual([
      { category: 'pokemon', name: 'Charizard ex', count: 2, set: 'OBF', number: '125' },
      { category: 'trainer', name: 'Rare Candy', count: 4 },
    ]);
  });
});
