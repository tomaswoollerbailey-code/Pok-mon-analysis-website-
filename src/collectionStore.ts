import { useCallback, useEffect, useState } from 'react';
import type { CollectionCard } from './lib/csv';

// The collection lives in this browser only (no accounts); export/import CSV moves it between devices.
const KEY = 'metalab.collection.v1';

export interface StoredCollection {
  cards: CollectionCard[];
  updatedAt: string;
  assumeBasicEnergy: boolean;
}

const EMPTY: StoredCollection = { cards: [], updatedAt: '', assumeBasicEnergy: true };

function read(): StoredCollection {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v && Array.isArray(v.cards) ? { ...EMPTY, ...v } : EMPTY;
  } catch {
    return EMPTY;
  }
}

let current = read();
const listeners = new Set<(c: StoredCollection) => void>();

export function useCollection() {
  const [state, setState] = useState(current);
  useEffect(() => {
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);
  const update = useCallback((patch: Partial<StoredCollection>) => {
    current = { ...current, ...patch, updatedAt: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* storage full or blocked: keep in memory */ }
    listeners.forEach((l) => l(current));
  }, []);
  return [state, update] as const;
}
