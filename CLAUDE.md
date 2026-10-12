# The Crow's Nest: project memory

> **Keep this file current.** Update it in the same PR as any decision, feature or change of plan. Remove anything stale. It should always describe the project as it is now, plus the decisions that got it here.

## Mission
Build **The Crow's Nest** ("Spot the meta before it lands") into a fun, clean, easy-to-read and secure Pokémon TCG meta website. It should earn a decent side income and have room to grow, for example sister sites for other card games built on the same engine.

**Claude's role:** professional web developer, Pokémon TCG expert, designer, data analyst, and advertising and marketing lead. Give recommendations, not just options.

## Working with the owner (Tom)
- Tom is in **Kuala Lumpur (UTC+8)**. Give times in KL time.
- Keep replies **short and clear**: a few bullets, no long explanations.
- Claude does the work end to end: branch, PR, merge, trigger workflows, and check the result.
- Every feature ships clean and readable. No "make it pretty later" debt.
- Tom can't send email from Claude (the Gmail connector isn't connected). Give him drafts to send himself.

## Decisions log
| Date | Decision |
|---|---|
| 2026-10-12 | Data comes from Limitless: the Play API for online events, limitlesstcg.com for in-person and Japanese events. No other sources. |
| 2026-10-12 | Static site on GitHub Pages. The repo is **public**, because Pages on a private repo needs a paid plan. |
| 2026-10-12 | **Worldwide** audience, not SEA-only. SEA touches like MYR prices are optional extras. |
| 2026-10-12 | **Meta tools only.** The collection tracker, CSV import and "Can I build?" were built, then **removed**. No collection or card-scanning features. |
| 2026-10-12 | **Main user:** a competitive player preparing for an event. |
| 2026-10-12 | **Data window:** completed Standard events since the last rotation. Online from 2026-03-26 (TCG Live), in person from 2026-04-10 (Play! Pokémon); G rotated out, H, I and J are legal. |
| 2026-10-12 | **Japan** is its own source (official City Leagues, plus JP-format majors like Champions League), never mixed into International. Pokecabook, the official Players site and weekly Gym Battles were rejected: same data or unreliable. |
| 2026-10-12 | **Rotation preview** assumes the H mark rotates next (TEF, TWM, SFA, SCR, SSP, PRE). Unconfirmed. "Post-rotation" toggle. |
| 2026-10-12 | **Prices:** a daily snapshot of TCGplayer USD and Cardmarket EUR read from Limitless decklist pages, plus MYR converted from USD. "Live" prices come only via the TCGplayer mass-entry link. The Shiny app has no API, so Tom will email contact@getshiny.io himself. |
| 2026-10-12 | **Brand:** "Meta Lab" → "Murkrow Meta" → **The Crow's Nest**. Never use Pokémon names in the brand, domain or logo (trademark risk). |
| 2026-10-12 | **Win rate** = head-to-head pairings vs other decks, mirrors excluded. Standings records (with byes and drops) read low. |
| 2026-10-12 | **No promotion or affiliate links** until the site is finished and polished. |
| 2026-10-12 | Don't use a work Claude account for this project. To save usage, use Sonnet for routine work and batch requests. |

## Current state (live)
Live site: https://tomaswoollerbailey-code.github.io/Pok-mon-analysis-website-/
- **Meta:** a snapshot hero ("X leads with Y%") with the top-3 deck cards, a meta share bar chart, and a sortable table (share, top-cut, conversion, win rate, W-L-T, deck price, rotation, wins).
- **Trends:** weekly share lines for up to 8 decks, with a table view.
- **Matchups:** a win-rate heatmap from online pairings with a minimum-games filter.
- **Field planner:** an editable expected field → every deck ranked by expected win rate ("what should I play?"). Matchups are shrunk toward 50% by 10 virtual games, and each row expands into a breakdown.
- **Tournaments:** a searchable list; event pages show the deck breakdown and standings.
- **Deck pages:** rotation status, card usage (core cards, a rare-techs toggle, top-cut-only), deck price with a cheapest-printings option, a TCGplayer buy link, Cardmarket links per card, and best finishes.
- **Filters:** International, Online, In person or Japan; period ("Since rotation" by default); format; top cut; currency (USD, EUR, MYR); Post-rotation; and under "More", dates and minimum players.
- **Theme:** light, dark or system. Deck sprites are hotlinked from Limitless.

## Roadmap
**Agreed order:**
1. **Real page URLs** (`/decks/dragapult` instead of `#/deck/...`), prerendered with their own titles and descriptions. This is the biggest lever for Google traffic, e.g. "dragapult deck list".
2. **"Copy for TCG Live" button** on every deck. Very useful and quick to build.
3. **Methodology page:** sources, update times, how win rates, shares and rotation status are calculated. This builds trust with competitive players.
4. **Weekly meta report page,** generated automatically: risers, fallers, top lists. Good for sharing and search.
5. **Share images:** an auto-generated preview card for each deck and report on Discord, Reddit and X.

**Before launch:**
- **Custom domain** (a crowsnest-style .gg or .com) to improve credibility and search ranking.
- **Contact Limitless:** ask permission, offer credit and links, and ask about sprite hotlinking. Possibly a partnership.

**Then:**
- Deck checker: paste a TCG Live list and compare it with the meta version.

**Launch and money:**
1. Privacy-friendly analytics (Cloudflare Web Analytics or Plausible).
2. Launch on Reddit (r/PTCG), Discord and X.
3. Ko-fi or Patreon from day one.
4. A privacy page and cookie consent before ads.
5. Affiliate links: TCGplayer first, then Cardmarket.
6. Display ads only once there are tens of thousands of monthly visits.
7. Later: a premium tier or sponsorships.
8. Sister sites for other games (for example One Piece via Limitless) on the same codebase.

**Ideas, not scheduled:** tech finder (cards over-represented in top cut), card lookup (which decks play card X), regional meta, budget view.

## Architecture
- Stack: Vite + React + TypeScript. Static site; all analysis runs in the browser.
- Data flow:
  - `scripts/fetch-online.ts`, `scripts/fetch-offline.ts`, `scripts/fetch-japan.ts` and `scripts/fetch-prices.ts` write to `data/raw/`, which is the committed cache.
  - `scripts/build-dataset.ts` writes `public/data/`, which is built in CI and gitignored.
- `src/lib/`:
  - `limitless/`: parsers, with columns mapped by header text
  - `build.ts`: dataset builder, including the format filter, Japan routing and icon votes
  - `analysis.ts`: all metrics and the Field planner
  - `rotation.ts`: `CURRENT_FORMAT` and `ROTATION` config
  - `pricing.ts`, `decktext.ts`, `cardname.ts`, `archetype.ts`
- `src/pages/`: Meta, Trends, Matchups, Field, Tournaments, Tournament, Deck. Shared UI is in `src/components/`.
- Workflows:
  - `update-data.yml`: daily at 06:17 UTC. Fetches online, then in-person, then Japan, then prices, and commits `data/raw`, rebasing onto main first. Capped per run: online 400 events or 30 min; in person 25 events with 64 lists each, or 40 min; Japan 60 events or 25 min.
  - `deploy.yml`: builds and deploys Pages after each data update or push to main.
  - `ci.yml`: unit tests, build, and Playwright end-to-end tests on desktop and mobile.
  - `probe.yml`: manual. Prints the structure of live Limitless pages and API responses to the job log, for checking parsers.

## Rules of thumb
- Run `npm test` and `npm run test:e2e` before every push. In the sandbox, prefix the e2e run with `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`.
- The dev sandbox can't reach Limitless or github.io. Check parsers through the Probe workflow logs, and real data by pulling `data/raw` and running `npm run build:data` locally.
- Never present synthetic data as real. Test fixtures use obviously fake names ("Deck Alpha").
- Show sources, dates and sample sizes. Flag small samples.
- Security:
  - no accounts or user data
  - secrets only in GitHub Actions secrets
  - minimal third-party scripts
  - keep dependencies updated
- At the next rotation, update `CURRENT_FORMAT` and `ROTATION` in `src/lib/rotation.ts`.

## Open items and caveats
- **Backfill:** in-person and online history back to April is still filling in, over a few daily runs from 2026-10-12.
- **Rotation sets:** the H rotation set list is assumed, not announced.
- **Prices:** they appear once `data/raw/prices.json` exists, after the first run that includes `fetch-prices`.
- **Data volume:** in person is only major events (Regionals, ICs, Worlds). That means few events between seasons.
