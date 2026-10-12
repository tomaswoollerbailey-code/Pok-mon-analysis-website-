// Prints the structure of live Limitless pages/API responses so the parsers can be checked
// against the real thing (used by the "Probe Limitless" workflow; output goes to the job log).
import * as cheerio from 'cheerio';
import { PLAY_API } from '../src/lib/limitless/online';
import { LIMITLESS_SITE, parseDecklist, parseStandings, parseTournamentHeader, parseTournamentList } from '../src/lib/limitless/offline';
import { createFetcher } from './util';

const get = createFetcher({ delayMs: 800 });
const clip = (s: string, n = 1500) => (s.length > n ? `${s.slice(0, n)} …[${s.length - n} more chars]` : s);
const section = (t: string) => console.log(`\n========== ${t} ==========`);

function structure(html: string) {
  const $ = cheerio.load(html);
  console.log('title:', $('title').text().trim());
  $('table').slice(0, 4).each((i, t) => {
    const table = $(t);
    console.log(`-- table[${i}] class="${table.attr('class') ?? ''}" rows=${table.find('tr').length}`);
    console.log('   headers:', table.find('th').toArray().map((th) => $(th).text().trim()).join(' | '));
    table.find('tr').filter((_, tr) => $(tr).find('td').length > 0).slice(0, 2).each((_, tr) => console.log('   row:', clip($.html(tr).replace(/\s+/g, ' '), 1200)));
  });
}

async function step(name: string, fn: () => Promise<void>) {
  section(name);
  try { await fn(); } catch (e: any) { console.log('FAILED:', e.message); }
}

let tId = '', listId = '';
await step('offline: tournament list', async () => {
  const html = await get(`${LIMITLESS_SITE}/tournaments`, 'text');
  structure(html);
  const parsed = parseTournamentList(html);
  console.log(`parsed ${parsed.length} tournaments; first 3:`, JSON.stringify(parsed.slice(0, 3)));
  const $ = cheerio.load(html);
  console.log('filter/links sample:', $('a[href*="tournaments?"]').toArray().slice(0, 15).map((a) => $(a).attr('href')).join('  '));
  tId = parsed.find((t) => t.players > 100)?.id ?? parsed[0]?.id ?? '';
});
await step(`offline: tournament ${tId}`, async () => {
  const html = await get(`${LIMITLESS_SITE}/tournaments/${tId}`, 'text');
  structure(html);
  const $ = cheerio.load(html);
  console.log('infobox:', clip($('.infobox, [class*="info"]').first().text().replace(/\s+/g, ' '), 600));
  console.log('header parse:', JSON.stringify(parseTournamentHeader(html)));
  const s = parseStandings(html);
  console.log(`parsed ${s.length} standings; first 3:`, JSON.stringify(s.slice(0, 3)));
  listId = s.find((x) => x.listId)?.listId ?? '';
  if (!listId) console.log('deck/list links:', $('a[href*="/decks"]').toArray().slice(0, 10).map((a) => $(a).attr('href')).join('  '));
});
await step(`offline: decklist ${listId}`, async () => {
  if (!listId) throw new Error('no list id found');
  const html = await get(`${LIMITLESS_SITE}/decks/list/${listId}`, 'text');
  const $ = cheerio.load(html);
  console.log('first cards:', clip($('.decklist-card').slice(0, 2).toArray().map((c) => $.html(c).replace(/\s+/g, ' ')).join('\n'), 1500));
  const node = $('[class*="decklist"]').first();
  console.log('decklist html:', clip($.html(node).replace(/\s+/g, ' '), 2500));
  console.log('parsed:', JSON.stringify(parseDecklist(html).slice(0, 6)));
});
await step('offline: list URL variants', async () => {
  for (const q of ['?time=all&show=500', '?show=100', '?time=all', '?page=2']) {
    const html = await get(`${LIMITLESS_SITE}/tournaments${q}`, 'text');
    const parsed = parseTournamentList(html);
    console.log(`${q}: ${parsed.length} tournaments, oldest ${parsed.at(-1)?.date}`);
  }
});
let jpId = '';
await step('japan: tournament list', async () => {
  const html = await get(`${LIMITLESS_SITE}/tournaments/jp`, 'text');
  structure(html);
  const $ = cheerio.load(html);
  console.log('links:', $('a[href*="/tournaments/jp"]').toArray().slice(0, 12).map((a) => $(a).attr('href')).join('  '));
  const parsed = parseTournamentList(html);
  console.log(`parsed ${parsed.length}; first 3:`, JSON.stringify(parsed.slice(0, 3)));
  jpId = $('a[href^="/tournaments/jp/"]').first().attr('href')?.split('/').pop() ?? '';
});
await step(`japan: tournament ${jpId}`, async () => {
  if (!jpId) throw new Error('no jp id');
  const html = await get(`${LIMITLESS_SITE}/tournaments/jp/${jpId}`, 'text');
  structure(html);
  const $ = cheerio.load(html);
  console.log('infobox:', clip($('.infobox, [class*="info"]').first().text().replace(/\s+/g, ' '), 600));
  console.log('parsed standings:', JSON.stringify(parseStandings(html).slice(0, 3)));
  console.log('list links:', $('a[href*="/decks/list"]').toArray().slice(0, 5).map((a) => $(a).attr('href')).join('  '));
});
let onlineId = '';
await step('online: tournaments', async () => {
  const list = await get(`${PLAY_API}/tournaments?game=PTCG&format=STANDARD&limit=50`);
  console.log(clip(JSON.stringify(list.slice(0, 3)), 1200));
  onlineId = list.find((t: any) => t.players >= 64)?.id ?? list[0]?.id;
});
await step(`online: details/standings/pairings ${onlineId}`, async () => {
  console.log('details:', clip(JSON.stringify(await get(`${PLAY_API}/tournaments/${onlineId}/details`)), 1500));
  const st = await get(`${PLAY_API}/tournaments/${onlineId}/standings`);
  console.log(`standings (${st.length}):`, clip(JSON.stringify(st.slice(0, 1)), 2500));
  const pr = await get(`${PLAY_API}/tournaments/${onlineId}/pairings`);
  console.log(`pairings (${pr.length}):`, clip(JSON.stringify(pr.slice(0, 3)), 800));
});
