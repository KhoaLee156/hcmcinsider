// Edge logic for hcmcinsider.com: canonical host, legacy .html URLs, security headers.
// Everything else is served from static assets.
const HOST = 'hcmcinsider.com';
const SECURITY = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.' + HOST) {
      url.hostname = HOST;
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === '/privacy.html') {
      url.pathname = '/privacy';
      return Response.redirect(url.toString(), 301);
    }
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY)) out.headers.set(k, v);
    const p = url.pathname;
    if (/^\/(og|assets)\//.test(p) || /\.(png|jpg|svg|woff2)$/.test(p)) out.headers.set('Cache-Control', 'public, max-age=604800');
    return out;
  }
};
