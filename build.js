/* ===========================================================
   STATIC PAGE GENERATOR — griffeycardprices.com
   Reads DATA + BLOG straight out of index.html and generates:
     /1990/ ... /1999/          — one page per year
     /1996/select-certified/    — one page per set
     /blog/                     — market report index
     /blog/2026-06-29/          — one page per report day
     sitemap.xml, robots.txt
   Run after every price update:  node build.js
=========================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const SITE = 'https://griffeycardprices.com';
const GA = 'G-1H6EWY4GJJ';

/* ---------- pull DATA + BLOG out of index.html ---------- */
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const start = src.indexOf('const DATA');
const end = src.indexOf('const years = Object.keys');
if (start < 0 || end < 0) { console.error('Could not locate DATA/BLOG in index.html'); process.exit(1); }
const ctx = vm.createContext({});
vm.runInContext(src.slice(start, end) + ';this.DATA=DATA;this.BLOG=BLOG;', ctx);
const DATA = ctx.DATA, BLOG = ctx.BLOG;

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = n => n == null ? '—' : '$' + Number(n).toLocaleString('en-US');
const slug = s => s.toLowerCase().replace(/'/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const isoToday = new Date().toISOString().slice(0, 10);
const years = Object.keys(DATA).map(Number).sort((a, b) => a - b);

function arrow(sub, g) {
  const prev = sub['prev_' + g], cur = sub[g];
  if (prev == null || cur == null || prev === cur) return '';
  return cur > prev ? '<span class="up">▲</span> ' : '<span class="down">▼</span> ';
}

function priceCell(sub, g) {
  return '<td class="' + g + '">' + arrow(sub, g) + money(sub[g]) + '</td>';
}

function cardTable(subs, withOdds) {
  let h = '<table><thead><tr><th>Card</th>' + (withOdds ? '<th>Odds</th>' : '') +
    '<th>Raw</th><th>PSA 8</th><th>PSA 9</th><th>PSA 10</th></tr></thead><tbody>';
  for (const sub of subs) {
    h += '<tr><td class="cname">' + esc(sub.name) +
      (sub.tag ? ' <span class="tag">' + esc(sub.tag) + '</span>' : '') + '</td>' +
      (withOdds ? '<td class="odds">' + (sub.odds ? esc(sub.odds) : '') + '</td>' : '') +
      priceCell(sub, 'raw') + priceCell(sub, 'psa8') + priceCell(sub, 'psa9') + priceCell(sub, 'psa10') + '</tr>';
  }
  return h + '</tbody></table>';
}

function yearNav(active) {
  return '<nav class="yearnav">' + years.map(y =>
    y === active ? '<span class="on">' + y + '</span>' : '<a href="/' + y + '/">' + y + '</a>'
  ).join('') + '<a href="/most-valuable/">Most Valuable</a><a href="/blog/">Market Reports</a></nav>';
}

function page(o) {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<script async src="https://www.googletagmanager.com/gtag/js?id=' + GA + '"></script>\n' +
    '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag(\'js\',new Date());gtag(\'config\',\'' + GA + '\');</script>\n' +
    '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + esc(o.title) + '</title>\n' +
    '<meta name="description" content="' + esc(o.desc) + '">\n' +
    '<link rel="canonical" href="' + o.url + '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:site_name" content="Griffey Card Prices">\n' +
    '<meta property="og:title" content="' + esc(o.title) + '">\n' +
    '<meta property="og:description" content="' + esc(o.desc) + '">\n' +
    '<meta property="og:url" content="' + o.url + '">\n' +
    '<meta property="og:image" content="' + SITE + '/hero-card.jpg">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n' +
    '<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">\n' +
    (o.jsonld ? '<script type="application/ld+json">' + JSON.stringify(o.jsonld) + '</script>\n' : '') +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Oswald:wght@400;500;600&display=swap" rel="stylesheet">\n' +
    '<style>' + CSS + '</style>\n</head>\n<body>\n<div class="wrap">\n' +
    '<a class="home" href="/">◂ Griffey Card Prices — interactive guide</a>\n' +
    o.body +
    '\n<div class="foot">Prices updated ' + today + ' from real eBay sold listings · Not affiliated with PSA, eBay, or Topps · Built for collectors, by a collector<br>' +
    '<a href="/">griffeycardprices.com</a> · <a href="mailto:shareyoursportscards@gmail.com">shareyoursportscards@gmail.com</a></div>\n' +
    '</div>\n</body></html>';
}

const CSS = `
:root{--bg:#0a0e14;--surface:#1c2533;--border:#2a3a50;--gold:#f0b03a;--text:#eaf0f6;--dim:#8ea4ba;
--raw:#a0aab8;--psa8:#5eeaa0;--psa9:#5cd8f0;--psa10:#f5c842;}
*{box-sizing:border-box}body{margin:0;background:var(--bg);background-image:linear-gradient(180deg,#0a0e14 0%,#0f1520 50%,#0a0e14 100%);
color:var(--text);font-family:'Oswald',sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:860px;margin:0 auto;padding:18px 14px 40px}
.home{display:inline-block;color:var(--gold);text-decoration:none;font-size:13px;letter-spacing:.5px;margin-bottom:14px}
h1{font-family:'Space Grotesk',sans-serif;font-size:clamp(19px,4vw,27px);color:var(--gold);margin:4px 0 6px}
h2{font-family:'Space Grotesk',sans-serif;font-size:17px;color:var(--text);margin:26px 0 8px;border-bottom:1px solid var(--border);padding-bottom:6px}
h2 a{color:var(--text);text-decoration:none}h2 a:hover{color:var(--gold)}
.sub{color:var(--dim);font-size:13.5px;line-height:1.55;margin:0 0 14px}
.yearnav{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 6px}
.yearnav a,.yearnav span{padding:4px 9px;border:1px solid var(--border);border-radius:6px;font-size:12.5px;color:var(--dim);text-decoration:none}
.yearnav .on{color:var(--gold);border-color:var(--gold)}
.yearnav a:hover{color:var(--text)}
table{width:100%;border-collapse:collapse;font-size:13px;margin:6px 0 4px}
th{text-align:left;color:var(--dim);font-weight:500;font-size:11px;letter-spacing:.8px;text-transform:uppercase;padding:5px 7px;border-bottom:1px solid var(--border)}
td{padding:6px 7px;border-bottom:1px solid rgba(42,58,80,.45)}
td.cname{color:var(--text)}td.odds{color:var(--dim);font-size:12px}
td.raw{color:var(--raw)}td.psa8{color:var(--psa8)}td.psa9{color:var(--psa9)}td.psa10{color:var(--psa10)}
.tag{font-size:10px;color:var(--dim);border:1px solid var(--border);border-radius:4px;padding:1px 5px;margin-left:5px;white-space:nowrap}
.up{color:#5eeaa0;font-size:10px}.down{color:#ff6b6b;font-size:10px}
.report{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:13px 15px;margin:10px 0;font-size:13.5px;line-height:1.65;color:var(--dim)}
.report b{color:var(--text)}.report .rdate{color:var(--gold);font-size:12px;letter-spacing:.6px;display:block;margin-bottom:5px}
.report .up{font-size:inherit}.report .down{font-size:inherit}
ul.plain{list-style:none;padding:0;margin:8px 0;columns:2;column-gap:24px}
ul.plain li{margin:0 0 7px}ul.plain a{color:var(--dim);text-decoration:none;font-size:13px}ul.plain a:hover{color:var(--gold)}
.foot{margin-top:36px;padding-top:14px;border-top:1px solid var(--border);color:rgba(170,115,55,.6);font-size:11.5px;line-height:1.8;text-align:center}
.foot a{color:rgba(170,115,55,.75);text-decoration:none}
@media(max-width:600px){ul.plain{columns:1}td,th{padding:5px 4px}}
`;

/* ---------- clean previous output ---------- */
for (const d of [...years.map(String), 'blog']) {
  fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
}

function write(rel, html) {
  const dir = path.join(ROOT, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

const sitemapUrls = [SITE + '/'];
let setPages = 0;

/* ---------- year + set pages ---------- */
for (const y of years) {
  const sets = DATA[y];
  const cardCount = sets.reduce((n, s) => n + s.subsets.length, 0);
  const usedSlugs = {};

  let body = yearNav(y) +
    '<h1>' + y + ' Ken Griffey Jr. Cards — Values &amp; Price Guide</h1>' +
    '<p class="sub">Current market values for ' + cardCount + ' Ken Griffey Jr. cards from ' + y +
    ' across ' + sets.length + ' sets. Raw, PSA 8, PSA 9 and PSA 10 prices from real eBay sold listings, updated daily.</p>';

  for (const s of sets) {
    let sl = slug(s.set.replace(/^\d{4}\s+/, ''));
    if (usedSlugs[sl]) sl += '-' + (++usedSlugs[sl]); else usedSlugs[sl] = 1;
    const rel = y + '/' + sl;
    const withOdds = s.subsets.some(x => x.odds);

    body += '<h2 id="' + sl + '"><a href="/' + rel + '/">' + esc(s.set) + '</a></h2>' + cardTable(s.subsets, withOdds);

    /* set page */
    const top = s.subsets.reduce((m, x) => Math.max(m, x.psa10 || 0, x.psa9 || 0, x.raw || 0, x.psa8 || 0), 0);
    const names = s.subsets.slice(0, 3).map(x => x.name).join(', ');
    const setBody = yearNav(y) +
      '<h1>' + esc(s.set) + ' Ken Griffey Jr. — Card Values</h1>' +
      '<p class="sub">' + esc(s.set) + ' Ken Griffey Jr. card prices from real eBay sold listings: ' +
      s.subsets.length + (s.subsets.length === 1 ? ' card' : ' cards') + ' tracked' +
      (top ? ', topping out at ' + money(top) : '') + '. Updated daily.</p>' +
      cardTable(s.subsets, withOdds) +
      '<h2>More ' + y + ' Griffey Sets</h2><ul class="plain">' +
      sets.filter(o => o !== s).map(o => '<li><a href="/' + y + '/' + slug(o.set.replace(/^\d{4}\s+/, '')) + '/">' + esc(o.set) + '</a></li>').join('') +
      '</ul>';
    write(rel, page({
      title: esc(s.set) + ' Ken Griffey Jr. Card Values | Raw & PSA Prices',
      desc: s.set + ' Ken Griffey Jr. card values — ' + names + '. Raw and PSA 8/9/10 prices from real eBay sold listings, updated daily.',
      url: SITE + '/' + rel + '/',
      jsonld: {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Griffey Card Prices', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: y + ' Cards', item: SITE + '/' + y + '/' },
          { '@type': 'ListItem', position: 3, name: s.set, item: SITE + '/' + rel + '/' }
        ]
      },
      body: setBody
    }));
    sitemapUrls.push(SITE + '/' + rel + '/');
    setPages++;
  }

  /* recent market reports for this year */
  const reports = (BLOG[y] || []);
  if (reports.length) {
    body += '<h2>Recent ' + y + ' Market Reports</h2>';
    for (const r of reports) {
      body += '<div class="report"><span class="rdate">' + esc(r.date) + '</span>' + r.body + '</div>';
    }
  }

  write(String(y), page({
    title: y + ' Ken Griffey Jr. Cards — Values & Price Guide',
    desc: 'Current values for ' + cardCount + ' Ken Griffey Jr. cards from ' + y + ' across ' + sets.length +
      ' sets — raw, PSA 8, PSA 9 and PSA 10 prices from real eBay sales, updated daily.',
    url: SITE + '/' + y + '/',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Griffey Card Prices', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: y + ' Cards', item: SITE + '/' + y + '/' }
      ]
    },
    body
  }));
  sitemapUrls.push(SITE + '/' + y + '/');
}

/* ---------- blog: one page per report day ---------- */
const byDate = {}; // iso -> [{y, date, body}]
for (const y of years) {
  for (const r of (BLOG[y] || [])) {
    const iso = new Date(r.date).toISOString().slice(0, 10);
    (byDate[iso] = byDate[iso] || []).push({ y, date: r.date, body: r.body });
  }
}
const days = Object.keys(byDate).sort().reverse();

for (const iso of days) {
  const entries = byDate[iso].sort((a, b) => a.y - b.y);
  const nice = entries[0].date;
  let body = yearNav(null) +
    '<h1>Griffey Card Market Report — ' + esc(nice) + '</h1>' +
    '<p class="sub">What moved in the Ken Griffey Jr. card market on ' + esc(nice) +
    ', based on real eBay sold listings across ' + entries.length + (entries.length === 1 ? ' year.' : ' years.') + '</p>';
  for (const e of entries) {
    body += '<h2><a href="/' + e.y + '/">' + e.y + '</a></h2><div class="report">' + e.body + '</div>';
  }
  body += '<p class="sub" style="margin-top:20px"><a href="/blog/" style="color:var(--gold)">◂ All market reports</a></p>';
  write('blog/' + iso, page({
    title: 'Griffey Card Market Report — ' + nice,
    desc: 'Ken Griffey Jr. card price movement for ' + nice + ' — real eBay sales across ' + entries.map(e => e.y).join(', ') + '.',
    url: SITE + '/blog/' + iso + '/',
    body
  }));
  sitemapUrls.push(SITE + '/blog/' + iso + '/');
}

/* ---------- blog index ---------- */
let blogBody = yearNav(null) +
  '<h1>Griffey Card Market Reports</h1>' +
  '<p class="sub">Daily notes on what actually moved in the Ken Griffey Jr. card market — every report backed by real eBay sold listings.</p><ul class="plain" style="columns:1">';
for (const iso of days) {
  const entries = byDate[iso];
  blogBody += '<li><a href="/blog/' + iso + '/">' + esc(entries[0].date) + '</a> <span style="color:var(--dim);font-size:12px">— ' +
    entries.length + (entries.length === 1 ? ' year covered' : ' years covered') + '</span></li>';
}
blogBody += '</ul>';
write('blog', page({
  title: 'Griffey Card Market Reports | Daily Price Movement',
  desc: 'Daily Ken Griffey Jr. card market reports — which cards moved, by how much, and why, based on real eBay sold data.',
  url: SITE + '/blog/',
  body: blogBody
}));
sitemapUrls.push(SITE + '/blog/');

/* ---------- most valuable top 25 ---------- */
const GRADES = [['psa10', 'PSA 10'], ['psa9', 'PSA 9'], ['psa8', 'PSA 8'], ['raw', 'Raw']];
const ranked = [];
let totalCards = 0;
for (const y of years) {
  const usedSlugs = {};
  for (const s of DATA[y]) {
    let sl = slug(s.set.replace(/^\d{4}\s+/, ''));
    if (usedSlugs[sl]) sl += '-' + (++usedSlugs[sl]); else usedSlugs[sl] = 1;
    for (const sub of s.subsets) {
      totalCards++;
      let best = null;
      for (const [g, label] of GRADES) {
        if (sub[g] != null && (!best || sub[g] > best.value)) best = { value: sub[g], grade: label };
      }
      if (best) ranked.push({ y, set: s.set, sl, name: sub.name, grade: best.grade, value: best.value });
    }
  }
}
ranked.sort((a, b) => b.value - a.value);
const top25 = ranked.slice(0, 25);

let mvBody = yearNav(null) +
  '<h1>Most Valuable Ken Griffey Jr. Cards of the 90s</h1>' +
  '<p class="sub">The 25 most valuable Ken Griffey Jr. cards from 1990–1999, ranked by the highest price actually paid on eBay since this guide began tracking sales in April 2026 — not asking prices, real sold listings. Out of ' +
  totalCards.toLocaleString('en-US') + ' Griffey cards tracked in this guide, these are the kings. Updated daily as new sales come in.</p>' +
  '<table><thead><tr><th>#</th><th>Card</th><th>Year</th><th>Grade</th><th>Value</th></tr></thead><tbody>';
top25.forEach((c, i) => {
  mvBody += '<tr><td style="color:var(--gold);font-weight:600">' + (i + 1) + '</td>' +
    '<td class="cname"><a href="/' + c.y + '/' + c.sl + '/" style="color:var(--text);text-decoration:none">' + esc(c.set) + ' — ' + esc(c.name) + '</a></td>' +
    '<td class="odds"><a href="/' + c.y + '/" style="color:var(--dim);text-decoration:none">' + c.y + '</a></td>' +
    '<td class="odds">' + c.grade + '</td>' +
    '<td class="psa10">' + money(c.value) + '</td></tr>';
});
mvBody += '</tbody></table>' +
  '<p class="sub" style="margin-top:16px">Every price above comes from a real completed eBay sale. Browse the full guide by year for raw, PSA 8, PSA 9 and PSA 10 values on every card.</p>';

write('most-valuable', page({
  title: 'Most Valuable Ken Griffey Jr. Cards of the 90s | Top 25 Ranked',
  desc: 'The 25 most valuable Ken Griffey Jr. cards from 1990-1999, ranked by real eBay sold prices. Topping the list: ' +
    top25[0].set + ' ' + top25[0].name + ' at ' + money(top25[0].value) + '. Updated daily.',
  url: SITE + '/most-valuable/',
  jsonld: {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: 'Most Valuable Ken Griffey Jr. Cards of the 90s',
    itemListElement: top25.map((c, i) => ({
      '@type': 'ListItem', position: i + 1,
      name: c.set + ' ' + c.name + ' ' + c.grade + ' — ' + money(c.value),
      url: SITE + '/' + c.y + '/' + c.sl + '/'
    }))
  },
  body: mvBody
}));
sitemapUrls.push(SITE + '/most-valuable/');

/* ---------- sitemap + robots ---------- */
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemapUrls.map(u => '  <url><loc>' + u + '</loc><lastmod>' + isoToday + '</lastmod></url>').join('\n') +
  '\n</urlset>\n');
fs.writeFileSync(path.join(ROOT, 'robots.txt'),
  'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n');

console.log('Generated: ' + years.length + ' year pages, ' + setPages + ' set pages, ' +
  days.length + ' market report pages + blog index, sitemap.xml (' + sitemapUrls.length + ' URLs), robots.txt');
