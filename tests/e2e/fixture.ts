// Synthetic, clearly fake tournament data for end-to-end tests only ("Deck Alpha", "Player 12"...).
// Usage: tsx tests/e2e/fixture.ts <outDir>
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDataset } from '../../src/lib/build';
import type { PricesFile, RawTournament } from '../../src/lib/types';

const out = process.argv[2] ?? 'dist-e2e/data';
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const decks = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 'Other'];
const weights = decks.map((_, i) => 1 / (i + 1.5));
const pick = () => { let r = rnd() * weights.reduce((a, b) => a + b); for (let i = 0; i < decks.length; i++) { r -= weights[i]; if (r <= 0) return i; } return 0; };
const latest = Date.UTC(2026, 9, 10);

const raw: RawTournament[] = [];
for (let k = 0; k < 30; k++) {
  const source = k % 3 === 0 ? 'offline' : 'online';
  const n = source === 'online' ? 64 + Math.floor(rnd() * 150) : 300 + Math.floor(rnd() * 500);
  const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, deck: pick(), skill: rnd() }));
  players.forEach((p) => (p.skill += (6 - Math.abs(p.deck - 3)) * 0.05));
  players.sort((a, b) => b.skill - a.skill);
  raw.push({
    source, id: String(1000 + k), name: `Test ${source} event ${k}`,
    date: new Date(latest - k * 3 * 86_400_000).toISOString().slice(0, 10),
    format: 'STANDARD', players: n, url: 'https://example.com/', fetchedAt: '',
    standings: players.map((p, i) => ({
      playerId: p.id, name: `Player ${i + 1}`, placing: i + 1,
      // Limitless's catch-all "Other" has no sprites.
      archetype: decks[p.deck] === 'Other' ? { name: 'Other' } : { name: `Deck ${decks[p.deck]}`, icons: [decks[p.deck].toLowerCase()] },
      ...(source === 'online' ? { record: { wins: Math.max(0, 6 - Math.floor((i / n) * 7)), losses: Math.min(6, Math.floor((i / n) * 7)), ties: 0 } } : {}),
      decklist: [
        { category: 'pokemon' as const, name: `${decks[p.deck]} ex`, set: p.deck % 4 === 1 ? 'TWM' : 'MEG', number: '1', count: 3 },
        { category: 'trainer' as const, name: 'Rare Candy', count: 4 },
        { category: 'energy' as const, name: 'Fire Energy', count: 8 },
      ],
    })),
    ...(source === 'online' ? {
      matches: Array.from({ length: n * 3 }, (_, i) => {
        const a = players[Math.floor(rnd() * n)], b = players[Math.floor(rnd() * n)];
        return { round: 1 + (i % 6), p1: a.id, p2: b.id, winner: rnd() < 0.5 + (a.skill - b.skill) ? a.id : b.id };
      }),
    } : {}),
  });
}

const prices: PricesFile = {
  fetchedAt: '2026-10-11T06:00:00Z',
  fx: { date: '2026-10-10', source: 'test', usd: { EUR: 0.9, MYR: 4.2 } },
  cards: { 't|Rare Candy': { usd: 0.25, eur: 0.2, tcgplayerId: '9' } },
};
decks.forEach((d, i) => { for (const s of ['MEG', 'TWM']) prices.cards[`p|${d} ex|${s}|1`] = { usd: 4 + i, eur: 3 + i, tcgplayerId: String(100 + i), cardmarketUrl: 'https://example.com/cm' }; });

const { dataset, lists, standings } = buildDataset(raw, '2026-10-11T06:00:00Z', undefined, prices);
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'lists'), { recursive: true });
mkdirSync(join(out, 'standings'), { recursive: true });
writeFileSync(join(out, 'dataset.json'), JSON.stringify(dataset));
for (const l of lists) writeFileSync(join(out, 'lists', `${l.archetype.key}.json`), JSON.stringify(l));
for (const s of standings) writeFileSync(join(out, 'standings', `${s.tournament.key}.json`), JSON.stringify(s));
console.log(`e2e fixture: ${dataset.tournaments.length} tournaments → ${out}`);
