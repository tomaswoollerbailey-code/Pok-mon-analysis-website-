import { useMemo } from 'react';
import { BarChart } from '../components/BarChart';
import { DeckIcons } from '../components/Brand';
import { DeckName } from '../components/DeckName';
import { RotationBadge } from '../components/RotationBadge';
import { convert, formatMoney } from '../lib/pricing';
import { SortTable, type Column } from '../components/SortTable';
import { isOther, metaSummary, SOURCE_CAPS, cutLabel, type ArchetypeStats, type Filters } from '../lib/analysis';
import type { Dataset } from '../lib/types';
import { int, pct } from '../format';
import { href } from '../router';

export function MetaPage({ data, filters }: { data: Dataset; filters: Filters }) {
  const m = useMemo(() => metaSummary(data, filters), [data, filters]);
  const name = (a: number) => data.archetypes[a].name;
  const cut = cutLabel(filters);
  const caps = SOURCE_CAPS[filters.source];
  // Only show what this source actually publishes.
  const hasWinRates = m.rows.some((r) => r.winRate != null);
  const showConversion = caps.conversion;
  const playersWord = filters.source === 'japan' ? 'top placings' : filters.source === 'offline' ? 'listed players' : 'players';
  const ranked = m.rows.filter((r) => !isOther(data, r.archetype));
  const leader = ranked[0];
  const bestConv = [...ranked].filter((r) => r.players >= Math.max(10, m.identified * 0.01)).sort((a, b) => b.conversion - a.conversion)[0];

  const columns: Column<ArchetypeStats>[] = [
    { key: 'name', label: 'Deck', render: (r) => <DeckName a={data.archetypes[r.archetype]} />, sort: (r) => name(r.archetype) },
    { key: 'players', label: filters.source === 'japan' ? 'Placings' : 'Players', hideOnMobile: true, numeric: true, render: (r) => int(r.players), sort: (r) => r.players },
    { key: 'share', label: 'Meta share', numeric: true, render: (r) => pct(r.share), sort: (r) => r.share },
    { key: 'topCut', label: cut, hideOnMobile: true, numeric: true, render: (r) => int(r.topCut), sort: (r) => r.topCut, title: `Pilots finishing in the ${cut}` },
    ...(!showConversion ? [] : [{ key: 'topCutShare', label: `${cut} share`, hideOnMobile: true, numeric: true, render: (r) => pct(r.topCutShare), sort: (r: ArchetypeStats) => r.topCutShare, title: `Share of all ${cut} slots` } as Column<ArchetypeStats>,
    { key: 'conversion', label: 'Conversion', numeric: true, render: (r: ArchetypeStats) => pct(r.conversion), sort: (r: ArchetypeStats) => r.conversion, title: `How often a pilot reaches the ${cut}` } as Column<ArchetypeStats>]),
    ...(!hasWinRates ? [] : [{ key: 'winRate', label: 'Win rate', numeric: true, render: (r) => pct(r.winRate), sort: (r) => r.winRate ?? -1, title: 'Head-to-head win rate vs other decks (mirrors excluded); ties count as half' } as Column<ArchetypeStats>,
    { key: 'record', label: 'W-L-T', hideOnMobile: true, numeric: true, render: (r: ArchetypeStats) => (r.wins + r.losses + r.ties ? `${r.wins}-${r.losses}-${r.ties}` : '—') } as Column<ArchetypeStats>]),
    ...(data.prices ? [{
      key: 'price', label: 'Deck price', numeric: true, hideOnMobile: true,
      title: 'Median cost of its recent lists at current market prices',
      render: (r: ArchetypeStats) => { const p = data.archetypes[r.archetype].price; return formatMoney(p ? convert(p, filters.currency, data.prices?.fx) : undefined, filters.currency); },
      sort: (r: ArchetypeStats) => { const p = data.archetypes[r.archetype].price; return (p && convert(p, filters.currency, data.prices?.fx)) ?? -1; },
    }] : []),
    { key: 'rotation', label: 'Rotation', hideOnMobile: true, render: (r) => <RotationBadge rotation={data.archetypes[r.archetype].rotation} />, sort: (r) => ['survives', 'unknown', 'impacted', 'rotates'].indexOf(data.archetypes[r.archetype].rotation?.status ?? 'unknown') },
    { key: 'wins1st', label: 'Wins', hideOnMobile: true, numeric: true, render: (r) => int(r.wins1st), sort: (r) => r.wins1st, title: 'Tournaments won' },
  ];

  const rotShare = m.rows.filter((r) => data.archetypes[r.archetype].rotation?.status === 'rotates').reduce((x, r) => x + r.share, 0);

  if (!m.tournaments) return <Empty />;

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Meta snapshot{data.format ? ` · ${data.format.label}` : ''}</p>
          <h1>{leader ? <>{name(leader.archetype)} leads {filters.source === 'online' ? 'online' : filters.source === 'japan' ? 'in Japan' : 'in person'} with {pct(leader.share)}</> : 'The meta'}</h1>
          <p className="hero-sub">
            {int(m.tournaments)} {caps.events} · {int(m.players)} {playersWord} · {int(m.rows.length)} decks
            {data.rotation && !filters.hideRotating && rotShare > 0 ? <> · <strong>{pct(rotShare)}</strong> of the field rotates</> : null}
          </p>
        </div>
        <div className="podium">
          {ranked.slice(0, 3).map((r, i) => {
            const a = data.archetypes[r.archetype];
            const price = a.price ? convert(a.price, filters.currency, data.prices?.fx) : undefined;
            return (
              <a key={r.archetype} className="podium-card" href={href.deck(a.key)}>
                <span className="rank">#{i + 1}</span>
                <DeckIcons icons={a.icons} size={44} />
                <span className="podium-name">{a.name}</span>
                <span className="podium-share">{pct(r.share)}</span>
                <span className="podium-stats">
                  {showConversion ? <span>Makes {cut} <b>{pct(r.conversion)}</b></span> : <span>{cut} finishes <b>{int(r.topCut)}</b></span>}
                  {r.winRate != null && <span>Win <b>{pct(r.winRate)}</b></span>}
                  {price != null && <span>{formatMoney(price, filters.currency)}</span>}
                </span>
              </a>
            );
          })}
        </div>
        <dl className="glossary">
          <div><dt>Meta share</dt><dd>% of {playersWord} on the deck</dd></div>
          {showConversion && <div><dt>Conversion</dt><dd>% of its {playersWord} who made the {cut}</dd></div>}
          {hasWinRates && <div><dt>Win rate</dt><dd>games won vs other decks</dd></div>}
        </dl>
        {showConversion && bestConv && (
          <p className="hero-note">
            Best {cut} conversion: <a href={href.deck(data.archetypes[bestConv.archetype].key)}>{name(bestConv.archetype)}</a> at {pct(bestConv.conversion)} from {int(bestConv.players)} pilots.
          </p>
        )}
      </section>

      <section className="card">
        <header className="card-head">
          <h2>Meta share</h2>
          <p>{filters.source === 'japan' ? 'Share of top placings' : filters.source === 'offline' ? 'Share of listed players' : 'Share of players with a known deck'}, top 15 decks (unrecognised decks left out).</p>
        </header>
        <BarChart
          bars={ranked.slice(0, 15).map((r) => ({
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
                {showConversion && <div className="tip-row"><span>{cut} conversion</span><span className="tip-val">{pct(r.conversion)}</span></div>}
                {hasWinRates && <div className="tip-row"><span>Win rate</span><span className="tip-val">{pct(r.winRate)}</span></div>}
              </>
            ),
          }))}
        />
      </section>

      <section className="card">
        <header className="card-head">
          <h2>All decks</h2>
          <p>Tap a column to sort.{hasWinRates ? ' Win rate and W-L-T count games against other decks (mirrors excluded).' : ''}</p>
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
