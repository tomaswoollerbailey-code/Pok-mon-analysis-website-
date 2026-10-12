import type { ArchetypeInfo } from '../lib/types';
import { href } from '../router';
import { DeckIcons } from './Brand';

export function DeckName({ a, size = 24, link = true }: { a: ArchetypeInfo; size?: number; link?: boolean }) {
  const body = <><DeckIcons icons={a.icons} size={size} /><span className="deck-label">{a.name}</span></>;
  return link ? <a className="deck-name" href={href.deck(a.key)} onClick={(e) => e.stopPropagation()}>{body}</a> : <span className="deck-name">{body}</span>;
}
