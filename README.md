# HCMC Insider

Static site for https://hcmcinsider.com — food, sights and local tips for Ho Chi Minh City. Hosted on Cloudflare Pages.

- `index.html` — the site (layout, styles, logic). Map: Leaflet + OpenStreetMap.
- `data.json` — places and videos. Updating this file updates the site.
- `privacy.html` — privacy page.

Cloudflare Pages: Framework preset **None**, build command empty, output directory `/`.

## Weekly update

1. Update `data.json` (places and videos).
2. Run `python3 build.py`. It regenerates `places/`, `guides/`, `sitemap.xml`, the guide list in `data.json` and the crawlable link directory inside `index.html`.
3. Commit and push; Cloudflare redeploys automatically.

Guide topics and their intro text live in the `GUIDES` list in `build.py`. Dish labels come from the `DISH` table in `index.html`.

`tips.json` holds "Local tips" per place id (hours, price, what to order, notes, more precise address), taken only from what creators state in their video descriptions, with the creator names as source. It is separate from `data.json` so weekly updates never overwrite it.

Share images: `build.py` writes `og/cards.json`; then `node tools/og-cards.js` (needs `npm i playwright @fontsource/be-vietnam-pro`) renders `og/<slug>.jpg`; run `build.py` again so pages point to them.

## SEO notes (Oct 2026)
- `src/worker.js` runs before assets: redirects www → apex and /privacy.html → /privacy, adds security headers and image caching.
- `build.py` also writes `llms.txt` and `robots.txt`, adds a "What is …?" dish explainer and "Last updated" line to place pages, a short answer + CollectionPage schema to guides.
- Very thin place pages get `noindex,follow` and stay out of the sitemap until they have tips or a fuller description (the build prints which).
- Update `STATIC_LASTMOD` in `build.py` when editing the metro, getting-around or privacy pages.
