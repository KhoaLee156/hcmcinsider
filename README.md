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
