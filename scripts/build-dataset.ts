// Build public/data/ from data/raw/{online,offline}/*.json.
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildDataset } from '../src/lib/build';
import type { PricesFile, RawTournament } from '../src/lib/types';
import { OUT_DIR, RAW_DIR, exists, listJson, readJson, writeJson } from './util';

const files = (await Promise.all(['online', 'offline'].map((s) => listJson(join(RAW_DIR, s))))).flat();
const raw = await Promise.all(files.map((f) => readJson<RawTournament>(f)));
const pricesFile = join(RAW_DIR, 'prices.json');
const prices = (await exists(pricesFile)) ? await readJson<PricesFile>(pricesFile) : undefined;
const { dataset, lists, standings } = buildDataset(raw, undefined, undefined, prices);

await rm(join(OUT_DIR, 'lists'), { recursive: true, force: true });
await rm(join(OUT_DIR, 'standings'), { recursive: true, force: true });
await writeJson(join(OUT_DIR, 'dataset.json'), dataset);
for (const l of lists) await writeJson(join(OUT_DIR, 'lists', `${l.archetype.key}.json`), l);
for (const s of standings) await writeJson(join(OUT_DIR, 'standings', `${s.tournament.key}.json`), s);

console.log(
  `Dataset: ${dataset.tournaments.length} tournaments, ${dataset.archetypes.length} archetypes, ` +
    `${dataset.results.length} results, ${dataset.matches.length} matches, ${lists.length} archetype list files`,
);
