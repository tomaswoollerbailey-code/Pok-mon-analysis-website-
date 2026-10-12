import { useEffect, useMemo, useState } from 'react';
import { SortTable } from '../components/SortTable';
import { loadLists } from '../data';
import { archetypeResults, cardUsage, metaSummary, TOP_CUT_LABELS, type CardUsage, type Filters } from '../lib/analysis';
import type { ArchetypeLists, CardCategory, Dataset } from '../lib/types';
import { date, int, pct } from '../format';
import { href } from '../router';
import { Empty, Tile } from './MetaPage';

const CATS: { key: CardCategory; label: string }[] = [
  { key: 'pokemon', label: 'Pokémon' },
  { key: 'trainer', label: 'Trainers' },
  { key: 'energy', label: 'Energy' },
];

export function DeckPage({ data, filters, aKey }: { data: Dataset; filters: Filters; aKey: string }) {
  const a = data.archetypes.findIndex((x) => x.key === aKey);
  const [lists, setLists] = useState<ArchetypeLists | null | 'none'>(null);
  const [topOnly, setTopOnly] = useState(false);
  useEffect(() => {
    setLists(null);
    loadLists(aKey).then(setLists, () => setLists('none'));
  }, [aKey]);

  const summary = useMemo(() => metaSummary(data, filters), [data, filters]);
  const stats = summary.rows.find((r) => r.archetype === a);
  const rank = summary.rows.findIndex((r) => r.archetype === a) + 1;
  const results = useMemo(() => (a >= 0 ? archetypeResults(data, filters, a) : []), [data, filters, a]);
  const usage = useMemo(
    () => (lists && lists !== 'none' ? cardUsage(data, lists, filters, topOnly) : null),
    [data, lists, filters, topOnly],
  );
  const cut = TOP_CUT_LABELS[filters.topCut];

  if (a < 0) return <Empty>Unknown archetype.</Empty>;
  const best = results.filter((r) => r[2] > 0).slice().sort((x, y) => x[2] - y[2] || x[0] - y[0]).slice(0, 25);

  return (
    <>
      <div className="page-head">
        <a href={href.meta} className="back">← Meta overview</a>
        <h1>{data.archetypes[a].name}</h1>
      </div>
      {!stats ? <Empty>No results for this archetype with the current filters.</Empty> : (
        <div className="tiles">
          <Tile label="Meta share" value={pct(stats.share)} note={`#${rank} · ${int(stats.players)} players`} />
          <Tile label={`${cut} conversion`} value={pct(stats.conversion)} note={`${int(stats.topCut)} ${cut} finishes`} />
          <Tile label="Win rate" value={pct(stats.winRate)} note={stats.wins + stats.losses + stats.ties ? `${stats.wins}-${stats.losses}-${stats.ties}` : 'No records'} />
          <Tile label="Tournament wins" value={int(stats.wins1st)} />
        </div>
      )}

      <section className="card">
        <header className="card-head row">
          <div>
            <h2>Card usage</h2>
            <p>{usage ? `${int(usage.lists)} decklists` : 'Share of lists playing each card and average copies when played.'}</p>
          </div>
          <label className="check"><input type="checkbox" checked={topOnly} onChange={(e) => setTopOnly(e.target.checked)} /> {cut} lists only</label>
        </header>
        {lists === null ? <div className="loading">Loading decklists…</div>
          : lists === 'none' || !usage || !usage.lists ? <Empty>No decklists published for this archetype with the current filters.</Empty>
          : (
            <div className="three-col">
              {CATS.map(({ key, label }) => {
                const rows = usage.cards.filter((u) => lists.cards[u.card].category === key);
                if (!rows.length) return null;
                return (
                  <div key={key}>
                    <h3>{label}</h3>
                    <SortTable<CardUsage>
                      rows={rows}
                      rowKey={(u) => u.card}
                      initial="inclusion"
                      columns={[
                        { key: 'name', label: 'Card', render: (u) => { const c = lists.cards[u.card]; return <>{c.name}{c.set && <span className="muted"> {c.set} {c.number}</span>}</>; }, sort: (u) => lists.cards[u.card].name },
                        { key: 'inclusion', label: 'Played', numeric: true, render: (u) => <span className="usage"><span className="usage-bar" style={{ width: `${u.inclusion * 100}%` }} />{pct(u.inclusion, 0)}</span>, sort: (u) => u.inclusion },
                        { key: 'avg', label: 'Avg', numeric: true, render: (u) => u.avgCount.toFixed(2), sort: (u) => u.avgCount, title: 'Average copies in lists that play it' },
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          )}
      </section>

      <section className="card">
        <header className="card-head"><h2>Best finishes</h2></header>
        {best.length ? (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th className="num">Place</th><th>Event</th><th>Date</th><th className="num">Players</th><th className="num">Record</th></tr></thead>
              <tbody>
                {best.map((r, i) => {
                  const t = data.tournaments[r[0]];
                  return (
                    <tr key={i}>
                      <td className="num">{r[2]}</td>
                      <td><a href={href.tournament(t.key)}>{t.name}</a> <span className={`badge ${t.source}`}>{t.source === 'online' ? 'Online' : 'In person'}</span></td>
                      <td className="nowrap">{date(t.date)}</td>
                      <td className="num">{int(t.players)}</td>
                      <td className="num">{r[3] + r[4] + r[5] ? `${r[3]}-${r[4]}-${r[5]}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <Empty>No placings recorded.</Empty>}
      </section>
    </>
  );
}
