import { useMemo, useState } from 'react';
import { tournamentMask, type Filters } from '../lib/analysis';
import { averageList, deckText, listCards, topLists, type DeckCard } from '../lib/decklist';
import type { ArchetypeLists, CardCategory, Dataset } from '../lib/types';
import { date, int, pct } from '../format';

const ORDINAL = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const HEAD: Record<CardCategory, string> = { pokemon: 'Pokémon', trainer: 'Trainers', energy: 'Energy' };

/** The deck's list: the average list or a recent top list, with a one-tap copy for Pokémon TCG Live. */
export function DeckList({ data, filters, lists }: { data: Dataset; filters: Filters; lists: ArchetypeLists }) {
  const mask = useMemo(() => tournamentMask(data, filters), [data, filters]);
  const inPeriod = useMemo(() => lists.lists.filter((r) => mask[r[0]]), [lists, mask]);
  const avg = useMemo(() => averageList(lists.cards, inPeriod), [lists, inPeriod]);
  const tops = useMemo(() => topLists(data, lists, mask), [data, lists, mask]);
  const [pick, setPick] = useState<'avg' | number>('avg');
  const [copied, setCopied] = useState(false);
  if (!avg) return null;

  const chosen = pick === 'avg' || !tops[pick] ? null : tops[pick];
  const cards: DeckCard[] = chosen ? listCards(lists.cards, chosen) : avg.cards;
  const label = (i: number) => { const r = tops[i], t = data.tournaments[r[0]]; return `${ORDINAL(r[1])} · ${t.name} · ${date(t.date)}`; };

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
    <section className="card">
      <header className="card-head row">
        <div>
          <h2>Decklist</h2>
          <p>
            {chosen
              ? `${int(data.tournaments[chosen[0]].players)}-player event.`
              : `The average of ${int(avg.lists)} lists in this period: each card's average copies, rounded to a full deck. % = share of lists playing it.`}
          </p>
        </div>
        <div className="decklist-actions">
          <select aria-label="Which list" value={String(pick)} onChange={(e) => setPick(e.target.value === 'avg' ? 'avg' : Number(e.target.value))}>
            <option value="avg">Average list ({int(avg.lists)} lists)</option>
            {tops.map((_, i) => <option key={i} value={i}>{label(i)}</option>)}
          </select>
          <button className="primary" onClick={copy} aria-live="polite">{copied ? 'Copied ✓' : 'Copy for TCG Live'}</button>
        </div>
      </header>
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
                    {c.inclusion != null
                      ? <span className="dl-incl" title="Share of lists that play this card">{pct(c.inclusion, 0)}</span>
                      : <span className="dl-set">{c.set ? `${c.set} ${c.number ?? ''}` : ''}</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
