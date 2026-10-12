import { useMemo } from 'react';
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
  const hasWinRates = m.rows.some((r) => r.winRate != null);
  const playersWord = filters.source === 'offline' ? 'listed players' : 'players';
  const ranked = m.rows.filter((r) => !isOther(data, r.archetype));
  const leader = ranked[0];
  const maxShare = Math.max(...ranked.map((r) => r.share), 0.0001);
  const rank = new Map(ranked.map((r, i) => [r.archetype, i + 1]));
  const where = filters.source === 'online' ? ' online' : filters.source === 'offline' ? ' offline' : '';

  // One table carries everything: share is drawn inline, so there's no separate chart.
  const columns: Column<ArchetypeStats>[] = [
    { key: 'rank', label: '#', numeric: true, hideOnMobile: true, render: (r) => rank.get(r.archetype) ?? '—', sort: (r) => -(rank.get(r.archetype) ?? 1e9) },
    { key: 'name', label: 'Deck', render: (r) => <DeckName a={data.archetypes[r.archetype]} />, sort: (r) => name(r.archetype) },
    {
      key: 'share', label: 'Meta share', shortLabel: 'Share', render: (r) => (
        <span className="share-cell">
          <span className="share-bar" aria-hidden><span style={{ width: `${(r.share / maxShare) * 100}%` }} /></span>
          <span className="share-val">{pct(r.share)}</span>
        </span>
      ), sort: (r) => r.share, title: `% of ${playersWord} on the deck`,
    },
    { key: 'conversion', label: 'Conversion', shortLabel: 'Conv.', numeric: true, render: (r) => pct(r.conversion), sort: (r) => r.conversion, title: `% of its ${playersWord} who made the ${cut}` },
    ...(hasWinRates ? [{
      key: 'winRate', label: 'Win rate', shortLabel: 'Win %', numeric: true,
      render: (r: ArchetypeStats) => <span title={r.wins + r.losses + r.ties ? `${r.wins}-${r.losses}-${r.ties} vs other decks` : undefined}>{pct(r.winRate)}</span>,
      sort: (r: ArchetypeStats) => r.winRate ?? -1, title: 'Games won vs other decks in online events (mirrors excluded; ties count as half)',
    } as Column<ArchetypeStats>] : []),
    ...(data.prices ? [{
      key: 'price', label: 'Price', numeric: true, hideOnMobile: true,
      title: 'Median cost of its recent lists at current market prices',
      render: (r: ArchetypeStats) => { const p = data.archetypes[r.archetype].price; return formatMoney(p ? convert(p, filters.currency, data.prices?.fx) : undefined, filters.currency); },
      sort: (r: ArchetypeStats) => { const p = data.archetypes[r.archetype].price; return (p && convert(p, filters.currency, data.prices?.fx)) ?? -1; },
    } as Column<ArchetypeStats>] : []),
    { key: 'rotation', label: 'Rotation', hideOnMobile: true, render: (r) => <RotationBadge rotation={data.archetypes[r.archetype].rotation} />, sort: (r) => ['survives', 'unknown', 'impacted', 'rotates'].indexOf(data.archetypes[r.archetype].rotation?.status ?? 'unknown') },
    { key: 'players', label: 'Players', hideOnMobile: true, numeric: true, render: (r) => int(r.players), sort: (r) => r.players },
    { key: 'wins1st', label: 'Wins', hideOnMobile: true, numeric: true, render: (r) => int(r.wins1st), sort: (r) => r.wins1st, title: 'Tournaments won' },
  ];

  const rotShare = m.rows.filter((r) => data.archetypes[r.archetype].rotation?.status === 'rotates').reduce((x, r) => x + r.share, 0);

  if (!m.tournaments) return <Empty />;

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Meta snapshot{data.format ? ` · ${data.format.label}` : ''}</p>
          <h1>{leader ? <>{name(leader.archetype)} leads{where} with {pct(leader.share)}</> : 'The meta'}</h1>
          <p className="hero-sub">
            {int(m.tournaments)} {caps.events} · {int(m.players)} {playersWord} · {int(ranked.length)} decks
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
                  <span>{cut} rate <b>{pct(r.conversion)}</b></span>
                  {r.winRate != null && <span>Win <b>{pct(r.winRate)}</b></span>}
                  {price != null && <span>{formatMoney(price, filters.currency)}</span>}
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <h2>The meta</h2>
          <dl className="glossary">
            <div><dt>Meta share</dt><dd>% of {playersWord} on the deck</dd></div>
            <div><dt>Conversion</dt><dd>% who made the {cut}</dd></div>
            {hasWinRates && <div><dt>Win rate</dt><dd>games won vs other decks (online)</dd></div>}
          </dl>
        </header>
        <SortTable rows={m.rows} columns={columns} initial="share" rowKey={(r) => r.archetype} limit={25} />
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
