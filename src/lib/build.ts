// Turns raw per-tournament files into the compact bundle the website loads.
import { archetypeKey, cardKey } from './archetype';
import type {
  ArchetypeInfo, ArchetypeLists, CardInfo, Dataset, ListRow, MatchRow, RawTournament,
  ResultRow, StandingsFile, TournamentInfo,
} from './types';

export interface BuiltDataset {
  dataset: Dataset;
  lists: ArchetypeLists[];
  standings: StandingsFile[];
}

export function buildDataset(raw: RawTournament[], generatedAt = new Date().toISOString()): BuiltDataset {
  const sorted = [...raw].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  const archetypes: ArchetypeInfo[] = [];
  const archIdx = new Map<string, number>();
  const archNameVotes = new Map<string, Map<string, number>>();
  const archetypeOf = (name: string | undefined): number => {
    if (!name) return -1;
    const key = archetypeKey(name);
    const votes = archNameVotes.get(key) ?? new Map<string, number>();
    votes.set(name, (votes.get(name) ?? 0) + 1);
    archNameVotes.set(key, votes);
    if (!archIdx.has(key)) {
      archIdx.set(key, archetypes.length);
      archetypes.push({ key, name });
    }
    return archIdx.get(key)!;
  };

  const tournaments: TournamentInfo[] = [];
  const results: ResultRow[] = [];
  const matches: MatchRow[] = [];
  const standings: StandingsFile[] = [];
  const listsByArch = new Map<number, { cards: CardInfo[]; cardIdx: Map<string, number>; lists: ListRow[] }>();

  for (const t of sorted) {
    const tIdx = tournaments.length;
    const info: TournamentInfo = {
      key: `${t.source}-${t.id}`,
      source: t.source,
      id: t.id,
      name: t.name,
      date: t.date,
      format: t.format,
      players: t.players,
      url: t.url,
      ...(t.organizer ? { organizer: t.organizer } : {}),
      ...(t.country ? { country: t.country } : {}),
    };
    tournaments.push(info);

    const playerArch = new Map<string, number>();
    const rows: StandingsFile['standings'] = [];
    for (const s of t.standings) {
      const a = archetypeOf(s.archetype?.name);
      playerArch.set(s.playerId, a);
      const r = s.record ?? { wins: 0, losses: 0, ties: 0 };
      results.push([tIdx, a, s.placing ?? 0, r.wins, r.losses, r.ties]);
      rows.push([s.name, s.country ?? '', s.placing ?? 0, r.wins, r.losses, r.ties, a, s.dropped ? 1 : 0]);

      if (a >= 0 && s.decklist?.length) {
        let bucket = listsByArch.get(a);
        if (!bucket) listsByArch.set(a, (bucket = { cards: [], cardIdx: new Map(), lists: [] }));
        const counts = new Map<number, number>();
        for (const c of s.decklist) {
          const k = cardKey(c);
          let ci = bucket.cardIdx.get(k);
          if (ci == null) {
            ci = bucket.cards.length;
            bucket.cardIdx.set(k, ci);
            bucket.cards.push({ category: c.category, name: c.name, ...(c.set ? { set: c.set } : {}), ...(c.number ? { number: c.number } : {}) });
          }
          counts.set(ci, (counts.get(ci) ?? 0) + c.count);
        }
        bucket.lists.push([tIdx, s.placing ?? 0, [...counts.entries()]]);
      }
    }
    rows.sort((x, y) => (x[2] || Infinity) - (y[2] || Infinity));
    standings.push({ tournament: info, standings: rows });

    for (const m of t.matches ?? []) {
      if (!m.p2 || !m.winner || m.winner === 'double-loss') continue;
      const a = playerArch.get(m.p1) ?? -1;
      const b = playerArch.get(m.p2) ?? -1;
      if (a < 0 || b < 0 || a === b) continue;
      const outcome = m.winner === 'tie' ? 0 : m.winner === m.p1 ? 1 : m.winner === m.p2 ? -1 : null;
      if (outcome == null) continue;
      matches.push([tIdx, a, b, outcome]);
    }
  }

  // Display the most common spelling of each archetype.
  for (const a of archetypes) {
    const votes = [...(archNameVotes.get(a.key) ?? new Map()).entries()].sort((x, y) => y[1] - x[1]);
    if (votes.length) a.name = votes[0][0];
  }

  const lists: ArchetypeLists[] = [...listsByArch.entries()].map(([a, b]) => ({
    archetype: archetypes[a],
    cards: b.cards,
    lists: b.lists,
  }));

  return { dataset: { generatedAt, archetypes, tournaments, results, matches }, lists, standings };
}
