import type { ArchetypeRotation } from '../lib/types';

/** Rotation status: icon + label so the status never rests on colour alone. */
export function RotationBadge({ rotation, year }: { rotation?: ArchetypeRotation; year?: number }) {
  const status = rotation?.status ?? 'unknown';
  const when = year ? ` in ${year}` : '';
  const labels = {
    survives: { text: 'Survives', icon: '✓', title: `No core card rotates${when}` },
    impacted: { text: 'Loses cards', icon: '!', title: `Survives the rotation${when} but loses core cards` },
    rotates: { text: 'Rotates', icon: '✕', title: `Its signature Pokémon rotate out${when}` },
    unknown: { text: 'No lists', icon: '?', title: 'No decklists to judge from' },
  } as const;
  const l = labels[status];
  const detail = rotation?.cards.length ? `${l.title}: ${rotation.cards.join(', ')}` : l.title;
  return (
    <span className={`rot rot-${status}`} title={detail}>
      <span className="rot-icon" aria-hidden>{l.icon}</span>
      {l.text}
    </span>
  );
}
