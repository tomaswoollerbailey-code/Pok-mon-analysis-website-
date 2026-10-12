# Meta Lab: project memory

## Working with the owner
- Keep replies **short and clear**: a few bullets, no long explanations. The owner has little time to read.
- Build features first and polish the design later.
- **Audience: worldwide.** Finish and polish the site before any promotion or affiliate links.
- **Focus: meta tools only.** The main user is a competitive player preparing for an event. No collection tracker (removed Oct 2026); don't add collection or scanning features.
- The owner wants Claude to do the work end to end: merge PRs and trigger workflows.

## What this is
A Pokémon TCG meta analysis site built from Limitless data. Online events come from the Limitless Play API; in-person events are scraped from limitlesstcg.com; Japan comes from official City League results on limitlesstcg.com/tournaments/jp.
- Japan is its own source (different card pool) and is excluded from the "International" view. It has top finishers only: no attendance, win rates or matchups.
- Live site: https://tomaswoollerbailey-code.github.io/Pok-mon-analysis-website-/ (public repo, GitHub Pages via Actions)
- Stack: Vite + React + TS. Static site; all analysis runs in the browser.

## Layout
- `scripts/fetch-online.ts`, `scripts/fetch-offline.ts`, `scripts/fetch-japan.ts` → `data/raw/` (committed cache); `scripts/build-dataset.ts` → `public/data/` (built in CI, gitignored)
- `src/lib/`: parsers (`limitless/`), `build.ts`, `analysis.ts`, `rotation.ts` (rotating sets config), `decktext.ts` (TCG Live list parser, used by the deck checker)
- `src/pages/`: Meta, Trends, Matchups, Field planner, Tournaments, Deck
- Workflows:
  - `update-data.yml`: daily fetch and commit; online 60 days, in-person 90 days, capped per run
  - `deploy.yml`: builds and deploys Pages after each data update or push to main
  - `probe.yml`: prints live page and API structure to the job log, for checking parsers
  - `ci.yml`: tests and build

## Prices
- `scripts/fetch-prices.ts` runs daily. It reads TCGplayer (USD) and Cardmarket (EUR) prices from the newest Limitless decklist pages and writes `data/raw/prices.json`, with USD→EUR/MYR exchange rates from frankfurter (fallback: open.er-api).
- MYR is converted from USD. It is not a local Malaysian price. The Shiny app has no public API; asking contact@getshiny.io is pending.
- Live prices: a TCGplayer mass-entry link and per-card Cardmarket links.

## Notes
- The dev sandbox can't reach Limitless or github.io. Check parsers through the Probe workflow logs.
- Rotation assumes the H mark rotates next (TEF, TWM, SFA, SCR, SSP, PRE). This is unconfirmed; change it in `src/lib/rotation.ts`.
- Run `npm test` before every push.

## Roadmap (agreed next)
1. Deck checker: paste a list and compare it with the meta version.
2. Done: Field planner (expected win rate vs an editable field, "what should I play?").
Later: tech finder, card lookup, regional meta, budget view, design polish. Also fetch in-person decklists from each event's single decklists page instead of one page per player.
