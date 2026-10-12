import { useMemo, useState } from 'react';
import { href } from '../router';
import { tournamentMask, type Filters } from '../lib/analysis';
import { commonLists, deckText, listCards, topLists } from '../lib/decklist';
import type { ArchetypeLists, CardCategory, Dataset, ListRow } from '../lib/types';
import { date, int } from '../format';
import { SOURCE_LABELS } from './FilterBar';

const HEAD: Record<CardCategory, string> = { pokemon: 'Pokémon', trainer: 'Trainers', energy: 'Energy' };
const CUTS = [8, 16, 32];
const PAGE = 10;

/** The cards of one real list, with a one-tap copy for Pokémon TCG Live. */
function ListBody({ lists, row }: { lists: ArchetypeLists; row: ListRow }) {
  const [copied, setCopied] = useState(false);
  const cards = useMemo(() => listCards(lists.cards, row), [lists, row]);
  const copy = async () => {
    const text = deckText(cards);
    try { await navigator.clipboard.writeText(text); } catch {
      // Clipboard API blocked (e.g. no permission): fall back to a hidden textarea.
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="list-body">
      <div className="decklist">
        {(['pokemon', 'trainer', 'energy'] as const).map((cat) => {
          const cs = cards.filter((c) => c.category === cat);
          if (!cs.length) return null;
          return (
            <div key={cat} className="decklist-col">
              <h3>{HEAD[cat]} <span>{cs.reduce((s, c) => s + c.count, 0)}</span></h3>
              <ul>
                {cs.map((c) => (
                  <li key={`${c.name}|${c.set}|${c.number}`}>
                    <span className="dl-count">{c.count}</span>
                    <span className="dl-name">{c.name}</span>
                    <span className="dl-set">{c.set ? `${c.set} ${c.number ?? ''}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <button className="primary" onClick={copy} aria-live="polite">{copied ? 'Copied ✓' : 'Copy for TCG Live'}</button>
    </div>
  );
}

/** Real lists for a deck: the ones that finished well, or the ones players run identically. */
export function DeckList({ data, filters, lists }: { data: Dataset; filters: Filters; lists: ArchetypeLists }) {
  const mask = useMemo(() => tournamentMask(data, filters), [data, filters]);
  const [view, setView] = useState<'top' | 'common'>('top');
  const [cut, setCut] = useState(8);
  const [shown, setShown] = useState(PAGE);
  const top = useMemo(() => topLists(data, lists, mask, cut), [data, lists, mask, cut]);
  const common = useMemo(() => commonLists(data, lists, mask), [data, lists, mask]);
  const total = useMemo(() => lists.lists.filter((r) => mask[r[0]]).length, [lists, mask]);
  if (!total) return null;

  const items = view === 'top' ? top : common;
  const event = (r: ListRow) => data.tournaments[r[0]];

  return (
    <section className="card">
      <header className="card-head row">
        <div>
          <h2>Decklists</h2>
          <p>
            {view === 'top'
              ? `Lists that finished in the top ${cut}, best placing first.`
              : `Identical lists (same cards and copies) played more than once, most common first. ${int(total)} lists in this period.`}
          </p>
        </div>
        <div className="decklist-actions">
          <div className="seg" role="group" aria-label="List view">
            <button className={view === 'top' ? 'on' : ''} onClick={() => { setView('top'); setShown(PAGE); }}>Top finishes</button>
            <button className={view === 'common' ? 'on' : ''} onClick={() => { setView('common'); setShown(PAGE); }}>Most played</button>
          </div>
          {view === 'top' && (
            <div className="seg" role="group" aria-label="Finish">
              {CUTS.map((c) => <button key={c} className={cut === c ? 'on' : ''} onClick={() => { setCut(c); setShown(PAGE); }}>Top {c}</button>)}
            </div>
          )}
        </div>
      </header>
      {items.length === 0 && <p className="muted">{view === 'top' ? `No top ${cut} lists in this period.` : 'No list was played more than once in this period.'}</p>}
      <div className="list-items">
        {(view === 'top'
          ? top.slice(0, shown).map((r) => ({ r, key: `${r[0]}|${r[1]}|${r[2].length}`, count: 0, events: 0 }))
          : common.filter((g) => g.count > 1).slice(0, shown).map((g) => ({ r: g.row, key: `${g.row[0]}|${g.row[1]}|${g.count}`, count: g.count, events: g.events }))
        ).map(({ r, key, count, events }, i) => {
          const t = event(r);
          return (
            <details key={key} className="list-item" open={i === 0 && view === 'top'}>
              <summary>
                {view === 'top'
                  ? <span className="list-rank">#{r[1]}</span>
                  : <span className="list-rank">×{count}</span>}
                <span className="list-title">
                  <a href={href.tournament(t.key)} onClick={(e) => e.stopPropagation()}>{t.name}</a>
                  <span className={`badge ${t.source}`}>{SOURCE_LABELS[t.source]}</span>
                </span>
                <span className="list-meta">
                  {view === 'common'
                    ? `${events} event${events === 1 ? '' : 's'}${r[1] ? ` · best #${r[1]}` : ''} · `
                    : `${int(t.players)} players · `}
                  {date(t.date)}
                </span>
              </summary>
              <ListBody lists={lists} row={r} />
            </details>
          );
        })}
      </div>
      {(view === 'top' ? top.length : common.filter((g) => g.count > 1).length) > shown && (
        <button className="show-more" onClick={() => setShown(shown + PAGE)}>Show more</button>
      )}
    </section>
  );
}
