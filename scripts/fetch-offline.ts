// Scrape in-person tournaments from limitlesstcg.com into data/raw/offline/.
//   npm run fetch:offline -- --days 365 --min-players 64
// The site has no JSON API, so requests are slow and spaced out on purpose.
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  LIMITLESS_SITE, parseDecklist, parseStandings, parseTournamentHeader, parseTournamentList,
} from '../src/lib/limitless/offline';
import type { RawTournament } from '../src/lib/types';
import { RAW_DIR, createFetcher, exists, isoDaysAgo, writeJson } from './util';

const { values: args } = parseArgs({ options: {
  days: { type: 'string', default: '365' },
  'min-players': { type: 'string', default: '0' },
  format: { type: 'string', default: 'STANDARD' },
  'list-url': { type: 'string', default: `${LIMITLESS_SITE}/tournaments?time=all&show=500` },
  'no-decklists': { type: 'boolean', default: false },
  delay: { type: 'string', default: '1000' },
  refresh: { type: 'boolean', default: false },
} });

const since = isoDaysAgo(Number(args.days));
const minPlayers = Number(args['min-players']);
const wantFormat = args.format?.toUpperCase();
const withLists = !args['no-decklists'];
const get = createFetcher({ delayMs: Number(args.delay) });
const dir = join(RAW_DIR, 'offline');

const listHtml: string = await get(args['list-url']!, 'text');
const all = parseTournamentList(listHtml);
const tournaments = all.filter(
  (t) => t.date >= since && t.players >= minPlayers && (!wantFormat || !t.format || t.format.includes(wantFormat)),
);
console.log(`Found ${tournaments.length} of ${all.length} listed offline tournaments since ${since}`);
if (!all.length) console.warn('  No tournaments parsed — the limitlesstcg.com layout may have changed (see src/lib/limitless/offline.ts).');

let fetched = 0, skipped = 0;
for (const t of tournaments) {
  const file = join(dir, `${t.id}.json`);
  if (!args.refresh && (await exists(file))) { skipped++; continue; }
  try {
    const html: string = await get(t.url, 'text');
    const header = parseTournamentHeader(html);
    const standings = parseStandings(html);
    if (!standings.length) { console.warn(`  skip ${t.name}: no standings table found`); continue; }
    if (withLists) {
      for (const s of standings) {
        if (!s.listId) continue;
        try {
          s.decklist = parseDecklist(await get(`${LIMITLESS_SITE}/decks/list/${s.listId}`, 'text'));
        } catch (err: any) {
          console.warn(`    list ${s.listId}: ${err.message}`);
        }
      }
    }
    const raw: RawTournament = {
      source: 'offline',
      id: t.id,
      name: t.name || header.name || `Tournament ${t.id}`,
      date: t.date || header.date!,
      format: t.format || header.format || wantFormat || 'UNKNOWN',
      players: t.players || header.players || standings.length,
      url: t.url,
      ...(t.country ? { country: t.country } : {}),
      standings: standings.map(({ listId, ...s }) => s),
      fetchedAt: new Date().toISOString(),
    };
    await writeJson(file, raw);
    fetched++;
    console.log(`  ✓ ${raw.date} ${raw.name} (${raw.players} players, ${standings.length} standings)`);
  } catch (err: any) {
    console.warn(`  ✗ ${t.name}: ${err.message}`);
  }
}
console.log(`Offline: ${fetched} fetched, ${skipped} already cached`);
