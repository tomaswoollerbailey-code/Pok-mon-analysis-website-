import { isBasicEnergy, normaliseCardName } from './cardname';
import type { CollectionCard } from './csv';
import type { ArchetypeLists, CardCategory, ListRow } from './types';

/** Copies owned per normalised card name. Any printing counts toward building a deck. */
export function ownedByName(cards: CollectionCard[]): Map<string, number> {
  const owned = new Map<string, number>();
  for (const c of cards) {
    const k = normaliseCardName(c.name);
    owned.set(k, (owned.get(k) ?? 0) + c.qty);
  }
  return owned;
}

/** Merge new cards into a collection, adding quantities for the same printing. */
export function mergeCollection(base: CollectionCard[], add: CollectionCard[]): CollectionCard[] {
  const key = (c: CollectionCard) => `${normaliseCardName(c.name)}|${(c.set ?? '').toUpperCase()}|${c.number ?? ''}`;
  const out = new Map(base.map((c) => [key(c), { ...c }]));
  for (const c of add) {
    const k = key(c);
    const cur = out.get(k);
    if (cur) cur.qty += c.qty;
    else out.set(k, { ...c });
  }
  return [...out.values()];
}

export interface Missing {
  name: string;
  category: CardCategory;
  need: number;
  have: number;
}

export interface Completion {
  total: number;
  owned: number;
  pct: number;
  missing: Missing[];
}

export function listCompletion(
  lists: ArchetypeLists,
  row: ListRow,
  owned: Map<string, number>,
  assumeBasicEnergy: boolean,
): Completion {
  const need = new Map<string, { name: string; category: CardCategory; count: number }>();
  for (const [ci, count] of row[2]) {
    const c = lists.cards[ci];
    const k = normaliseCardName(c.name);
    const cur = need.get(k);
    if (cur) cur.count += count;
    else need.set(k, { name: c.name, category: c.category, count });
  }
  let total = 0, have = 0;
  const missing: Missing[] = [];
  for (const [k, n] of need) {
    total += n.count;
    const h = assumeBasicEnergy && isBasicEnergy(k) ? n.count : Math.min(n.count, owned.get(k) ?? 0);
    have += h;
    if (h < n.count) missing.push({ name: n.name, category: n.category, need: n.count, have: h });
  }
  const order: CardCategory[] = ['pokemon', 'trainer', 'energy'];
  missing.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || (b.need - b.have) - (a.need - a.have));
  return { total, owned: have, pct: total ? have / total : 0, missing };
}

export interface BestList {
  row: ListRow;
  completion: Completion;
}

/**
 * The real decklist for this archetype that the collection gets closest to, among its
 * best-placing recent lists (`candidates` tournament indices are newest-first in the dataset).
 */
export function closestList(
  lists: ArchetypeLists,
  owned: Map<string, number>,
  opts: { assumeBasicEnergy: boolean; allowed?: (tournamentIdx: number) => boolean; candidates?: number },
): BestList | null {
  const pool = lists.lists
    .filter((r) => !opts.allowed || opts.allowed(r[0]))
    .sort((a, b) => a[0] - b[0] || (a[1] || 1e9) - (b[1] || 1e9))
    .slice(0, opts.candidates ?? 40);
  let best: BestList | null = null;
  for (const row of pool) {
    const completion = listCompletion(lists, row, owned, opts.assumeBasicEnergy);
    if (!best || completion.pct > best.completion.pct) best = { row, completion };
  }
  return best;
}

/** Decklist text (Pokémon TCG Live format) for the missing cards, for shopping lists or trades. */
export function missingAsText(missing: Missing[]): string {
  const label: Record<CardCategory, string> = { pokemon: 'Pokémon', trainer: 'Trainer', energy: 'Energy' };
  return (['pokemon', 'trainer', 'energy'] as CardCategory[])
    .map((cat) => {
      const rows = missing.filter((m) => m.category === cat);
      if (!rows.length) return '';
      return `${label[cat]}: ${rows.reduce((s, m) => s + m.need - m.have, 0)}\n${rows.map((m) => `${m.need - m.have} ${m.name}`).join('\n')}`;
    })
    .filter(Boolean)
    .join('\n\n');
}
