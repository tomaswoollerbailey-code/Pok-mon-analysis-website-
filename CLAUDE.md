# The Crow's Nest: project memory

> **Keep this file current.** Update it in the same PR as any decision, feature or change of plan, and clean out anything stale. It should always describe the project as it is now, plus the decisions that got it here. Read it first in every new session.

## Mission
Build **The Crow's Nest** ("Spot the meta before it lands") into a fun, clean, easy-to-read and secure Pokémon TCG meta website. It should earn a decent side income and have room to grow, for example sister sites for other card games built on the same engine.

**Claude's role:** professional web developer, Pokémon TCG expert, designer, data analyst, and advertising and marketing lead. Give recommendations, not just options.

**Money, realistically (agreed Oct 2026):** aim for **£100–300/month by the end of year one**. £1k/month needs roughly 50–100k monthly visits across ads, affiliate links and supporters, and is maybe a 10–20% chance within 12–18 months. Limitless (free, dominant) and Trainer Hill already cover basic meta stats, so the edge is what they don't do well: the **Field planner** (expected win rate vs a field), **deck prices**, and Google traffic from deck pages. Running costs are near zero.

## Working with the owner (Tom)
- Tom is in **Kuala Lumpur (UTC+8)**. The sandbox clock is UTC. Give times in KL time.
- Keep replies **short and clear**: a few bullets, no long explanations.
- Claude does the work end to end: branch, PR, merge, trigger workflows, and check the result.
- Every feature ships clean and readable. No "make it pretty later" debt. Keep the site **sharp and simple**.
- Tom can't send email through Claude (the Gmail connector isn't connected). Give him drafts to send himself.
- Don't use a work Claude account or work PC for this project (employer terms and code-ownership risk).
- **Saving usage (agreed Oct 2026):**
  - Sessions default to **`opusplan`** (`.claude/settings.json`): Opus while planning, Sonnet for everything else, so Tom never has to switch. For a big design decision Claude enters plan mode (Opus) first.
  - Grunt work (CI/Actions logs, code searches, data checks, test runs) goes to the **`scout`** subagent (`.claude/agents/scout.md`, Haiku). Feature code stays in the main session.
  - **One feature per chat:** start fresh with "read CLAUDE.md, then build X", and clear the chat once it's merged. Long chats are the biggest cost.
  - Batch requests into one message.

## Decisions log
| Date | Decision |
|---|---|
| 2026-10-12 | **Data comes from Limitless only:** the Play API for online events, limitlesstcg.com for offline (in-person) majors. Japan was tried and removed (below). |
| 2026-10-12 | **Hosting:** static site on GitHub Pages. The repo is **public** (Pages on a private repo needs a paid plan). The data job runs **hourly** (at :17 UTC) and redeploys only when it committed something new. |
| 2026-10-12 | **Worldwide** audience, not SEA-only (SEA touches like MYR prices are optional extras). **Main user:** a competitive player preparing for an event. |
| 2026-10-12 | **Meta tools only.** The collection tracker, CSV import and "Can I build?" were built, then **removed**. No collection or card-scanning features. |
| 2026-10-12 | **Data window:** completed Standard events since the last rotation (April 2026: G mark out; H, I and J legal). Online from 2026-03-26 (TCG Live), offline from 2026-04-10 (Play! Pokémon). Japanese-format events are excluded. |
| 2026-10-12 | **Two views: Online (default) and Offline.** An "All" tab was removed: offline standings only list top finishers, so blending skewed shares, and offline is Bo3 while online is often Bo1. Online has the pairings (win rates, matchups, Field planner); Offline is "what wins majors". Pages adapt via `SOURCE_CAPS`: Offline hides win rates, and Matchups / Field planner show a "needs online data" card with a one-tap switch. |
| 2026-10-12 | **Japan removed completely** (tab, fetch, data, code). It used official City League results from limitlesstcg.com/tournaments/jp and is recoverable from git history (PRs #10 and #15). Pokecabook, the official Players site and weekly Gym Battles were rejected as duplicate or unreliable. |
| 2026-10-12 | **Filters (simplified, supersedes the earlier Filters button):** one always-visible bar, nothing hidden: Online / Offline switch, Period segments (14d / 30d / 90d / Since rotation), an "After 2027 rotation" chip and Reset. **Price currency filter removed:** prices show in USD only (`Filters.currency` deleted; MYR/EUR stay in `pricing.ts` and the data). `Filters.topCut`, `format`, `from`, `to` and `minPlayers` still exist internally and are not exposed. |
| 2026-10-12 | **Conversion uses a fixed cut:** Top 8 online, Top 10% offline (a Top 8 of a 2,000-player Regional is 0.4% of the field). |
| 2026-10-12 | **Card usage removed from deck pages** (looked ugly). `cardUsage()` stays in `analysis.ts` for when it returns with a better design. |
| 2026-10-12 | **Rotation wording uses years:** the last rotation was April 2026 (G out); the next is expected in **2027**, assumed to remove the H mark (TEF, TWM, SFA, SCR, SSP, PRE), **unconfirmed**. Config: `CURRENT_FORMAT.rotatedYear` and `ROTATION.year` / `sets` in `src/lib/rotation.ts`. |
| 2026-10-12 | **"Other"** (Limitless's unclassified bucket) gets the site's own card-stack icon, because Limitless points it at a sprite that doesn't exist. It has no price or rotation status and is left out of rankings. Any deck whose sprites fail to load shows the same placeholder. |
| 2026-10-12 | **Meta page = one table** with inline share bars. Phones show Deck, Share, Conv. and Win % with short labels. |
| 2026-10-12 | **Win rate** = head-to-head pairings vs other decks, mirrors excluded (standings records include byes and drops and read low). |
| 2026-10-12 | **Prices:** a daily snapshot of TCGplayer USD and Cardmarket EUR read from Limitless decklist pages, plus MYR converted from USD (not a Malaysian shop price). "Live" prices come only via the TCGplayer mass-entry link. The Shiny app has no public API. |
| 2026-10-12 | **Brand:** "Meta Lab" → "Murkrow Meta" → **The Crow's Nest** (other options considered: Murk Meta, Crowsight, Nightcrow, Caw Meta). **Never use Pokémon names in the brand, domain or logo** (trademark risk). |
| 2026-10-12 | **Mobile-first, app-style shell:** a bottom tab bar on phones, 16px inputs, safe-area insets, a swipeable top-3, secondary table columns hidden. |
| 2026-10-12 | **Real page URLs:** `/decks/<key>`, `/tournaments/<key>`, `/trends`, `/matchups`, `/field`, `/tournaments` (History API, in-site links navigate without a reload; old `#/...` links redirect). `npm run build` runs `scripts/prerender.ts` after Vite: a static HTML file per page with its own title, description, canonical and a text summary (`src/lib/seo.ts`), plus `404.html` (app-shell fallback), `sitemap.xml` and `robots.txt`. Vite `base` is absolute: default `/Pok-mon-analysis-website-/`; on a custom domain build with `SITE_BASE=/` and `SITE_URL=https://<domain>` (robots.txt only counts at a domain root). |
| 2026-10-12 | **Matchups follow the period filter only:** the deck-count and min-games pickers were removed; every deck with ≥1% share gets a row and column (`MIN_SHARE`, `MIN_GAMES` in `MatchupsPage.tsx`). Showing all 100+ decks would be unreadable. |
| 2026-10-12 | **Matchups readability:** an "Average" column (row deck's win rate vs all decks shown, games-weighted), green (wins) to red (loses) colours, an order switch (Most played / Best win rate), row and column highlight on hover, a Loses→Wins legend and larger cells. **1st/2nd win rates are not possible:** Limitless pairings carry no turn-order data (`p1`/`p2` are just table positions). |
| 2026-10-12 | **Trends reworked:** the multi-line chart was replaced by risers/fallers boards and a movers table (`metaMovers()` in `analysis.ts`, `Sparkline`/`Delta` components), and the Meta table got a Trend column. Then simplified to the single every-deck table. |
| 2026-10-12 | **Period is stored as days** (`Filters.periodDays`); the app derives `from` from the newest event each load, so a saved period keeps working as data updates (it used to turn into stale "Custom dates"). Every page with a filter bar uses it: Meta, Trends, Matchups, Field planner, Tournaments, Deck pages. `LineChart` and the series colour slots were deleted. |
| 2026-10-12 | **Decklists on deck pages reworked** (replaces the average list and the deck price card, both removed): a **Top finishes** view (real lists in the top 8 / 16 / 32, newest event first, all collapsed by default) and a **Most played** view (identical lists grouped, printings merged, only lists played more than once). Each list expands and has "Copy for TCG Live" (`src/lib/decklist.ts`, `DeckList.tsx`). Prerendered deck pages include the best top-8 list as text. Per-card prices stay in the data for the Meta table. |
| 2026-10-12 | **Next after decklists (agreed):** Cloudflare Web Analytics, then Field planner presets and share links. Weekly report, share images and methodology wait until there's traffic. |
| 2026-10-12 | **Methodology page** (`/methodology`, linked from the footer, not in the nav): sources, update times and how each metric is calculated, with live event counts. It reads the same constants as the code (`MIN_SHARE`, `MIN_GAMES`, `SHRINK_GAMES`, `CORE_SHARE`) so the text can't drift. Change the page when a calculation changes. |
| 2026-10-12 | **Weekly report** (`/report`): the latest 7 days of online data vs the 7 before, with fixed filters (no filter bar), so it is identical for everyone and prerenders with a text summary. Top decks, risers/fallers (≥20 players, ≥0.2 pts), and event winners (online and offline). Computed by `weeklyReport()` in `analysis.ts`; no separate generation step, it updates with the daily data run. In the desktop nav and footer, not the phone tab bar (`tab: false` in `App.tsx`). |
| 2026-10-12 | **No promotion or affiliate links** until the site is finished and polished. |

## Current state (live)
Live site: https://tomaswoollerbailey-code.github.io/Pok-mon-analysis-website-/
- **Meta:** a Trend column (sparkline + change in points, desktop only) from the same `metaMovers()`. A snapshot hero ("X leads online with Y%") with the top-3 deck cards, then one sortable table: rank, deck, share (inline bar), conversion, win rate, price, 2027 rotation, players and wins. A glossary sits in the table header (hidden on phones).
- **Trends ("What's moving"):** one table of every deck: share now, before, change in points, weekly sparkline, players (biggest decks first, 30 shown, "Show all"; sortable by change). Window = half the Period (7 / 15 / 45 days) or 4 weeks for "Since rotation"; offline at least 4 weeks. Decks under 20 players are faded.
- **Matchups:** a win-rate heatmap from online pairings of every deck with ≥1% of the field in the chosen period (about 20–25 decks). No pickers; cells under 10 games are greyed; an Average column and a Most played / Best win rate order switch. Deck names stick to the left and wrap on phones.
- **Field planner:** an editable expected field → every deck ranked by expected win rate ("what should I play?"). Matchups are shrunk toward 50% by 10 virtual games, and each row expands into a breakdown.
- **Tournaments:** a searchable list; event pages show the deck breakdown and standings.
- **Deck pages:** rotation status, **Decklists** (Top finishes top 8/16/32, or Most played identical lists; each with **Copy for TCG Live**). The Best finishes table and deck price card were removed.
- **Weekly report:** headline deck, top-decks table (share, change, Top 8 rate, win rate), risers and fallers, and the week's biggest event winners.
- **Methodology:** a static explainer page (data sources, window, update times, every metric, Field planner, rotation rules, prices, limits). No filter bar.
- **Filters and theme:** see the decisions above. Theme is light, dark or system. Deck sprites are hotlinked from `r2.limitlesstcg.net/pokemon/gen9/{icon}.png` (ask Limitless before launch, or self-host).
- **Phones (≤720px):** a bottom tab bar (Meta, Trends, Matchups, Planner, Events), the always-visible filter bar (each control on its own row) and simplified tables.

## Roadmap
**Next to build (agreed order, not started).** Real page URLs, the methodology page and the weekly report are done (see decisions).
1. **Share images:** an auto-generated preview card for each deck and the weekly report on Discord, Reddit and X.
2. **Report extras once there's traffic:** archived past weeks (`/report/<week>`), top lists per deck.

**Then:** a deck checker (paste a TCG Live list, compare it with the meta version).

**Before launch:** a custom domain (crowsnest-style .gg or .com), and contact Limitless (ask permission, offer credit and links, ask about sprite hotlinking; possibly a partnership).

**Launch and money, in order:**
1. Privacy-friendly analytics (Cloudflare Web Analytics or Plausible).
2. Launch on Reddit (r/PTCG), Discord and X.
3. Ko-fi or Patreon from day one.
4. A privacy page and cookie consent before ads.
5. Affiliate links: TCGplayer first, then Cardmarket.
6. Display ads once there are tens of thousands of monthly visits.
7. Later: a premium tier or sponsorships.
8. Sister sites for other games (for example One Piece via Limitless) on the same codebase.

**Ideas, not scheduled:** tech finder (cards over-represented in top cut), card lookup (which decks play card X), regional meta, budget view, bringing Japan back.

## Waiting on Tom
- **Shiny prices (MYR):** send contact@getshiny.io a short note asking for an API or daily price feed (about 1,000 tournament-legal cards, with credit and a link back). Claude can't send email.
- **Custom domain and Limitless outreach** before launch.
- **Next rotation:** tell Claude when the 2027 rotation is announced, to confirm the set list and date.

## Architecture
- Stack: Vite + React + TypeScript. Static site; all analysis runs in the browser.
- Data flow:
  - `scripts/fetch-online.ts`, `scripts/fetch-offline.ts` and `scripts/fetch-prices.ts` write to `data/raw/`, which is the committed cache (`prices.json` plus one JSON file per tournament).
  - `scripts/build-dataset.ts` writes `public/data/`, which is built in CI and gitignored.
- `src/lib/`:
  - `limitless/`: parsers, with columns mapped by header text
  - `build.ts`: dataset builder, including the format filter (current Standard only) and icon votes
  - `analysis.ts`: all metrics, `SOURCE_CAPS` and the Field planner
  - `rotation.ts`: `CURRENT_FORMAT` and `ROTATION` config
  - `pricing.ts`, `decktext.ts`, `cardname.ts`, `archetype.ts`
- `src/lib/routes.ts` (pure route paths, shared with build scripts), `src/lib/seo.ts` (titles, descriptions, page list), `src/router.ts` (base-aware links and navigation), `scripts/prerender.ts`.
- `src/pages/`: Meta, Trends, Matchups, Field, Tournaments, Tournament, Deck, Report, Methodology. Shared UI is in `src/components/`.
- Tests: unit tests in `tests/*.test.ts` (HTML fixtures in `tests/fixtures/`), and Playwright end-to-end tests in `tests/e2e/` that run against synthetic data from `tests/e2e/fixture.ts` on desktop and mobile.
- Workflows:
  - `update-data.yml`: hourly at :17 UTC. Fetches online, then offline, then prices (only when `prices.json` is over 20 hours old, or on a manual run), and commits `data/raw`, rebasing onto main first. After a commit it starts `deploy.yml` itself (`gh workflow run`; a push by the workflow token wouldn't), so runs with nothing new don't redeploy. Offline events are first saved the day after their listed date; for 4 days after that each run re-reads the event's standings page (1 request) and re-fetches the event if the standings changed, so a Regional listed mid-weekend ends up with its final standings. Capped per run: online 400 uncached events or 30 min (newest first, so each run reaches further back); offline 25 events with 64 lists each, or 40 min. A manual run takes an optional `since` date.
  - `deploy.yml`: builds and deploys Pages on push to main and when started by the data job.
  - `ci.yml`: unit tests, build, and the end-to-end tests.
  - `probe.yml`: manual. Prints the structure of live Limitless pages and API responses to the job log, for checking parsers.

## How to work in this repo
- **Branch and PRs:** the working branch is `claude/pokemon-meta-analysis-site-wa6cwi`. After a squash merge, reset it to `origin/main` and push with `--force-with-lease` (it only holds already-merged history). Then open a PR, subscribe to its activity, and squash-merge with `expectedHeadSha` once CI is green. A push to `main` triggers a deploy (about 2 minutes).
- **GitHub tools:** the GitHub and PR-subscription tools are deferred. After a worker restart, load them with ToolSearch (`select:mcp__github__create_pull_request,mcp__github__merge_pull_request,mcp__claude-code-remote__subscribe_pr_activity`). There is no `gh` CLI.
- **Local dev** serves at `/`; production builds use the GitHub Pages base. E2E builds with `SITE_BASE=/` and prerenders into `dist-e2e`.
- **Every new feature is checked on desktop AND mobile (Pixel 7)** before it ships: screenshot both with Playwright against the e2e build (`SITE_BASE=/ npx vite build --outDir dist-e2e`, fixture, prerender, `vite preview --port 4174`) and fix anything cramped, overlapping or truncated. E2E tests already run both projects.
- **Before every push:** run `npm test` and `npm run test:e2e` (in the sandbox prefix e2e with `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`). The stop hook complains about unpushed commits, so push the branch.
- **Checking real data:** the sandbox can't reach Limitless or github.io. Pull `data/raw`, run `npm run build:data` and `npx vite build`, serve with `vite preview`, and screenshot with Playwright. Check parsers through the Probe workflow logs.
- **Sandbox gotcha:** never put the `pkill -f` pattern for the preview server in the same command as the text of the launch command, because it kills its own shell. Run `pkill -f "[v]ite preview"` as a separate call, and check screenshots aren't stale files from an earlier run.
- **Never present synthetic data as real.** Test fixtures use obviously fake names ("Deck Alpha").
- Show sources, dates and sample sizes, and flag small samples.
- **Security:** no accounts or user data, secrets only in GitHub Actions secrets, minimal third-party scripts, keep dependencies updated.
- **At the next rotation,** update `CURRENT_FORMAT` and `ROTATION` in `src/lib/rotation.ts`.

## Open items and caveats
- **History backfill (Oct 2026):** online data only reached back to 7 Aug because the fetcher capped the *newest* 400 listed events (cached ones included), so it never went further back; it also lost events to HTTP 429 and wrongly skipped old events as "not finished". Fixed: the cap counts only uncached events, 429s wait longer, unusable events are remembered in `data/raw/online-skipped.json`, and only events under 3 days old wait for final standings. Manual Update data runs fill the gap back to 26 Mar. Offline runs from 25 Apr.
- **Offline volume:** only major events (Regionals, ICs, Worlds), so there are few events between seasons.
- **Rotation sets** for 2027 are assumed, not announced.
- **Prices** are market snapshots (TCGplayer and Cardmarket via Limitless), not shop prices, and new cards swing in their first weeks.
