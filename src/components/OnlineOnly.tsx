import { SOURCE_CAPS, type Filters } from '../lib/analysis';

/** Shown on views that need round-by-round results when another source is selected. */
export function OnlineOnly({ what, filters, onFilters }: { what: string; filters: Filters; onFilters: (f: Filters) => void }) {
  return (
    <section className="card empty online-only">
      <h2>{what} use online events</h2>
      <p>
        {what} need round-by-round results. Only online events publish those; {SOURCE_CAPS[filters.source].events} only publish final standings.
      </p>
      <button className="primary" onClick={() => onFilters({ ...filters, source: 'online' })}>Show online data</button>
    </section>
  );
}
