import { useMemo, useState } from 'react';
import { LineChart } from '../components/LineChart';
import { SERIES_SLOTS, seriesVar, useStableSlots } from '../colors';
import { metaSummary, metaTrend, type Filters } from '../lib/analysis';
import type { Dataset } from '../lib/types';
import { pct, shortDate } from '../format';
import { Empty } from './MetaPage';

export function TrendsPage({ data, filters }: { data: Dataset; filters: Filters }) {
  const ranked = useMemo(() => metaSummary(data, filters).rows.map((r) => r.archetype), [data, filters]);
  const [picked, setPicked] = useState<number[] | null>(null);
  const [showTable, setShowTable] = useState(false);
  const selected = (picked ?? ranked.slice(0, 6)).filter((a) => ranked.includes(a)).slice(0, SERIES_SLOTS);
  const slots = useStableSlots(selected);
  const trend = useMemo(() => metaTrend(data, filters, selected), [data, filters, selected.join()]);

  if (!ranked.length) return <Empty />;

  const toggle = (a: number) => {
    const cur = selected;
    setPicked(cur.includes(a) ? cur.filter((x) => x !== a) : cur.length >= SERIES_SLOTS ? cur : [...cur, a]);
  };

  return (
    <section className="card">
      <header className="card-head">
        <h2>Meta share over time</h2>
        <p>Weekly share of players with a known deck. Pick up to {SERIES_SLOTS} archetypes.</p>
      </header>
      <div className="legend" role="group" aria-label="Archetypes shown">
        {ranked.slice(0, 20).map((a) => {
          const on = selected.includes(a);
          return (
            <button key={a} className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(a)} disabled={!on && selected.length >= SERIES_SLOTS}>
              <span className="swatch" style={{ background: on ? seriesVar(slots.get(a)!) : 'transparent' }} />
              {data.archetypes[a].name}
            </button>
          );
        })}
      </div>
      {trend.weeks.length < 2 ? (
        <Empty>Need at least two weeks of tournaments in this period to draw a trend.</Empty>
      ) : (
        <LineChart
          x={trend.weeks}
          xLabel={shortDate}
          yFormat={(v) => pct(v, 0)}
          series={trend.series.map((s) => ({ id: s.archetype, label: data.archetypes[s.archetype].name, slot: slots.get(s.archetype)!, values: s.values }))}
        />
      )}
      <button className="link-btn" onClick={() => setShowTable(!showTable)}>{showTable ? 'Hide table' : 'Show as table'}</button>
      {showTable && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Week of</th><th className="num">Players</th>{trend.series.map((s) => <th key={s.archetype} className="num">{data.archetypes[s.archetype].name}</th>)}</tr>
            </thead>
            <tbody>
              {trend.weeks.map((w, i) => (
                <tr key={w}><td>{shortDate(w)}</td><td className="num">{trend.totals[i]}</td>{trend.series.map((s) => <td key={s.archetype} className="num">{pct(s.values[i])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
