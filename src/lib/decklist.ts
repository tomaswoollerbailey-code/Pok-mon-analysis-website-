// Decklists for a deck page: the "average list" across recent lists, recent top lists, and the
// Pokémon TCG Live text format for copying a list into the game.
import type { ArchetypeLists, CardCategory, CardInfo, Dataset, ListRow } from './types';

export interface DeckCard {
  category: CardCategory;
  name: string;
  set?: string;
  number?: string;
  count: number;
  /** Share of lists that play at least one copy (average list only). */
  inclusion?: number;
}

export interface AverageList {
  cards: DeckCard[];
  /** Lists the average was built from. */
  lists: number;
}

const ORDER: Record<CardCategory, number> = { pokemon: 0, trainer: 1, energy: 2 };
const byCategory = (a: DeckCard, b: DeckCard) => ORDER[a.category] - ORDER[b.category] || b.count - a.count || a.name.localeCompare(b.name);
const total = (rows: [number, number][]) => rows.reduce((s, [, n]) => s + n, 0);

/**
 * The average list: each card's mean copies across the lists (0 when a list doesn't play it),
 * rounded to whole cards so the total matches the lists' size (largest-remainder rounding).
 * Printings of the same card are merged and shown as the most-played printing.
 */
export function averageList(cards: CardInfo[], lists: ListRow[]): AverageList | null {
  if (!lists.length) return null;
  const groups = new Map<string, { category: CardCategory; name: string; copies: number; inLists: number; printings: Map<number, number> }>();
  for (const [, , rows] of lists) {
    const seen = new Set<string>();
    for (const [ci, n] of rows) {
      const c = cards[ci];
      const key = `${c.category}|${c.name}`;
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { category: c.category, name: c.name, copies: 0, inLists: 0, printings: new Map() }));
      g.copies += n;
      g.printings.set(ci, (g.printings.get(ci) ?? 0) + n);
      if (!seen.has(key)) { g.inLists++; seen.add(key); }
    }
  }
  const sizes = lists.map((l) => total(l[2])).sort((a, b) => a - b);
  const size = sizes[Math.floor(sizes.length / 2)]; // 60 for Standard
  const entries = [...groups.values()].map((g) => ({ g, mean: g.copies / lists.length }));
  const scale = size / entries.reduce((s, e) => s + e.mean, 0);
  const alloc = entries.map((e) => ({ ...e, want: e.mean * scale, count: Math.floor(e.mean * scale) }));
  let left = size - alloc.reduce((s, e) => s + e.count, 0);
  for (const e of [...alloc].sort((a, b) => (b.want - b.count) - (a.want - a.count) || b.g.inLists - a.g.inLists)) {
    if (left <= 0) break;
    e.count++; left--;
  }
  const out = alloc.filter((e) => e.count > 0).map((e): DeckCard => {
    const ci = [...e.g.printings.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return { category: e.g.category, name: e.g.name, set: cards[ci].set, number: cards[ci].number, count: e.count, inclusion: e.g.inLists / lists.length };
  });
  return { cards: out.sort(byCategory), lists: lists.length };
}

/** One real list as cards, grouped and sorted for display. */
export function listCards(cards: CardInfo[], row: ListRow): DeckCard[] {
  return row[2].map(([ci, n]): DeckCard => ({ category: cards[ci].category, name: cards[ci].name, set: cards[ci].set, number: cards[ci].number, count: n })).sort(byCategory);
}

/** The newest lists with the best placings, for the list picker. */
export function topLists(d: Dataset, l: ArchetypeLists, mask: boolean[], max = 10): ListRow[] {
  return l.lists
    .filter((r) => mask[r[0]] && r[1] > 0)
    .sort((a, b) => a[1] - b[1] || d.tournaments[b[0]].date.localeCompare(d.tournaments[a[0]].date) || d.tournaments[b[0]].players - d.tournaments[a[0]].players)
    .slice(0, max);
}

const HEAD: Record<CardCategory, string> = { pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' };

/** Pokémon TCG Live import format ("Pokémon: 12" then "4 Name SET 123" lines). */
export function deckText(list: DeckCard[]): string {
  const parts: string[] = [];
  for (const cat of ['pokemon', 'trainer', 'energy'] as const) {
    const cs = list.filter((c) => c.category === cat);
    if (!cs.length) continue;
    parts.push(`${HEAD[cat]}: ${cs.reduce((s, c) => s + c.count, 0)}`);
    for (const c of cs) parts.push([c.count, c.name, c.set, c.number].filter((x) => x != null && x !== '').join(' '));
    parts.push('');
  }
  return `${parts.join('\n').trimEnd()}\n\nTotal Cards: ${list.reduce((s, c) => s + c.count, 0)}\n`;
}
