import { useEffect, useMemo, useState } from 'react';
import { Logo } from './components/Brand';
import { FilterBar } from './components/FilterBar';
import { ThemeToggle } from './components/ThemeToggle';
import { loadDataset } from './data';
import { DEFAULT_FILTERS, formatsIn, type Filters } from './lib/analysis';
import type { Dataset } from './lib/types';
import { date } from './format';
import { href, useRoute } from './router';
import { DeckPage } from './pages/DeckPage';
import { MatchupsPage } from './pages/MatchupsPage';
import { MetaPage } from './pages/MetaPage';
import { FieldPage } from './pages/FieldPage';
import { TournamentPage } from './pages/TournamentPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { TrendsPage } from './pages/TrendsPage';

const FILTER_STORE = 'murkrow.filters';

function readFilters(): Filters {
  try {
    const v = JSON.parse(localStorage.getItem(FILTER_STORE) || 'null');
    return v ? { ...DEFAULT_FILTERS, ...v } : DEFAULT_FILTERS;
  } catch {
    return DEFAULT_FILTERS;
  }
}

const NAV = [
  { page: 'meta', label: 'Meta', href: href.meta },
  { page: 'trends', label: 'Trends', href: href.trends },
  { page: 'matchups', label: 'Matchups', href: href.matchups },
  { page: 'field', label: 'Field planner', href: href.field },
  { page: 'tournaments', label: 'Tournaments', href: href.tournaments },
] as const;

export function App() {
  const route = useRoute();
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>(readFilters);

  useEffect(() => { loadDataset().then(setData, (e) => setError(String(e.message))); }, []);
  useEffect(() => { try { localStorage.setItem(FILTER_STORE, JSON.stringify(filters)); } catch { /* storage unavailable */ } }, [filters]);

  const formats = useMemo(() => (data ? formatsIn(data) : []), [data]);
  // Fall back to "any format" when the stored format isn't in this dataset.
  const effective = data && filters.format && !formats.includes(filters.format) ? { ...filters, format: '' } : filters;
  const latest = data?.tournaments[0]?.date ?? new Date().toISOString().slice(0, 10);
  const active = route.page === 'tournament' ? 'tournaments' : route.page === 'deck' ? 'meta' : route.page;

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href={href.meta}>
          <Logo />
          <span>Murkrow<b>Meta</b></span>
        </a>
        <nav>
          {NAV.map((n) => <a key={n.page} href={n.href} className={active === n.page ? 'on' : ''} aria-current={active === n.page ? 'page' : undefined}>{n.label}</a>)}
        </nav>
        <ThemeToggle />
      </header>

      <main>
        {error ? (
          <NoData error={error} />
        ) : !data ? (
          <div className="card loading">Loading tournament data…</div>
        ) : !data.tournaments.length ? (
          <NoData />
        ) : (
          <>
            {route.page !== 'tournament' && (
              <FilterBar filters={effective} onChange={setFilters} formats={formats} latest={latest} rotationLabel={data.rotation?.label} showTopCut={route.page !== 'trends' && route.page !== 'matchups' && route.page !== 'field'} />
            )}
            {effective.source === 'japan' && route.page !== 'tournament' && (
              <div className="notice" role="status">
                Japan: official City League results (top finishers only, Japanese card pool, which runs about two months ahead of international releases). Shares are of top placements, not of all players. There’s no matchup or win-rate data.
              </div>
            )}
            {effective.hideRotating && route.page !== 'tournaments' && data.rotation && (
              <div className="notice" role="status">
                Projected post-rotation meta: decks whose signature Pokémon rotate with the {data.rotation.label} ({data.rotation.sets.join(', ')}) are excluded and shares are recalculated without them.
              </div>
            )}
            {route.page === 'meta' && <MetaPage data={data} filters={effective} />}
            {route.page === 'trends' && <TrendsPage data={data} filters={effective} />}
            {route.page === 'matchups' && <MatchupsPage data={data} filters={effective} />}
            {route.page === 'field' && <FieldPage data={data} filters={effective} />}
            {route.page === 'tournaments' && <TournamentsPage data={data} filters={effective} />}
            {route.page === 'tournament' && <TournamentPage data={data} tKey={route.key} />}
            {route.page === 'deck' && <DeckPage data={data} filters={effective} aKey={route.key} />}
          </>
        )}
      </main>

      <footer>
        Tournament data from <a href="https://limitlesstcg.com" target="_blank" rel="noreferrer">Limitless TCG</a> (in person) and{' '}
        <a href="https://play.limitlesstcg.com" target="_blank" rel="noreferrer">Limitless Play</a> (online).
        {data && <> Updated {date(data.generatedAt.slice(0, 10))}.</>} Not affiliated with Limitless, Nintendo or The Pokémon Company.
      </footer>
    </div>
  );
}

function NoData({ error }: { error?: string }) {
  return (
    <div className="card empty">
      <h2>No tournament data yet</h2>
      <p>{error ? `The dataset couldn’t be loaded (${error}).` : 'The dataset is empty.'} Build it with:</p>
      <pre>npm run data</pre>
      <p>This fetches online events from the Limitless Play API and in-person events from limitlesstcg.com, then writes <code>public/data/</code>.</p>
    </div>
  );
}
