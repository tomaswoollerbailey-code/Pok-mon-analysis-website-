// After `vite build`: write a static HTML file for every page (own title, description and a text
// summary for crawlers), plus 404.html (SPA fallback), sitemap.xml and robots.txt.
// Usage: tsx scripts/prerender.ts [outDir]   (SITE_URL = public origin + base path, no trailing slash)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { allRoutes, pageMeta } from '../src/lib/seo';
import { routePath } from '../src/lib/routes';
import type { Dataset } from '../src/lib/types';

const out = process.argv[2] ?? 'dist';
const site = (process.env.SITE_URL ?? 'https://tomaswoollerbailey-code.github.io/Pok-mon-analysis-website-').replace(/\/$/, '');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const template = await readFile(join(out, 'index.html'), 'utf8');
const data = JSON.parse(await readFile(join(out, 'data', 'dataset.json'), 'utf8')) as Dataset;

// GitHub Pages serves each page as a folder, so the canonical URL ends with a slash.
const urlOf = (path: string) => `${site}/${path}${path ? '/' : ''}`;

function render(route: Parameters<typeof pageMeta>[1]) {
  const m = pageMeta(data, route);
  const path = routePath(route);
  const canonical = urlOf(path);
  const head = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:site_name" content="The Crow’s Nest" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join('\n    ');
  const body = `<div id="root"><main><h1>${esc(m.title.split(' · ')[0])}</h1>${m.summary.map((p) => `<p>${esc(p)}</p>`).join('')}</main></div>`;
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', body);
  return { path, html };
}

const routes = allRoutes(data);
for (const route of routes) {
  const { path, html } = render(route);
  const file = join(out, path, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}
await writeFile(join(out, '404.html'), render({ page: 'meta' }).html); // unknown URL → app shell
const today = new Date().toISOString().slice(0, 10);
await writeFile(
  join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map((r) => `  <url><loc>${esc(urlOf(routePath(r)))}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`,
);
await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
console.log(`Prerendered ${routes.length} pages into ${out}/`);
