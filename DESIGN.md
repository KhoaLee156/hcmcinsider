# HCMC Insider – Design system

An independent English guide to Ho Chi Minh City by locals. The look should feel **warm, trustworthy and local**: the jade of Saigon's trees and old shutters, the amber of Cholon's lanterns, lots of calm off-white space, real food photos from creators' videos. Never touristy-cheesy, never "AI startup".

Tokens live as CSS variables in `index.html` (`:root`) and `assets/page.css` (same values; keep them in sync). Pages use the variable names, never raw hex.

## Color

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | #F5F7F6 | #0E1518 | Page background |
| `--surface` | #FFFFFF | #162026 | Cards, nav, inputs |
| `--sunk` | #EDF2EF | #1D2A31 | Hover fills, quiet areas |
| `--ink` | #13212B | #EAF1EF | Body text and headings |
| `--muted` | #5A6B72 | #9FB0B3 | Secondary text (≥ 4.5:1 on bg/surface) |
| `--line` | #DCE5E1 | #2A3A40 | Borders, dividers |
| `--jade` | #0E6655 | #3FC2A4 | **Primary**: main buttons, links, kickers, logo |
| `--jade-2` | #0B5446 | #5AD3B6 | Primary hover |
| `--jade-soft` | #E1F1EC | #14322B | Primary tint: highlight boxes, chips |
| `--amber` | #F4A634 | #F7B651 | **Accent / money**: booking CTAs (Plan your trip), lantern, badges. Text on amber uses `--amber-ink` |
| `--amber-soft` | #FFF3DF | #3A2A12 | "Show this to your driver", bus notice, Ask box |
| `--c-food` `--c-cafe` `--c-shop` `--c-culture` `--c-stay` `--c-other` | #E2572F #9A5B2E #6A4BC4 #0E8A78 #2C6FD1 #66737A | lighter in dark | Category coding only (thumb gradients, dots, small labels). As text, always mix toward ink: `color-mix(in srgb, var(--cc) 72%, var(--ink))` |

Rules: one primary (jade) for navigation and normal actions; amber is reserved for things that earn money or need attention, so it stays special. The "Plan your trip" band uses a fixed dark jade gradient (#0E6655 → #083C33) in both themes. No purple-blue gradients, no gradient text, no glass effects.

## Typography

- Family: **Be Vietnam Pro** (designed in Vietnam; full Vietnamese diacritics), weights 400 / 500 / 700 / 800. Fallback: system-ui.
- Scale (use these; older one-off sizes like 13.5 or 14.5 should move to the nearest step when touched):

| Step | Size / line height | Use |
|---|---|---|
| Display | clamp(34px, 5.4vw, 58px) / 1.04, 800, −0.035em | Homepage H1 |
| H1 | clamp(30px, 4.6vw, 48px) / 1.08, 800 | Page titles |
| H2 | clamp(22px, 3vw, 36px) / 1.1–1.15, 800 | Section titles |
| H3 | 17–19px / 1.25, 800 | Card titles |
| Lead | 18px / 1.6 | Intros under H1 |
| Body | 16px / 1.55–1.6 | Text |
| Small | 14px / 1.5 | Meta, notes, buttons |
| Micro | 12–13px, 700, uppercase +0.06–0.08em | Kickers, labels |

- Kickers (small uppercase jade label above a heading) introduce every section.
- Keep paragraphs ≤ 70ch. Always show the Vietnamese name next to the English one (`lang="vi"`), in muted or italic.

## Spacing and layout

- 4px base; common steps 4, 8, 12, 16, 20, 24, 28, 40.
- Content width: 1200px; 1520px on screens ≥ 1400px. Reading pages: 780–880px.
- Side gutter: 16px minimum (respects safe-area).
- Sections: `.sec` with 40px top padding; the Plan band 44px/40px.
- Grids: `repeat(auto-fill, minmax(min(100%, 260–300px), 1fr))`, gap 16–20px. Phones: one column, no horizontal scroll ever.
- From 1200px the places grid gets a 290px sticky side rail (trip planner, guides, ask a local).

## Shape and depth

- Radius: `--r` 16px for cards and boxes; 12px for inner elements (rows, small buttons, icons); 999px for pills and chips; 18px for Plan cards.
- Shadow: `--shadow` (soft, two-layer) on cards; Plan cards use a deeper shadow on the dark band. Nothing else casts shadows.
- Borders: 1px `--line`; highlight boxes use a 5px jade left border.

## Components

- **Buttons**: primary `.cta` / `.btn.go` (jade, white text, pill); secondary `.btn` (surface, line border); money CTA `.pc .go a.pri` (amber, amber-ink text, 12px radius, full width); quiet links `.more-link` (jade text, →). Hover darkens or adds border; focus shows a 3px amber outline (`:focus-visible`).
- **Cards**: place card = 16:9 creator thumbnail (or category gradient with the dish label), dish label, English name (links to the place page), Vietnamese name, area with pin icon, 1–3 line description, creator videos (details/summary), Directions + Save.
- **Chips**: category filters with a colored dot; pressed = ink background.
- **Boxes**: `.box` (surface), `.box.driver` (amber-soft, big Vietnamese text), `.box.answer` (jade-soft, short answer), `.ltips` (definition list).
- **Plan your trip**: dark jade band, 4 journey steps (Before you fly → When you land → During your stay → On your last day), each with a colored band, 3 ✓ benefits, one amber primary and one quiet "Compare" link. Always followed by the affiliate disclosure.
- **Nav**: sticky, translucent surface, logo left, text links right; the sticky category bar sits under it on the homepage.
- **Footer**: logo, independence and creator-credit statement, email, X · Facebook, Privacy, YouTube Terms.

## Imagery and icons

- Photos: only creators' YouTube thumbnails, unmodified, as links to the original video (YouTube API rules), or our own photos. Never screenshots of others' videos, never stock photos of other cities.
- Share images: generated per place (`og/<slug>.jpg`) in brand colors with the lantern.
- Icons: simple 24px line icons (1.6–2px stroke, round caps), drawn inline as SVG. No emoji as UI icons (emoji are fine inside social copy).
- Logo: amber lantern on a jade rounded square (`favicon.svg`).

## Voice in the UI

Plain, friendly English from a local: "Show this to your driver", "Address, videos & more →". Specific facts over adjectives; no invented superlatives, ratings or urgency. Disclose affiliate links next to them.
