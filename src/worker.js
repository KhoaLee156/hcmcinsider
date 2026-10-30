// Edge logic for hcmcinsider.com: canonical host, legacy .html URLs, security headers.
// Everything else is served from static assets.
const HOST = 'hcmcinsider.com';
const SECURITY = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)'
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.' + HOST || url.protocol === 'http:') {
      url.hostname = HOST;
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === '/privacy.html') {
      url.pathname = '/privacy';
      return Response.redirect(url.toString(), 301);
    }
    const p = url.pathname;
    // The 404 page itself must never answer 200 at /404 or /404.html.
    if (p === '/404' || p === '/404.html') {
      const nf = await env.ASSETS.fetch(new Request(new URL('/this-page-does-not-exist', url), request));
      const r = new Response(nf.body, { status: 404, headers: nf.headers });
      for (const [k, v] of Object.entries(SECURITY)) r.headers.set(k, v);
      return r;
    }
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY)) out.headers.set(k, v);
    // Data and text files are for the app and AI tools, not for search results.
    if (/\.(json|txt|csv)$/.test(p) && p !== '/robots.txt') out.headers.set('X-Robots-Tag', 'noindex');
    if (/^\/(og|assets)\//.test(p) || /\.(png|jpg|svg|woff2)$/.test(p)) out.headers.set('Cache-Control', 'public, max-age=604800');
    return out;
  }
};
