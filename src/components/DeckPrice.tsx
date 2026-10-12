import { useMemo, useState } from 'react';
import type { Filters } from '../lib/analysis';
import { tournamentMask } from '../lib/analysis';
import { convert, formatMoney, listCost, tcgplayerMassEntry } from '../lib/pricing';
import type { ArchetypeLists, Dataset } from '../lib/types';
import { date } from '../format';
import { href } from '../router';

/** Price of a real recent top list for this archetype, with live-price buy links. */
export function DeckPrice({ data, filters, lists }: { data: Dataset; filters: Filters; lists: ArchetypeLists }) {
  const [cheapest, setCheapest] = useState(false);
  const cur = filters.currency;
  const fx = data.prices?.fx;
  const mask = useMemo(() => tournamentMask(data, filters), [data, filters]);
  // Newest best-placing list within the filters.
  const row = useMemo(
    () => [...lists.lists].filter((r) => mask[r[0]]).sort((a, b) => a[0] - b[0] || (a[1] || 1e9) - (b[1] || 1e9))[0],
    [lists, mask],
  );
  if (!data.prices) return null;
  if (!row) return null;

  const t = data.tournaments[row[0]];
  const cost = listCost(lists.cards, row, cheapest);
  const total = convert(cost, cur, fx);
  const unpriced = cur === 'eur' ? cost.unpricedEur : cost.unpricedUsd;
  const buy = tcgplayerMassEntry(lists.cards, row);
  const unit = (ci: number) => {
    const c = lists.cards[ci];
    const p = cheapest ? { usd: c.cheapest?.usd ?? c.price?.usd, eur: c.cheapest?.eur ?? c.price?.eur } : { usd: c.price?.usd, eur: c.price?.eur };
    return convert(p, cur, fx);
  };
  const order = { pokemon: 0, trainer: 1, energy: 2 };
  const rows = [...row[2]].sort((a, b) => order[lists.cards[a[0]].category] - order[lists.cards[b[0]].category] || (unit(b[0]) ?? 0) * b[1] - (unit(a[0]) ?? 0) * a[1]);
  const archetype = data.archetypes.find((a) => a.key === lists.archetype.key);
  const median = archetype?.price ? convert(archetype.price, cur, fx) : undefined;

  return (
    <section className="card">
      <header className="card-head row">
        <div>
          <h2>Deck price: {formatMoney(total, cur)}{unpriced ? <span className="muted"> + {unpriced} unpriced cards</span> : null}</h2>
          <p>
            #{row[1] || '—'} at <a href={href.tournament(t.key)}>{t.name}</a> ({date(t.date)}).
            {median != null && <> Typical (median of {archetype!.price!.lists} recent lists): {formatMoney(median, cur)}.</>}
          </p>
        </div>
        <div className="actions">
          <label className="check"><input type="checkbox" checked={cheapest} onChange={(e) => setCheapest(e.target.checked)} /> Cheapest printings</label>
          <a className="primary" href={buy.url} target="_blank" rel="noreferrer" title={buy.missing ? `${buy.missing} cards have no TCGplayer link and aren't included` : undefined}>
            Buy on TCGplayer (live prices) ↗
          </a>
        </div>
      </header>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th className="num">Qty</th><th>Card</th><th className="num">Each</th><th className="num">Total</th><th>Cardmarket</th></tr></thead>
          <tbody>
            {rows.map(([ci, n]) => {
              const c = lists.cards[ci];
              const u = unit(ci);
              return (
                <tr key={ci}>
                  <td className="num">{n}</td>
                  <td>{c.name}{c.set && <span className="muted"> {c.set} {c.number}</span>}</td>
                  <td className="num">{formatMoney(u, cur)}</td>
                  <td className="num">{formatMoney(u != null ? u * n : undefined, cur)}</td>
                  <td>{c.price?.cardmarketUrl ? <a href={c.price.cardmarketUrl} target="_blank" rel="noreferrer">View ↗</a> : <span className="muted">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Market prices shown on Limitless: TCGplayer (USD) and Cardmarket (EUR), refreshed {date(data.prices.asOf.slice(0, 10))}.
        {fx?.usd.MYR ? ` MYR is converted from USD at 1 USD = ${fx.usd.MYR.toFixed(3)} MYR (${fx.date}); it isn't a Malaysian shop price.` : ''}
        {' '}Shop prices vary; the TCGplayer button shows live seller prices.
      </p>
    </section>
  );
}
