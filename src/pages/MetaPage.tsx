import { useMemo } from 'react';
import { BarChart } from '../components/BarChart';
import { DeckIcons } from '../components/Brand';
import { DeckName } from '../components/DeckName';
import { RotationBadge } from '../components/RotationBadge';
import { convert, formatMoney } from '../lib/pricing';
import { SortTable, type Column } from '../components/SortTable';
import { metaSummary, TOP_CUT_LABELS, type ArchetypeStats, type Filters } from '../lib/analysis';
import type { Dataset } from '../lib/types';
import { int, pct } from '../format';
import { href } from '../router';

export function MetaPage({ data, filters }: { data: Dataset; filters: Filters }) {
  const m = useMemo(() => metaSummary(data, filters), [data, filters]);
  const name = (a: number) => data.archetypes[a].name;
  const cut = TOP_CUT_LABELS[filters.topCut];
  const leader = m.rows[0];
  const bestConv = [...m.rows].filter((r) => r.players >= Math.max(10, m.identified * 0.01)).sort((a, b) => b.conversion - a.conversion)[0];

  const columns: Column<ArchetypeStats>[] = [
    { key: 'name', label: 'Deck', render: (r) => <DeckName a={data.archetypes[r.archetype]} />, sort: (r) => name(r.archetype) },
    { key: 'players', label: 'Players', numeric: true, render: (r) => int(r.players), sort: (r) => r.players },
    { key: 'share', label: 'Meta share', numeric: true, render: (r) => pct(r.share), sort: (r) => r.share },
    { key: 'topCut', label: cut, numeric: true, render: (r) => int(r.topCut), sort: (r) => r.topCut, title: `Pilots finishing in the ${cut}` },
    { key: 'topCutShare', label: `${cut} share`, numeric: true, render: (r) => pct(r.topCutShare), sort: (r) => r.topCutShare, title: `Share of all ${cut} slots` },
    { key: 'conversion', label: 'Conversion', numeric: true, render: (r) => pct(r.conversion), sort: (r) => r.conversion, title: `Pilots reaching the ${cut} ÷ pilots` },
    { key: 'winRate', label: 'Win rate', numeric: true, render: (r) => pct(r.winRate), sort: (r) => r.winRate ?? -1, title: 'Match win rate where records are available (online events); ties count as half' },
    { key: 'record', label: 'W-L-T', numeric: true, render: (r) => (r.wins + r.losses + r.ties ? `${r.wins}-${r.losses}-${r.ties}` : '—') },
    ...(data.prices ? [{
      key: 'price', label: 'Deck price', numeric: true,
      title: 'Median cost of its recent lists at current market prices',
      render: (r: ArchetypeStats) => { const p = data.archetypes[r.archetype].price; return formatMoney(p ? convert(p, filters.currency, data.prices?.fx) : undefined, filters.currency); },
      sort: (r: ArchetypeStats) => { const p = data.archetypes[r.archetype].price; return (p && convert(p, filters.currency, data.prices?.fx)) ?? -1; },
    }] : []),
    { key: 'rotation', label: 'Rotation', render: (r) => <RotationBadge rotation={data.archetypes[r.archetype].rotation} />, sort: (r) => ['survives', 'unknown', 'impacted', 'rotates'].indexOf(data.archetypes[r.archetype].rotation?.status ?? 'unknown') },
    { key: 'wins1st', label: 'Wins', numeric: true, render: (r) => int(r.wins1st), sort: (r) => r.wins1st, title: 'Tournaments won' },
  ];

  const rotShare = m.rows.filter((r) => data.archetypes[r.archetype].rotation?.status === 'rotates').reduce((x, r) => x + r.share, 0);

  if (!m.tournaments) return <Empty />;

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Meta snapshot{data.format ? ` · ${data.format.label}` : ''}</p>
          <h1>{leader ? <>{name(leader.archetype)} leads with {pct(leader.share)}</> : 'The meta'}</h1>
          <p className="hero-sub">
            {int(m.tournaments)} tournaments · {int(m.players)} players
            {m.identified < m.players ? ` (${int(m.identified)} with a known deck)` : ''} · {int(m.rows.length)} archetypes
            {data.rotation && !filters.hideRotating && rotShare > 0 ? <> · <strong>{pct(rotShare)}</strong> of the field rotates</> : null}
          </p>
        </div>
        <div className="podium">
          {m.rows.slice(0, 3).map((r, i) => {
            const a = data.archetypes[r.archetype];
            const price = a.price ? convert(a.price, filters.currency, data.prices?.fx) : undefined;
            return (
              <a key={r.archetype} className="podium-card" href={href.deck(a.key)}>
                <span className="rank">#{i + 1}</span>
                <DeckIcons icons={a.icons} size={44} />
                <span className="podium-name">{a.name}</span>
                <span className="podium-share">{pct(r.share)}</span>
                <span className="podium-stats">
                  <span>{cut} conv. <b>{pct(r.conversion)}</b></span>
                  {r.winRate != null && <span>Win <b>{pct(r.winRate)}</b></span>}
                  {price != null && <span>{formatMoney(price, filters.currency)}</span>}
                </span>
              </a>
            );
          })}
        </div>
        {bestConv && (
          <p className="hero-note">
            Best {cut} conversion: <a href={href.deck(data.archetypes[bestConv.archetype].key)}>{name(bestConv.archetype)}</a> at {pct(bestConv.conversion)} from {int(bestConv.players)} pilots.
          </p>
        )}
      </section>

      <section className="card">
        <header className="card-head">
          <h2>Meta share</h2>
          <p>Share of players with a known deck, top 15 archetypes.</p>
        </header>
        <BarChart
          bars={m.rows.slice(0, 15).map((r) => ({
            id: r.archetype,
            label: name(r.archetype),
            lead: <DeckIcons icons={data.archetypes[r.archetype].icons} size={22} />,
            value: r.share,
            valueLabel: pct(r.share),
            href: href.deck(data.archetypes[r.archetype].key),
            tip: (
              <>
                <div className="tip-title">{name(r.archetype)}</div>
                <div className="tip-row"><span>Players</span><span className="tip-val">{int(r.players)}</span></div>
                <div className="tip-row"><span>Meta share</span><span className="tip-val">{pct(r.share)}</span></div>
                <div className="tip-row"><span>{cut} conversion</span><span className="tip-val">{pct(r.conversion)}</span></div>
                <div className="tip-row"><span>Win rate</span><span className="tip-val">{pct(r.winRate)}</span></div>
              </>
            ),
          }))}
        />
      </section>

      <section className="card">
        <header className="card-head">
          <h2>All archetypes</h2>
          <p>Click a column to sort. Win rates come from events that publish records, which are mostly online.</p>
        </header>
        <SortTable rows={m.rows} columns={columns} initial="players" rowKey={(r) => r.archetype} limit={30} />
      </section>
    </>
  );
}

export function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {note && <div className="tile-note">{note}</div>}
    </div>
  );
}

export function Empty({ children }: { children?: React.ReactNode }) {
  return <div className="card empty">{children ?? 'No tournaments match these filters. Try a wider period or a different source.'}</div>;
}
