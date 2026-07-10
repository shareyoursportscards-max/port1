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

/* ---------- price history logger ----------
   Appends to price-history.json: { "year|set|card": { grade: [[iso-date, value], ...] } }
   Change-only: a point is recorded when a value first appears or differs from the
   last logged value. Re-running on the same day revises today's point in place. */
const HIST_FILE = path.join(ROOT, 'price-history.json');
(function logPriceHistory() {
  let hist = {};
  try { hist = JSON.parse(fs.readFileSync(HIST_FILE, 'utf8')); } catch (e) { /* first run */ }
  let added = 0, revised = 0;
  for (const year of Object.keys(DATA)) {
    for (const set of DATA[year]) {
      for (const sub of set.subsets) {
        const key = year + '|' + set.set + '|' + sub.name;
        for (const g of ['raw', 'psa8', 'psa9', 'psa10']) {
          const val = sub[g];
          if (val == null) continue;
          const series = (hist[key] = hist[key] || {});
          const arr = (series[g] = series[g] || []);
          const last = arr[arr.length - 1];
          if (last && last[0] === isoToday) {
            if (last[1] !== val) { last[1] = val; revised++; }
          } else if (!last || last[1] !== val) {
            arr.push([isoToday, val]);
            added++;
          }
        }
      }
    }
  }
  fs.writeFileSync(HIST_FILE, JSON.stringify(hist));
  console.log('Price history: +' + added + ' new points' + (revised ? ', ' + revised + ' revised today' : '') + ' -> price-history.json');
})();

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
  ).join('') + '<a href="/most-valuable/">Most Valuable</a><a href="/blog/">Market Reports</a><a href="/how-much-are-griffey-cards-worth/">Card Values</a></nav>';
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
    '<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet">\n' +
    '<style>' + CSS + '</style>\n</head>\n<body>\n<div class="wrap">\n' +
    '<a class="home" href="/">◂ Griffey Card Prices — interactive guide</a>\n' +
    o.body +
    '\n<div class="foot">Prices updated ' + today + ' from real eBay sold listings · Not affiliated with PSA, eBay, or Topps · Built for collectors, by a collector<br>' +
    '<a href="/">griffeycardprices.com</a> · <a href="mailto:shareyoursportscards@gmail.com">shareyoursportscards@gmail.com</a></div>\n' +
    '</div>\n</body></html>';
}

const CSS = `
:root{--bg:#06090f;--surface:#0f1622;--border:#1d2c40;--gold:#2fe6c7;--text:#edf3f9;--dim:#8fa6bd;
--raw:#9fb0c2;--psa8:#5eeaa0;--psa9:#5cd8f0;--psa10:#f0c75b;}
*{box-sizing:border-box}body{margin:0;background:var(--bg);background-image:linear-gradient(180deg,#06090f 0%,#0a1019 50%,#06090f 100%);
color:var(--text);font-family:'Inter Tight',sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:860px;margin:0 auto;padding:18px 14px 40px}
.home{display:inline-block;color:var(--gold);text-decoration:none;font-size:13px;letter-spacing:.5px;margin-bottom:14px}
h1{font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:clamp(19px,4vw,27px);color:var(--gold);margin:4px 0 6px}
h2{font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:17px;color:var(--text);margin:26px 0 8px;border-bottom:1px solid var(--border);padding-bottom:6px}
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
.foot{margin-top:36px;padding-top:14px;border-top:1px solid var(--border);color:rgba(107,160,150,.6);font-size:11.5px;line-height:1.8;text-align:center}
.foot a{color:rgba(107,160,150,.8);text-decoration:none}
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

/* ---------- "how much is a griffey card worth" ---------- */
const over1k = ranked.filter(c => c.value >= 1000).length;
const over10k = ranked.filter(c => c.value >= 10000).length;
const under100 = ranked.filter(c => c.value < 100).length;
const kingCard = top25[0];
const gum = DATA['1995'].find(s => s.set === '1995 Pinnacle').subsets.find(c => c.name.indexOf('Bubble Gum') > -1 && c.name.indexOf('Base') > -1);

let worthBody = yearNav(null) +
  '<h1>How Much Is a Ken Griffey Jr. Card Worth?</h1>' +
  '<p class="sub">Anywhere from a few dollars to ' + money(kingCard.value) + '. Most 1990s Griffey cards sell for under $100, ' +
  'but rare inserts and serial-numbered parallels regularly sell for four and five figures. This guide tracks ' +
  totalCards.toLocaleString('en-US') + ' Griffey cards from 1990&ndash;1999 using real completed eBay sales &mdash; not asking prices &mdash; updated daily.</p>' +

  '<h2>The quick answer</h2>' +
  '<p class="sub">Of the ' + totalCards.toLocaleString('en-US') + ' cards in this guide, ' + under100 +
  ' have a top recorded sale under $100, ' + over1k + ' have sold for $1,000 or more, and ' + over10k +
  ' have topped $10,000. The highest price on record here is the <a href="/' + kingCard.y + '/' + kingCard.sl + '/" style="color:var(--gold)">' +
  esc(kingCard.set) + ' ' + esc(kingCard.name) + '</a> at <b style="color:var(--psa10)">' + money(kingCard.value) + '</b> in ' + kingCard.grade + '.</p>' +
  '<ul class="plain" style="columns:1">' +
  '<li>Base cards, raw: <b style="color:var(--text)">$2&ndash;$25</b></li>' +
  '<li>Graded base cards and common inserts: <b style="color:var(--text)">$25&ndash;$100</b></li>' +
  '<li>Major inserts, refractors, gold parallels: <b style="color:var(--text)">$100&ndash;$1,000</b></li>' +
  '<li>Serial-numbered parallels and gem-mint chase cards: <b style="color:var(--text)">$1,000&ndash;' + money(kingCard.value) + '</b></li>' +
  '</ul>' +

  '<h2>What makes a Griffey card valuable</h2>' +
  '<p class="sub"><b>Scarcity.</b> The 1990s insert era produced cards numbered to 500, 100, even 25 copies, and inserts with pack odds as long as 1:944. ' +
  'Print run and pull rate drive the top of the market &mdash; the record-holder above is one of just 25 copies.</p>' +
  '<p class="sub"><b>Grade.</b> The same card can be worth 30x more in PSA 10 than raw. The famous 1995 Pinnacle Bubble Gum card, the most frequently traded Griffey in this guide:</p>' +
  '<table><thead><tr><th>Grade</th><th>Latest sale</th></tr></thead><tbody>' +
  '<tr><td class="cname">Raw (ungraded)</td><td class="raw">' + money(gum.raw) + '</td></tr>' +
  '<tr><td class="cname">PSA 8</td><td class="psa8">' + money(gum.psa8) + '</td></tr>' +
  '<tr><td class="cname">PSA 9</td><td class="psa9">' + money(gum.psa9) + '</td></tr>' +
  '<tr><td class="cname">PSA 10</td><td class="psa10">' + money(gum.psa10) + '</td></tr>' +
  '</tbody></table>' +
  '<p class="sub"><b>The card itself.</b> Base cards were printed by the million in the junk wax era. The money is in inserts, refractors, and parallels &mdash; ' +
  'Finest Refractors, Metal Universe, Flair die-cuts, Donruss Crusade, and the other chase sets of the decade.</p>' +

  '<h2>What about the rookie card?</h2>' +
  '<p class="sub">Griffey’s rookie is the 1989 Upper Deck #1 &mdash; the most famous baseball card of its generation. This guide covers 1990&ndash;1999, ' +
  'the insert era that followed, where the scarce cards are far rarer than the rookie (which was heavily printed). The same rules apply to the rookie as to everything here: ' +
  'grade and centering decide the price, and completed eBay sales &mdash; not listing prices &mdash; tell you what it’s actually worth.</p>' +

  '<h2>The 10 most valuable Griffey cards of the 90s</h2>' +
  '<table><thead><tr><th>#</th><th>Card</th><th>Grade</th><th>Sale</th></tr></thead><tbody>' +
  top25.slice(0, 10).map((c, i) =>
    '<tr><td style="color:var(--gold);font-weight:600">' + (i + 1) + '</td>' +
    '<td class="cname"><a href="/' + c.y + '/' + c.sl + '/" style="color:var(--text);text-decoration:none">' + esc(c.set) + ' &mdash; ' + esc(c.name) + '</a></td>' +
    '<td class="odds">' + c.grade + '</td>' +
    '<td class="psa10">' + money(c.value) + '</td></tr>').join('') +
  '</tbody></table>' +
  '<p class="sub"><a href="/most-valuable/" style="color:var(--gold)">See the full Top 25 &rsaquo;</a></p>' +

  '<h2>How this guide works</h2>' +
  '<p class="sub">Every price on this site comes from a real completed eBay sale &mdash; auctions and Buy It Now both count, because someone actually paid that amount. ' +
  'Prices are updated daily as new sales close, tracked since April 2026. Grading columns cover raw, PSA 8, PSA 9 and PSA 10. ' +
  'Built and maintained by a Griffey collector. Browse any year above for every card’s current value, or check the <a href="/blog/" style="color:var(--gold)">daily market reports</a> to see what moved.</p>';

write('how-much-are-griffey-cards-worth', page({
  title: 'How Much Is a Ken Griffey Jr. Card Worth? | Real Sold Prices',
  desc: 'Ken Griffey Jr. cards sell for a few dollars to ' + money(kingCard.value) + '. Real eBay sold prices for ' +
    totalCards.toLocaleString('en-US') + ' Griffey cards from 1990-1999 - raw and PSA graded, updated daily.',
  url: SITE + '/how-much-are-griffey-cards-worth/',
  jsonld: {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question', name: 'How much is a Ken Griffey Jr. card worth?',
        acceptedAnswer: { '@type': 'Answer', text: 'Anywhere from a few dollars to ' + money(kingCard.value) + '. Most 1990s Griffey base cards sell for under $100, while rare inserts, refractors and serial-numbered parallels sell for $1,000 to over $30,000 based on real eBay sold prices.' }
      },
      {
        '@type': 'Question', name: 'What is the most valuable Ken Griffey Jr. card?',
        acceptedAnswer: { '@type': 'Answer', text: 'The most expensive 1990s Griffey sale tracked in this guide is the ' + kingCard.set + ' ' + kingCard.name + ' at ' + money(kingCard.value) + ' in ' + kingCard.grade + ' - one of only 25 copies.' }
      },
      {
        '@type': 'Question', name: 'Are Ken Griffey Jr. cards worth grading?',
        acceptedAnswer: { '@type': 'Answer', text: 'Often yes. The gap between raw and PSA 10 can be 10-30x on 1990s Griffey cards. For example, the 1995 Pinnacle Bubble Gum card sells for around ' + money(gum.raw) + ' raw but ' + money(gum.psa10) + ' in PSA 10.' }
      }
    ]
  },
  body: worthBody
}));
sitemapUrls.push(SITE + '/how-much-are-griffey-cards-worth/');

/* ---------- sitemap + robots ---------- */
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemapUrls.map(u => '  <url><loc>' + u + '</loc><lastmod>' + isoToday + '</lastmod></url>').join('\n') +
  '\n</urlset>\n');
fs.writeFileSync(path.join(ROOT, 'robots.txt'),
  'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n');

console.log('Generated: ' + years.length + ' year pages, ' + setPages + ' set pages, ' +
  days.length + ' market report pages + blog index, sitemap.xml (' + sitemapUrls.length + ' URLs), robots.txt');
