# Murkrow Meta: Pokémon TCG meta analysis

A static website that analyses the Pokémon TCG meta from both **online** and **in-person** tournaments published on Limitless:

| Source | Where it comes from | What it gives |
| --- | --- | --- |
| Online | [Limitless Play API](https://docs.limitlesstcg.com/developer.html) (`play.limitlesstcg.com/api`) | Standings, records, decklists, round-by-round pairings |
| In person | [limitlesstcg.com/tournaments](https://limitlesstcg.com/tournaments) (HTML; no public API) | Standings, archetypes, decklists |
| Japan | [limitlesstcg.com/tournaments/jp](https://limitlesstcg.com/tournaments/jp) (official City League results) | Top finishers and their decklists; no attendance or pairings |

## What the site shows

- **Meta**: meta share, top-cut count and share, conversion rate (top-cut finishes ÷ pilots), match win rate and tournament wins per archetype. You can filter by source (all, online, in person), period, format, minimum event size, and top-cut definition (Top 8/16/32/10%).
- **Trends**: weekly meta share for up to 8 archetypes, with a table view.
- **Matchups**: an archetype × archetype win-rate heatmap built from online pairings, with a minimum-games threshold. In-person events on Limitless don't publish pairings, so this view uses online data only.
- **Tournaments**: a searchable event list. Each event page shows its deck breakdown and standings.
- **Deck pages**: card usage (share of lists playing each card, average copies, optionally top-cut lists only) and best finishes.

**Rotation.** Each archetype is tagged for the next Standard rotation (configured in `src/lib/rotation.ts`, currently the H regulation mark sets TEF, TWM, SFA, SCR, SSP and PRE):
- *Rotates*: its signature Pokémon leave Standard.
- *Loses cards*: it survives but loses cards that appear in at least half its lists.
- *Survives*: none of its core cards rotate.

A card counts as rotating only if no printing outside those sets appears anywhere in the data, so reprints stay legal. **Hide rotating decks** removes the *Rotates* archetypes and recalculates every metric as a projected post-rotation meta.

Win rates count ties as half a win. Archetype names are normalised (case, accents and punctuation are ignored), so the same deck from online and in-person events is merged.

## Getting started

```bash
npm install
npm run data        # fetch online + in-person events, then build public/data/
npm run dev         # http://localhost:5173
```

Run each step on its own if you want to tune it:

```bash
npm run fetch:online  -- --days 60 --min-players 32 --format STANDARD   # optional: LIMITLESS_API_KEY=...
npm run fetch:offline -- --days 90 --min-players 0 --format STANDARD   # --no-decklists for a quicker scrape
npm run fetch:japan   -- --days 60
npm run build:data
```

Fetching is incremental. Each tournament is cached as `data/raw/{online,offline}/{id}.json` and skipped on later runs (`--refresh` re-downloads it). Requests run one at a time with a delay between them (`--delay`, in ms) and retry with backoff, to stay polite to Limitless.

## How it fits together

```
scripts/fetch-online.ts   ─┐                    scripts/build-dataset.ts
scripts/fetch-offline.ts  ─┴─> data/raw/*.json ───────────────────────────> public/data/
                                (committed cache)   dataset.json        compact results + matches
                                                    lists/{deck}.json    decklists per archetype
                                                    standings/{id}.json  per-event standings
src/  React + Vite site that loads public/data/ and computes everything in the browser
```

- `src/lib/limitless/online.ts` normalises Limitless Play API responses.
- `src/lib/limitless/offline.ts` parses limitlesstcg.com pages. It maps columns by header text, not position, and falls back to cell text when `data-*` attributes are missing. If the site layout changes and the scraper reports zero tournaments, fix it here.
- `src/lib/build.ts` builds the compact dataset; `src/lib/analysis.ts` has every metric (all pure functions, covered by `npm test`).

## Tests

- `npm test` runs the unit tests for the parsers, the dataset builder and every metric.
- `npm run test:e2e` runs the browser tests (Playwright) against a build that uses synthetic fixture data (`tests/e2e/fixture.ts`). They click through every page on desktop and mobile. CI runs them on every PR. In a sandbox with a preinstalled Chromium, set `PW_CHROMIUM_PATH`.

## Automation

- **Update data** (`.github/workflows/update-data.yml`) runs daily and on demand. It fetches new tournaments and commits them to `data/raw/`. Each run is capped (in-person: 25 events, 64 decklists per event, a 40-minute budget) so it stays within free Actions minutes. A backlog is worked through over several runs.
- **Deploy** (`.github/workflows/deploy.yml`) builds the site and publishes it to GitHub Pages after each data update and on every push to `main`.
- **Probe Limitless** (`.github/workflows/probe.yml`) is a manual diagnostic. It prints the structure of live Limitless pages and API responses into the job log, which helps when updating the parsers.

You can optionally add a `LIMITLESS_API_KEY` repository secret. The build output in `dist/` is static and works on any host.

Data © Limitless TCG. This project is not affiliated with Limitless, Nintendo or The Pokémon Company.
