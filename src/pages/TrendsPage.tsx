import { useMemo } from 'react';
import { DeckName } from '../components/DeckName';
import { Delta, Sparkline, trendOf } from '../components/Sparkline';
import { SortTable, type Column } from '../components/SortTable';
import { metaMovers, MOVER_MIN_PLAYERS, type Filters, type Mover } from '../lib/analysis';
import type { Dataset } from '../lib/types';
import { int, pct, shortDate } from '../format';
import { Empty } from './MetaPage';

const BOARD = 6;

export function TrendsPage({ data, filters }: { data: Dataset; filters: Filters }) {
  const m = useMemo(() => metaMovers(data, filters), [data, filters]);
  if (!m) return <Empty>Not enough recent events in this period to compare. Try a longer period.</Empty>;
  if (!m.rows.length) return <Empty>No deck has {MOVER_MIN_PLAYERS}+ players in the last two windows. Try a longer period.</Empty>;

  const rising = m.rows.filter((r) => r.delta > 0).slice(0, BOARD);
  const falling = m.rows.filter((r) => r.delta < 0).slice(-BOARD).reverse();
  const range = (w: { from: string; to: string }) => `${shortDate(w.from)}–${shortDate(w.to)}`;
  const weeks = m.days % 7 === 0 ? `${m.days / 7} week${m.days === 7 ? '' : 's'}` : `${m.days} days`;

  const columns: Column<Mover>[] = [
    { key: 'name', label: 'Deck', render: (r) => <DeckName a={data.archetypes[r.archetype]} />, sort: (r) => data.archetypes[r.archetype].name },
    { key: 'now', label: 'Share now', shortLabel: 'Now', numeric: true, render: (r) => pct(r.now), sort: (r) => r.now, title: range(m.now) },
    { key: 'before', label: 'Before', numeric: true, hideOnMobile: true, render: (r) => pct(r.before), sort: (r) => r.before, title: range(m.before) },
    { key: 'delta', label: 'Change', numeric: true, render: (r) => <Delta value={r.delta} />, sort: (r) => r.delta },
    { key: 'spark', label: 'Weekly share', hideOnMobile: true, render: (r) => <Sparkline values={r.spark} trend={trendOf(r.delta)} /> },
    { key: 'players', label: 'Players', numeric: true, hideOnMobile: true, render: (r) => int(r.players), sort: (r) => r.players, title: 'Players on the deck across both windows' },
  ];

  return (
    <>
      <section className="card">
        <header className="card-head">
          <h2>What’s moving</h2>
          <p>
            Meta share in the last {weeks} ({range(m.now)}) vs the {weeks} before ({range(m.before)}).
            Decks with at least {MOVER_MIN_PLAYERS} players across both. Change is in percentage points.
          </p>
        </header>
        <div className="movers">
          <MoverList title="Rising" rows={rising} data={data} empty="Nothing gained share." />
          <MoverList title="Falling" rows={falling} data={data} empty="Nothing lost share." />
        </div>
      </section>
      <section className="card">
        <header className="card-head"><h2>Every deck</h2></header>
        <SortTable rows={m.rows} columns={columns} initial="delta" rowKey={(r) => r.archetype} limit={25} />
      </section>
    </>
  );
}

function MoverList({ title, rows, data, empty }: { title: string; rows: Mover[]; data: Dataset; empty: string }) {
  return (
    <div className="mover-list">
      <h3>{title}</h3>
      {rows.length ? (
        <ol>
          {rows.map((r) => (
            <li key={r.archetype}>
              <DeckName a={data.archetypes[r.archetype]} size={22} />
              <Sparkline values={r.spark} trend={trendOf(r.delta)} />
              <span className="mover-now">{pct(r.now)}</span>
              <Delta value={r.delta} />
            </li>
          ))}
        </ol>
      ) : <p className="muted">{empty}</p>}
    </div>
  );
}
