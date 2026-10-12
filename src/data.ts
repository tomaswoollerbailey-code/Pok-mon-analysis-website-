import type { ArchetypeLists, Dataset, StandingsFile } from './lib/types';

const base = `${import.meta.env.BASE_URL}data/`;
const cache = new Map<string, Promise<any>>();

function load<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(base + path).then((r) => {
        if (!r.ok) throw new Error(`${r.status} loading ${path}`);
        return r.json();
      }).catch((e) => { cache.delete(path); throw e; }),
    );
  }
  return cache.get(path)!;
}

export const loadDataset = () => load<Dataset>('dataset.json');
export const loadLists = (archetypeKey: string) => load<ArchetypeLists>(`lists/${archetypeKey}.json`);
export const loadStandings = (tournamentKey: string) => load<StandingsFile>(`standings/${tournamentKey}.json`);
