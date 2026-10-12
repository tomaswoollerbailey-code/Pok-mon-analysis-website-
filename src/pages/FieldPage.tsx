import { DeckName } from '../components/DeckName';
import { Fragment, useMemo, useState } from 'react';
import { RotationBadge } from '../components/RotationBadge';
import { fieldWinRates, metaSummary, SHRINK_GAMES, type Filters } from '../lib/analysis';
import type { Dataset } from '../lib/types';
import { int, pct } from '../format';
import { Empty } from './MetaPage';

const FIELD_SIZE = 10;
const CANDIDATES = 20;

/** Expected field → expected win rate for every deck ("what should I play?"). */
export function FieldPage({ data, filters }: { data: Dataset; filters: Filters }) {
  const meta = useMemo(() => metaSummary(data, filters), [data, filters]);
  const top = meta.rows.slice(0, FIELD_SIZE);
  const defaults = useMemo(() => new Map(top.map((r) => [r.archetype, Math.round(r.share * 1000) / 10])), [meta]);
  const [edits, setEdits] = useState<Map<number, number>>(new Map());
  const [open, setOpen] = useState<number | null>(null);
  const name = (a: number) => data.archetypes[a].name;

  const shares = top.map((r) => ({ archetype: r.archetype, pct: edits.get(r.archetype) ?? defaults.get(r.archetype) ?? 0 }));
  const listed = shares.reduce((s, e) => s + e.pct, 0);
  const scale = listed > 100 ? 100 / listed : 1; // over 100%: normalise, no "other"
  const other = Math.max(0, 100 - listed) / 100;
  const field = shares.map((e) => ({ archetype: e.archetype, share: (e.pct * scale) / 100 }));
  const candidates = meta.rows.slice(0, CANDIDATES).map((r) => r.archetype);
  const results = useMemo(() => fieldWinRates(data, filters, field, other, candidates), [data, filters, JSON.stringify(field), other, candidates.join()]);
  const totalGames = results.reduce((s, r) => s + r.games, 0);

  if (!top.length) return <Empty />;

  return (
    <div className="two-col field">
      <section className="card">
        <header className="card-head row">
          <div>
            <h2>Expected field</h2>
            <p>What you expect to face. Starts from the current meta. Edit any share.</p>
          </div>
          {edits.size > 0 && <button className="link-btn" onClick={() => setEdits(new Map())}>Reset</button>}
        </header>
        <table className="data">
          <tbody>
            {shares.map((e) => (
              <tr key={e.archetype}>
                <td><DeckName a={data.archetypes[e.archetype]} size={20} link={false} /></td>
                <td className="num">
                  <input
                    className="pct-input"
                    type="number" min={0} max={100} step={0.5}
                    value={e.pct}
                    aria-label={`Expected share of ${name(e.archetype)}`}
                    onChange={(ev) => setEdits(new Map(edits).set(e.archetype, Math.max(0, Math.min(100, Number(ev.target.value) || 0))))}
                  />%
                </td>
              </tr>
            ))}
            <tr className="muted"><td>Everything else</td><td className="num">{(other * 100).toFixed(1)}%</td></tr>
          </tbody>
        </table>
        {listed > 100 && <p className="footnote">Shares add up to {listed.toFixed(1)}%, so they're scaled down to 100%.</p>}
      </section>

      <section className="card">
        <header className="card-head">
          <h2>What should I play?</h2>
          <p>
            Expected match win rate against that field, from {int(totalGames)} online games with these filters.
            Each matchup is pulled toward 50% by {SHRINK_GAMES} virtual games, so small samples don’t mislead. Mirrors count as 50%.
          </p>
        </header>
        {totalGames === 0 ? <Empty>No pairings for these filters. This needs online events.</Empty> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Deck</th><th>Expected win rate</th><th className="num" title="Share of the field covered by matchups with 10+ real games">Data</th><th>Best vs</th><th>Worst vs</th><th>Rotation</th></tr></thead>
              <tbody>
                {results.map((r) => {
                  const vs = r.vs.filter((v) => v.archetype !== r.archetype && v.games >= 10).sort((a, b) => b.winRate - a.winRate);
                  const best = vs[0], worst = vs[vs.length - 1];
                  return (
                    <Fragment key={r.archetype}>
                      <tr className="clickable" onClick={() => setOpen(open === r.archetype ? null : r.archetype)}>
                        <td><DeckName a={data.archetypes[r.archetype]} /></td>
                        <td><span className="meter" aria-hidden><span style={{ width: `${r.expected * 100}%` }} /></span> <strong>{pct(r.expected)}</strong></td>
                        <td className="num">{r.coverage < 0.5 ? <span className="muted" title="Few games: treat with caution">{pct(r.coverage, 0)} ⚠</span> : pct(r.coverage, 0)}</td>
                        <td className="small">{best ? `${name(best.archetype)} ${pct(best.winRate, 0)}` : '—'}</td>
                        <td className="small">{worst && worst !== best ? `${name(worst.archetype)} ${pct(worst.winRate, 0)}` : '—'}</td>
                        <td><RotationBadge rotation={data.archetypes[r.archetype].rotation} /></td>
                      </tr>
                      {open === r.archetype && (
                        <tr className="detail">
                          <td colSpan={6}>
                            <table className="data inner">
                              <thead><tr><th>Opponent</th><th className="num">Field share</th><th className="num">Win rate</th><th className="num">Games</th><th className="num">Contribution</th></tr></thead>
                              <tbody>
                                {r.vs.map((v) => (
                                  <tr key={v.archetype}>
                                    <td>{name(v.archetype)}{v.archetype === r.archetype ? <span className="muted"> (mirror)</span> : ''}</td>
                                    <td className="num">{pct(v.share)}</td>
                                    <td className="num">{pct(v.winRate)}</td>
                                    <td className="num">{v.archetype === r.archetype ? '—' : int(v.games)}</td>
                                    <td className="num">{(v.share * v.winRate * 100).toFixed(1)} pts</td>
                                  </tr>
                                ))}
                                <tr><td>Everything else</td><td className="num">{pct(other)}</td><td className="num">{pct(r.vsOther)}</td><td className="num">—</td><td className="num">{(other * r.vsOther * 100).toFixed(1)} pts</td></tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="footnote">Click a row to see each matchup's contribution. Change the filters above (period, events) to change the data used.</p>
      </section>
    </div>
  );
}
