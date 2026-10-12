import type { Currency } from './pricing';
import type { ArchetypeLists, Dataset, ResultRow, Source } from './types';

export type TopCut = 'top8' | 'top16' | 'top32' | 'top10pct';

export interface Filters {
  /** 'all' = international (online + in person); Japan is a different card pool, so it's kept apart. */
  source: 'all' | Source;
  format: string; // '' = any
  from: string; // YYYY-MM-DD, '' = open
  to: string;
  minPlayers: number;
  topCut: TopCut;
  /** Drop archetypes that rotate out at the next rotation (projected post-rotation meta). */
  hideRotating: boolean;
  /** Display currency for prices (doesn't affect the analysis). */
  currency: Currency;
}

export const DEFAULT_FILTERS: Filters = {
  source: 'all',
  format: 'STANDARD',
  from: '',
  to: '',
  minPlayers: 0,
  topCut: 'top8',
  hideRotating: false,
  currency: 'usd',
};

export const TOP_CUT_LABELS: Record<TopCut, string> = {
  top8: 'Top 8',
  top16: 'Top 16',
  top32: 'Top 32',
  top10pct: 'Top 10%',
};

export function cutSize(cut: TopCut, players: number): number {
  switch (cut) {
    case 'top8': return 8;
    case 'top16': return 16;
    case 'top32': return 32;
    case 'top10pct': return Math.max(1, Math.round(players * 0.1));
  }
}

/** Boolean mask over dataset.tournaments for the current filters. */
export function tournamentMask(d: Dataset, f: Filters): boolean[] {
  return d.tournaments.map(
    (t) =>
      (f.source === 'all' ? t.source !== 'japan' : t.source === f.source) &&
      (!f.format || t.format === f.format) &&
      (!f.from || t.date >= f.from) &&
      (!f.to || t.date <= f.to) &&
      (t.source === 'japan' || t.players >= f.minPlayers),
  );
}

/** Archetype mask: false for archetypes hidden by the rotation toggle. */
export function archetypeMask(d: Dataset, f: Filters): boolean[] {
  return d.archetypes.map((a) => !(f.hideRotating && a.rotation?.status === 'rotates'));
}

export interface ArchetypeStats {
  archetype: number;
  players: number;
  share: number;
  topCut: number;
  /** Share of all top-cut slots held by this archetype. */
  topCutShare: number;
  /** topCut / players: how often a pilot makes the cut. */
  conversion: number;
  wins: number;
  losses: number;
  ties: number;
  /** Win rate vs other decks from pairings (mirrors excluded), ties as half; null without games. */
  winRate: number | null;
  wins1st: number;
}

export interface MetaSummary {
  tournaments: number;
  players: number;
  /** Players with a known archetype — the denominator for shares. */
  identified: number;
  topCutSlots: number;
  rows: ArchetypeStats[];
}

export function winRate(w: number, l: number, t: number): number | null {
  const games = w + l + t;
  return games ? (w + t / 2) / games : null;
}

export function metaSummary(d: Dataset, f: Filters): MetaSummary {
  const mask = tournamentMask(d, f);
  const keep = archetypeMask(d, f);
  const by = new Map<number, ArchetypeStats>();
  let players = 0, identified = 0, topCutSlots = 0;
  for (const [ti, a, placing] of d.results) {
    if (!mask[ti] || (a >= 0 && !keep[a])) continue;
    players++;
    const inCut = placing > 0 && placing <= cutSize(f.topCut, d.tournaments[ti].players);
    if (a < 0) continue;
    identified++;
    if (inCut) topCutSlots++;
    let s = by.get(a);
    if (!s) by.set(a, (s = { archetype: a, players: 0, share: 0, topCut: 0, topCutShare: 0, conversion: 0, wins: 0, losses: 0, ties: 0, winRate: null, wins1st: 0 }));
    s.players++;
    if (inCut) s.topCut++;
    if (placing === 1) s.wins1st++;
  }
  // Win rate from head-to-head games against other decks (mirrors excluded). Standings
  // records include byes and drops, which skew every deck below 50%.
  for (const [ti, a, b, o] of d.matches) {
    if (!mask[ti]) continue;
    const sa = by.get(a), sb = by.get(b);
    if (o === 1) { if (sa) sa.wins++; if (sb) sb.losses++; }
    else if (o === -1) { if (sa) sa.losses++; if (sb) sb.wins++; }
    else { if (sa) sa.ties++; if (sb) sb.ties++; }
  }
  const rows = [...by.values()];
  for (const s of rows) {
    s.share = s.players / identified;
    s.topCutShare = topCutSlots ? s.topCut / topCutSlots : 0;
    s.conversion = s.topCut / s.players;
    s.winRate = winRate(s.wins, s.losses, s.ties);
  }
  rows.sort((x, y) => y.players - x.players || x.archetype - y.archetype);
  return { tournaments: mask.filter(Boolean).length, players, identified, topCutSlots, rows };
}

/** Monday of the ISO week containing `date` (YYYY-MM-DD). */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export interface TrendSeries {
  weeks: string[];
  /** archetype idx -> share per week (null = no data that week). */
  series: { archetype: number; values: (number | null)[] }[];
  totals: number[];
}

export function metaTrend(d: Dataset, f: Filters, archetypes: number[]): TrendSeries {
  const mask = tournamentMask(d, f);
  const weekIdx = new Map<string, number>();
  const weekOf = d.tournaments.map((t, i) => (mask[i] ? weekStart(t.date) : ''));
  const weeks = [...new Set(weekOf.filter(Boolean))].sort();
  weeks.forEach((w, i) => weekIdx.set(w, i));
  const totals = weeks.map(() => 0);
  const counts = new Map(archetypes.map((a) => [a, weeks.map(() => 0)]));
  const keep = archetypeMask(d, f);
  for (const [ti, a] of d.results) {
    if (!mask[ti] || a < 0 || !keep[a]) continue;
    const wi = weekIdx.get(weekOf[ti])!;
    totals[wi]++;
    const c = counts.get(a);
    if (c) c[wi]++;
  }
  return {
    weeks,
    totals,
    series: archetypes.map((a) => ({ archetype: a, values: counts.get(a)!.map((c, i) => (totals[i] ? c / totals[i] : null)) })),
  };
}

export interface MatchupCell {
  wins: number;
  losses: number;
  ties: number;
  games: number;
  winRate: number | null;
}

/** Matrix[i][j] = results of archetypes[i] against archetypes[j]. */
export function matchupMatrix(d: Dataset, f: Filters, archetypes: number[]): MatchupCell[][] {
  const mask = tournamentMask(d, f);
  const pos = new Map(archetypes.map((a, i) => [a, i]));
  const m = archetypes.map(() => archetypes.map(() => ({ wins: 0, losses: 0, ties: 0, games: 0, winRate: null as number | null })));
  for (const [ti, a, b, outcome] of d.matches) {
    if (!mask[ti]) continue;
    const i = pos.get(a), j = pos.get(b);
    if (i == null || j == null) continue;
    const ab = m[i][j], ba = m[j][i];
    if (outcome === 1) { ab.wins++; ba.losses++; }
    else if (outcome === -1) { ab.losses++; ba.wins++; }
    else { ab.ties++; ba.ties++; }
  }
  for (const row of m) for (const c of row) {
    c.games = c.wins + c.losses + c.ties;
    c.winRate = winRate(c.wins, c.losses, c.ties);
  }
  return m;
}

export interface CardUsage {
  card: number;
  /** Share of lists that include the card. */
  inclusion: number;
  /** Average copies among lists that include it. */
  avgCount: number;
  /** copies -> number of lists */
  distribution: Map<number, number>;
}

export function cardUsage(
  d: Dataset,
  lists: ArchetypeLists,
  f: Filters,
  topCutOnly: boolean,
): { lists: number; cards: CardUsage[] } {
  const mask = tournamentMask(d, f);
  const by = new Map<number, CardUsage>();
  let n = 0;
  for (const [ti, placing, cards] of lists.lists) {
    if (!mask[ti]) continue;
    if (topCutOnly && !(placing > 0 && placing <= cutSize(f.topCut, d.tournaments[ti].players))) continue;
    n++;
    for (const [ci, count] of cards) {
      let u = by.get(ci);
      if (!u) by.set(ci, (u = { card: ci, inclusion: 0, avgCount: 0, distribution: new Map() }));
      u.avgCount += count;
      u.inclusion++;
      u.distribution.set(count, (u.distribution.get(count) ?? 0) + 1);
    }
  }
  const cards = [...by.values()];
  for (const u of cards) {
    u.avgCount /= u.inclusion;
    u.inclusion /= n;
  }
  cards.sort((a, b) => b.inclusion - a.inclusion || b.avgCount - a.avgCount);
  return { lists: n, cards };
}

/** Results of one archetype, newest first, for its detail page. */
export function archetypeResults(d: Dataset, f: Filters, archetype: number): ResultRow[] {
  const mask = tournamentMask(d, f);
  return d.results
    .filter(([ti, a]) => a === archetype && mask[ti])
    .sort((x, y) => x[0] - y[0] || (x[2] || Infinity) - (y[2] || Infinity));
}

/** Limitless's catch-all bucket for unrecognised decks: kept in tables, left out of rankings. */
export const isOther = (d: Dataset, a: number) => d.archetypes[a]?.key === 'other';

export function formatsIn(d: Dataset): string[] {
  return [...new Set(d.tournaments.map((t) => t.format))].sort();
}

// ---------- Field planner ----------

/** Shrink a matchup toward 50% so small samples don't dominate: k phantom games at 50%. */
export const SHRINK_GAMES = 10;
export const shrunk = (w: number, l: number, t: number, k = SHRINK_GAMES) => (w + t / 2 + k / 2) / (w + l + t + k);

export interface FieldEntry {
  archetype: number;
  /** Expected share of opponents, 0–1. Entries plus `other` should sum to 1. */
  share: number;
}

export interface FieldResult {
  archetype: number;
  /** Expected match win rate against the field. */
  expected: number;
  /** Share of the field covered by matchups with at least `minGames` real games. */
  coverage: number;
  games: number;
  /** Per-opponent contribution, for the breakdown view. */
  vs: { archetype: number; share: number; winRate: number; games: number }[];
  /** Win rate against everything outside the listed field (from all its games). */
  vsOther: number;
}

/**
 * Expected win rate of each candidate deck against an expected field. Matchups use shrunk win
 * rates; mirrors count as 50%; the unlisted "other" slice uses the deck's overall win rate.
 */
export function fieldWinRates(
  d: Dataset,
  f: Filters,
  field: FieldEntry[],
  other: number,
  candidates: number[],
  minGames = 10,
): FieldResult[] {
  const mask = tournamentMask(d, f);
  const ids = [...new Set([...candidates, ...field.map((e) => e.archetype)])];
  const m = matchupMatrix(d, f, ids);
  const pos = new Map(ids.map((a, i) => [a, i]));
  const overall = new Map<number, [number, number, number]>();
  for (const [ti, a, b, o] of d.matches) {
    if (!mask[ti]) continue;
    for (const [x, r] of [[a, o], [b, -o]] as const) {
      const s = overall.get(x) ?? [0, 0, 0];
      if (r === 1) s[0]++; else if (r === -1) s[1]++; else s[2]++;
      overall.set(x, s);
    }
  }
  return candidates
    .map((a) => {
      const i = pos.get(a)!;
      let expected = 0, covered = 0, games = 0;
      const vs = field.map((e) => {
        if (e.archetype === a) { expected += e.share * 0.5; covered += e.share; return { archetype: e.archetype, share: e.share, winRate: 0.5, games: 0 }; }
        const c = m[i][pos.get(e.archetype)!];
        const wr = shrunk(c.wins, c.losses, c.ties);
        expected += e.share * wr;
        games += c.games;
        if (c.games >= minGames) covered += e.share;
        return { archetype: e.archetype, share: e.share, winRate: wr, games: c.games };
      });
      const o = overall.get(a) ?? [0, 0, 0];
      const vsOther = shrunk(o[0], o[1], o[2]);
      expected += other * vsOther;
      return { archetype: a, expected, coverage: covered / Math.max(1e-9, 1 - other), games, vs, vsOther };
    })
    .sort((x, y) => y.expected - x.expected);
}
