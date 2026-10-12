import { useMemo, useState } from 'react';
import { useCollection } from '../collectionStore';
import { tournamentMask, type Filters } from '../lib/analysis';
import { closestList, missingAsText, ownedByName } from '../lib/collection';
import type { ArchetypeLists, Dataset } from '../lib/types';
import { date, int, pct } from '../format';
import { href } from '../router';

/** "Can I build it?" for one archetype: the closest real list and what's missing. */
export function CollectionPanel({ data, filters, lists }: { data: Dataset; filters: Filters; lists: ArchetypeLists }) {
  const [col] = useCollection();
  const [copied, setCopied] = useState(false);
  const owned = useMemo(() => ownedByName(col.cards), [col.cards]);
  const mask = useMemo(() => tournamentMask(data, filters), [data, filters]);
  const best = useMemo(
    () => closestList(lists, owned, { assumeBasicEnergy: col.assumeBasicEnergy, allowed: (ti) => mask[ti] }),
    [lists, owned, mask, col.assumeBasicEnergy],
  );

  if (!col.cards.length) {
    return (
      <section className="card">
        <header className="card-head"><h2>Can I build it?</h2></header>
        <p className="muted"><a href={href.collection}>Import your collection</a> to see how many of these cards you already own.</p>
      </section>
    );
  }
  if (!best) return null;
  const t = data.tournaments[best.row[0]];
  const c = best.completion;
  const copy = async () => {
    try { await navigator.clipboard.writeText(missingAsText(c.missing)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  return (
    <section className="card">
      <header className="card-head row">
        <div>
          <h2>Can I build it?</h2>
          <p>
            Closest list: #{best.row[1] || '—'} at <a href={href.tournament(t.key)}>{t.name}</a> ({date(t.date)}).
            You own {int(c.owned)} of its {int(c.total)} cards ({pct(c.pct, 0)}).
          </p>
        </div>
        {c.missing.length > 0 && <button className="link-btn" onClick={copy}>{copied ? 'Copied ✓' : 'Copy missing cards'}</button>}
      </header>
      <span className="meter wide" aria-hidden><span style={{ width: `${c.pct * 100}%` }} /></span>
      {c.missing.length ? (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Missing card</th><th className="num">Need</th><th className="num">Have</th><th className="num">Short</th></tr></thead>
            <tbody>
              {c.missing.map((m) => (
                <tr key={m.name}><td>{m.name}</td><td className="num">{m.need}</td><td className="num">{m.have}</td><td className="num">{m.need - m.have}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="rot rot-survives"><span className="rot-icon" aria-hidden>✓</span>You own every card in this list.</p>}
    </section>
  );
}
