import { useState, type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => number | string;
  numeric?: boolean;
  title?: string;
  /** Shorter header for phone-width screens, e.g. "Conv.". */
  shortLabel?: string;
  /** Hide this column on phone-width screens. */
  hideOnMobile?: boolean;
}

const cls = (c: { numeric?: boolean; hideOnMobile?: boolean }) => [c.numeric && 'num', c.hideOnMobile && 'hide-sm'].filter(Boolean).join(' ');

export function SortTable<T>({ rows, columns, initial, rowKey, limit }: {
  rows: T[];
  columns: Column<T>[];
  initial: string;
  rowKey: (row: T) => string | number;
  limit?: number;
}) {
  const [sortKey, setSortKey] = useState(initial);
  const [desc, setDesc] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const col = columns.find((c) => c.key === sortKey);
  const sorted = col?.sort
    ? [...rows].sort((a, b) => {
        const x = col.sort!(a), y = col.sort!(b);
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
        return desc ? -c : c;
      })
    : rows;
  const shown = limit && !expanded ? sorted.slice(0, limit) : sorted;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cls(c)} title={c.title} aria-sort={sortKey === c.key ? (desc ? 'descending' : 'ascending') : undefined}>
                {c.sort ? (
                  <button onClick={() => { if (sortKey === c.key) setDesc(!desc); else { setSortKey(c.key); setDesc(true); } }}>
                    <Label c={c} />{sortKey === c.key ? (desc ? ' ↓' : ' ↑') : ''}
                  </button>
                ) : <Label c={c} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => <td key={c.key} className={cls(c)}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {limit && sorted.length > limit && (
        <button className="link-btn more" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show fewer' : `Show all ${sorted.length}`}
        </button>
      )}
    </div>
  );
}

function Label({ c }: { c: { label: string; shortLabel?: string } }) {
  if (!c.shortLabel) return <>{c.label}</>;
  return <><span className="label-long">{c.label}</span><span className="label-short">{c.shortLabel}</span></>;
}
