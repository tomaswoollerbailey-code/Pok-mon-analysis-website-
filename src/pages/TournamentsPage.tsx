import { DeckName } from '../components/DeckName';
import { SOURCE_LABELS } from '../components/FilterBar';
import { useMemo, useState } from 'react';
import { SortTable } from '../components/SortTable';
import { tournamentMask, type Filters } from '../lib/analysis';
import type { Dataset, TournamentInfo } from '../lib/types';
import { date, int } from '../format';
import { href } from '../router';
import { Empty } from './MetaPage';

export function TournamentsPage({ data, filters }: { data: Dataset; filters: Filters }) {
  const [q, setQ] = useState('');
  const winners = useMemo(() => {
    const w = new Map<number, number>();
    for (const [ti, a, placing] of data.results) if (placing === 1) w.set(ti, a);
    return w;
  }, [data]);
  const mask = useMemo(() => tournamentMask(data, filters), [data, filters]);
  const rows = data.tournaments
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => mask[i] && (!q || t.name.toLowerCase().includes(q.toLowerCase())));

  const winner = (i: number) => {
    const a = winners.get(i);
    return a == null ? '—' : a < 0 ? 'Unknown deck' : <DeckName a={data.archetypes[a]} size={20} />;
  };

  return (
    <section className="card">
      <header className="card-head row">
        <div>
          <h2>Tournaments</h2>
          <p>{int(rows.length)} events match the filters.</p>
        </div>
        <input className="search" type="search" placeholder="Search events…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tournaments" />
      </header>
      {rows.length ? (
        <SortTable<{ t: TournamentInfo; i: number }>
          rows={rows}
          rowKey={(r) => r.t.key}
          initial="date"
          limit={100}
          columns={[
            { key: 'date', label: 'Date', render: (r) => date(r.t.date), sort: (r) => r.t.date },
            { key: 'name', label: 'Event', render: (r) => <a href={href.tournament(r.t.key)}>{r.t.name}</a>, sort: (r) => r.t.name },
            { key: 'source', label: 'Type', render: (r) => <span className={`badge ${r.t.source}`}>{SOURCE_LABELS[r.t.source]}</span>, sort: (r) => r.t.source },
            { key: 'players', label: 'Players', numeric: true, render: (r) => int(r.t.players), sort: (r) => r.t.players },
            { key: 'winner', label: 'Winning deck', render: (r) => winner(r.i) },
          ]}
        />
      ) : <Empty />}
    </section>
  );
}
