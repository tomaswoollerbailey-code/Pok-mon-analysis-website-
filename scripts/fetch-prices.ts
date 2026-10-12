// Refresh card prices daily from the newest in-person and Japan decklists on limitlesstcg.com
// (each list shows TCGplayer USD and Cardmarket EUR per card), plus USD→EUR/MYR exchange rates.
// Writes data/raw/prices.json.
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { cardKey } from '../src/lib/archetype';
import { LIMITLESS_SITE, parseDecklist, parseStandings } from '../src/lib/limitless/offline';
import type { PricesFile, RawTournament } from '../src/lib/types';
import { RAW_DIR, createFetcher, listJson, readJson, writeJson } from './util';

const { values: args } = parseArgs({ options: {
  events: { type: 'string', default: '25' },
  'max-lists': { type: 'string', default: '200' },
  delay: { type: 'string', default: '800' },
} });

const get = createFetcher({ delayMs: Number(args.delay) });
const raw = (await Promise.all(['offline', 'japan'].map((s) => listJson(join(RAW_DIR, s))))).flat();
const events = (await Promise.all(raw.map((f) => readJson<RawTournament>(f))))
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, Number(args.events));

// One list per archetype per event, best placing first, until every archetype seen is covered a few times.
const picks: string[] = [];
const perArch = new Map<string, number>();
for (const t of events) {
  try {
    const standings = parseStandings(await get(t.url, 'text'));
    const seen = new Set<string>();
    for (const s of standings) {
      const a = s.archetype?.name ?? '';
      if (!s.listId || seen.has(a) || (perArch.get(a) ?? 0) >= 3) continue;
      seen.add(a);
      perArch.set(a, (perArch.get(a) ?? 0) + 1);
      picks.push(s.listId);
    }
  } catch (err: any) {
    console.warn(`  ✗ ${t.name}: ${err.message}`);
  }
}

const cards: PricesFile['cards'] = {};
let fetched = 0;
for (const id of picks.slice(0, Number(args['max-lists']))) {
  try {
    for (const c of parseDecklist(await get(`${LIMITLESS_SITE}/decks/list/${id}`, 'text'))) {
      const k = cardKey(c);
      if (c.price && !cards[k]) cards[k] = c.price; // newest event wins
    }
    fetched++;
  } catch (err: any) {
    console.warn(`  list ${id}: ${err.message}`);
  }
}

async function fx(): Promise<PricesFile['fx']> {
  const sources = [
    ['https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,MYR', (j: any) => ({ date: j.date, rates: j.rates })],
    ['https://api.frankfurter.app/latest?from=USD&to=EUR,MYR', (j: any) => ({ date: j.date, rates: j.rates })],
    ['https://open.er-api.com/v6/latest/USD', (j: any) => ({ date: new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10), rates: j.rates })],
  ] as const;
  for (const [url, read] of sources) {
    try {
      const { date, rates } = read(await get(url));
      if (rates?.MYR) return { date, source: new URL(url).host, usd: { EUR: rates.EUR, MYR: rates.MYR } };
    } catch (err: any) {
      console.warn(`  fx ${url}: ${err.message}`);
    }
  }
  return undefined;
}

const out: PricesFile = { fetchedAt: new Date().toISOString(), cards, fx: await fx() };
await writeJson(join(RAW_DIR, 'prices.json'), out, true);
console.log(`Prices: ${Object.keys(cards).length} cards from ${fetched} lists across ${events.length} events; FX ${out.fx ? `1 USD = ${out.fx.usd.MYR} MYR (${out.fx.date})` : 'unavailable'}`);
