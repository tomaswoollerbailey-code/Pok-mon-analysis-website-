import { useMemo } from 'react';
import { DeckIcons } from '../components/Brand';
import { DeckName } from '../components/DeckName';
import { Delta } from '../components/Sparkline';
import { SortTable, type Column } from '../components/SortTable';
import { weeklyReport, type Mover, type ReportWinner, type WeeklyReport } from '../lib/analysis';
import type { Dataset } from '../lib/types';
import { int, pct, shortDate } from '../format';
import { href } from '../router';
import { Empty } from './MetaPage';

type Top = WeeklyReport['top'][number];

/** The weekly report: fixed 7-day window, online data, no filters, so everyone sees the same page. */
export function ReportPage({ data }: { data: Dataset }) {
  const r = useMemo(() => weeklyReport(data), [data]);
  if (!r) return <Empty>Not enough online events yet to write a weekly report.</Empty>;

  const range = `${shortDate(r.from)}–${shortDate(r.to)}`;
  const deck = (a: number) => data.archetypes[a];
  const lead = r.top[0];
  const hasWinRates = r.top.some((t) => t.winRate != null);

  const columns: Column<Top>[] = [
    { key: 'name', label: 'Deck', render: (t) => <DeckName a={deck(t.archetype)} /> },
    { key: 'share', label: 'Share', numeric: true, render: (t) => pct(t.share), title: '% of online players on the deck this week' },
    { key: 'delta', label: 'Change', numeric: true, render: (t) => <Delta value={t.delta} />, title: 'Change in share vs the 7 days before' },
    { key: 'conversion', label: 'Top 8 rate', shortLabel: 'Top 8', numeric: true, render: (t) => pct(t.conversion), title: '% of its players who made the Top 8' },
    ...(hasWinRates ? [{ key: 'winRate', label: 'Win rate', shortLabel: 'Win %', numeric: true, render: (t: Top) => pct(t.winRate), title: 'Games won vs other decks (mirrors excluded)' } as Column<Top>] : []),
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Weekly report · {range}</p>
          <h1>{lead ? <>{deck(lead.archetype).name} led the week with {pct(lead.share)}</> : 'The week in the meta'}</h1>
          <p className="hero-sub">
            {int(r.events)} online events · {int(r.players)} players, {r.risers.length ? <>{deck(r.risers[0].archetype).name} gained the most</> : 'no deck moved much'} against the 7 days before.
          </p>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <h2>Top decks</h2>
          <p>Online meta share for {range}, with the change in percentage points vs the 7 days before.</p>
        </header>
        <SortTable rows={r.top} columns={columns} initial="share" rowKey={(t) => t.archetype} />
      </section>

      <div className="report-movers">
        <Movers title="Risers" empty="No deck gained notable share." movers={r.risers} data={data} />
        <Movers title="Fallers" empty="No deck lost notable share." movers={r.fallers} data={data} />
      </div>

      <section className="card">
        <header className="card-head">
          <h2>Event winners</h2>
          <p>The {r.winners.length < r.totalEvents ? `${r.winners.length} biggest of ${r.totalEvents}` : r.totalEvents} events of the week, online and in person.</p>
        </header>
        <Winners winners={r.winners} data={data} />
      </section>

      <p className="source-note">
        The latest seven days of data against the seven before. Risers and fallers need at least 20 players across both weeks. <a href={href.trends}>See every deck’s trend</a> or <a href={href.methodology}>how the numbers work</a>.
      </p>
    </>
  );
}

function Movers({ title, empty, movers, data }: { title: string; empty: string; movers: Mover[]; data: Dataset }) {
  return (
    <section className="card">
      <header className="card-head"><h2>{title}</h2></header>
      {movers.length ? (
        <ul className="mover-list">
          {movers.map((m) => (
            <li key={m.archetype}>
              <DeckName a={data.archetypes[m.archetype]} />
              <span className="mover-share">{pct(m.before)} → {pct(m.now)}</span>
              <Delta value={m.delta} />
            </li>
          ))}
        </ul>
      ) : <p className="muted">{empty}</p>}
    </section>
  );
}

function Winners({ winners, data }: { winners: ReportWinner[]; data: Dataset }) {
  if (!winners.length) return <p className="muted">No events this week.</p>;
  return (
    <ul className="winner-list">
      {winners.map((w) => {
        const t = data.tournaments[w.tournament];
        const a = w.archetype >= 0 ? data.archetypes[w.archetype] : null;
        return (
          <li key={t.key}>
            <span className="winner-event">
              <a href={href.tournament(t.key)}>{t.name}</a>
              <small>{shortDate(t.date)} · {int(t.players)} players · {t.source}</small>
            </span>
            {a && a.key !== 'other' ? <DeckName a={a} /> : <span className="muted"><DeckIcons icons={a?.icons} size={24} /> Unknown deck</span>}
          </li>
        );
      })}
    </ul>
  );
}
