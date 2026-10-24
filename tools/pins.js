// Renders 1000x1500 Pinterest pin images into pins/<slug>.jpg from pins/pins.json.
// Needs: npm i playwright @fontsource/be-vietnam-pro   Run: node tools/pins.js
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const fontDir = path.dirname(require.resolve('@fontsource/be-vietnam-pro/package.json'));
const fontCss = ['500', '700', '800'].map(w => fs.readFileSync(path.join(fontDir, w + '.css'), 'utf8')
  .replace(/url\(\.\/files\/([^)]+?\.woff2)\)/g, (m, f) => 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(fontDir, 'files', f)).toString('base64') + ')')
  .replace(/,\s*url\(\.\/files\/[^)]+?\.woff\)\s*format\('woff'\)/g, '')).join('\n');
const lantern = fs.readFileSync(path.join(ROOT, 'favicon.svg'), 'utf8').replace(/<rect width="100" height="100" rx="22" fill="#0E6655"\/>/, '');
const COL = { food: ['#E2572F', '#6E200E'], shop: ['#6A4BC4', '#2A1A5E'], see: ['#0E8A78', '#08362F'], move: ['#0E6655', '#062E27'] };
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function html(p) {
  const [a, b] = COL[p.kind] || COL.see;
  const size = p.big.length > 30 ? 92 : p.big.length > 20 ? 104 : 118;
  return `<!doctype html><meta charset="utf-8"><style>${fontCss}
*{margin:0;box-sizing:border-box}body{width:1000px;height:1500px;overflow:hidden;font-family:'Be Vietnam Pro';color:#fff;
background:radial-gradient(circle at 50% 66%,rgba(244,166,52,.42),transparent 34%),linear-gradient(165deg,${a},${b})}
.top{position:absolute;left:80px;right:80px;top:110px}
.kick{display:inline-block;background:rgba(0,0,0,.25);border-radius:999px;padding:12px 26px;font-weight:700;font-size:34px;letter-spacing:3px;text-transform:uppercase;color:#FFD08A}
h1{font-size:${size}px;line-height:1.02;letter-spacing:-3px;font-weight:800;margin-top:40px}
.sub{font-size:44px;line-height:1.25;font-weight:500;margin-top:30px;opacity:.93}
.lan{position:absolute;left:50%;bottom:210px;width:470px;height:470px;margin-left:-235px}.lan svg{width:100%;height:100%}
.foot{position:absolute;left:0;right:0;bottom:0;height:150px;background:rgba(0,0,0,.28);display:flex;align-items:center;justify-content:space-between;padding:0 80px}
.brand{display:flex;align-items:center;gap:18px;font-weight:800;font-size:42px}.brand i{width:70px;height:70px;border-radius:18px;background:#0E6655;display:grid;place-items:center}.brand i svg{width:60px;height:60px}.brand span{color:#F4A634}
.url{font-size:38px;font-weight:700;color:#FFD08A}
</style><div class="top"><div class="kick">${esc(p.kicker)}</div><h1>${esc(p.big)}</h1><div class="sub">${esc(p.sub)}</div></div>
<div class="lan">${lantern}</div>
<div class="foot"><div class="brand"><i>${lantern}</i>HCMC <span>Insider</span></div><div class="url">hcmcinsider.com</div></div>`;
}
(async () => {
  const pins = JSON.parse(fs.readFileSync(path.join(ROOT, 'pins/pins.json'), 'utf8'));
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 1500 } });
  for (const p of pins) {
    await pg.setContent(html(p), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(ROOT, 'pins', p.slug + '.jpg'), type: 'jpeg', quality: 86 });
  }
  await b.close(); console.log('rendered', pins.length, 'pins');
})();
