/**
 * Normalise a card name so the same card matches across collection apps and decklists:
 * "Boss’s Orders (Ghetsis) - 172/182" → "boss's orders", "Basic Fire Energy" → "fire energy".
 */
export function normaliseCardName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // Pokémon → Pokemon
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+-\s+#?[A-Z]{0,4}\d+[a-z]?(\/[A-Z]{0,4}\d+)?\s*$/i, '') // " - 125/197", " - SV107"
    .replace(/\s+#?\d+\/\d+\s*$/, '') // " 125/197"
    .replace(/(\s*[([][^)\]]*[)\]])+\s*$/, '') // trailing "(Secret)", "[Reverse Holo]"
    .replace(/^basic\s+(\w+\s+energy)$/i, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const BASIC_ENERGY = /^(grass|fire|water|lightning|psychic|fighting|darkness|metal) energy$/;
export const isBasicEnergy = (normalisedName: string) => BASIC_ENERGY.test(normalisedName);
