import { useEffect, useState } from 'react';

import { legacyHashPath, parsePath, routePath, type Route } from './lib/routes';
export type { Route };

/** Site root, e.g. "/" or "/Pok-mon-analysis-website-/" (set by Vite's `base`). Always ends with "/". */
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');

const url = (path: string) => `${BASE}${path}`;
export const href = {
  meta: url(''),
  trends: url('trends'),
  matchups: url('matchups'),
  tournaments: url('tournaments'),
  field: url('field'),
  methodology: url('methodology'),
  report: url('report'),
  tournament: (key: string) => url(routePath({ page: 'tournament', key })),
  deck: (key: string) => url(routePath({ page: 'deck', key })),
};

const current = () => parsePath(location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : '');

export function useRoute(): Route {
  const [route, setRoute] = useState(() => {
    const legacy = legacyHashPath(location.hash);
    if (legacy != null) history.replaceState(null, '', url(legacy));
    return current();
  });
  useEffect(() => {
    const show = () => { setRoute(current()); window.scrollTo(0, 0); };
    // Plain left-clicks on in-site links navigate without a page reload. Capture phase, so links
    // whose React handlers stop propagation (deck names inside clickable rows) are covered too.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.('a');
      if (!a || a.target || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || !u.pathname.startsWith(BASE)) return;
      e.preventDefault();
      if (u.pathname + u.search !== location.pathname + location.search) history.pushState(null, '', u.pathname + u.search);
      show();
    };
    addEventListener('popstate', show);
    document.addEventListener('click', onClick, true);
    return () => { removeEventListener('popstate', show); document.removeEventListener('click', onClick, true); };
  }, []);
  return route;
}
