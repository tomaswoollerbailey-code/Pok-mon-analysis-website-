// Normalisers for the Limitless TCG Play API (https://play.limitlesstcg.com/api),
// documented at https://docs.limitlesstcg.com/developer.html.
import type { Card, CardCategory, RawMatch, RawStanding, RawTournament } from '../types';

export const PLAY_API = 'https://play.limitlesstcg.com/api';

export interface ApiTournamentSummary {
  id: string;
  game: string;
  format: string | null;
  name: string;
  date: string;
  players: number;
  organizerId?: number;
}

export interface ApiTournamentDetails extends ApiTournamentSummary {
  organizer?: { id: number; name: string; logo?: string };
  platform?: string;
  decklists?: boolean;
  isPublic?: boolean;
  isOnline?: boolean;
}

interface ApiCard {
  count: number;
  name: string;
  set?: string;
  number?: string | number;
}

export interface ApiStanding {
  player: string;
  name: string;
  country?: string | null;
  placing?: number | null;
  record?: { wins: number; losses: number; ties: number } | null;
  decklist?: Partial<Record<string, ApiCard[]>> | null;
  deck?: { id?: string; name?: string; icons?: string[] } | null;
  drop?: number | null;
}

export interface ApiPairing {
  round: number;
  phase?: number;
  table?: number;
  match?: string;
  winner?: string | number | null;
  player1: string;
  player2?: string | null;
}

const CATEGORY_KEYS: Record<string, CardCategory> = {
  pokemon: 'pokemon',
  trainer: 'trainer',
  energy: 'energy',
};

export function normaliseDecklist(list: ApiStanding['decklist']): Card[] | undefined {
  if (!list || typeof list !== 'object') return undefined;
  const cards: Card[] = [];
  for (const [section, entries] of Object.entries(list)) {
    const category = CATEGORY_KEYS[section.toLowerCase()];
    if (!category || !Array.isArray(entries)) continue;
    for (const c of entries) {
      if (!c || !c.name || !(c.count > 0)) continue;
      cards.push({
        category,
        name: c.name,
        count: c.count,
        ...(c.set ? { set: String(c.set) } : {}),
        ...(c.number != null && c.number !== '' ? { number: String(c.number) } : {}),
      });
    }
  }
  return cards.length ? cards : undefined;
}

export function normaliseStanding(s: ApiStanding): RawStanding {
  const deckName = s.deck?.name?.trim();
  return {
    playerId: s.player,
    name: s.name,
    ...(s.country ? { country: s.country } : {}),
    placing: s.placing ?? null,
    ...(s.record ? { record: { wins: s.record.wins ?? 0, losses: s.record.losses ?? 0, ties: s.record.ties ?? 0 } } : {}),
    ...(s.drop != null ? { dropped: true } : {}),
    archetype: deckName ? { ...(s.deck?.id ? { id: s.deck.id } : {}), name: deckName, ...(s.deck?.icons?.length ? { icons: s.deck.icons.map((i) => i.toLowerCase()) } : {}) } : null,
    ...(normaliseDecklist(s.decklist) ? { decklist: normaliseDecklist(s.decklist) } : {}),
  };
}

export function normalisePairing(p: ApiPairing): RawMatch {
  const w = p.winner;
  let winner: RawMatch['winner'] = null;
  if (w === 0 || w === '0') winner = 'tie';
  else if (w === -1 || w === '-1') winner = 'double-loss';
  else if (w != null && w !== '') winner = String(w);
  return {
    round: p.round,
    ...(p.phase != null ? { phase: p.phase } : {}),
    p1: p.player1,
    p2: p.player2 || null,
    winner,
  };
}

export function normaliseOnlineTournament(
  details: ApiTournamentDetails,
  standings: ApiStanding[],
  pairings: ApiPairing[],
  fetchedAt = new Date().toISOString(),
): RawTournament {
  return {
    source: 'online',
    id: details.id,
    name: details.name,
    date: details.date.slice(0, 10),
    format: (details.format || 'UNKNOWN').toUpperCase(),
    players: details.players,
    url: `https://play.limitlesstcg.com/tournament/${details.id}/standings`,
    ...(details.organizer?.name ? { organizer: details.organizer.name } : {}),
    standings: standings.map(normaliseStanding),
    matches: pairings.map(normalisePairing),
    fetchedAt,
  };
}
