import { DEFAULT_FILTERS, type Filters } from '../lib/analysis';
import { CURRENT_FORMAT } from '../lib/rotation';

export const SOURCE_LABELS = { online: 'Online', offline: 'Offline' } as const;

const PERIODS: { label: string; short: string; days: number | null }[] = [
  { label: 'Last 14 days', short: '14d', days: 14 },
  { label: 'Last 30 days', short: '30d', days: 30 },
  { label: 'Last 90 days', short: '90d', days: 90 },
  { label: `Since ${CURRENT_FORMAT.rotatedYear} rotation`, short: 'Since rotation', days: null },
];

export function FilterBar({ filters, onChange, rotation }: {
  filters: Filters;
  onChange: (f: Filters) => void;
  /** The next rotation (e.g. H mark, 2027); omitted when the dataset has no rotation info. */
  rotation?: { label: string; year?: number };
}) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const period = PERIODS.find((p) => p.days === filters.periodDays) ?? PERIODS[PERIODS.length - 1];
  const changed = filters.periodDays !== DEFAULT_FILTERS.periodDays || filters.hideRotating !== DEFAULT_FILTERS.hideRotating;

  return (
    <div className="toolbar" role="group" aria-label="Filters">
      <div className="seg" role="radiogroup" aria-label="Source">
        {(['online', 'offline'] as const).map((s) => (
          <button key={s} role="radio" aria-checked={filters.source === s} className={filters.source === s ? 'on' : ''} onClick={() => set('source', s)}>
            {SOURCE_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="seg" role="radiogroup" aria-label="Period">
        {PERIODS.map((p) => (
          <button key={p.short} role="radio" aria-checked={period === p} title={p.label} className={period === p ? 'on' : ''} onClick={() => set('periodDays', p.days)}>
            {p.short}
          </button>
        ))}
      </div>
      {rotation && (
        <button
          className={`pill ${filters.hideRotating ? 'on' : ''}`}
          role="switch"
          aria-checked={filters.hideRotating}
          title={`Hide decks whose key Pokémon leave Standard with the ${rotation.year ?? 'next'} rotation (${rotation.label})`}
          onClick={() => set('hideRotating', !filters.hideRotating)}
        >
          {rotation.year ? `After ${rotation.year} rotation` : 'After rotation'}
        </button>
      )}
      {changed && <button className="link-btn" onClick={() => onChange({ ...DEFAULT_FILTERS, source: filters.source })}>Reset</button>}
    </div>
  );
}
