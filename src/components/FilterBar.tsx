import { useState } from 'react';
import { cutLabel, DEFAULT_FILTERS, type Filters, type TopCut } from '../lib/analysis';
import type { Currency } from '../lib/pricing';

export const SOURCE_LABELS = { all: 'All', offline: 'Offline', online: 'Online' } as const;

const PERIODS: { label: string; short: string; days: number | null }[] = [
  { label: 'Last 14 days', short: '14d', days: 14 },
  { label: 'Last 30 days', short: '30d', days: 30 },
  { label: 'Last 90 days', short: '90d', days: 90 },
  { label: 'Since rotation', short: 'Rotation', days: null },
];
const CUTS: { value: TopCut; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'top8', label: '8' },
  { value: 'top16', label: '16' },
  { value: 'top32', label: '32' },
  { value: 'top10pct', label: '10%' },
];
const CURRENCIES: Currency[] = ['usd', 'eur', 'myr'];

function daysAgo(latest: string, days: number) {
  const d = new Date(`${latest}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** A row of tap-chips for one choice. */
function Chips<T extends string>({ label, value, options, onPick }: {
  label: string;
  value: T | undefined;
  options: { value: T; label: string }[];
  onPick: (v: T) => void;
}) {
  return (
    <div className="chip-group" role="radiogroup" aria-label={label}>
      <span className="chip-group-label">{label}</span>
      <div className="chip-row">
        {options.map((o) => (
          <button key={o.value} role="radio" aria-checked={value === o.value} className={`pill ${value === o.value ? 'on' : ''}`} onClick={() => onPick(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilterBar({ filters, onChange, latest, rotationLabel, showTopCut = true }: {
  filters: Filters;
  onChange: (f: Filters) => void;
  /** e.g. "H regulation mark"; omitted when the dataset has no rotation info. */
  rotationLabel?: string;
  /** Most recent tournament date: periods count back from it so an old dataset still shows data. */
  latest: string;
  showTopCut?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const period = PERIODS.find((p) => (p.days == null ? !filters.from && !filters.to : filters.from === daysAgo(latest, p.days) && !filters.to));
  const summary = [period?.label ?? 'Custom dates', showTopCut ? cutLabel(filters) : '', filters.currency.toUpperCase(), filters.hideRotating ? 'Post-rotation' : '']
    .filter(Boolean).join(' · ');
  const changed = JSON.stringify({ ...filters, source: DEFAULT_FILTERS.source }) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className={`toolbar ${open ? 'open' : ''}`} role="group" aria-label="Filters">
      <div className="toolbar-top">
        <div className="seg" role="radiogroup" aria-label="Source">
          {(['all', 'offline', 'online'] as const).map((s) => (
            <button key={s} role="radio" aria-checked={filters.source === s} className={filters.source === s ? 'on' : ''} onClick={() => set('source', s)}>
              {SOURCE_LABELS[s]}
            </button>
          ))}
        </div>
        <button className="filters-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          <span className="filters-summary">{summary}</span>
          <svg className="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>

      <div className="filters-panel">
        <Chips
          label="Period"
          value={period ? String(period.days) : undefined}
          options={PERIODS.map((p) => ({ value: String(p.days), label: p.short }))}
          onPick={(v) => { const p = PERIODS.find((x) => String(x.days) === v)!; onChange({ ...filters, from: p.days == null ? '' : daysAgo(latest, p.days), to: '' }); }}
        />
        {showTopCut && <Chips label="Top cut" value={filters.topCut} options={CUTS} onPick={(v) => set('topCut', v)} />}
        <Chips label="Prices" value={filters.currency} options={CURRENCIES.map((c) => ({ value: c, label: c.toUpperCase() }))} onPick={(v) => set('currency', v)} />
        {rotationLabel && (
          <label className="switch-row" title={`Hide decks whose key Pokémon leave Standard with the ${rotationLabel} rotation`}>
            <span className="switch-text">
              Post-rotation meta
              <small>Hide decks that rotate out next</small>
            </span>
            <input type="checkbox" role="switch" checked={filters.hideRotating} onChange={(e) => set('hideRotating', e.target.checked)} />
            <span className="switch" aria-hidden />
          </label>
        )}
        {changed && <button className="link-btn reset" onClick={() => onChange({ ...DEFAULT_FILTERS, source: filters.source })}>Reset filters</button>}
      </div>
    </div>
  );
}
