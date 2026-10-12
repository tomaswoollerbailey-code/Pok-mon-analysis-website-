import { useEffect, useState } from 'react';

export type Route =
  | { page: 'meta' }
  | { page: 'trends' }
  | { page: 'matchups' }
  | { page: 'tournaments' }
  | { page: 'collection' }
  | { page: 'build' }
  | { page: 'tournament'; key: string }
  | { page: 'deck'; key: string };

export function parseHash(hash: string): Route {
  const [, page, key] = hash.replace(/^#/, '').split('/');
  if (page === 'tournament' && key) return { page, key: decodeURIComponent(key) };
  if (page === 'deck' && key) return { page, key: decodeURIComponent(key) };
  if (page === 'trends' || page === 'matchups' || page === 'tournaments' || page === 'collection' || page === 'build') return { page };
  return { page: 'meta' };
}

export const href = {
  meta: '#/',
  trends: '#/trends',
  matchups: '#/matchups',
  tournaments: '#/tournaments',
  collection: '#/collection',
  build: '#/build',
  tournament: (key: string) => `#/tournament/${encodeURIComponent(key)}`,
  deck: (key: string) => `#/deck/${encodeURIComponent(key)}`,
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => { setRoute(parseHash(location.hash)); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}
