import { useEffect, useMemo, useState } from 'react';
import { BarChart } from '../components/BarChart';
import { loadStandings } from '../data';
import type { Dataset, StandingsFile } from '../lib/types';
import { date, int, pct } from '../format';
import { href } from '../router';
import { Empty, Tile } from './MetaPage';

export function TournamentPage({ data, tKey }: { data: Dataset; tKey: string }) {
  const [file, setFile] = useState<StandingsFile | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setFile(null); setError('');
    loadStandings(tKey).then(setFile, (e) => setError(String(e.message)));
  }, [tKey]);

  const breakdown = useMemo(() => {
    if (!file) return [];
    const c = new Map<number, number>();
    for (const s of file.standings) if (s[6] >= 0) c.set(s[6], (c.get(s[6]) ?? 0) + 1);
    const known = [...c.values()].reduce((a, b) => a + b, 0);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => ({ a, n, share: n / known }));
  }, [file]);

  if (error) return <Empty>Couldn’t load this tournament ({error}).</Empty>;
  if (!file) return <div className="card loading">Loading standings…</div>;
  const t = file.tournament;
  const hasRecords = file.standings.some((s) => s[3] + s[4] + s[5] > 0);
  const name = (a: number) => (a >= 0 ? data.archetypes[a].name : 'Unknown');

  return (
    <>
      <div className="page-head">
        <a href={href.tournaments} className="back">← Tournaments</a>
        <h1>{t.name}</h1>
        <p>
          {date(t.date)} · <span className={`badge ${t.source}`}>{t.source === 'online' ? 'Online' : 'In person'}</span> · {t.format}
          {t.organizer ? ` · ${t.organizer}` : ''} · <a href={t.url} target="_blank" rel="noreferrer">View on Limitless ↗</a>
        </p>
      </div>
      <div className="tiles">
        <Tile label="Players" value={int(t.players)} />
        <Tile label="Archetypes" value={int(breakdown.length)} />
        {breakdown[0] && <Tile label="Most played" value={pct(breakdown[0].share)} note={name(breakdown[0].a)} />}
      </div>
      <div className="two-col">
        <section className="card">
          <header className="card-head"><h2>Deck breakdown</h2></header>
          <BarChart
            bars={breakdown.slice(0, 12).map((b) => ({
              id: b.a, label: name(b.a), value: b.share, valueLabel: pct(b.share), href: href.deck(data.archetypes[b.a].key),
              tip: <><div className="tip-title">{name(b.a)}</div><div className="tip-row"><span>Players</span><span className="tip-val">{b.n}</span></div></>,
            }))}
          />
        </section>
        <section className="card">
          <header className="card-head"><h2>Standings</h2></header>
          <div className="table-wrap tall">
            <table className="data">
              <thead><tr><th className="num">#</th><th>Player</th><th>Deck</th>{hasRecords && <th className="num">Record</th>}</tr></thead>
              <tbody>
                {file.standings.map((s, i) => (
                  <tr key={i}>
                    <td className="num">{s[2] || '—'}</td>
                    <td>{s[0]}{s[1] && <span className="muted"> · {s[1]}</span>}{s[7] ? <span className="muted"> (drop)</span> : null}</td>
                    <td>{s[6] >= 0 ? <a href={href.deck(data.archetypes[s[6]].key)}>{name(s[6])}</a> : <span className="muted">Unknown</span>}</td>
                    {hasRecords && <td className="num">{s[3]}-{s[4]}-{s[5]}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
