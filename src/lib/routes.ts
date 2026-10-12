// Pure route helpers (no browser or Vite globals), shared with the build scripts.
export type Route =
  | { page: 'meta' }
  | { page: 'trends' }
  | { page: 'matchups' }
  | { page: 'tournaments' }
  | { page: 'field' }
  | { page: 'methodology' }
  | { page: 'tournament'; key: string }
  | { page: 'deck'; key: string };

const SEGMENTS = { tournaments: 'tournaments', decks: 'decks' } as const;

/** Parse a site path (relative to the base, no leading slash), e.g. "decks/dragapult". */
export function parsePath(path: string): Route {
  const [page, key] = path.replace(/^\/+|\/+$/g, '').split('/');
  if (page === SEGMENTS.tournaments && key) return { page: 'tournament', key: decodeURIComponent(key) };
  if (page === SEGMENTS.decks && key) return { page: 'deck', key: decodeURIComponent(key) };
  if (page === 'trends' || page === 'matchups' || page === 'tournaments' || page === 'field' || page === 'methodology') return { page };
  return { page: 'meta' };
}

/** The path of a route relative to the base, with no leading slash ("" = home). */
export function routePath(r: Route): string {
  switch (r.page) {
    case 'meta': return '';
    case 'deck': return `${SEGMENTS.decks}/${encodeURIComponent(r.key)}`;
    case 'tournament': return `${SEGMENTS.tournaments}/${encodeURIComponent(r.key)}`;
    default: return r.page;
  }
}

/** Old hash links (#/deck/x, #/tournament/x, #/trends) → the new path, or null if it isn't one. */
export function legacyHashPath(hash: string): string | null {
  if (!hash.startsWith('#/')) return null;
  const [page, key] = hash.slice(2).split('/');
  if (page === 'deck' && key) return routePath({ page: 'deck', key: decodeURIComponent(key) });
  if (page === 'tournament' && key) return routePath({ page: 'tournament', key: decodeURIComponent(key) });
  return routePath(parsePath(page ?? ''));
}

