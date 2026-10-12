import { useMemo } from 'react';
import { DeckName } from '../components/DeckName';
import { Delta, Sparkline, trendOf } from '../components/Sparkline';
import { SortTable, type Column } from '../components/SortTable';
import { metaMovers, MOVER_MIN_PLAYERS, type Filters, type Mover } from '../lib/analysis';
import type { Dataset } from '../lib/types';
import { int, pct, shortDate } from '../format';
import { Empty } from './MetaPage';

export function TrendsPage({ data, filters }: { data: Dataset; filters: Filters }) {
  const m = useMemo(() => metaMovers(data, filters), [data, filters]);
  if (!m || !m.rows.length) return <Empty>Not enough events in this period to compare two windows. Try a longer period.</Empty>;

  const range = (w: { from: string; to: string }) => `${shortDate(w.from)}–${shortDate(w.to)}`;
  const span = m.days % 7 === 0 ? `${m.days / 7} week${m.days === 7 ? '' : 's'}` : `${m.days} days`;
  const small = (r: Mover) => r.players < MOVER_MIN_PLAYERS;

  const columns: Column<Mover>[] = [
    { key: 'name', label: 'Deck', render: (r) => <DeckName a={data.archetypes[r.archetype]} />, sort: (r) => data.archetypes[r.archetype].name },
    { key: 'now', label: 'Share now', shortLabel: 'Now', numeric: true, render: (r) => pct(r.now), sort: (r) => r.now, title: range(m.now) },
    { key: 'before', label: 'Before', numeric: true, hideOnMobile: true, render: (r) => pct(r.before), sort: (r) => r.before, title: range(m.before) },
    {
      key: 'delta', label: 'Change', numeric: true, sort: (r) => r.delta,
      render: (r) => <span title={small(r) ? `Only ${r.players} players: small sample` : undefined}><Delta value={r.delta} /></span>,
    },
    { key: 'spark', label: 'Weekly share', hideOnMobile: true, render: (r) => <Sparkline values={r.spark} trend={trendOf(r.delta)} /> },
    { key: 'players', label: 'Players', numeric: true, hideOnMobile: true, render: (r) => int(r.players), sort: (r) => r.players, title: 'Players on the deck across both windows' },
  ];

  return (
    <section className="card">
      <header className="card-head">
        <h2>What’s moving</h2>
        <p>
          Every deck’s meta share in the last {span} ({range(m.now)}) vs the {span} before ({range(m.before)}), with weekly share across the period.
          Change is in percentage points. Faded rows have fewer than {MOVER_MIN_PLAYERS} players. Change the period with Filters.
        </p>
      </header>
      <SortTable rows={m.rows} columns={columns} initial="now" rowKey={(r) => r.archetype} limit={30} rowClass={(r) => (small(r) ? 'faded' : undefined)} />
    </section>
  );
}
