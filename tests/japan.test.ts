import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, metaSummary } from '../src/lib/analysis';
import { buildDataset } from '../src/lib/build';
import { iconsToName, parseJapanTournamentList, parseStandings } from '../src/lib/limitless/offline';
import type { RawTournament } from '../src/lib/types';

const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

describe('Japan pages', () => {
  it('parses the City League list', () => {
    expect(parseJapanTournamentList(fx('japan-list.html'))).toEqual([
      { id: '5007', name: 'City League Gifu', date: '2026-10-11', prefecture: 'Gifu', shop: 'Test Shop A', url: 'https://limitlesstcg.com/tournaments/jp/5007' },
    ]);
  });

  it('parses standings with icon-only decks and jp list ids', () => {
    const s = parseStandings(fx('japan-event.html'));
    expect(s[0]).toMatchObject({ placing: 1, name: 'Player A', listId: 'jp/74740', archetype: { name: 'Mega Lucario Hariyama', icons: ['lucario-mega', 'hariyama'], fromIcons: true } });
    expect(s[1].archetype).toMatchObject({ name: 'Dragapult Dusknoir' });
  });

  it('turns icons into names', () => {
    expect(iconsToName(['kangaskhan-mega', 'slowking'])).toBe('Mega Kangaskhan Slowking');
  });
});

describe('Japan in the dataset', () => {
  const intl: RawTournament = {
    source: 'offline', id: '1', name: 'Regional', date: '2026-10-01', format: 'STANDARD', players: 500, url: '', fetchedAt: '',
    standings: [{ playerId: '0', name: 'x', placing: 1, archetype: { name: 'Dragapult Dusknoir', icons: ['dragapult', 'dusknoir'] } }],
  };
  const jp: RawTournament = {
    source: 'japan', id: '5007', name: 'City League Gifu', date: '2026-10-11', format: 'STANDARD', players: 2, url: '', fetchedAt: '',
    standings: parseStandings(fx('japan-event.html')).map(({ listId, ...s }) => s),
  };
  const { dataset: d } = buildDataset([intl, jp], 'now');

  it('reuses international names for the same icons', () => {
    expect(d.archetypes.map((a) => a.name).sort()).toEqual(['Dragapult Dusknoir', 'Mega Lucario Hariyama']);
  });

  it('keeps Japan out of the international view', () => {
    expect(metaSummary(d, DEFAULT_FILTERS).players).toBe(1);
    expect(metaSummary(d, { ...DEFAULT_FILTERS, source: 'japan', minPlayers: 64 }).players).toBe(2);
  });
});
