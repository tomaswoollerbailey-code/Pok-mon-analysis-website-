import { SHRINK_GAMES } from '../lib/analysis';
import { CORE_SHARE, CURRENT_FORMAT, ROTATION } from '../lib/rotation';
import type { Dataset } from '../lib/types';
import { date, int, pct } from '../format';
import { MIN_GAMES, MIN_SHARE } from './MatchupsPage';

const LIMITLESS = <a href="https://limitlesstcg.com" target="_blank" rel="noreferrer">Limitless TCG</a>;
const LIMITLESS_PLAY = <a href="https://play.limitlesstcg.com" target="_blank" rel="noreferrer">Limitless Play</a>;

export function MethodologyPage({ data }: { data: Dataset | null }) {
  const fmt = data?.format ?? { ...CURRENT_FORMAT };
  const online = data?.tournaments.filter((t) => t.source === 'online') ?? [];
  const offline = data?.tournaments.filter((t) => t.source === 'offline') ?? [];
  const rotation = data?.rotation ?? ROTATION;

  return (
    <>
      <header className="page-head">
        <h1>Methodology</h1>
        <p>Where the numbers come from and exactly how each one is worked out, so you can judge how far to trust it.</p>
      </header>

      <section className="card prose">
        <h2>Data</h2>
        <dl>
          <dt>Online</dt>
          <dd>
            Completed Standard events with 32 or more players from the {LIMITLESS_PLAY} API (Pokémon TCG Live), from {date(fmt.online)}.
            {data && <> Currently {int(online.length)} events.</>} Online events publish every round, so only they have win rates, matchups and the Field planner. Many are best-of-one.
          </dd>
          <dt>Offline</dt>
          <dd>
            Regionals, Internationals and Worlds listed on {LIMITLESS}, from {date(fmt.inPerson)}.
            {data && <> Currently {int(offline.length)} events.</>} They only publish the top finishers, and are best-of-three, so offline shares lean towards the decks that did well. Offline has no win rates.
          </dd>
          <dt>Window</dt>
          <dd>
            Events since the last rotation ({fmt.rotatedYear}: {fmt.marks} marks legal). Japanese-format events are not included. The Period filter narrows this to the last 14, 30 or 90 days, counted back from the newest event.
          </dd>
          <dt>Updates</dt>
          <dd>
            Results, decklists and prices refresh once a day (06:17 UTC).{data && <> The data on this page was built on {date(data.generatedAt.slice(0, 10))}.</>} Events are counted once they have final standings.
          </dd>
        </dl>
        <p className="footnote">All results are collected by Limitless; this site only analyses them. Not affiliated with Limitless, Nintendo or The Pokémon Company.</p>
      </section>

      <section className="card prose">
        <h2>Metrics</h2>
        <dl>
          <dt>Deck</dt>
          <dd>
            The deck name is Limitless’s label for each entry, which we use as given. Entries Limitless could not classify are “Other”: they are left out of every ranking and every share.
          </dd>
          <dt>Share</dt>
          <dd>
            A deck’s players divided by all players with a named deck, in the events and period you have selected. Every entry counts once, so bigger events weigh more.
          </dd>
          <dt>Conversion</dt>
          <dd>
            The share of a deck’s players who reached the top cut: Top 8 online, Top 10% offline (a Top 8 of a 2,000-player Regional would be just 0.4% of the field). It shows which decks get pilots to the end, not only which are popular.
          </dd>
          <dt>Win rate</dt>
          <dd>
            Wins divided by games in head-to-head pairings against other decks, with ties as half a win. Mirror matches are excluded. Standings records are not used, because they include byes and drops and read low.
          </dd>
          <dt>Matchups</dt>
          <dd>
            Every deck with at least {pct(MIN_SHARE, 0)} of the field in the period gets a row and a column. A cell is the row deck’s win rate against the column deck, and is greyed out under {MIN_GAMES} games.
          </dd>
          <dt>Trends</dt>
          <dd>
            Compares a deck’s share in the latest window with the window before it, in percentage points. The window is half the Period (7, 15 or 45 days), or four weeks for “Since rotation” and for offline.
          </dd>
        </dl>
      </section>

      <section className="card prose">
        <h2>Field planner</h2>
        <p>
          You enter the share of the field you expect. Each deck’s expected win rate is the average of its matchup win rates against those decks, weighted by the shares you set.
        </p>
        <ul>
          <li>Each matchup is pulled towards 50% by {SHRINK_GAMES} virtual games, so a 3–0 record doesn’t look like a 100% matchup.</li>
          <li>Mirrors count as 50%.</li>
          <li>The slice of the field you leave unlisted uses each deck’s overall win rate.</li>
        </ul>
        <p className="footnote">It is a guide built from past results, not a prediction. Expect a different field at your own event.</p>
      </section>

      <section className="card prose">
        <h2>Rotation</h2>
        <p>
          The next rotation is expected in {rotation.year ?? 'a future year'} and is assumed to remove the {rotation.label} ({rotation.sets.join(', ')}). <b>This is unconfirmed</b> until it is announced, and the site will be updated then.
        </p>
        <ul>
          <li>A card is treated as rotating only if every printing seen in the data is from a rotating set. A reprint in any other set keeps it legal, and basic Energy never rotates.</li>
          <li>A card is part of a deck’s core if it appears in at least {pct(CORE_SHARE, 0)} of that deck’s lists.</li>
          <li><b>Rotates:</b> the Pokémon the deck is named for is in a rotating set (or, for names that match no card, most of its core Pokémon are).</li>
          <li><b>Loses cards:</b> the deck survives but some core cards rotate.</li>
          <li><b>Survives:</b> no core card rotates.</li>
        </ul>
        <p>The Post-rotation switch in Filters hides decks that rotate and recalculates every share without them.</p>
      </section>

      <section className="card prose">
        <h2>Decklists and prices</h2>
        <dl>
          <dt>Top finishes</dt>
          <dd>
            Real lists that finished in the top 8, 16 or 32 of an event in your period, best placing first. Only events that publish lists are included, so some placings have no list.
          </dd>
          <dt>Most played</dt>
          <dd>
            Lists grouped when they have exactly the same cards and copies (different printings of a card count as the same). Only lists played more than once are shown, most common first.
          </dd>
          <dt>Prices</dt>
          <dd>
            A daily snapshot of TCGplayer (USD) and Cardmarket (EUR) market prices, read from Limitless decklist pages. MYR is the USD price converted at a daily exchange rate, not a Malaysian shop price. These are market prices, not what a shop will charge, and new cards swing in their first weeks.
          </dd>
        </dl>
      </section>

      <section className="card prose">
        <h2>Limits to keep in mind</h2>
        <ul>
          <li>Small samples are noisy. Treat a deck with few players or games as a hint, not a result. Players and games are shown wherever a number appears.</li>
          <li>Online and offline are different environments (best-of-one against best-of-three, and different fields), so they are never blended.</li>
          <li>Results show what was played, not what is best. A deck can score well because strong players pick it.</li>
        </ul>
      </section>
    </>
  );
}
