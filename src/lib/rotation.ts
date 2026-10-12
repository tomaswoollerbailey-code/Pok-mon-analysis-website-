// Next Standard rotation (expected 2027). Limitless labels the current format (Oct 2026) "Temporal Forces – 30th
// Celebration", so the oldest legal sets are the H regulation mark ones listed here. Update this
// when The Pokémon Company announces the next rotation.
import { archetypeKey } from './archetype';
import type { ArchetypeRotation, CardInfo, ListRow } from './types';

/**
 * The current Standard format started at the last rotation (G mark out; H, I and J legal).
 * Online events count from the TCG Live switch, in-person events from the Play! Pokémon date.
 * Source: Bulbapedia "2026-27 Standard format".
 */
export const CURRENT_FORMAT = {
  label: '2026–27 Standard',
  /** The last rotation happened this year (April 2026): G mark out. */
  rotatedYear: 2026,
  marks: 'H, I and J',
  online: '2026-03-26',
  inPerson: '2026-04-10',
};

/** First date counted for a source. */
export function formatStart(source: 'online' | 'offline'): string {
  return source === 'online' ? CURRENT_FORMAT.online : CURRENT_FORMAT.inPerson;
}

export const ROTATION = {
  label: 'H regulation mark',
  /** The next rotation is expected next year (unconfirmed). */
  year: 2027,
  /** Set codes (as used by Limitless) whose cards leave Standard. */
  sets: ['TEF', 'TWM', 'SFA', 'SCR', 'SSP', 'PRE'],
};

const BASIC_ENERGY = /^(basic )?(grass|fire|water|lightning|psychic|fighting|darkness|metal) energy$/i;
/** Words in archetype names that don't identify a Pokémon. */
const NOT_POKEMON = new Set(['ex', 'box', 'basic', 'control', 'toolbox', 'turbo', 'other', 'lost', 'zone', 'mill', 'stall', 'v', 'vstar', 'vmax']);

/**
 * Card names that rotate: every printing seen in the data is from a rotating set.
 * A card with any printing outside those sets (a reprint) stays legal; basic energy never rotates.
 */
export function rotatingCardNames(printings: Iterable<{ name: string; set?: string }>, rotatingSets = ROTATION.sets): Set<string> {
  const rotating = new Set(rotatingSets.map((s) => s.toUpperCase()));
  const legal = new Set<string>();
  const seen = new Set<string>();
  for (const c of printings) {
    if (!c.set) continue; // unknown printing: no evidence either way
    seen.add(c.name);
    if (!rotating.has(c.set.toUpperCase()) || BASIC_ENERGY.test(c.name)) legal.add(c.name);
  }
  return new Set([...seen].filter((n) => !legal.has(n)));
}

/** A card in at least this share of an archetype's lists is part of its core. */
export const CORE_SHARE = 0.5;

/**
 * Classify an archetype from its decklists:
 * - rotates: a core Pokémon named in the archetype (e.g. "Dragapult ex" for "Dragapult") rotates,
 *   or, for names that don't match any card, most of its core Pokémon copies rotate;
 * - impacted: it survives but loses core cards;
 * - survives: no core card rotates.
 */
export function classifyArchetype(name: string, cards: CardInfo[], lists: ListRow[], rotatingNames: Set<string>): ArchetypeRotation {
  if (!lists.length) return { status: 'unknown', cards: [] };
  const inclusion = new Map<string, number>();
  const copies = new Map<string, number>();
  for (const [, , entries] of lists) {
    const names = new Set<string>();
    for (const [ci, count] of entries) {
      const n = cards[ci].name;
      names.add(n);
      copies.set(n, (copies.get(n) ?? 0) + count);
    }
    for (const n of names) inclusion.set(n, (inclusion.get(n) ?? 0) + 1);
  }
  const category = new Map(cards.map((c) => [c.name, c.category]));
  const core = [...inclusion.entries()].filter(([, k]) => k / lists.length >= CORE_SHARE).map(([n]) => n);
  const lost = core.filter((n) => rotatingNames.has(n)).sort((a, b) => (copies.get(b) ?? 0) - (copies.get(a) ?? 0));
  if (!lost.length) return { status: 'survives', cards: [] };

  const tokens = archetypeKey(name).split('-').filter((t) => t.length >= 3 && !NOT_POKEMON.has(t));
  const corePokemon = core.filter((n) => category.get(n) === 'pokemon');
  const signature = corePokemon.filter((n) => tokens.some((t) => archetypeKey(n).split('-').includes(t)));
  let rotates: boolean;
  if (signature.length) {
    rotates = signature.some((n) => rotatingNames.has(n));
  } else {
    const total = corePokemon.reduce((s, n) => s + (copies.get(n) ?? 0), 0);
    const gone = corePokemon.filter((n) => rotatingNames.has(n)).reduce((s, n) => s + (copies.get(n) ?? 0), 0);
    rotates = total > 0 && gone / total > 0.5;
  }
  return { status: rotates ? 'rotates' : 'impacted', cards: lost };
}
