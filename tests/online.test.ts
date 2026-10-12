import { describe, expect, it } from 'vitest';
import { normaliseOnlineTournament } from '../src/lib/limitless/online';

describe('normaliseOnlineTournament', () => {
  it('maps API shapes to raw tournaments', () => {
    const t = normaliseOnlineTournament(
      { id: 'abc', game: 'PTCG', format: 'standard', name: 'Test Online', date: '2026-10-01T18:00:00.000Z', players: 64, organizer: { id: 1, name: 'Org' } },
      [
        { player: 'p1', name: 'P One', country: 'US', placing: 1, record: { wins: 6, losses: 1, ties: 0 },
          deck: { id: 'charizard-pidgeot', name: 'Charizard Pidgeot' },
          decklist: { pokemon: [{ count: 3, name: 'Charizard ex', set: 'OBF', number: 125 }], trainer: [{ count: 4, name: 'Rare Candy' }], energy: [] } },
        { player: 'p2', name: 'P Two', placing: 2, record: { wins: 5, losses: 2, ties: 0 }, deck: null, drop: 4 },
      ],
      [
        { round: 1, player1: 'p1', player2: 'p2', winner: 'p1' },
        { round: 2, player1: 'p1', player2: 'p2', winner: 0 },
        { round: 3, player1: 'p1', player2: 'p2', winner: -1 },
        { round: 4, player1: 'p2', winner: 'p2' },
      ],
      'now',
    );
    expect(t).toMatchObject({ source: 'online', id: 'abc', date: '2026-10-01', format: 'STANDARD', organizer: 'Org' });
    expect(t.standings[0]).toEqual({
      playerId: 'p1', name: 'P One', country: 'US', placing: 1, record: { wins: 6, losses: 1, ties: 0 },
      archetype: { id: 'charizard-pidgeot', name: 'Charizard Pidgeot' },
      decklist: [
        { category: 'pokemon', name: 'Charizard ex', count: 3, set: 'OBF', number: '125' },
        { category: 'trainer', name: 'Rare Candy', count: 4 },
      ],
    });
    expect(t.standings[1]).toMatchObject({ archetype: null, dropped: true });
    expect(t.matches!.map((m) => m.winner)).toEqual(['p1', 'tie', 'double-loss', 'p2']);
    expect(t.matches![3].p2).toBeNull();
  });
});
