import { useEffect, useMemo, useState } from 'react';
import { useCollection } from '../collectionStore';
import { RotationBadge } from '../components/RotationBadge';
import { loadLists } from '../data';
import { metaSummary, tournamentMask, type Filters } from '../lib/analysis';
import { closestList, ownedByName, type BestList } from '../lib/collection';
import type { ArchetypeLists, Dataset } from '../lib/types';
import { int, pct } from '../format';
import { href } from '../router';
import { Empty } from './MetaPage';

const TOP = 30;

export function BuildPage({ data, filters }: { data: Dataset; filters: Filters }) {
  const [col] = useCollection();
  const meta = useMemo(() => metaSummary(data, filters), [data, filters]);
  const top = meta.rows.slice(0, TOP);
  const [lists, setLists] = useState<Map<number, ArchetypeLists>>(new Map());

  const keys = top.map((r) => r.archetype).join();
  useEffect(() => {
    let live = true;
    Promise.all(top.map((r) => loadLists(data.archetypes[r.archetype].key).then((l) => [r.archetype, l] as const, () => null)))
      .then((res) => { if (live) setLists(new Map(res.filter((x): x is readonly [number, ArchetypeLists] => !!x))); });
    return () => { live = false; };
  }, [keys]);

  const owned = useMemo(() => ownedByName(col.cards), [col.cards]);
  const mask = useMemo(() => tournamentMask(data, filters), [data, filters]);
  const rows = useMemo(() => top
    .map((r) => {
      const l = lists.get(r.archetype);
      const best: BestList | null = l ? closestList(l, owned, { assumeBasicEnergy: col.assumeBasicEnergy, allowed: (ti) => mask[ti] }) : null;
      return { r, best };
    })
    .filter((x) => x.best)
    .sort((a, b) => b.best!.completion.pct - a.best!.completion.pct || b.r.share - a.r.share), [top, lists, owned, mask, col.assumeBasicEnergy]);

  if (!col.cards.length) {
    return <Empty><h2>Can I build it?</h2><p>Import your collection first. Then this page ranks the current meta decks by how close you are to building them.</p><p><a href={href.collection}>Import your collection →</a></p></Empty>;
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Meta decks you can build</h2>
        <p>
          The top {TOP} archetypes for these filters, each compared against its real recent lists. We pick the list your collection gets closest to.
          Any printing of a card counts{col.assumeBasicEnergy ? ', and basic Energy is assumed' : ''}.
        </p>
      </header>
      {lists.size === 0 ? <div className="loading">Checking decklists…</div> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Archetype</th><th className="num">Meta share</th><th>You own</th><th className="num">Missing</th><th>Rotation</th><th>Biggest gaps</th></tr></thead>
            <tbody>
              {rows.map(({ r, best }) => {
                const c = best!.completion;
                const missing = c.total - c.owned;
                return (
                  <tr key={r.archetype}>
                    <td><a href={href.deck(data.archetypes[r.archetype].key)}>{data.archetypes[r.archetype].name}</a></td>
                    <td className="num">{pct(r.share)}</td>
                    <td><span className="meter" aria-label={`${pct(c.pct, 0)} owned`}><span style={{ width: `${c.pct * 100}%` }} /></span> {pct(c.pct, 0)}</td>
                    <td className="num">{missing ? `${int(missing)} cards` : <span className="rot rot-survives"><span className="rot-icon" aria-hidden>✓</span>Buildable</span>}</td>
                    <td><RotationBadge rotation={data.archetypes[r.archetype].rotation} /></td>
                    <td className="muted gaps">{c.missing.slice(0, 3).map((m) => `${m.need - m.have}× ${m.name}`).join(', ')}{c.missing.length > 3 ? '…' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
