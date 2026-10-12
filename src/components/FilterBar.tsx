import { DEFAULT_FILTERS, TOP_CUT_LABELS, type Filters, type TopCut } from '../lib/analysis';

export const SOURCE_LABELS = { all: 'International', online: 'Online', offline: 'In person', japan: 'Japan' } as const;

const PRESETS: { label: string; days: number | null }[] = [
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Since rotation', days: null },
];

function daysAgo(latest: string, days: number) {
  const d = new Date(`${latest}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function FilterBar({ filters, onChange, formats, latest, rotationLabel, showTopCut = true }: {
  filters: Filters;
  onChange: (f: Filters) => void;
  formats: string[];
  /** e.g. "H regulation mark"; omitted when the dataset has no rotation info. */
  rotationLabel?: string;
  /** Most recent tournament date — presets count back from it so an old dataset still shows data. */
  latest: string;
  showTopCut?: boolean;
}) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const activePreset = PRESETS.find((p) => (p.days == null ? !filters.from && !filters.to : filters.from === daysAgo(latest, p.days) && !filters.to));
  const custom = !!(filters.from || filters.to || filters.minPlayers);
  return (
    <div className="toolbar" role="group" aria-label="Filters">
      <div className="toolbar-row">
        <div className="seg" role="radiogroup" aria-label="Source">
          {(['all', 'online', 'offline', 'japan'] as const).map((s) => (
            <button key={s} role="radio" aria-checked={filters.source === s} className={filters.source === s ? 'on' : ''} onClick={() => set('source', s)}>
              {SOURCE_LABELS[s]}
            </button>
          ))}
        </div>
        <label className="field-inline">
          <span>Period</span>
          <select
            value={activePreset?.label ?? 'custom'}
            onChange={(e) => {
              const p = PRESETS.find((x) => x.label === e.target.value);
              if (p) onChange({ ...filters, from: p.days == null ? '' : daysAgo(latest, p.days), to: '' });
            }}
          >
            {PRESETS.map((p) => <option key={p.label}>{p.label}</option>)}
            {!activePreset && <option value="custom">Custom</option>}
          </select>
        </label>
        <label className="field-inline">
          <span>Format</span>
          <select value={filters.format} onChange={(e) => set('format', e.target.value)}>
            <option value="">Any</option>
            {formats.map((f) => <option key={f} value={f}>{f[0] + f.slice(1).toLowerCase()}</option>)}
          </select>
        </label>
        {showTopCut && (
          <label className="field-inline">
            <span>Cut</span>
            <select value={filters.topCut} onChange={(e) => set('topCut', e.target.value as TopCut)}>
              {Object.entries(TOP_CUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        )}
        <label className="field-inline">
          <span>Prices</span>
          <select value={filters.currency} onChange={(e) => set('currency', e.target.value as Filters['currency'])}>
            <option value="usd">USD</option>
            <option value="eur">EUR</option>
            <option value="myr">MYR</option>
          </select>
        </label>
        {rotationLabel && (
          <button
            className={`toggle ${filters.hideRotating ? 'on' : ''}`}
            aria-pressed={filters.hideRotating}
            title={`Remove decks whose signature Pokémon leave Standard with the ${rotationLabel} rotation, and recompute shares as a post-rotation meta`}
            onClick={() => set('hideRotating', !filters.hideRotating)}
          >
            <span className="toggle-box" aria-hidden>{filters.hideRotating ? '✓' : ''}</span>
            Post-rotation
          </button>
        )}
        <details className="more" open={custom || undefined}>
          <summary>More{custom ? ' •' : ''}</summary>
          <div className="more-body">
            <label className="field-inline"><span>From</span><input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set('from', e.target.value)} /></label>
            <label className="field-inline"><span>To</span><input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set('to', e.target.value)} /></label>
            <label className="field-inline"><span>Min players</span><input type="number" min={0} step={8} value={filters.minPlayers} onChange={(e) => set('minPlayers', Math.max(0, Number(e.target.value) || 0))} /></label>
            <button className="link-btn" onClick={() => onChange(DEFAULT_FILTERS)}>Reset all</button>
          </div>
        </details>
      </div>
    </div>
  );
}
