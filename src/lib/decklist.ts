// Decklists for a deck page: top-finishing lists, identical lists grouped, and the
// Pokémon TCG Live text format for copying a list into the game.
import type { ArchetypeLists, CardCategory, CardInfo, Dataset, ListRow } from './types';

export interface DeckCard {
  category: CardCategory;
  name: string;
  set?: string;
  number?: string;
  count: number;
}

const ORDER: Record<CardCategory, number> = { pokemon: 0, trainer: 1, energy: 2 };
const byCategory = (a: DeckCard, b: DeckCard) => ORDER[a.category] - ORDER[b.category] || b.count - a.count || a.name.localeCompare(b.name);

/** A group of identical lists (same cards and counts; printings of a card are treated as the same). */
export interface ListGroup {
  /** The group's best-placed, then newest, list: the one shown. */
  row: ListRow;
  /** Lists in the group. */
  count: number;
  /** Distinct events they came from. */
  events: number;
  /** Best placing among them (0 when none has a recorded placing). */
  best: number;
}

/** One real list as cards, grouped and sorted for display. */
export function listCards(cards: CardInfo[], row: ListRow): DeckCard[] {
  return row[2].map(([ci, n]): DeckCard => ({ category: cards[ci].category, name: cards[ci].name, set: cards[ci].set, number: cards[ci].number, count: n })).sort(byCategory);
}

/** Lists that finished in the top `cut`, newest event first, then best placing. */
export function topLists(d: Dataset, l: ArchetypeLists, mask: boolean[], cut: number): ListRow[] {
  return l.lists
    .filter((r) => mask[r[0]] && r[1] > 0 && r[1] <= cut)
    .sort((a, b) => d.tournaments[b[0]].date.localeCompare(d.tournaments[a[0]].date) || a[1] - b[1] || d.tournaments[b[0]].players - d.tournaments[a[0]].players);
}

/** Identical lists grouped together, most-played first (ties: best finish, then newest). */
export function commonLists(d: Dataset, l: ArchetypeLists, mask: boolean[]): ListGroup[] {
  const groups = new Map<string, ListRow[]>();
  for (const r of l.lists) {
    if (!mask[r[0]]) continue;
    const counts = new Map<string, number>();
    for (const [ci, n] of r[2]) { const c = l.cards[ci]; counts.set(`${c.category}|${c.name}`, (counts.get(`${c.category}|${c.name}`) ?? 0) + n); }
    const sig = [...counts].sort(([x], [y]) => x.localeCompare(y)).join(';');
    (groups.get(sig) ?? groups.set(sig, []).get(sig)!).push(r);
  }
  const place = (r: ListRow) => r[1] || 1e9;
  const newest = (a: ListRow, b: ListRow) => d.tournaments[b[0]].date.localeCompare(d.tournaments[a[0]].date);
  return [...groups.values()]
    .map((rows): ListGroup => {
      const sorted = [...rows].sort((a, b) => place(a) - place(b) || newest(a, b));
      return { row: sorted[0], count: rows.length, events: new Set(rows.map((r) => r[0])).size, best: sorted[0][1] };
    })
    .sort((a, b) => b.count - a.count || (a.best || 1e9) - (b.best || 1e9) || newest(a.row, b.row));
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
