import { describe, expect, it } from 'vitest';
import { normaliseCardName } from '../src/lib/cardname';
import { parseDeckText } from '../src/lib/decktext';

describe('normaliseCardName', () => {
  it.each([
    ["Boss’s Orders (Ghetsis) - 172/182", "boss's orders"],
    ['Ultra Ball [Reverse Holo]', 'ultra ball'],
    ['Basic Fire Energy', 'fire energy'],
    ['Pokégear 3.0', 'pokegear 3.0'],
  ])('%s', (a, b) => expect(normaliseCardName(a)).toBe(b));
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
