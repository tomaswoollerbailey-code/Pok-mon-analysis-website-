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

const FILTER_STORE = 'crowsnest.filters';

function readFilters(): Filters {
  try {
    const v = JSON.parse(localStorage.getItem(FILTER_STORE) || 'null');
    return v ? { ...DEFAULT_FILTERS, ...v } : DEFAULT_FILTERS;
  } catch {
    return DEFAULT_FILTERS;
  }
}

const NAV = [
  { page: 'meta', label: 'Meta', short: 'Meta', href: href.meta },
  { page: 'trends', label: 'Trends', short: 'Trends', href: href.trends },
  { page: 'matchups', label: 'Matchups', short: 'Matchups', href: href.matchups },
  { page: 'field', label: 'Field planner', short: 'Planner', href: href.field },
  { page: 'tournaments', label: 'Tournaments', short: 'Events', href: href.tournaments },
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
          <span className="wordmark"><small>The</small> Crow’s <b>Nest</b></span>
        </a>
        <nav>
          {NAV.map((n) => <a key={n.page} href={n.href} className={active === n.page ? 'on' : ''} aria-current={active === n.page ? 'page' : undefined}>{n.label}</a>)}
        </nav>
        <ThemeToggle />
      </header>

      <nav className="tabbar" aria-label="Sections">
        {NAV.map((n) => (
          <a key={n.page} href={n.href} className={active === n.page ? 'on' : ''} aria-current={active === n.page ? 'page' : undefined}>
            <TabIcon page={n.page} />
            <span>{n.short}</span>
          </a>
        ))}
      </nav>

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
              <FilterBar key={route.page} filters={effective} onChange={setFilters} formats={formats} latest={latest} rotationLabel={data.rotation?.label} showTopCut={route.page !== 'trends' && route.page !== 'matchups' && route.page !== 'field'} />
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
        {data && <> Updated {date(data.generatedAt.slice(0, 10))}.</>}
        {data?.format && <> Covers completed {data.format.label} events ({data.format.marks} marks) since the last rotation: online from {date(data.format.online)}, in person from {date(data.format.inPerson)}.</>} Not affiliated with Limitless, Nintendo or The Pokémon Company.
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

/** Simple line icons for the phone tab bar. */
function TabIcon({ page }: { page: string }) {
  const paths: Record<string, string> = {
    meta: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    trends: 'M3 17l6-6 4 4 8-8M15 7h6v6',
    matchups: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    field: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
    tournaments: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
  };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[page]} />
    </svg>
  );
}
