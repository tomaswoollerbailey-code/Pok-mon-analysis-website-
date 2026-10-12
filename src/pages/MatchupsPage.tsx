import { DeckIcons } from '../components/Brand';
import { DeckName } from '../components/DeckName';
import { useMemo, useState } from 'react';
import { divergingFill } from '../colors';
import { useTooltip } from '../components/Tooltip';
import { isOther, matchupMatrix, metaSummary, type Filters } from '../lib/analysis';
import type { Dataset } from '../lib/types';
import { int, pct } from '../format';
import { OnlineOnly } from '../components/OnlineOnly';
import { Empty } from './MetaPage';

export function MatchupsPage({ data, filters, onFilters }: { data: Dataset; filters: Filters; onFilters: (f: Filters) => void }) {
  const [size, setSize] = useState(12);
  const [minGames, setMinGames] = useState(10);
  const { ref, show, hide, node } = useTooltip();
  const top = useMemo(() => metaSummary(data, filters).rows.filter((r) => !isOther(data, r.archetype)).slice(0, size).map((r) => r.archetype), [data, filters, size]);
  const m = useMemo(() => matchupMatrix(data, filters, top), [data, filters, top]);
  const total = m.flat().reduce((s, c) => s + c.games, 0) / 2;
  const name = (a: number) => data.archetypes[a].name;

  if (filters.source !== 'online') return <OnlineOnly what="Matchups" filters={filters} onFilters={onFilters} />;
  if (!top.length) return <Empty />;

  return (
    <section className="card">
      <header className="card-head">
        <h2>Matchups</h2>
        <p>
          How often the row deck beats the column deck, from {int(total)} online games. Blue = row deck favoured, red = unfavoured.
          Ties count as half a win; mirrors are excluded.
        </p>
      </header>
      <div className="filter-bar inline">
        <label><span>Archetypes</span>
          <select value={size} onChange={(e) => setSize(Number(e.target.value))}>{[8, 12, 16, 20].map((n) => <option key={n}>{n}</option>)}</select>
        </label>
        <label><span>Min games per cell</span>
          <select value={minGames} onChange={(e) => setMinGames(Number(e.target.value))}>{[1, 5, 10, 20, 50].map((n) => <option key={n}>{n}</option>)}</select>
        </label>
        <div className="scale" aria-hidden>
          <span>25%</span><span className="scale-bar" /><span>75%+</span>
        </div>
      </div>
      {total === 0 ? (
        <Empty>No pairings for these filters. Matchup data comes from online tournaments only.</Empty>
      ) : (
        <div className="table-wrap heat-wrap" ref={ref} onMouseLeave={hide}>
          <table className="heat">
            <thead>
              <tr>
                <th className="corner">vs →</th>
                {top.map((a) => <th key={a} className="col-head" title={name(a)}><span>{name(a)}</span><DeckIcons icons={data.archetypes[a].icons} size={20} /></th>)}
              </tr>
            </thead>
            <tbody>
              {top.map((a, i) => (
                <tr key={a}>
                  <th className="row-head"><DeckName a={data.archetypes[a]} size={20} /></th>
                  {top.map((b, j) => {
                    const c = m[i][j];
                    if (i === j) return <td key={b} className="mirror">—</td>;
                    const ok = c.games >= minGames && c.winRate != null;
                    const tip = (
                      <>
                        <div className="tip-title">{name(a)} vs {name(b)}</div>
                        <div className="tip-row"><span>Win rate</span><span className="tip-val">{pct(c.winRate)}</span></div>
                        <div className="tip-row"><span>Record</span><span className="tip-val">{c.wins}-{c.losses}-{c.ties}</span></div>
                        <div className="tip-row"><span>Games</span><span className="tip-val">{int(c.games)}</span></div>
                      </>
                    );
                    return (
                      <td
                        key={b}
                        className={ok ? 'cell' : 'cell thin'}
                        style={ok ? { background: divergingFill(c.winRate!) } : undefined}
                        onMouseMove={(e) => show(e, tip)}
                      >
                        {ok ? pct(c.winRate, 0) : c.games ? <span className="muted">{c.games}g</span> : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {node}
        </div>
      )}
      <p className="footnote">Cells under the minimum show the game count only (e.g. “4g”).</p>
    </section>
  );
}
