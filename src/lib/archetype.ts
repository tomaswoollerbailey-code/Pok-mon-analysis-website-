/** Normalise an archetype name into a key that matches across online and offline data. */
export function archetypeKey(name: string): string {
  const key = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return key || 'other';
}

/** Identity used to merge card usage: Pokémon by printing, trainers and energy by name. */
export function cardKey(card: { category: string; name: string; set?: string; number?: string }): string {
  if (card.category === 'pokemon' && card.set && card.number) {
    return `p|${card.name}|${card.set}|${card.number}`;
  }
  return `${card.category[0]}|${card.name}`;
}
