// Scrape in-person tournaments from limitlesstcg.com into data/raw/offline/.
//   npm run fetch:offline -- --min-players 64   (default: since the last rotation)
// The site has no JSON API, so requests are slow and spaced out on purpose.
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  LIMITLESS_SITE, parseDecklist, parseStandings, parseTournamentHeader, parseTournamentList,
} from '../src/lib/limitless/offline';
import type { RawTournament } from '../src/lib/types';
import { CURRENT_FORMAT } from '../src/lib/rotation';
import { RAW_DIR, createFetcher, exists, isoDaysAgo, readJson, writeJson } from './util';

const { values: args } = parseArgs({ options: {
  since: { type: 'string', default: CURRENT_FORMAT.inPerson },
  'min-players': { type: 'string', default: '0' },
  format: { type: 'string', default: 'STANDARD' },
  'list-url': { type: 'string', default: `${LIMITLESS_SITE}/tournaments?time=all&show=500` },
  'no-decklists': { type: 'boolean', default: false },
  delay: { type: 'string', default: '1000' },
  'max-tournaments': { type: 'string', default: '25' },
  'max-lists': { type: 'string', default: '64' },
  'time-budget': { type: 'string', default: '40' },
  refresh: { type: 'boolean', default: false },
} });

const since = args.since!;
const minPlayers = Number(args['min-players']);
const wantFormat = args.format?.toUpperCase();
const withLists = !args['no-decklists'];
const maxTournaments = Number(args['max-tournaments']);
const maxLists = Number(args['max-lists']);
const deadline = Date.now() + Number(args['time-budget']) * 60_000;
// Regionals run over a weekend, and Limitless can list one before the final standings are in. So an event is
// first saved the day after its listed date, and for the next few days each run re-reads its standings page
// (one request) and re-fetches the event if the standings changed. Older events are never re-read.
const settled = isoDaysAgo(1);
const recheckFrom = isoDaysAgo(4);
const rows = (ss: { name: string; placing?: number | null; record?: { wins: number; losses: number; ties: number } }[]) =>
  JSON.stringify(ss.map((s) => [s.name, s.placing ?? null, s.record?.wins ?? null, s.record?.losses ?? null, s.record?.ties ?? null]));
const get = createFetcher({ delayMs: Number(args.delay) });
const dir = join(RAW_DIR, 'offline');

const listHtml: string = await get(args['list-url']!, 'text');
const all = parseTournamentList(listHtml);
const tournaments = all.filter(
  (t) => t.date >= since && t.players >= minPlayers && (!wantFormat || !t.format || t.format.includes(wantFormat)),
);
console.log(`Found ${tournaments.length} of ${all.length} listed offline tournaments since ${since}`);
if (!all.length) console.warn('  No tournaments parsed — the limitlesstcg.com layout may have changed (see src/lib/limitless/offline.ts).');

let fetched = 0, skipped = 0, updated = 0;
for (const t of tournaments) {
  if (fetched >= maxTournaments || Date.now() > deadline) { console.log('Reached the per-run limit; the rest will be fetched next run.'); break; }
  const file = join(dir, `${t.id}.json`);
  const cached = !args.refresh && (await exists(file));
  if (cached && t.date < recheckFrom) { skipped++; continue; }
  if (!cached && t.date > settled) { console.log(`  wait ${t.name} (${t.date}): too recent, standings may not be in yet`); continue; }
  try {
    const html: string = await get(t.url, 'text');
    const header = parseTournamentHeader(html);
    const standings = parseStandings(html);
    if (!standings.length) { if (!cached) console.warn(`  skip ${t.name}: no standings table found`); continue; }
    if (cached) {
      const before = await readJson<RawTournament>(file);
      if (rows(before.standings) === rows(standings)) { skipped++; continue; }
      updated++;
      console.log(`  standings changed for ${t.name}, re-fetching`);
    }
    if (withLists) {
      // Lists are fetched best placing first, up to --max-lists per event.
      const withList = standings.filter((s) => s.listId).sort((a, b) => (a.placing ?? 1e9) - (b.placing ?? 1e9)).slice(0, maxLists);
      for (const s of withList) {
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
console.log(`Offline: ${fetched} fetched (${updated} re-fetched after the standings changed), ${skipped} already cached`);
