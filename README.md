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

## Speed notes (Oct 2026)
- No third-party requests before first paint: fonts are self-hosted (`assets/fonts/`, @font-face is inlined in `index.html` and at the top of `assets/page.css`), Leaflet is self-hosted in `assets/vendor/leaflet/` and only loaded when the map nears the screen.
- `build.py` inlines `data.json` into `index.html` (`<script id="hi-data">`), so the homepage renders complete on the first paint with no layout shift.

## Visitor tools (Oct 2026)
All run in the browser; no server. Shared code is `assets/site.js` (loaded on every page, referenced as `site.js?v=<hash>` by `build.py`).
- **Order card** on food and coffee place pages: typical dishes per dish label (`ORDER_MENU` in `build.py`), options (no spring onion, spicy level, take away, allergies), then big Vietnamese text to show the seller, plus "Ask for the bill".
- **Near me, open now** (homepage chip, or link to `/#near`): uses the browser's location and `near` in `data.json`, which `build.py` makes from `tips.json`. Hours text is parsed by `parse_hours()`; add an entry to `HOURS_FIX` when the parser can't read new wording. Places without a pin use the centre of their ward or old district (`AREA_XY`), shown with "≈". Add `lat`/`lng` to a place in `data.json` for an exact distance.
- **♥ Save + offline**: saved ids live in `localStorage` (`hi_favs`). `sw.js` caches the homepage, `/saved/` and every saved place page, so they open without data. `/saved/` shows each saved place with a full-screen "Show this to your driver" card. `src/worker.js` allows `geolocation=(self)`.

## SEO notes (Oct 2026)
- `src/worker.js` runs before assets: redirects www → apex and /privacy.html → /privacy, adds security headers and image caching.
- `build.py` also writes `llms.txt` and `robots.txt`, adds a "What is …?" dish explainer and "Last updated" line to place pages, a short answer + CollectionPage schema to guides.
- Very thin place pages get `noindex,follow` and stay out of the sitemap until they have tips or a fuller description (the build prints which).
- Update `STATIC_LASTMOD` in `build.py` when editing the metro, getting-around or privacy pages.

## See & Do
`sights.json` holds the landmark pages (/see-and-do/<slug>/). Facts are checked against the listed sources; update `checked` when re-verifying. To add real photos, put them in `assets/photos/` and list them in the sight's `photos` as {src, alt, credit}; they replace the illustration card at the top.

## IndexNow
`.github/workflows/indexnow.yml` runs after every push that changes `sitemap.xml`: it waits for Cloudflare to deploy, then `tools/indexnow.py` sends the new or changed URLs to IndexNow (Bing, Yandex and others). The key file is the `<key>.txt` at the site root. To resubmit everything, run the workflow by hand on GitHub (Actions → IndexNow → Run workflow, tick "all").
