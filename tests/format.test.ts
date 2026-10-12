import { describe, expect, it } from 'vitest';
import { buildDataset } from '../src/lib/build';
import { CURRENT_FORMAT } from '../src/lib/rotation';
import type { RawTournament } from '../src/lib/types';

const t = (source: RawTournament['source'], id: string, date: string, format = 'STANDARD'): RawTournament => ({
  source, id, name: id, date, format, players: 1, url: '', fetchedAt: '',
  standings: [{ playerId: '0', name: 'x', placing: 1, archetype: { name: 'Deck' } }],
});

describe('current format window', () => {
  it('keeps only Standard events since the last rotation (Japan keeps its own window)', () => {
    const { dataset } = buildDataset([
      t('online', 'old-online', '2026-03-25'),
      t('online', 'new-online', CURRENT_FORMAT.online),
      t('offline', 'old-offline', '2026-04-09'),
      t('offline', 'new-offline', CURRENT_FORMAT.inPerson),
      t('offline', 'expanded', '2026-06-01', 'EXPANDED'),
      t('japan', 'jp', '2026-02-01'),
    ], 'now');
    expect(dataset.tournaments.map((x) => x.id).sort()).toEqual(['jp', 'new-offline', 'new-online']);
    expect(dataset.format).toEqual(CURRENT_FORMAT);
  });
});
