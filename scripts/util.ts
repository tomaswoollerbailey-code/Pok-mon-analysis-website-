import { mkdir, readFile, readdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export const RAW_DIR = join(process.cwd(), 'data', 'raw');
export const OUT_DIR = join(process.cwd(), 'public', 'data');

const USER_AGENT = 'pokemon-meta-analysis (+https://github.com/tomaswoollerbailey-code/Pok-mon-analysis-website-)';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Polite fetch: one request at a time, a fixed gap between requests, retries with backoff.
 * Rate limits (HTTP 429) wait longer: Retry-After when given, else 15s, 30s, 60s, 120s.
 */
export function createFetcher(opts: { delayMs: number; headers?: Record<string, string> }) {
  let last = 0;
  return async function get(url: string, as: 'json' | 'text' = 'json'): Promise<any> {
    for (let attempt = 0; ; attempt++) {
      const wait = last + opts.delayMs - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      try {
        const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...opts.headers } });
        if (res.status === 429) {
          const after = Number(res.headers.get('retry-after'));
          throw Object.assign(new Error('HTTP 429'), { waitMs: after > 0 ? after * 1000 : 15_000 * 2 ** attempt });
        }
        if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { fatal: true });
        return as === 'json' ? await res.json() : await res.text();
      } catch (err: any) {
        if (err.fatal || attempt >= 4) throw err;
        const backoff = err.waitMs ?? 2000 * 2 ** attempt;
        console.warn(`  retry ${attempt + 1} for ${url} in ${backoff}ms (${err.message})`);
        await sleep(backoff);
      }
    }
  };
}

export async function exists(path: string) {
  try { await access(path); return true; } catch { return false; }
}

export async function writeJson(path: string, value: unknown, pretty = false) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, pretty ? 2 : undefined) + '\n');
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

export async function listJson(dir: string): Promise<string[]> {
  if (!(await exists(dir))) return [];
  return (await readdir(dir)).filter((f) => f.endsWith('.json')).map((f) => join(dir, f));
}

export function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}
