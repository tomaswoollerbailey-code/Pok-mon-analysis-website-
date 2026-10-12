// Parse decklists in the Pokémon TCG Live / Limitless text format:
//   Pokémon: 12
//   4 Charizard ex OBF 125
//   Trainer: 36
//   4 Rare Candy SVI 191
import type { Card, CardCategory } from './types';

const HEADINGS: Array<[RegExp, CardCategory]> = [
  [/^pok[eé]mon\b/i, 'pokemon'],
  [/^trainers?\b/i, 'trainer'],
  [/^energy\b/i, 'energy'],
];

export function parseDeckText(text: string): Card[] {
  const cards: Card[] = [];
  let category: CardCategory = 'pokemon';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^total cards/i.test(line)) continue;
    const heading = HEADINGS.find(([re]) => re.test(line));
    if (heading && !/^\d/.test(line)) { category = heading[1]; continue; }
    const m = line.match(/^(\d+)x?\s+(.+?)(?:\s+([A-Z][A-Z0-9-]{1,5})\s+([A-Z]{0,3}\d+[a-z]?))?$/);
    if (!m) continue;
    cards.push({
      category,
      name: m[2].trim(),
      count: Number(m[1]),
      ...(m[3] ? { set: m[3], number: m[4] } : {}),
    });
  }
  return cards;
}
