// GET /api/rate: today's mid-market dong rates for the Try Saigon game (/try-saigon/).
// Source: ExchangeRate-API's free open endpoint (no key; attribution shown in the game). Cached at the edge for 6 hours.
const SOURCE = 'https://open.er-api.com/v6/latest/USD';
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD'];

export async function handleRate(request, ctx) {
  const cache = caches.default;
  const key = new Request(new URL('/api/rate', request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  let body, status = 200;
  try {
    const r = await fetch(SOURCE, { cf: { cacheTtl: 21600 } });
    const j = await r.json();
    if (j.result !== 'success' || !j.rates || !j.rates.VND) throw new Error('bad feed');
    const rates = {};
    for (const c of CURRENCIES) if (j.rates[c]) rates[c] = Math.round(j.rates.VND / j.rates[c]);
    const date = new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10);
    body = { rates, date, source: 'ExchangeRate-API (exchangerate-api.com)' };
  } catch (e) {
    body = { error: 'rate unavailable' };
    status = 503;
  }
  const res = new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': status === 200 ? 'public, max-age=21600' : 'no-store' }
  });
  if (status === 200) ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}
