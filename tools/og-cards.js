// Renders one 1200x630 share image per place into og/<slug>.jpg from og/cards.json (written by build.py).
// Needs: npm i playwright @fontsource/be-vietnam-pro   Run: node tools/og-cards.js
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const fontDir = path.dirname(require.resolve('@fontsource/be-vietnam-pro/package.json'));
const fontCss = ['500', '700', '800'].map(w => fs.readFileSync(path.join(fontDir, w + '.css'), 'utf8')
  .replace(/url\(\.\/files\/([^)]+?\.woff2)\)/g, (m, f) => 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(fontDir, 'files', f)).toString('base64') + ')')
  .replace(/,\s*url\(\.\/files\/[^)]+?\.woff\)\s*format\('woff'\)/g, '')).join('\n');
const lantern = fs.readFileSync(path.join(ROOT, 'favicon.svg'), 'utf8')
  .replace(/<rect width="100" height="100" rx="22" fill="#0E6655"\/>/, '');
const COL = { food: ['#E2572F', '#7A2512'], cafe: ['#9A5B2E', '#4A2810'], shop: ['#6A4BC4', '#2E1E66'], culture: ['#0E8A78', '#0A3F37'], stay: ['#2C6FD1', '#123A72'], other: ['#0E6655', '#073A31'] };
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const short = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).replace(/[\s,;(]+\S*$/, '') + '…' : s; };
function html(c) {
  const [a, b] = COL[c.cat] || COL.other;
  const chips = [c.hours && ['Hours', short(c.hours, 72)], c.price && ['Price', short(c.price, 50)]].filter(Boolean)
    .map(([k, v]) => `<div class="chip"><b>${k}</b>${esc(v)}</div>`).join('');
  const nameSize = c.name.length > 34 ? 62 : c.name.length > 24 ? 72 : 84;
  return `<!doctype html><meta charset="utf-8"><style>${fontCss}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;font-family:'Be Vietnam Pro';color:#fff;
background:radial-gradient(circle at 88% 30%,rgba(244,166,52,.35),transparent 42%),linear-gradient(135deg,${a},${b})}
.brand{position:absolute;left:64px;top:52px;display:flex;align-items:center;gap:14px;font-weight:800;font-size:30px;letter-spacing:-.5px}
.brand i{width:52px;height:52px;border-radius:13px;background:#0E6655;display:grid;place-items:center}.brand i svg{width:46px;height:46px}.brand span{color:#F4A634}
.main{position:absolute;left:64px;top:150px;width:820px}
.kick{display:inline-block;background:rgba(0,0,0,.28);border-radius:999px;padding:8px 18px;font-weight:700;font-size:24px;letter-spacing:2px;text-transform:uppercase;color:#FFD08A}
h1{font-size:${nameSize}px;line-height:1.02;letter-spacing:-2px;font-weight:800;margin:22px 0 12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.vn{font-size:34px;font-weight:500;opacity:.9}.area{font-size:28px;font-weight:700;margin-top:10px;color:#FFD08A}
.chips{position:absolute;left:64px;bottom:52px;display:flex;align-items:flex-end;gap:14px;max-width:830px}
.chip{background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.28);border-radius:16px;padding:12px 18px;font-size:23px;line-height:1.3;font-weight:500;max-width:400px}
.chip b{display:block;font-size:16px;letter-spacing:2px;text-transform:uppercase;opacity:.75;font-weight:700}
.url{position:absolute;right:64px;bottom:62px;font-size:26px;font-weight:700;color:#F4A634}
.lan{position:absolute;right:30px;top:-40px;width:330px;height:330px;opacity:.95}.lan svg{width:100%;height:100%}
</style><div class="lan">${lantern}</div>
<div class="brand"><i>${lantern}</i>HCMC <span>Insider</span></div>
<div class="main"><div class="kick">${esc(c.dish)}</div><h1>${esc(c.name)}</h1><div class="vn">${esc(c.vn)}</div><div class="area">📍 ${esc(c.area)}, Ho Chi Minh City</div></div>
<div class="chips">${chips}</div><div class="url">hcmcinsider.com</div>`;
}
(async () => {
  const cards = JSON.parse(fs.readFileSync(path.join(ROOT, 'og/cards.json'), 'utf8'));
  const only = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const c of cards) {
    if (only && c.slug !== only) continue;
    await p.setContent(html(c), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(ROOT, 'og', c.slug + '.jpg'), type: 'jpeg', quality: 86 });
  }
  await b.close(); console.log('rendered', only ? 1 : cards.length, 'cards');
})();
