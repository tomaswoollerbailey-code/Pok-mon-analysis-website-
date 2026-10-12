import { cardKey } from './archetype';
import { normaliseCardName } from './cardname';
import type { ArchetypeLists, CardInfo, CardPrice, ListRow, PricesFile } from './types';

export type Currency = 'usd' | 'eur' | 'myr';

/** Attach current prices to a list file's cards; also record the cheapest printing of each name. */
export function attachPrices(cards: CardInfo[], prices: PricesFile['cards'], cheapestByName: Map<string, { usd?: number; eur?: number }>) {
  for (const c of cards) {
    const p = prices[cardKey(c)];
    if (p) c.price = p;
    const cheap = cheapestByName.get(normaliseCardName(c.name));
    if (cheap) c.cheapest = cheap;
  }
}

export function cheapestByName(prices: PricesFile['cards'], keyToName: Map<string, string>) {
  const out = new Map<string, { usd?: number; eur?: number }>();
  for (const [k, p] of Object.entries(prices)) {
    const name = keyToName.get(k);
    if (!name) continue;
    const n = normaliseCardName(name);
    const cur = out.get(n) ?? {};
    if (p.usd != null && (cur.usd == null || p.usd < cur.usd)) cur.usd = p.usd;
    if (p.eur != null && (cur.eur == null || p.eur < cur.eur)) cur.eur = p.eur;
    out.set(n, cur);
  }
  return out;
}

export interface ListCost {
  usd: number;
  eur: number;
  /** Copies with no price in that currency. */
  unpricedUsd: number;
  unpricedEur: number;
  copies: number;
}

export function listCost(cards: CardInfo[], row: ListRow, cheapest = false): ListCost {
  const cost: ListCost = { usd: 0, eur: 0, unpricedUsd: 0, unpricedEur: 0, copies: 0 };
  for (const [ci, n] of row[2]) {
    const c = cards[ci];
    const usd = cheapest ? c.cheapest?.usd ?? c.price?.usd : c.price?.usd;
    const eur = cheapest ? c.cheapest?.eur ?? c.price?.eur : c.price?.eur;
    cost.copies += n;
    if (usd != null) cost.usd += usd * n; else cost.unpricedUsd += n;
    if (eur != null) cost.eur += eur * n; else cost.unpricedEur += n;
  }
  return cost;
}

const median = (xs: number[]) => {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Median cost of an archetype's most recent lists (lists are newest-first by tournament index).
 * Lists with more than 10% of copies unpriced are left out so missing prices don't drag it down.
 */
export function archetypePrice(lists: ArchetypeLists, recent = 30): { usd?: number; eur?: number; lists: number } {
  const rows = [...lists.lists].sort((a, b) => a[0] - b[0]).slice(0, recent);
  const usd: number[] = [], eur: number[] = [];
  for (const r of rows) {
    const c = listCost(lists.cards, r);
    if (c.copies && c.unpricedUsd / c.copies <= 0.1) usd.push(c.usd);
    if (c.copies && c.unpricedEur / c.copies <= 0.1) eur.push(c.eur);
  }
  const u = median(usd), e = median(eur);
  return { ...(u != null ? { usd: round2(u) } : {}), ...(e != null ? { eur: round2(e) } : {}), lists: Math.max(usd.length, eur.length) };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** TCGplayer mass-entry link: opens the list in TCGplayer with live seller prices. */
export function tcgplayerMassEntry(cards: CardInfo[], row: ListRow): { url: string; missing: number } {
  const pairs: string[] = [];
  let missing = 0;
  for (const [ci, n] of row[2]) {
    const id = cards[ci].price?.tcgplayerId;
    if (id) pairs.push(`${n}-${id}`);
    else missing += n;
  }
  return { url: `https://www.tcgplayer.com/massentry?productline=Pokemon&c=${encodeURIComponent(pairs.join('||'))}`, missing };
}

export function convert(amount: { usd?: number; eur?: number }, currency: Currency, fx?: PricesFile['fx']): number | undefined {
  if (currency === 'usd') return amount.usd;
  if (currency === 'eur') return amount.eur;
  const rate = fx?.usd.MYR;
  return amount.usd != null && rate ? amount.usd * rate : undefined;
}

export function formatMoney(v: number | undefined, currency: Currency): string {
  if (v == null) return '—';
  const opts = { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: v >= 100 ? 0 : 2 } as const;
  return new Intl.NumberFormat(currency === 'eur' ? 'de-DE' : currency === 'myr' ? 'en-MY' : 'en-US', opts).format(v);
}

export type { CardPrice };
