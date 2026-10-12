# The Crow's Nest: Pokémon TCG meta analysis

*Spot the meta before it lands.*

A static website that analyses the current Standard meta from tournaments published on Limitless. Project notes, decisions and the roadmap live in [`CLAUDE.md`](CLAUDE.md).

| View | Where it comes from | What it gives |
| --- | --- | --- |
| **Online** (default) | [Limitless Play API](https://docs.limitlesstcg.com/developer.html) (`play.limitlesstcg.com/api`) | Standings, records, decklists, round-by-round pairings |
| **Offline** | [limitlesstcg.com/tournaments](https://limitlesstcg.com/tournaments) (HTML, no public API) | Standings (mostly top finishers), archetypes, decklists. No pairings |

Only completed Standard events since the last rotation count (April 2026: G mark out; H, I and J legal). The two views are never blended: offline standings only list top finishers, so mixing them would skew shares.

## What the site shows

- **Meta**: meta share, conversion (the share of a deck's players who finished in the Top 8 online, or the Top 10% at majors), win rate, price, rotation status and tournament wins per deck.
- **Trends**: every deck's change in share (the recent half of the chosen period vs the half before), with weekly sparklines. The Meta table shows the same trend per deck.
- **Matchups**: a deck-vs-deck win-rate heatmap from online pairings, covering every deck with at least 1% of the field in the chosen period.
- **Field planner**: set the field you expect and every deck is ranked by expected win rate against it ("what should I play?").
- **Tournaments**: a searchable event list; each event page shows its deck breakdown and standings.
- **Deck pages**: rotation status, a price breakdown of a real recent list (with a TCGplayer buy link and per-card Cardmarket links), and best finishes.

Offline hides win rates (no pairings), and Matchups and the Field planner ask you to switch to Online. Win rate counts games against other decks only (mirrors excluded, ties as half). Archetype names are normalised (case, accents and punctuation are ignored), so the same deck from different events is merged. Limitless's catch-all "Other" deck is shown in tables but left out of rankings.

**Rotation.** Decks are tagged for the next Standard rotation, expected in **2027** (the last was April 2026). It is configured in `src/lib/rotation.ts` and currently assumes the H regulation mark sets (TEF, TWM, SFA, SCR, SSP, PRE) leave:
- *Rotates*: its signature Pokémon leave Standard.
- *Loses cards*: it survives but loses cards that appear in at least half its lists.
- *Survives*: none of its core cards rotate.

A card counts as rotating only if no printing outside those sets appears anywhere in the data, so reprints stay legal. The **Post-rotation meta** switch hides the *Rotates* decks and recalculates every metric.

**Prices.** A daily snapshot of TCGplayer (USD) and Cardmarket (EUR) market prices read from Limitless decklist pages, plus MYR converted from USD with a public exchange-rate feed. They are market prices, not a shop's price; the TCGplayer button opens a list with live seller prices.

## Getting started

```bash
npm install
npm run data        # fetch online + offline events and prices, then build public/data/
npm run dev         # http://localhost:5173
```

Run each step on its own if you want to tune it:

```bash
npm run fetch:online  -- --min-players 32 --format STANDARD    # optional: LIMITLESS_API_KEY=...
npm run fetch:offline -- --min-players 0 --format STANDARD     # --no-decklists for a quicker scrape
npm run fetch:prices                                           # card prices and exchange rates
npm run build:data
```

`fetch:online` and `fetch:offline` default to events since the last rotation (`--since YYYY-MM-DD` overrides it). Fetching is incremental: each tournament is cached as `data/raw/{online,offline}/{id}.json` and skipped on later runs (`--refresh` re-downloads it). Requests run one at a time with a delay (`--delay`, in ms) and retry with backoff, to stay polite to Limitless.

## How it fits together

```
scripts/fetch-online.ts   ─┐                    scripts/build-dataset.ts
scripts/fetch-offline.ts  ─┼─> data/raw/*.json ─────────────────────────> public/data/
scripts/fetch-prices.ts   ─┘   (committed cache)   dataset.json        compact results + matches
                                                   lists/{deck}.json    decklists per archetype
                                                   standings/{id}.json  per-event standings
src/  React + Vite site that loads public/data/ and computes everything in the browser
```

- `src/lib/limitless/online.ts` normalises Limitless Play API responses.
- `src/lib/limitless/offline.ts` parses limitlesstcg.com pages. It maps columns by header text, not position, and falls back to cell text when `data-*` attributes are missing. If the site layout changes and the scraper reports zero tournaments, fix it here.
- `src/router.ts` and `src/lib/routes.ts` give every page a real URL (`/decks/<deck>`); `scripts/prerender.ts` writes a static HTML file per page (with its own title and description), a sitemap and robots.txt after the Vite build. For a custom domain build with `SITE_BASE=/ SITE_URL=https://example.com`.
- `src/lib/build.ts` builds the compact dataset; `src/lib/analysis.ts` has every metric (pure functions, covered by `npm test`).

## Tests

- `npm test` runs the unit tests for the parsers, the dataset builder and every metric.
- `npm run test:e2e` runs the browser tests (Playwright) against a build that uses synthetic fixture data (`tests/e2e/fixture.ts`). They click through every page on desktop and mobile, and CI runs them on every PR. In a sandbox with a preinstalled Chromium, set `PW_CHROMIUM_PATH`.

## Automation

- **Update data** (`.github/workflows/update-data.yml`) runs daily and on demand. It fetches new tournaments and prices and commits them to `data/raw/`. Each run is capped (offline: 25 events, 64 decklists per event, a 40-minute budget) so it stays within free Actions minutes, and a backlog is worked through over several runs.
- **Deploy** (`.github/workflows/deploy.yml`) builds the site and publishes it to GitHub Pages after each data update and on every push to `main`.
- **CI** (`.github/workflows/ci.yml`) runs the unit tests, the build and the browser tests.
- **Probe Limitless** (`.github/workflows/probe.yml`) is a manual diagnostic. It prints the structure of live Limitless pages and API responses into the job log, which helps when updating the parsers.

You can optionally add a `LIMITLESS_API_KEY` repository secret. The build output in `dist/` is static and works on any host.

Data © Limitless TCG. This project is not affiliated with Limitless, Nintendo or The Pokémon Company.
