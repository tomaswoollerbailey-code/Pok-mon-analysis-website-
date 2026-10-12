// Per-page titles, descriptions and a crawlable text summary. Used to prerender every page at
// build time (scripts/prerender.ts) and to keep document.title right while browsing.
import { DEFAULT_FILTERS, metaSummary } from './analysis';
import type { Route } from './routes';
import type { Dataset } from './types';

export interface PageMeta {
  title: string;
  description: string;
  /** Plain-text paragraphs shown to crawlers (and before the app loads). */
  summary: string[];
}

const SITE = 'The Crow’s Nest';
const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const deckKeyOf = (d: Dataset, key: string) => d.archetypes.find((a) => a.key === key);

export function pageMeta(d: Dataset | null, route: Route): PageMeta {
  const since = d?.format ? `since the ${d.format.rotatedYear} rotation` : 'this season';
  const meta = d ? metaSummary(d, DEFAULT_FILTERS) : null;
  const events = meta?.tournaments ?? 0;

  switch (route.page) {
    case 'deck': {
      const a = d && deckKeyOf(d, route.key);
      if (!d || !a) return { title: `Deck · ${SITE}`, description: 'Pokémon TCG deck statistics.', summary: [] };
      const idx = d.archetypes.indexOf(a);
      const row = meta!.rows.find((r) => r.archetype === idx);
      const facts = row
        ? [
            `${pct(row.share)} of the online meta`,
            `${pct(row.conversion)} reach the Top 8`,
            ...(row.winRate != null ? [`${pct(row.winRate)} win rate`] : []),
          ]
        : [];
      const price = a.price?.usd != null ? `about $${Math.round(a.price.usd)} to build` : '';
      const rotation = a.rotation && d.rotation?.year
        ? a.rotation.status === 'rotates' ? `Rotates out in ${d.rotation.year}.` : a.rotation.status === 'impacted' ? `Loses cards in the ${d.rotation.year} rotation.` : a.rotation.status === 'survives' ? `Survives the ${d.rotation.year} rotation.` : ''
        : '';
      const stats = [...facts, price].filter(Boolean).join(', ');
      const sentence = stats ? `${a.name}: ${stats} (${events} online events ${since}).` : `${a.name} results from Standard tournaments ${since}.`;
      return {
        title: `${a.name} deck list, meta share & price · ${SITE}`,
        description: `${sentence} ${rotation} Recent decklists, best finishes and price.`.replace(/\s+/g, ' ').trim(),
        summary: [sentence, rotation].filter(Boolean),
      };
    }
    case 'tournament': {
      const t = d?.tournaments.find((x) => x.key === route.key);
      if (!d || !t) return { title: `Tournament · ${SITE}`, description: 'Pokémon TCG tournament results.', summary: [] };
      const text = `${t.name}: ${t.players} players, ${t.date}. Deck breakdown and standings from Limitless.`;
      return { title: `${t.name} results & decks · ${SITE}`, description: text, summary: [text] };
    }
    case 'trends':
      return { title: `Pokémon TCG meta trends · ${SITE}`, description: `Weekly meta share for the top Pokémon TCG Standard decks ${since}.`, summary: [] };
    case 'matchups':
      return { title: `Pokémon TCG matchup win rates · ${SITE}`, description: `Deck-vs-deck win-rate heatmap from online tournament pairings ${since}.`, summary: [] };
    case 'field':
      return { title: `What should I play? Field planner · ${SITE}`, description: 'Set the decks you expect at your event and see every deck ranked by expected win rate.', summary: [] };
    case 'tournaments':
      return { title: `Pokémon TCG tournament results · ${SITE}`, description: `${d?.tournaments.length ?? 0} completed Standard events ${since}, online and in person, with deck breakdowns and standings.`, summary: [] };
    default: {
      const top = meta?.rows.filter((r) => d && d.archetypes[r.archetype].key !== 'other').slice(0, 3) ?? [];
      const lead = d && top.length ? `${d.archetypes[top[0].archetype].name} leads the online meta with ${pct(top[0].share)}.` : '';
      return {
        title: `${SITE} · Pokémon TCG meta`,
        description: `Spot the Pokémon TCG meta before it lands. ${lead} Meta share, matchups, deck prices and a field planner from online and in-person tournaments.`.replace(/\s+/g, ' ').trim(),
        summary: lead ? [lead] : [],
      };
    }
  }
}

/** Every page worth prerendering. */
export function allRoutes(d: Dataset): Route[] {
  return [
    { page: 'meta' }, { page: 'trends' }, { page: 'matchups' }, { page: 'field' }, { page: 'tournaments' },
    ...d.archetypes.filter((a) => a.key !== 'other').map((a): Route => ({ page: 'deck', key: a.key })),
    ...d.tournaments.map((t): Route => ({ page: 'tournament', key: t.key })),
  ];
}
