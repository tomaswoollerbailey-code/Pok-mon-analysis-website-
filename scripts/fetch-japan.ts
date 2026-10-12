// Scrape official Japanese City League results (top finishers + decklists) from
// limitlesstcg.com/tournaments/jp into data/raw/japan/.
//   npm run fetch:japan -- --days 60
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { LIMITLESS_SITE, parseDecklist, parseJapanTournamentList, parseStandings } from '../src/lib/limitless/offline';
import type { RawTournament } from '../src/lib/types';
import { RAW_DIR, createFetcher, exists, isoDaysAgo, writeJson } from './util';

const { values: args } = parseArgs({ options: {
  days: { type: 'string', default: '60' },
  'max-tournaments': { type: 'string', default: '60' },
  'time-budget': { type: 'string', default: '25' },
  delay: { type: 'string', default: '1000' },
  refresh: { type: 'boolean', default: false },
} });

const since = isoDaysAgo(Number(args.days));
const maxTournaments = Number(args['max-tournaments']);
const deadline = Date.now() + Number(args['time-budget']) * 60_000;
const get = createFetcher({ delayMs: Number(args.delay) });
const dir = join(RAW_DIR, 'japan');

const all = parseJapanTournamentList(await get(`${LIMITLESS_SITE}/tournaments/jp?show=500`, 'text'));
const tournaments = all.filter((t) => t.date >= since);
console.log(`Found ${tournaments.length} of ${all.length} listed City Leagues since ${since}`);
if (!all.length) console.warn('  No tournaments parsed — the page layout may have changed (see src/lib/limitless/offline.ts).');

let fetched = 0, skipped = 0;
for (const t of tournaments) {
  if (fetched >= maxTournaments || Date.now() > deadline) { console.log('Reached the per-run limit; the rest will be fetched next run.'); break; }
  const file = join(dir, `${t.id}.json`);
  if (!args.refresh && (await exists(file))) { skipped++; continue; }
  try {
    const standings = parseStandings(await get(t.url, 'text'));
    if (!standings.length) { console.warn(`  skip ${t.name}: no standings table found`); continue; }
    for (const s of standings) {
      if (!s.listId) continue;
      try {
        s.decklist = parseDecklist(await get(`${LIMITLESS_SITE}/decks/list/${s.listId}`, 'text'));
      } catch (err: any) {
        console.warn(`    list ${s.listId}: ${err.message}`);
      }
    }
    const raw: RawTournament = {
      source: 'japan',
      id: t.id,
      name: t.name,
      date: t.date,
      format: 'STANDARD',
      // City Leagues only publish the top finishers; attendance isn't listed.
      players: standings.length,
      url: t.url,
      country: 'JP',
      ...(t.shop ? { organizer: t.shop } : {}),
      standings: standings.map(({ listId, ...s }) => s),
      fetchedAt: new Date().toISOString(),
    };
    await writeJson(file, raw);
    fetched++;
    console.log(`  ✓ ${raw.date} ${raw.name} (${standings.length} placings)`);
  } catch (err: any) {
    console.warn(`  ✗ ${t.name}: ${err.message}`);
  }
}
console.log(`Japan: ${fetched} fetched, ${skipped} already cached`);
