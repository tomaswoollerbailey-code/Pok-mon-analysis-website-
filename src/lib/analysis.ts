import type { ArchetypeLists, Dataset, ResultRow, Source } from './types';

export type TopCut = 'auto' | 'top8' | 'top16' | 'top32' | 'top10pct';

export interface Filters {
  /** Online and offline are analysed separately: they publish different data (see SOURCE_CAPS). */
  source: Source;
  format: string; // '' = any
  /** The Period chip: last N days counted back from the newest event (null = since the rotation). */
  periodDays: number | null;
  /** Derived from periodDays by the app; '' = open. */
  from: string; // YYYY-MM-DD
  to: string;
  minPlayers: number;
  /** No picker in the UI: always 'auto' (Top 8 online, Top 10% offline). */
  topCut: TopCut;
  /** Drop archetypes that rotate out at the next rotation (projected post-rotation meta). */
  hideRotating: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  source: 'online',
  format: 'STANDARD',
  periodDays: null,
  from: '',
  to: '',
  minPlayers: 0,
  topCut: 'auto',
  hideRotating: false,
};

export const TOP_CUT_LABELS: Record<TopCut, string> = {
  auto: 'Auto',
  top8: 'Top 8',
  top16: 'Top 16',
  top32: 'Top 32',
  top10pct: 'Top 10%',
};

/**
 * "Auto" picks a cut that means something for each event: Top 8 online, Top 10% at in-person
 * majors (a Top 8 of a 2,000-player Regional is 0.4% of the field).
 */
export function resolveCut(cut: TopCut, source: Source): Exclude<TopCut, 'auto'> {
  return cut !== 'auto' ? cut : source === 'offline' ? 'top10pct' : 'top8';
}

/** Label for the cut in use: "Top 8" online, "Top 10%" offline. */
export const cutLabel = (f: Pick<Filters, 'topCut' | 'source'>) => TOP_CUT_LABELS[resolveCut(f.topCut, f.source)];

export function cutSize(cut: Exclude<TopCut, 'auto'>, players: number): number {
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
      t.source === f.source &&
      (!f.format || t.format === f.format) &&
      (!f.from || t.date >= f.from) &&
      (!f.to || t.date <= f.to) &&
      t.players >= f.minPlayers,
  );
}

/** Archetype mask: false for archetypes hidden by the rotation toggle. */
export function archetypeMask(d: Dataset, f: Filters): boolean[] {
  return d.archetypes.map((a) => !(f.hideRotating && a.rotation?.status === 'rotates'));
}

/** What each source can show. Pages use this to hide metrics a source doesn't have. */
export const SOURCE_CAPS: Record<Source, { label: string; events: string; matchups: boolean; blurb: string }> = {
  online: {
    label: 'Online', events: 'online events', matchups: true,
    blurb: 'Limitless Play events with 32+ players.',
  },
  offline: {
    label: 'Offline', events: 'offline majors', matchups: false,
    blurb: 'Regionals, Internationals and Worlds. No win rates: these events don’t publish round-by-round results.',
  },
};

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
    const inCut = placing > 0 && placing <= cutSize(resolveCut(f.topCut, d.tournaments[ti].source), d.tournaments[ti].players);
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

export interface Mover {
  archetype: number;
  /** Share in the recent window and the window before it. */
  now: number;
  before: number;
  /** now − before, as a fraction (0.012 = +1.2 points). */
  delta: number;
  /** Players with the deck across both windows (sample size). */
  players: number;
  /** Weekly share over the selected period, for a sparkline. */
  spark: (number | null)[];
}

export interface Movers {
  /** Length of each window in days. */
  days: number;
  now: { from: string; to: string };
  before: { from: string; to: string };
  rows: Mover[];
}

/** Below this many players across both windows the change is flagged as a small sample. */
export const MOVER_MIN_PLAYERS = 20;

const shiftDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Window length in days for metaMovers (see below). */
export function moverWindow(f: Pick<Filters, 'periodDays' | 'source'>): number {
  const half = f.periodDays ? Math.ceil(f.periodDays / 2) : 28;
  return f.source === 'offline' ? Math.max(28, half) : half;
}

/**
 * Who is rising and falling: share in the last `days` (counting back from the latest event in the
 * filters) vs the `days` before. Rows are every named deck seen in either window, biggest change first.
 * Default window: half the chosen period (7, 15 or 45 days), or 4 weeks when the period is the whole
 * rotation. Offline events are sparse, so offline windows are at least 4 weeks.
 */
export function metaMovers(d: Dataset, f: Filters, days?: number): Movers | null {
  const mask = tournamentMask(d, f);
  const dates = d.tournaments.filter((_, i) => mask[i]).map((t) => t.date).sort();
  if (!dates.length) return null;
  const latest = dates[dates.length - 1];
  const w = days ?? moverWindow(f);
  const nowFrom = shiftDays(latest, -w + 1), beforeFrom = shiftDays(latest, -2 * w + 1);
  const keep = archetypeMask(d, f);
  const n = d.archetypes.length;
  const cNow = new Array(n).fill(0), cBefore = new Array(n).fill(0);
  let tNow = 0, tBefore = 0;
  for (const [ti, a] of d.results) {
    if (!mask[ti] || a < 0 || !keep[a]) continue;
    const date = d.tournaments[ti].date;
    if (date >= nowFrom) { tNow++; cNow[a]++; } else if (date >= beforeFrom) { tBefore++; cBefore[a]++; }
  }
  if (!tNow || !tBefore) return null;
  const candidates = d.archetypes.map((_, a) => a).filter((a) => !isOther(d, a) && cNow[a] + cBefore[a] > 0);
  const trend = metaTrend(d, f, candidates);
  const rows = candidates.map((a, i): Mover => {
    const now = cNow[a] / tNow, before = cBefore[a] / tBefore;
    return { archetype: a, now, before, delta: now - before, players: cNow[a] + cBefore[a], spark: trend.series[i].values };
  }).sort((x, y) => y.delta - x.delta);
  return { days: w, now: { from: nowFrom, to: latest }, before: { from: beforeFrom, to: shiftDays(nowFrom, -1) }, rows };
}

export interface ReportWinner {
  tournament: number;
  /** Winning archetype, or -1 when the winner's deck is unknown. */
  archetype: number;
}

export interface WeeklyReport {
  /** The seven days the report covers (ends on the newest online event). */
  from: string;
  to: string;
  events: number;
  players: number;
  /** Online decks by share this week, with how each moved vs the week before. */
  top: (ArchetypeStats & { before: number; delta: number })[];
  risers: Mover[];
  fallers: Mover[];
  /** Events from this window (online and offline), biggest first. */
  winners: ReportWinner[];
  /** Events the window held, before the list is cut down. */
  totalEvents: number;
}

/** Share change below this many points is not worth calling a riser or faller. */
const REPORT_MIN_DELTA = 0.002;

/**
 * The weekly report: the latest 7 days of online data against the 7 before it. Independent of the
 * user's filters (the page has none), so it reads the same for everyone and can be prerendered.
 */
export function weeklyReport(d: Dataset, base: Filters = DEFAULT_FILTERS): WeeklyReport | null {
  const online: Filters = { ...base, source: 'online', periodDays: null, from: '', to: '', minPlayers: 0 };
  const dates = d.tournaments.filter((_, i) => tournamentMask(d, online)[i]).map((t) => t.date).sort();
  if (!dates.length) return null;
  const to = dates[dates.length - 1], from = shiftDays(to, -6);
  const week: Filters = { ...online, from, to };
  const m = metaSummary(d, week);
  const movers = metaMovers(d, { ...online, from: shiftDays(to, -13) }, 7);
  if (!m.tournaments || !movers) return null;
  const move = new Map(movers.rows.map((r) => [r.archetype, r]));
  const top = m.rows
    .filter((r) => !isOther(d, r.archetype))
    .slice(0, 8)
    .map((r) => ({ ...r, before: move.get(r.archetype)?.before ?? 0, delta: move.get(r.archetype)?.delta ?? 0 }));
  const solid = movers.rows.filter((r) => r.players >= MOVER_MIN_PLAYERS);
  const risers = solid.filter((r) => r.delta >= REPORT_MIN_DELTA).slice(0, 3);
  const fallers = solid.filter((r) => r.delta <= -REPORT_MIN_DELTA).slice(-3).reverse();
  // Winners from every source in the window: offline majors are the headline results.
  const inWindow = d.tournaments.map((t, i) => [t, i] as const).filter(([t]) => t.format === online.format && t.date >= from && t.date <= to);
  const winnerOf = new Map<number, number>();
  for (const [ti, a, placing] of d.results) if (placing === 1) winnerOf.set(ti, a);
  const winners = inWindow
    .sort((x, y) => y[0].players - x[0].players)
    .slice(0, 8)
    .map(([, ti]): ReportWinner => ({ tournament: ti, archetype: winnerOf.get(ti) ?? -1 }));
  return { from, to, events: m.tournaments, players: m.players, top, risers, fallers, winners, totalEvents: inWindow.length };
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
    if (topCutOnly && !(placing > 0 && placing <= cutSize(resolveCut(f.topCut, d.tournaments[ti].source), d.tournaments[ti].players))) continue;
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
