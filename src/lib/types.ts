// Shared data model. "Raw" types are what the fetch scripts write to data/raw/,
// "Dataset" types are the compact bundle the website loads from public/data/.

export type Source = 'online' | 'offline';

export type CardCategory = 'pokemon' | 'trainer' | 'energy';

export interface Card {
  category: CardCategory;
  name: string;
  set?: string;
  number?: string;
  count: number;
}

export interface Record3 {
  wins: number;
  losses: number;
  ties: number;
}

export interface RawStanding {
  /** Stable per-tournament player id (Limitless username online, row index offline). */
  playerId: string;
  name: string;
  country?: string;
  placing: number | null;
  record?: Record3;
  dropped?: boolean;
  archetype: { id?: string; name: string } | null;
  decklist?: Card[];
}

export interface RawMatch {
  round: number;
  phase?: number;
  p1: string;
  /** null for a bye. */
  p2: string | null;
  /** playerId of the winner, 'tie', 'double-loss', or null when unreported. */
  winner: string | null;
}

export interface RawTournament {
  source: Source;
  id: string;
  name: string;
  /** YYYY-MM-DD */
  date: string;
  format: string;
  players: number;
  url: string;
  organizer?: string;
  country?: string;
  standings: RawStanding[];
  matches?: RawMatch[];
  fetchedAt: string;
}

// ---------- Compact dataset loaded by the site ----------

export interface ArchetypeInfo {
  key: string;
  name: string;
}

export interface TournamentInfo {
  key: string;
  source: Source;
  id: string;
  name: string;
  date: string;
  format: string;
  players: number;
  url: string;
  organizer?: string;
  country?: string;
}

/** [tournamentIdx, archetypeIdx (-1 = unknown), placing (0 = unknown), wins, losses, ties] */
export type ResultRow = [number, number, number, number, number, number];

/**
 * [tournamentIdx, archetypeIdxA, archetypeIdxB, outcome] where outcome is
 * 1 = A won, -1 = B won, 0 = tie. Mirrors and unknown archetypes are dropped.
 */
export type MatchRow = [number, number, number, -1 | 0 | 1];

export interface Dataset {
  generatedAt: string;
  archetypes: ArchetypeInfo[];
  tournaments: TournamentInfo[];
  results: ResultRow[];
  matches: MatchRow[];
}

export interface CardInfo {
  category: CardCategory;
  name: string;
  set?: string;
  number?: string;
}

/** Per-archetype decklists: [tournamentIdx, placing, [[cardIdx, count], ...]] */
export type ListRow = [number, number, [number, number][]];

export interface ArchetypeLists {
  archetype: ArchetypeInfo;
  cards: CardInfo[];
  lists: ListRow[];
}

export interface StandingsFile {
  tournament: TournamentInfo;
  /** [name, country, placing, wins, losses, ties, archetypeIdx, dropped(0|1)] */
  standings: [string, string, number, number, number, number, number, 0 | 1][];
}
