export const pct = (v: number | null | undefined, digits = 1) => (v == null ? '—' : `${(v * 100).toFixed(digits)}%`);
export const int = (v: number) => v.toLocaleString('en-US');
export const record = (w: number, l: number, t: number) => `${w}-${l}-${t}`;

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const date = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`));
export const shortDate = (iso: string) => shortFmt.format(new Date(`${iso}T00:00:00Z`));
