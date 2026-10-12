# The Crow's Nest: project memory

## Mission
Build **The Crow's Nest** into a fun, clean, easy-to-read and secure Pokémon TCG meta website. It should earn a decent side income and have room to grow, for example sister sites for other card games built on the same engine.

## Claude's role
Act as a professional web developer, Pokémon TCG expert, designer, data analyst, and advertising and marketing lead. Bring opinions and recommendations, not just options.

## Product principles
- **Built for the player prepping for an event:** what's winning, what to play, how to tune a deck and what it costs.
- **Easy to read first:** one clear headline number per view, plain-English labels, no jargon without a tooltip.
- **Trustworthy data:** always show sources, dates and sample sizes. Never invent or estimate numbers silently. Flag small samples.
- **Fun:** crow-on-lookout personality, deck sprites and a light touch of copy, without clutter.
- **Fast and mobile-first:** a static site, no horizontal scroll, works on a phone at an event.
- **Secure:**
  - No accounts or user data unless truly needed. Secrets live only in GitHub Actions secrets.
  - No third-party scripts except what's essential, such as fonts and privacy-friendly analytics.
  - Keep dependencies updated, and never commit keys.
- **Respect data sources:** polite request rates, credit Limitless, and ask before commercial use or heavy hotlinking.

## Business plan (agreed order)
1. Finish and polish the site. **No promotion or affiliate links until it's ready.**
2. Then add privacy-friendly analytics, launch on Reddit, Discord and X, and gather feedback.
3. Monetise:
   - Affiliate links first: TCGplayer, then Cardmarket.
   - Display ads once traffic justifies them.
   - Optionally a premium tier or sponsorships later.
4. Grow with sister sites for other games (for example One Piece via Limitless) on the same codebase.

## Working with the owner
- Keep replies **short and clear**: a few bullets, no long explanations. The owner has little time to read.
- Every feature ships clean and readable. No "make it pretty later" debt.
- **Audience: worldwide.** Finish and polish the site before any promotion or affiliate links.
- **Focus: meta tools only.** The main user is a competitive player preparing for an event. No collection tracker (removed Oct 2026); don't add collection or scanning features.
- The owner wants Claude to do the work end to end: merge PRs and trigger workflows.

## Brand
- **The Crow's Nest**, tagline "Spot the meta before it lands." A crow's nest is a ship's lookout, which is what the site does for the meta.
- Look: dark purple and black surfaces, gold accent, and a crow-in-lookout logo (`src/components/Brand.tsx`).
- Renamed from "Murkrow Meta" (Oct 2026) to avoid using a Pokémon trademark in the brand. **Never put Pokémon character names in the brand, domain or logo.** Pokémon and card names in content are fine, and the site keeps its "not affiliated" footer.
- Deck sprites are hotlinked from Limitless's CDN (`r2.limitlesstcg.net/pokemon/gen9/{icon}.png`). Ask Limitless before launch, or self-host them.

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
  - `ci.yml`: unit tests, build and Playwright browser tests (desktop + mobile)

## Prices
- `scripts/fetch-prices.ts` runs daily. It reads TCGplayer (USD) and Cardmarket (EUR) prices from the newest Limitless decklist pages and writes `data/raw/prices.json`, with USD→EUR/MYR exchange rates from frankfurter (fallback: open.er-api).
- MYR is converted from USD. It is not a local Malaysian price. The Shiny app has no public API; asking contact@getshiny.io is pending.
- Live prices: a TCGplayer mass-entry link and per-card Cardmarket links.

## Notes
- The dev sandbox can't reach Limitless or github.io. Check parsers through the Probe workflow logs.
- Rotation assumes the H mark rotates next (TEF, TWM, SFA, SCR, SSP, PRE). This is unconfirmed; change it in `src/lib/rotation.ts`.
- Run `npm test` and `npm run test:e2e` (with `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` in the sandbox) before every push.
- Don't merge to main while an Update data run is in progress. It rebases now, but merging still triggers extra deploys.

## Roadmap (agreed next)
1. Deck checker: paste a list and compare it with the meta version.
2. Done: Field planner (expected win rate vs an editable field, "what should I play?").
Later: tech finder, card lookup, regional meta, budget view, design polish. Also fetch in-person decklists from each event's single decklists page instead of one page per player.
