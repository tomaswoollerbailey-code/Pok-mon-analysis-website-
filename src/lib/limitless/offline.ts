// HTML parsers for limitlesstcg.com (in-person events: Regionals, ICs, Worlds, ...).
// limitlesstcg.com has no public JSON API, so these read the rendered pages.
// They map table columns by header text rather than position so small layout
// changes on the site don't silently shift data into the wrong field.
import * as cheerio from 'cheerio';
import type { Card, CardCategory, RawStanding } from '../types';

export const LIMITLESS_SITE = 'https://limitlesstcg.com';

type $ = cheerio.CheerioAPI;
type Row = ReturnType<$>;

export interface OfflineTournamentSummary {
  id: string;
  name: string;
  date: string;
  players: number;
  format?: string;
  country?: string;
  url: string;
}

export interface OfflineStanding extends RawStanding {
  /** limitlesstcg.com decklist id, when the player's list is public. */
  listId?: string;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Parse "2024-08-16", "16 Aug 24", "16th August 2024", "Aug 16, 2024" into YYYY-MM-DD. */
export function parseDate(text: string): string | null {
  const t = text.trim();
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const pad = (n: number) => String(n).padStart(2, '0');
  const fullYear = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));
  const dmy = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{2,4})/);
  if (dmy && MONTHS[dmy[2].toLowerCase()]) {
    return `${fullYear(dmy[3])}-${pad(MONTHS[dmy[2].toLowerCase()])}-${pad(Number(dmy[1]))}`;
  }
  const mdy = t.match(/([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})/);
  if (mdy && MONTHS[mdy[1].toLowerCase()]) {
    return `${fullYear(mdy[3])}-${pad(MONTHS[mdy[1].toLowerCase()])}-${pad(Number(mdy[2]))}`;
  }
  return null;
}

function toInt(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.replace(/,/g, '').match(/\d+/);
  return m ? Number(m[0]) : null;
}

function headerIndex($: $, table: Row): Record<string, number> {
  const idx: Record<string, number> = {};
  let headers = table.find('thead th');
  if (!headers.length) headers = table.find('tr').first().find('th');
  headers.each((i, th) => {
    const h = $(th).text().trim().toLowerCase();
    const set = (k: string) => { if (idx[k] == null) idx[k] = i; };
    if (h === '#' || h.startsWith('place') || h.startsWith('rank') || h === 'pos') set('placing');
    else if (h.startsWith('name') || h.startsWith('player')) set('name');
    else if (h.startsWith('country') || h === 'nat' || h.startsWith('nation')) set('country');
    else if (h.startsWith('deck') || h.startsWith('archetype')) set('deck');
    else if (h.startsWith('list')) set('list');
    else if (h.startsWith('record') || h === 'w-l-t') set('record');
    else if (h.startsWith('points') || h === 'pts') set('points');
    else if (h.startsWith('date')) set('date');
    else if (h.startsWith('tournament') || h.startsWith('event')) set('tournament');
    else if (h.startsWith('format')) set('format');
    // Count column on list pages; also matches the name branch above when it comes first.
    if (h === 'players' || h === 'size' || h.startsWith('attend')) set('playerCount');
  });
  return idx;
}

function bodyRows($: $, table: Row): Row[] {
  const rows: Row[] = [];
  table.find('tr').each((_, tr) => {
    const row = $(tr);
    if (row.find('td').length) rows.push(row);
  });
  return rows;
}

function countryOf(cell: Row | undefined): string | undefined {
  if (!cell || !cell.length) return undefined;
  const img = cell.find('img').first();
  const fromImg = img.attr('alt') || img.attr('title') || img.attr('data-tooltip');
  const fromSrc = img.attr('src')?.match(/\/([A-Z]{2})\.(?:png|svg|webp)/i)?.[1];
  const text = (fromImg || fromSrc || cell.text()).trim();
  return text ? text.toUpperCase() : undefined;
}

/** Parse a limitlesstcg.com tournament list page. */
export function parseTournamentList(html: string): OfflineTournamentSummary[] {
  const $ = cheerio.load(html);
  const out = new Map<string, OfflineTournamentSummary>();
  $('table').each((_, t) => {
    const table = $(t);
    const idx = headerIndex($, table);
    for (const row of bodyRows($, table)) {
      const link = row.find('a[href]').filter((_, a) => /\/tournaments\/\d+\/?$/.test($(a).attr('href') || '')).first();
      if (!link.length) continue;
      const id = (link.attr('href') || '').match(/\/tournaments\/(\d+)/)![1];
      const cells = row.find('td');
      const cell = (k: string) => (idx[k] != null ? cells.eq(idx[k]) : undefined);
      const date =
        parseDate(row.attr('data-date') || '') ??
        parseDate(cell('date')?.text() || '') ??
        cells.toArray().map((c) => parseDate($(c).text())).find(Boolean) ?? null;
      if (!date) continue;
      const name = (row.attr('data-name') || link.text() || cell('tournament')?.text() || '').trim();
      const players = toInt(row.attr('data-players')) ?? toInt(cell('playerCount')?.text()) ?? 0;
      const format = (row.attr('data-format') || cell('format')?.text() || '').trim() || undefined;
      const country = row.attr('data-country')?.toUpperCase() || countryOf(cell('country'));
      out.set(id, {
        id,
        name,
        date,
        players,
        ...(format ? { format: format.toUpperCase() } : {}),
        ...(country ? { country } : {}),
        url: `${LIMITLESS_SITE}/tournaments/${id}`,
      });
    }
  });
  return [...out.values()];
}

function deckOf($: $, row: Row, cell: Row | undefined): RawStanding['archetype'] {
  const scope = cell && cell.length ? cell : row;
  const link = scope.find('a[href*="/decks/"]').filter((_, a) => !/\/decks\/list\//.test($(a).attr('href') || '')).first();
  const dataDeck = row.attr('data-deck')?.trim();
  const imgs = (link.length ? link : scope).find('img');
  const fromTitle = (link.attr('title') || link.attr('data-tooltip') || '').trim();
  const fromText = link.text().trim() || (cell?.text().trim() ?? '');
  const fromImgs = imgs.toArray().map((i) => ($(i).attr('alt') || '').trim()).filter(Boolean).join(' ');
  const name = dataDeck || fromTitle || fromText || fromImgs;
  if (!name) return null;
  const id = link.attr('href')?.match(/\/decks\/([^/?#]+)/)?.[1];
  return { ...(id ? { id } : {}), name };
}

/** Parse the standings table on a limitlesstcg.com/tournaments/{id} page. */
export function parseStandings(html: string): OfflineStanding[] {
  const $ = cheerio.load(html);
  let best: OfflineStanding[] = [];
  $('table').each((_, t) => {
    const table = $(t);
    const idx = headerIndex($, table);
    if (idx.name == null && idx.placing == null) return;
    const rows: OfflineStanding[] = [];
    bodyRows($, table).forEach((row, i) => {
      const cells = row.find('td');
      const cell = (k: string) => (idx[k] != null ? cells.eq(idx[k]) : undefined);
      const name = (row.attr('data-name') || cell('name')?.text() || '').trim();
      if (!name) return;
      const placing = toInt(row.attr('data-placing')) ?? toInt(cell('placing')?.text()) ?? null;
      const recordText = cell('record')?.text() ?? cells.toArray().map((c) => $(c).text()).find((x) => /^\s*\d+\s*-\s*\d+\s*-\s*\d+\s*$/.test(x));
      const rec = recordText?.match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);
      const listHref = row.find('a[href*="/decks/list/"]').first().attr('href');
      const country = row.attr('data-country')?.toUpperCase() || countryOf(cell('country'));
      rows.push({
        playerId: String(i),
        name,
        ...(country ? { country } : {}),
        placing,
        ...(rec ? { record: { wins: +rec[1], losses: +rec[2], ties: +rec[3] } } : {}),
        archetype: deckOf($, row, cell('deck')),
        ...(listHref ? { listId: listHref.match(/\/decks\/list\/([^/?#]+)/)![1] } : {}),
      });
    });
    if (rows.length > best.length) best = rows;
  });
  return best;
}

/** Pull tournament metadata (name, date, player count) from a tournament page header. */
export function parseTournamentHeader(html: string): { name?: string; date?: string; players?: number; format?: string } {
  const $ = cheerio.load(html);
  const name = ($('.infobox-heading').first().text() || $('h1').first().text() || $('title').text().split('|')[0]).trim();
  const info = ($('.infobox-line').text() || $('.infobox').text() || $('body').text()).replace(/\s+/g, ' ');
  const date = parseDate(info) ?? undefined;
  const players = toInt(info.match(/(\d[\d,]*)\s+Players/i)?.[1]) ?? undefined;
  const format = info.match(/\b(Standard|Expanded|GLC|Unlimited)\b/i)?.[1]?.toUpperCase();
  return { ...(name ? { name } : {}), ...(date ? { date } : {}), ...(players ? { players } : {}), ...(format ? { format } : {}) };
}

const SECTION: Array<[RegExp, CardCategory]> = [
  [/pok[eé]mon/i, 'pokemon'],
  [/trainer/i, 'trainer'],
  [/energy/i, 'energy'],
];

/** Parse a limitlesstcg.com/decks/list/{id} page into cards. */
export function parseDecklist(html: string): Card[] {
  const $ = cheerio.load(html);
  const cards: Card[] = [];
  const columns = $('.decklist-column, .decklist-section, [class*="decklist"] > div').filter((_, el) =>
    SECTION.some(([re]) => re.test($(el).children().first().text())),
  );
  columns.each((_, col) => {
    const heading = $(col).children().first().text();
    const category = SECTION.find(([re]) => re.test(heading))?.[1];
    if (!category) return;
    $(col).find('.decklist-card, [class*="card"]').each((_, el) => {
      const node = $(el);
      if (node.find('.decklist-card').length) return; // container, not a card
      const count = toInt(node.find('.card-count').text() || node.attr('data-count'));
      const name = (node.find('.card-name').text() || node.attr('data-name') || '').trim();
      if (!count || !name) return;
      const set = node.attr('data-set')?.trim();
      const number = node.attr('data-number')?.trim();
      cards.push({ category, name, count, ...(set ? { set } : {}), ...(number ? { number } : {}) });
    });
  });
  if (cards.length) return cards;
  // Fallback: plain-text export in a <textarea>/<pre> ("4 Charizard ex OBF 125").
  const text = $('textarea, pre').first().text();
  let category: CardCategory = 'pokemon';
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const sec = SECTION.find(([re]) => re.test(line) && !/^\d/.test(line));
    if (sec) { category = sec[1]; continue; }
    const m = line.match(/^(\d+)\s+(.+?)(?:\s+([A-Z0-9-]{2,6})\s+(\w+))?$/);
    if (!m) continue;
    cards.push({
      category,
      name: m[2],
      count: Number(m[1]),
      ...(m[3] && category === 'pokemon' ? { set: m[3], number: m[4] } : {}),
    });
  }
  return cards;
}
