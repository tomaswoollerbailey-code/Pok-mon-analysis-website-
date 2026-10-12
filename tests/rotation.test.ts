import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, matchupMatrix, metaSummary } from '../src/lib/analysis';
import { buildDataset } from '../src/lib/build';
import { classifyArchetype, rotatingCardNames } from '../src/lib/rotation';
import type { Card, CardInfo, ListRow, RawStanding, RawTournament } from '../src/lib/types';

const SETS = ['TWM', 'SFA'];

describe('rotatingCardNames', () => {
  it('keeps reprints and basic energy legal', () => {
    const r = rotatingCardNames([
      { name: 'Dragapult ex', set: 'TWM' },
      { name: "Boss's Orders", set: 'TWM' },
      { name: "Boss's Orders", set: 'MEG' },
      { name: 'Fire Energy', set: 'SFA' },
      { name: 'Fezandipiti ex', set: 'SFA' },
      { name: 'Mystery Card' },
    ], SETS);
    expect([...r].sort()).toEqual(['Dragapult ex', 'Fezandipiti ex']);
  });
});

describe('classifyArchetype', () => {
  const cards: CardInfo[] = [
    { category: 'pokemon', name: 'Dragapult ex' },
    { category: 'pokemon', name: 'Fezandipiti ex' },
    { category: 'trainer', name: 'Rare Candy' },
    { category: 'pokemon', name: 'Charizard ex' },
  ];
  const rotating = new Set(['Dragapult ex', 'Fezandipiti ex']);
  const lists = (rows: [number, number][][]): ListRow[] => rows.map((r) => [0, 1, r]);

  it('rotates when the signature Pokémon rotates', () => {
    expect(classifyArchetype('Dragapult', cards, lists([[[0, 4], [2, 4]], [[0, 3]]]), rotating)).toEqual({ status: 'rotates', cards: ['Dragapult ex'] });
  });
  it('is impacted when only a core tech rotates', () => {
    expect(classifyArchetype('Charizard', cards, lists([[[3, 3], [1, 1]], [[3, 3], [1, 1]]]), rotating)).toEqual({ status: 'impacted', cards: ['Fezandipiti ex'] });
  });
  it('ignores rotating cards outside the core', () => {
    expect(classifyArchetype('Charizard', cards, lists([[[3, 3], [1, 1]], [[3, 3]], [[3, 3]]]), rotating).status).toBe('survives');
  });
  it('falls back to Pokémon copies for names without a matching card', () => {
    expect(classifyArchetype('Basic Box', cards, lists([[[1, 3], [3, 1]]]), rotating).status).toBe('rotates');
  });
  it('is unknown without lists', () => {
    expect(classifyArchetype('Dragapult', cards, [], rotating).status).toBe('unknown');
  });
});

describe('hideRotating', () => {
  const list = (name: string, set: string): Card[] => [{ category: 'pokemon', name, set, number: '1', count: 3 }];
  const st = (id: string, placing: number, deck: string, cards: Card[]): RawStanding => ({ playerId: id, name: id, placing, archetype: { name: deck }, decklist: cards, record: { wins: 1, losses: 1, ties: 0 } });
  const t: RawTournament = {
    source: 'online', id: 't', name: 't', date: '2026-10-01', format: 'STANDARD', players: 4, url: '', fetchedAt: '',
    standings: [
      st('a', 1, 'Dragapult', list('Dragapult ex', 'TWM')),
      st('b', 2, 'Charizard', list('Charizard ex', 'MEG')),
      st('c', 3, 'Charizard', list('Charizard ex', 'MEG')),
      st('d', 4, 'Gardevoir', list('Gardevoir ex', 'MEG')),
    ],
    matches: [{ round: 1, p1: 'a', p2: 'b', winner: 'a' }, { round: 1, p1: 'c', p2: 'd', winner: 'c' }],
  };
  const { dataset: d, lists } = buildDataset([t], 'now', { label: 'test', sets: SETS });

  it('tags archetypes and cards', () => {
    expect(d.archetypes.map((a) => [a.name, a.rotation?.status])).toEqual([['Dragapult', 'rotates'], ['Charizard', 'survives'], ['Gardevoir', 'survives']]);
    expect(lists.find((l) => l.archetype.name === 'Dragapult')!.cards[0].rotates).toBe(true);
    expect(d.rotation).toEqual({ label: 'test', sets: SETS });
  });

  it('removes rotating decks and renormalises shares', () => {
    const all = metaSummary(d, DEFAULT_FILTERS);
    expect(all.rows.find((r) => d.archetypes[r.archetype].name === 'Charizard')!.share).toBeCloseTo(0.5);
    const post = metaSummary(d, { ...DEFAULT_FILTERS, hideRotating: true });
    expect(post.rows.map((r) => d.archetypes[r.archetype].name)).toEqual(['Charizard', 'Gardevoir']);
    expect(post.rows[0].share).toBeCloseTo(2 / 3);
    expect(post.players).toBe(3);
    const top = post.rows.map((r) => r.archetype);
    expect(matchupMatrix(d, { ...DEFAULT_FILTERS, hideRotating: true }, top)[0][1].games).toBe(1);
  });
});
