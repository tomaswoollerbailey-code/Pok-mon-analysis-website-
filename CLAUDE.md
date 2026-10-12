# Meta Lab: project memory

## Working with the owner
- Keep replies **short and clear**: a few bullets, no long explanations. The owner has little time to read.
- Build features first and polish the design later.
- The owner wants Claude to do the work end to end: merge PRs and trigger workflows.

## What this is
A Pokémon TCG meta analysis site built from Limitless data. Online events come from the Limitless Play API; in-person events are scraped from limitlesstcg.com.
- Live site: https://tomaswoollerbailey-code.github.io/Pok-mon-analysis-website-/ (public repo, GitHub Pages via Actions)
- Stack: Vite + React + TS. Static site; all analysis runs in the browser.

## Layout
- `scripts/fetch-online.ts`, `scripts/fetch-offline.ts` → `data/raw/` (committed cache); `scripts/build-dataset.ts` → `public/data/` (built in CI, gitignored)
- `src/lib/`: parsers (`limitless/`), `build.ts`, `analysis.ts`, `rotation.ts` (rotating sets config), `collection.ts`, `csv.ts`, `decktext.ts`
- `src/pages/`: Meta, Trends, Matchups, Tournaments, Deck, Collection, Can I build?
- Workflows:
  - `update-data.yml`: daily fetch and commit; online 60 days, in-person 90 days, capped per run
  - `deploy.yml`: builds and deploys Pages after each data update or push to main
  - `probe.yml`: prints live page and API structure to the job log, for checking parsers
  - `ci.yml`: tests and build

## Notes
- The dev sandbox can't reach Limitless or github.io. Check parsers through the Probe workflow logs.
- Rotation assumes the H mark rotates next (TEF, TWM, SFA, SCR, SSP, PRE). This is unconfirmed; change it in `src/lib/rotation.ts`.
- Collection CSV importers haven't been checked against real app exports yet.
- Run `npm test` before every push.

## Roadmap (agreed next)
1. Deck checker: paste a list and compare it with the meta version.
2. Expected win rate vs the field (matchups × meta share).
3. What should I play? (best deck or counter-pick for an expected field).
Later: tech finder, card lookup, regional meta, budget view, card scanning, design polish. Also fetch in-person decklists from each event's single decklists page instead of one page per player.
