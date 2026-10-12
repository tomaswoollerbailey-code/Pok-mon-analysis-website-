/** Murkrow-inspired mark: wide-brim hat, dark head, gold beak, red eye. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className="logo">
      <circle cx="16" cy="19" r="9" fill="var(--crow-body)" />
      <path d="M3 13.5c4-1.6 8.5-2.4 13-2.4s9 .8 13 2.4c-3.5.3-6.8.4-9.4.3L16 3l-3.6 10.8c-2.6.1-5.9 0-9.4-.3Z" fill="var(--crow-hat)" />
      <path d="M21 19.5 29 22l-8 1.8Z" fill="var(--gold)" />
      <circle cx="19.2" cy="17.6" r="1.6" fill="#e5484d" />
    </svg>
  );
}

const ICON_BASE = 'https://r2.limitlesstcg.net/pokemon/gen9/';

/** Pokémon sprites Limitless uses for a deck. Hidden quietly if an image is missing. */
export function DeckIcons({ icons, size = 24 }: { icons?: string[]; size?: number }) {
  // Fixed width (room for two overlapping sprites) keeps names aligned in lists.
  const width = Math.round(size * 1.75);
  if (!icons?.length) return <span className="deck-icons" style={{ width, height: size }} aria-hidden />;
  return (
    <span className="deck-icons" style={{ width, height: size }} aria-hidden>
      {icons.slice(0, 2).map((i) => (
        <img key={i} src={`${ICON_BASE}${i}.png`} width={size} height={size} loading="lazy" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      ))}
    </span>
  );
}
