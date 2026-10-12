import { DeckIcons } from '../components/Brand';
import { DeckName } from '../components/DeckName';
import { useMemo } from 'react';
import { divergingFill } from '../colors';
import { useTooltip } from '../components/Tooltip';
import { isOther, matchupMatrix, metaSummary, type Filters } from '../lib/analysis';
import type { Dataset } from '../lib/types';
import { int, pct } from '../format';
import { OnlineOnly } from '../components/OnlineOnly';
import { Empty } from './MetaPage';

/** Decks with at least this share of the field in the chosen period get a row and a column. */
export const MIN_SHARE = 0.01;
/** Cells with fewer games are shown greyed out as a rough guide. */
export const MIN_GAMES = 10;

export function MatchupsPage({ data, filters, onFilters }: { data: Dataset; filters: Filters; onFilters: (f: Filters) => void }) {
  const { ref, show, hide, node } = useTooltip();
  const top = useMemo(() => {
    const rows = metaSummary(data, filters).rows.filter((r) => !isOther(data, r.archetype));
    const big = rows.filter((r) => r.share >= MIN_SHARE);
    return (big.length >= 2 ? big : rows.slice(0, 8)).map((r) => r.archetype); // tiny samples: just the top decks
  }, [data, filters]);
  const m = useMemo(() => matchupMatrix(data, filters, top), [data, filters, top]);
  const total = m.flat().reduce((s, c) => s + c.games, 0) / 2;
  const name = (a: number) => data.archetypes[a].name;

  if (filters.source === 'offline') return <OnlineOnly what="Matchups" filters={filters} onFilters={onFilters} />;
  if (!top.length) return <Empty />;

  return (
    <section className="card">
      <header className="card-head">
        <h2>Matchups</h2>
        <p>
          How often the row deck beats the column deck: every deck with at least {pct(MIN_SHARE, 0)} of the field ({top.length} decks), from {int(total)} online games in this period.
          Blue = row deck favoured, red = unfavoured. Ties count as half a win; mirrors are excluded.
        </p>
      </header>
      <div className="filter-bar inline">
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
                    const ok = c.games >= MIN_GAMES && c.winRate != null;
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
                        aria-label={`${name(a)} vs ${name(b)}: ${c.games ? `${pct(c.winRate)} over ${c.games} games` : 'no games'}`}
                        style={ok ? { background: divergingFill(c.winRate!) } : undefined}
                        onMouseMove={(e) => show(e, tip)}
                      >
                        {c.games ? pct(c.winRate, 0) : ''}
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
      <p className="footnote">Grey cells have fewer than {MIN_GAMES} games, so treat them as a rough guide. Hover or tap a cell for its record. Change the period with Filters.</p>
    </section>
  );
}
