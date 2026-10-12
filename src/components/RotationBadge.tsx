import type { ArchetypeRotation } from '../lib/types';

const LABELS = {
  survives: { text: 'Survives', icon: '✓', title: 'No core card rotates' },
  impacted: { text: 'Loses cards', icon: '!', title: 'Survives rotation but loses core cards' },
  rotates: { text: 'Rotates', icon: '✕', title: 'Its signature Pokémon rotate' },
  unknown: { text: 'No lists', icon: '?', title: 'No decklists to judge from' },
} as const;

/** Rotation status: icon + label so the status never rests on colour alone. */
export function RotationBadge({ rotation }: { rotation?: ArchetypeRotation }) {
  const status = rotation?.status ?? 'unknown';
  const l = LABELS[status];
  const detail = rotation?.cards.length ? `${l.title}: ${rotation.cards.join(', ')}` : l.title;
  return (
    <span className={`rot rot-${status}`} title={detail}>
      <span className="rot-icon" aria-hidden>{l.icon}</span>
      {l.text}
    </span>
  );
}
