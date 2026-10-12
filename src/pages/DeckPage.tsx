import { DeckIcons } from '../components/Brand';
import { useEffect, useMemo, useState } from 'react';
import { DeckList } from '../components/DeckList';
import { RotationBadge } from '../components/RotationBadge';
import { loadLists } from '../data';
import { metaSummary, cutLabel, type Filters } from '../lib/analysis';
import type { ArchetypeLists, Dataset } from '../lib/types';
import { int, pct } from '../format';
import { href } from '../router';
import { Empty, Tile } from './MetaPage';

export function DeckPage({ data, filters, aKey }: { data: Dataset; filters: Filters; aKey: string }) {
  const a = data.archetypes.findIndex((x) => x.key === aKey);
  const [lists, setLists] = useState<ArchetypeLists | null | 'none'>(null);
  useEffect(() => {
    setLists(null);
    loadLists(aKey).then(setLists, () => setLists('none'));
  }, [aKey]);

  const summary = useMemo(() => metaSummary(data, filters), [data, filters]);
  const stats = summary.rows.find((r) => r.archetype === a);
  const rank = summary.rows.findIndex((r) => r.archetype === a) + 1;
  const cut = cutLabel(filters);

  if (a < 0) return <Empty>Unknown archetype.</Empty>;

  return (
    <>
      <div className="page-head">
        <a href={href.meta} className="back">← Meta overview</a>
        <h1 className="deck-title"><DeckIcons icons={data.archetypes[a].icons} size={48} />{data.archetypes[a].name}</h1>
        {aKey === 'other' && (
          <p className="muted">Decks Limitless couldn’t sort into a named archetype. It isn’t a real deck, so there’s no price or rotation status.</p>
        )}
        {data.rotation && aKey !== 'other' && (
          <p className="rot-line">
            <RotationBadge rotation={data.archetypes[a].rotation} year={data.rotation.year} />
            {data.archetypes[a].rotation?.cards.length
              ? <span> Core cards leaving Standard{data.rotation.year ? ` in ${data.rotation.year}` : ''} ({data.rotation.label}): {data.archetypes[a].rotation!.cards.join(', ')}.</span>
              : data.archetypes[a].rotation?.status === 'survives' ? <span> None of its core cards rotate{data.rotation.year ? ` in ${data.rotation.year}` : ''}.</span> : null}
          </p>
        )}
      </div>
      {!stats ? (
        <Empty>
          {filters.hideRotating && data.archetypes[a].rotation?.status === 'rotates'
            ? `This deck rotates out${data.rotation?.year ? ` in ${data.rotation.year}` : ''}, so it’s hidden while the post-rotation meta is on.`
            : 'No results for this archetype with the current filters.'}
        </Empty>
      ) : (
        <div className="tiles">
          <Tile label="Meta share" value={pct(stats.share)} note={`#${rank} · ${int(stats.players)} players`} />
          <Tile label={`${cut} conversion`} value={pct(stats.conversion)} note={`${int(stats.topCut)} ${cut} finishes`} />
          {stats.winRate != null && <Tile label="Win rate" value={pct(stats.winRate)} note={`${stats.wins}-${stats.losses}-${stats.ties} vs other decks`} />}
          <Tile label="Tournament wins" value={int(stats.wins1st)} />
        </div>
      )}

      {aKey !== 'other' && lists && lists !== 'none' && <DeckList data={data} filters={filters} lists={lists} />}

    </>
  );
}
