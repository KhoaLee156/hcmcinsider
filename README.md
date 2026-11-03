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
- **Where-to-stay quiz** (`/guides/where-to-stay-ho-chi-minh-city/#quiz`): 6 questions score the four areas in `STAY_AREAS`. Questions and points are `STAY_QUIZ` in `build.py`, follow-up links per area are `STAY_NEXT`; scoring runs in `assets/site.js` (`initQuiz`). Results can be shared as `#stay=<area>` (e.g. `#stay=cholon`). Hotel buttons appear in the result once `HOTEL_LINKS` is filled.
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

## Weekly site check
`.github/workflows/site-check.yml` runs `tools/site_check.py` every Monday at 8:17 am Saigon time. When something needs attention it opens (or updates) one GitHub issue labelled `site-check`, so GitHub emails you; when everything is fine it closes that issue. Run it by hand from Actions → Weekly site check → Run workflow, or locally with `python3 tools/site_check.py` (`--offline` skips the network checks).
It checks: internal links and #anchors, outside links (404/410/5xx/DNS; sites that block robots are listed separately), YouTube videos removed or made private, `checked` dates in `sights.json`/`events.json` older than 120 days, events that ended or start within 30 days, text like "free until the end of 2026" within 75 days of its date, and `STATIC_LASTMOD` pages older than 180 days. Thresholds are at the top of the script. Affiliate short links are checked without following them, so they never count as clicks.

## Ask a local chat
A chat button on every page answers visitors' questions with Claude (Anthropic), using only facts from this site.
- `src/ask.js` handles `POST /api/ask` (streams the answer) and `GET /api/ask` (is the chat switched on?). Model, limits and the instructions to the assistant are at the top of the file.
- `src/knowledge.js` is the site's facts for the assistant (places with tips, sights, events, practical guides). `build.py` regenerates it on every build, so the chat always matches the site. Do not edit it by hand.
- The chat button only appears when the Worker has the secret `ANTHROPIC_API_KEY` (Cloudflare dashboard → Workers & Pages → hcmcinsider → Settings → Variables and Secrets → Add → type Secret). Delete the secret to switch the chat off.
- Each visitor can ask 5 questions per minute (`ratelimits` in `wrangler.jsonc`). Set a monthly spend limit in the Anthropic Console as well.
- Conversations are not stored; they live in the visitor's browser tab (sessionStorage).
- Local test: put `ANTHROPIC_API_KEY=...` in `.dev.vars` (git-ignored), run `npm install` then `npx wrangler dev --local-protocol https`.

## Try Saigon (practice-day game)
`/try-saigon/` is a browser game for first-time visitors: land at Tan Son Nhat with play money, change it at the live rate, get into the city (free bus 152, ride app, metered taxi or the tout), order bánh mì and coffee in Vietnamese, cross the street, look around Ben Thanh Market in 360°, bargain for a conical hat, check a ride app's plate number and pay for dinner at Sidewalk Noodles, 187 Huynh Man Dat. It ends with a skills report and links to the real guides.
- `assets/try-saigon/trip.js` — **the story**: chapters, times, prices, phrases, menus, hotspots. Edit this to change the day; prices marked "example" are typical, not quotes.
- `assets/try-saigon/game.js` — the engine (wallet with real note denominations, exchange, ordering, paying and change, haggling, ride app, street-crossing game, report). Progress is kept in the visitor's browser (`localStorage`, key `ts_state_v1`).
- `assets/try-saigon/scene.js` — paints the 360° illustration of Ben Thanh. To use a real 360° photo instead, put a 2:1 equirectangular JPG in `assets/photos/` and add `pano: "/assets/photos/ben-thanh-360.jpg"` to the `pano` step in `trip.js`.
- `src/rate.js` — `GET /api/rate`: mid-market dong rates for USD, EUR, GBP and AUD from ExchangeRate-API's free endpoint, cached 6 hours at the edge. If it fails, the game uses `fallbackRate` in `trip.js` and says so.
- `build.py` writes the page shell (`try_saigon_page()`, FAQ in `TRY_FAQ`) and links it from the Guides index, the airport guide and the chat knowledge.
