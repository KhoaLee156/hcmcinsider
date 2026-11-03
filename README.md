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

## Try Saigon (360° role-play)
`/try-saigon/` is a first-person 360° role-play of a first day in Saigon. The player stands in six places (Tan Son Nhat arrivals hall, outside arrivals, Le Loi Street, Ben Thanh south gate, inside Ben Thanh, Ben Thanh metro station, Opera House, Cholon), drags to look around, taps people, counters and stalls to interact, and taps arrows to walk. There is no fixed order: a to-do list (get dong, get to District 1, breakfast, cross the street, a souvenir, get to Cholon, coffee, dinner) and a running clock (the noodle stall opens at 5 pm). Interactions: change money at the live rate, ATM, SIM or eSIM, the tout, bus 152, taxi, ride app with a plate check, ordering in Vietnamese, paying with real notes and getting change, bargaining, the street-crossing game. It ends with a skills and spending report.
- `assets/try-saigon/trip.js` — **the world**: scenes, the objects in them (position by yaw/pitch, label, what tapping does), prices, phrases, to-do list. Edit this to change the game; the header comment lists every option. Prices marked "example" are typical, not quotes.
- `assets/try-saigon/scene.js` — paints each scene (background + the objects at their yaw). To use a real 360° photo, put a 2:1 equirectangular JPG in `assets/photos/` and add `pano: "/assets/photos/….jpg"` to the scene in `trip.js`; the hotspots stay where their yaw/pitch says.
- **Hotspot editor:** open `/try-saigon/?edit`. Pick a scene, click any point in the view and copy its `yaw`/`pitch` into `trip.js`. Use it after swapping in a real photo. iPhone Pano strips work too: set `haov`/`vaov` on the scene (see the comment at the top of `trip.js`).
- The ☰ button lists everything in the current place as buttons (for screen readers, and for anyone who can't find a dot).
- The report has share buttons (Web Share, Facebook, X) and "Make the real day easier" links chosen from the player's day (`realTrip` in `trip.js`; affiliate, with the disclosure). Share image: `og/try-saigon.jpg`.
- `assets/try-saigon/game.js` — the engine (viewer, hotspots, sheet, wallet, all activities). Progress is kept in the visitor's browser (`localStorage`, key `ts_state_v1`).
- `src/rate.js` — `GET /api/rate`: mid-market dong rates for USD, EUR, GBP and AUD from ExchangeRate-API's free endpoint, cached 6 hours at the edge. If it fails, the game uses `fallbackRate` in `trip.js` and says so.
- `build.py` writes the page shell (`try_saigon_page()`, FAQ in `TRY_FAQ`) and links it from the nav, the homepage banner, the Guides index, the airport guide and the chat knowledge.
