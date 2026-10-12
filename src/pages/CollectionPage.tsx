import { useMemo, useRef, useState } from 'react';
import { useCollection } from '../collectionStore';
import { mergeCollection } from '../lib/collection';
import { detectColumns, FIELD_LABELS, parseCsv, rowsToCollection, type ColumnMap, type CollectionCard, type Field } from '../lib/csv';
import { parseDeckText } from '../lib/decktext';
import { int } from '../format';
import { href } from '../router';

const APPS: { name: string; how: string }[] = [
  { name: 'Collectr', how: 'Portfolio → ⋯ → Export (needs Collectr PRO). The CSV is emailed to you.' },
  { name: 'TCGplayer', how: 'Collection → Export to CSV.' },
  { name: 'TCG Collector', how: 'Use the collection export option to download a CSV.' },
  { name: 'Dragon Shield', how: 'Use the folder or collection export to download a CSV.' },
  { name: 'Eyevo / Poke Pursuit / others', how: 'Any CSV export with card names (and ideally quantities) works.' },
];

interface Pending {
  fileName: string;
  headers: string[];
  rows: string[][];
  map: ColumnMap;
}

export function CollectionPage() {
  const [col, update] = useCollection();
  const [pending, setPending] = useState<Pending | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [deckText, setDeckText] = useState('');
  const [message, setMessage] = useState('');
  const [q, setQ] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const total = col.cards.reduce((s, c) => s + c.qty, 0);
  const preview = useMemo(() => (pending ? rowsToCollection(pending.rows, pending.map) : null), [pending]);
  const shown = useMemo(() => {
    const s = q.toLowerCase();
    return col.cards.filter((c) => !s || c.name.toLowerCase().includes(s)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 300);
  }, [col.cards, q]);

  const readFile = async (file: File) => {
    setMessage('');
    const rows = parseCsv(await file.text());
    if (rows.length < 2) { setMessage(`${file.name} doesn’t look like a CSV with a header row and cards.`); return; }
    setPending({ fileName: file.name, headers: rows[0], rows: rows.slice(1), map: detectColumns(rows[0]) });
  };

  const commit = (cards: CollectionCard[], how: 'merge' | 'replace', what: string) => {
    update({ cards: how === 'replace' ? mergeCollection([], cards) : mergeCollection(col.cards, cards) });
    setMessage(`Added ${int(cards.reduce((s, c) => s + c.qty, 0))} cards from ${what}.`);
  };

  const exportCsv = () => {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = ['Quantity,Card Name,Set,Card Number', ...col.cards.map((c) => [String(c.qty), c.name, c.set ?? '', c.number ?? ''].map(esc).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'meta-lab-collection.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const setQty = (c: CollectionCard, qty: number) =>
    update({ cards: qty <= 0 ? col.cards.filter((x) => x !== c) : col.cards.map((x) => (x === c ? { ...x, qty } : x)) });

  return (
    <>
      <div className="page-head">
        <h1>Your collection</h1>
        <p>
          {total ? <>{int(total)} cards · {int(col.cards.length)} entries. </> : 'Import your collection to see which meta decks you can build. '}
          Saved in this browser only. Nothing is uploaded. {total > 0 && <a href={href.build}>See which decks you can build →</a>}
        </p>
      </div>
      {message && <div className="notice" role="status">{message}</div>}

      <div className="two-col even">
        <section className="card">
          <header className="card-head">
            <h2>Import a CSV export</h2>
            <p>Export your collection from your app and drop the file here.</p>
          </header>
          <div
            className={`drop ${drag ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
          >
            <strong>Choose a CSV file</strong> or drag it here
            <input ref={fileRef} type="file" accept=".csv,text/csv,.txt,.tsv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ''; }} />
          </div>
          <details className="how">
            <summary>How to export from your app</summary>
            <ul>{APPS.map((a) => <li key={a.name}><strong>{a.name}:</strong> {a.how}</li>)}</ul>
          </details>

          {pending && preview && (
            <div className="mapping">
              <h3>{pending.fileName}</h3>
              <p className="muted">Check the columns we detected. Change any that are wrong.</p>
              <div className="filter-bar">
                {(Object.keys(FIELD_LABELS) as Field[]).map((f) => (
                  <label key={f}>
                    <span>{FIELD_LABELS[f]}{f === 'name' ? ' *' : ''}</span>
                    <select
                      value={pending.map[f] ?? ''}
                      onChange={(e) => setPending({ ...pending, map: { ...pending.map, [f]: e.target.value === '' ? undefined : Number(e.target.value) } })}
                    >
                      <option value="">{f === 'quantity' ? '(1 each)' : '(none)'}</option>
                      {pending.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th className="num">Qty</th><th>Card</th><th>Set</th><th>No.</th></tr></thead>
                  <tbody>
                    {preview.cards.slice(0, 6).map((c, i) => <tr key={i}><td className="num">{c.qty}</td><td>{c.name}</td><td>{c.set ?? ''}</td><td>{c.number ?? ''}</td></tr>)}
                  </tbody>
                </table>
              </div>
              <p className="muted">
                {int(preview.cards.length)} cards ready{preview.skipped ? `, ${int(preview.skipped)} rows skipped (no name or quantity)` : ''}
                {preview.otherGames ? `, ${int(preview.otherGames)} non-Pokémon rows ignored` : ''}.
              </p>
              <div className="actions">
                <div className="seg" role="radiogroup" aria-label="Import mode">
                  <button role="radio" aria-checked={mode === 'merge'} className={mode === 'merge' ? 'on' : ''} onClick={() => setMode('merge')}>Add to collection</button>
                  <button role="radio" aria-checked={mode === 'replace'} className={mode === 'replace' ? 'on' : ''} onClick={() => setMode('replace')}>Replace collection</button>
                </div>
                <button className="primary" disabled={pending.map.name == null || !preview.cards.length} onClick={() => { commit(preview.cards, mode, pending.fileName); setPending(null); }}>
                  Import {int(preview.cards.length)} cards
                </button>
                <button className="link-btn" onClick={() => setPending(null)}>Cancel</button>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <header className="card-head">
            <h2>Add a decklist</h2>
            <p>Paste a deck exported from Pokémon TCG Live or Limitless to add its cards, for example a deck you just bought.</p>
          </header>
          <textarea className="decktext" rows={9} value={deckText} onChange={(e) => setDeckText(e.target.value)} placeholder={'Pokémon: 12\n4 Dragapult ex TWM 130\n…\nTrainer: 36\n4 Rare Candy SVI 191'} />
          <div className="actions">
            <button
              className="primary"
              disabled={!parseDeckText(deckText).length}
              onClick={() => { const cards = parseDeckText(deckText).map((c) => ({ name: c.name, qty: c.count, ...(c.set ? { set: c.set, number: c.number } : {}) })); commit(cards, 'merge', 'the pasted list'); setDeckText(''); }}
            >
              Add {int(parseDeckText(deckText).reduce((s, c) => s + c.count, 0))} cards
            </button>
          </div>
          <label className="check spaced">
            <input type="checkbox" checked={col.assumeBasicEnergy} onChange={(e) => update({ assumeBasicEnergy: e.target.checked })} />
            Assume I have basic Energy (most apps don’t track it)
          </label>
        </section>
      </div>

      <section className="card">
        <header className="card-head row">
          <div><h2>Cards</h2><p>{col.cards.length > 300 && !q ? 'Showing the first 300. Search to find more.' : `${int(shown.length)} shown`}</p></div>
          <div className="actions">
            <input className="search" type="search" placeholder="Search your cards…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search collection" />
            <button className="link-btn" disabled={!col.cards.length} onClick={exportCsv}>Export CSV</button>
            <button className="link-btn danger" disabled={!col.cards.length} onClick={() => { if (confirm('Remove every card from your collection in this browser?')) update({ cards: [] }); }}>Clear</button>
          </div>
        </header>
        {col.cards.length ? (
          <div className="table-wrap tall">
            <table className="data">
              <thead><tr><th>Card</th><th>Set</th><th>No.</th><th className="num">Qty</th></tr></thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={`${c.name}|${c.set}|${c.number}`}>
                    <td>{c.name}</td><td>{c.set ?? ''}</td><td>{c.number ?? ''}</td>
                    <td className="num"><input className="qty" type="number" min={0} value={c.qty} aria-label={`Quantity of ${c.name}`} onChange={(e) => setQty(c, Math.max(0, Number(e.target.value) || 0))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty">No cards yet.</div>}
      </section>
    </>
  );
}
