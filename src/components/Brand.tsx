/** The Crow's Nest mark: a crow keeping lookout from a ship's crow's nest. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className="logo">
      <path d="M16 2v8" stroke="var(--crow-mast)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3.2 22 5l-6 1.8Z" fill="var(--gold)" />
      <circle cx="15" cy="15.5" r="6.2" fill="var(--crow-body)" />
      <path d="M20.2 14.6 26 16.4l-5.8 1.4Z" fill="var(--gold)" />
      <circle cx="17.2" cy="14.4" r="1.25" fill="#f2f0f7" />
      <path d="M6 19.5h20l-2 9.5H8Z" fill="var(--crow-mast)" />
      <path d="M7.1 23h17.8M7.8 26.3h16.4" stroke="var(--page)" strokeWidth="1.1" opacity=".55" />
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
