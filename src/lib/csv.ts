// Collection CSV import. Collection apps (Collectr, TCGplayer, TCG Collector, Dragon Shield,
// Eyevo, ...) all export slightly different columns, so columns are detected by header name
// and the user can override the mapping.

/** RFC 4180-ish parser: quoted fields, escaped quotes, CRLF, BOM; delimiter auto-detected. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const delim = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

export type Field = 'quantity' | 'name' | 'set' | 'number' | 'game';
export type ColumnMap = Partial<Record<Field, number>>;

export const FIELD_LABELS: Record<Field, string> = {
  quantity: 'Quantity',
  name: 'Card name',
  set: 'Set',
  number: 'Card number',
  game: 'Game / category',
};

// Most specific first: "Simple Name" (no variant suffix) beats "Product Name".
const ALIASES: Record<Field, string[]> = {
  quantity: ['quantity', 'qty', 'count', 'total quantity', 'number owned', 'owned', 'copies', 'have', 'amount', 'add to quantity'],
  name: ['simple name', 'card name', 'name', 'product name', 'card', 'title', 'product'],
  set: ['set code', 'set id', 'set', 'set name', 'expansion', 'edition', 'series'],
  number: ['card number', 'collector number', 'number', 'card no', 'card #', 'no', 'no.', '#'],
  game: ['category', 'product line', 'game', 'tcg'],
};

export function detectColumns(headers: string[]): ColumnMap {
  const h = headers.map((x) => x.trim().toLowerCase().replace(/\s+/g, ' '));
  const map: ColumnMap = {};
  const used = new Set<number>();
  for (const field of Object.keys(ALIASES) as Field[]) {
    for (const alias of ALIASES[field]) {
      const i = h.findIndex((x, j) => x === alias && !used.has(j));
      if (i >= 0) { map[field] = i; used.add(i); break; }
    }
  }
  return map;
}

export interface CollectionCard {
  name: string;
  set?: string;
  number?: string;
  qty: number;
}

export interface ImportResult {
  cards: CollectionCard[];
  skipped: number;
  otherGames: number;
}

export function rowsToCollection(rows: string[][], map: ColumnMap): ImportResult {
  const cards: CollectionCard[] = [];
  let skipped = 0, otherGames = 0;
  for (const r of rows) {
    const name = map.name != null ? r[map.name]?.trim() : '';
    if (!name) { skipped++; continue; }
    if (map.game != null) {
      const g = (r[map.game] ?? '').toLowerCase();
      if (g && !g.includes('pok')) { otherGames++; continue; }
    }
    const qtyText = map.quantity != null ? r[map.quantity] : '1';
    const qty = qtyText == null || qtyText.trim() === '' ? 1 : Number(qtyText.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(qty) || qty <= 0) { skipped++; continue; }
    const set = map.set != null ? r[map.set]?.trim() : '';
    const number = map.number != null ? r[map.number]?.trim().replace(/\/.*$/, '').replace(/^#/, '') : '';
    cards.push({ name, qty: Math.round(qty), ...(set ? { set } : {}), ...(number ? { number } : {}) });
  }
  return { cards, skipped, otherGames };
}
