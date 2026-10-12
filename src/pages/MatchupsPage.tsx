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
  const [sort, setSort] = useState<'share' | 'win'>('share');
  const [hot, setHot] = useState<[number, number] | null>(null); // hovered cell: [row, column] positions
  // Average win rate of each deck against the other decks shown (weighted by games played).
  const avg = useMemo(() => m.map((row, i) => {
    const g = row.reduce((t, c, j) => t + (i === j ? 0 : c.games), 0);
    const w = row.reduce((t, c, j) => t + (i === j ? 0 : c.wins + c.ties / 2), 0);
    return g >= MIN_GAMES ? w / g : null;
  }), [m]);
  const order = useMemo(() => {
    const idx = top.map((_, i) => i);
    return sort === 'win' ? idx.sort((x, y) => (avg[y] ?? -1) - (avg[x] ?? -1)) : idx;
  }, [top, avg, sort]);
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
          Green = the row deck usually wins, red = it usually loses. Ties count as half a win; mirrors are excluded.
        </p>
      </header>
      <div className="filter-bar inline heat-controls">
        <div className="seg" role="radiogroup" aria-label="Order decks by">
          <button role="radio" aria-checked={sort === 'share'} className={sort === 'share' ? 'on' : ''} onClick={() => setSort('share')}>Most played</button>
          <button role="radio" aria-checked={sort === 'win'} className={sort === 'win' ? 'on' : ''} onClick={() => setSort('win')}>Best win rate</button>
        </div>
        <div className="scale" aria-hidden>
          <span>Loses</span><span className="scale-bar" /><span>Wins</span>
        </div>
      </div>
      {total === 0 ? (
        <Empty>No pairings for these filters. Matchup data comes from online tournaments only.</Empty>
      ) : (
        <div className="table-wrap heat-wrap" ref={ref} onMouseLeave={() => { hide(); setHot(null); }}>
          <table className="heat">
            <thead>
              <tr>
                <th className="corner">Row deck vs column deck →</th>
                <th className="col-head avg-head" title="Average win rate against the decks shown"><span className="col-label">Average</span><span className="deck-icons" style={{ height: 20 }} aria-hidden /></th>
                {order.map((oj, j) => { const a = top[oj]; return <th key={a} className={`col-head ${hot?.[1] === j ? 'hot' : ''}`} title={name(a)}><span className="col-label">{name(a)}</span><DeckIcons icons={data.archetypes[a].icons} size={20} /></th>; })}
              </tr>
            </thead>
            <tbody>
              {order.map((oi, i) => { const a = top[oi]; return (
                <tr key={a}>
                  <th className={`row-head ${hot?.[0] === i ? 'hot' : ''}`}><DeckName a={data.archetypes[a]} size={20} /></th>
                  <td className="avg" style={avg[oi] != null ? { background: divergingFill(avg[oi]!) } : undefined}>{avg[oi] != null ? pct(avg[oi], 0) : '–'}</td>
                  {order.map((oj, j) => {
                    const b = top[oj];
                    const c = m[oi][oj];
                    if (oi === oj) return <td key={b} className="mirror" onMouseEnter={() => setHot(null)}>—</td>;
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
                        className={`${ok ? 'cell' : 'cell thin'} ${hot && (hot[0] === i || hot[1] === j) ? 'hot' : ''}`}
                        aria-label={`${name(a)} vs ${name(b)}: ${c.games ? `${pct(c.winRate)} over ${c.games} games` : 'no games'}`}
                        style={ok ? { background: divergingFill(c.winRate!) } : undefined}
                        onMouseEnter={() => setHot([i, j])}
                        onMouseMove={(e) => show(e, tip)}
                      >
                        {c.games ? pct(c.winRate, 0) : ''}
                      </td>
                    );
                  })}
                </tr>
              ); })}
            </tbody>
          </table>
          {node}
        </div>
      )}
      <p className="footnote">Grey cells have fewer than {MIN_GAMES} games, so treat them as a rough guide. Hover or tap a cell for its record. “Average” is the row deck’s win rate against all the decks shown.</p>
    </section>
  );
}
