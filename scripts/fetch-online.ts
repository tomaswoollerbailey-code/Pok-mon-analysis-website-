// Fetch online tournaments from the Limitless Play API into data/raw/online/.
//   npm run fetch:online -- --min-players 32 --format STANDARD   (default: since the last rotation)
// Set LIMITLESS_API_KEY if you have one (sent as X-Access-Key); public endpoints work without it.
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  PLAY_API, normaliseOnlineTournament,
  type ApiPairing, type ApiStanding, type ApiTournamentDetails, type ApiTournamentSummary,
} from '../src/lib/limitless/online';
import { CURRENT_FORMAT } from '../src/lib/rotation';
import { RAW_DIR, createFetcher, exists, readJson, writeJson } from './util';

const { values: args } = parseArgs({ options: {
  since: { type: 'string', default: CURRENT_FORMAT.online },
  'min-players': { type: 'string', default: '32' },
  format: { type: 'string', default: 'STANDARD' },
  game: { type: 'string', default: 'PTCG' },
  'max-tournaments': { type: 'string', default: '400' },
  delay: { type: 'string', default: '700' },
  'time-budget': { type: 'string', default: '30' },
  refresh: { type: 'boolean', default: false },
} });

const since = args.since!;
// Only completed events: skip anything that started in the last 12 hours.
const startedBefore = new Date(Date.now() - 12 * 3_600_000).toISOString();
const minPlayers = Number(args['min-players']);
const maxTournaments = Number(args['max-tournaments']);
const apiKey = process.env.LIMITLESS_API_KEY;
const get = createFetcher({ delayMs: Number(args.delay), headers: apiKey ? { 'X-Access-Key': apiKey } : {} });
const dir = join(RAW_DIR, 'online');
const deadline = Date.now() + Number(args['time-budget']) * 60_000;
// Events that can never be used (no decklists, no deck data, no final standings), so later runs
// don't spend requests on them again. Kept outside online/ so the dataset builder ignores it.
const skipFile = join(RAW_DIR, 'online-skipped.json');
const skipped: Record<string, string> = (await exists(skipFile)) ? await readJson(skipFile) : {};
const recent = new Date(Date.now() - 3 * 86_400_000).toISOString();

async function listTournaments(): Promise<ApiTournamentSummary[]> {
  const found: ApiTournamentSummary[] = [];
  for (let page = 1; page < 2000; page++) {
    const params = new URLSearchParams({ game: args.game!, limit: '50', page: String(page) });
    if (args.format) params.set('format', args.format);
    const batch: ApiTournamentSummary[] = await get(`${PLAY_API}/tournaments?${params}`);
    if (!batch.length) break;
    for (const t of batch) if (t.date.slice(0, 10) >= since && t.date < startedBefore && t.players >= minPlayers) found.push(t);
    // The API lists newest first; stop once a whole page is older than the window.
    if (batch.every((t) => t.date.slice(0, 10) < since)) break;
  }
  return found;
}

const listed = await listTournaments();
// Only events not cached yet count toward the per-run cap, so each run works further back in time.
const todo: ApiTournamentSummary[] = [];
for (const t of listed) {
  if (!args.refresh && (skipped[t.id] || (await exists(join(dir, `${t.id}.json`))))) continue;
  todo.push(t);
}
const tournaments = todo.slice(0, maxTournaments);
console.log(
  `Found ${listed.length} online ${args.format} tournaments since ${since} with ≥${minPlayers} players: ` +
    `${listed.length - todo.length} cached or unusable, ${todo.length} to fetch (this run: up to ${tournaments.length})`,
);

const skip = (t: ApiTournamentSummary, reason: string) => { skipped[t.id] = reason; console.log(`  skip ${t.name}: ${reason}`); };
let fetched = 0;
for (const t of tournaments) {
  if (Date.now() > deadline) { console.log('Reached the time budget; the rest will be fetched next run.'); break; }
  const file = join(dir, `${t.id}.json`);
  try {
    const details: ApiTournamentDetails = await get(`${PLAY_API}/tournaments/${t.id}/details`);
    if (details.decklists === false) { skip(t, 'no decklists'); continue; }
    const standings: ApiStanding[] = await get(`${PLAY_API}/tournaments/${t.id}/standings`);
    if (!standings.some((s) => s.deck?.name)) { skip(t, 'no deck data'); continue; }
    // A finished event has placings for (nearly) everyone. A recent one without them may still be
    // running, so try again next run; an older one with fewer than 8 placings never got final standings.
    const placed = standings.filter((s) => s.placing != null).length;
    if (t.date > recent && placed < standings.length * 0.5) { console.log(`  wait ${t.name}: not finished`); continue; }
    if (placed < Math.min(8, standings.length)) { skip(t, 'no final standings'); continue; }
    const pairings: ApiPairing[] = await get(`${PLAY_API}/tournaments/${t.id}/pairings`).catch(() => []);
    await writeJson(file, normaliseOnlineTournament({ ...t, ...details }, standings, pairings));
    fetched++;
    console.log(`  ✓ ${t.date.slice(0, 10)} ${t.name} (${t.players} players)`);
  } catch (err: any) {
    console.warn(`  ✗ ${t.name}: ${err.message}`);
  }
}
await writeJson(skipFile, skipped, true);
console.log(`Online: ${fetched} fetched, ${todo.length - fetched} left for later runs`);
