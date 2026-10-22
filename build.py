#!/usr/bin/env python3
"""HCMC Insider static page builder.

Reads data.json and writes:
  places/<slug>/index.html   one page per place
  guides/<slug>/index.html   topic guides (+ guides/index.html)
  sitemap.xml
  data.json                  adds "slug" to each place and a "guides" list
  index.html                 refreshes the crawlable link directory inside #root

Run after every data update:  python3 build.py
"""
import datetime
import html
import json
import os
import re
import shutil
import unicodedata

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = "https://hcmcinsider.com"
TODAY = datetime.date.today().isoformat()
MONTH = datetime.date.today().strftime("%B %Y")

E = lambda s: html.escape(str(s if s is not None else ""), quote=True)


# ---------------------------------------------------------------- data helpers
def load():
    with open(os.path.join(ROOT, "data.json"), encoding="utf-8") as f:
        return json.load(f)


def dish_rules():
    """Single source of truth: the DISH table inside index.html."""
    src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    line = re.search(r"var DISH=\[(.*?)\];\n", src).group(1)
    return [(re.compile(p, re.I), label) for p, label in re.findall(r'\[/(.+?)/i,"(.+?)"\]', line)]


CATS = {"food": "Eat", "cafe": "Coffee & tea", "shop": "Markets", "culture": "Culture", "stay": "Stay", "other": "Other"}
SCHEMA_TYPE = {"food": "Restaurant", "cafe": "CafeOrCoffeeShop", "shop": "TouristAttraction",
               "culture": "TouristAttraction", "stay": "LodgingBusiness", "other": "Place"}


def slugify(s):
    s = s.replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:70].rstrip("-") or "place"


def addr_en(a):
    a = str(a or "")
    a = re.sub(r"Quận (\d+) cũ", r"District \1", a)
    a = re.sub(r"\bQuận (\d+)", r"District \1", a)
    a = re.sub(r"\bP\.\s*", "Ward ", a).replace("Phường ", "Ward ").replace("Đường số", "Street")
    a = re.sub(r"^Chợ Lớn$", "Cholon (Chinatown)", a)
    a = re.sub(r"Tân Phú$", "Tan Phu", a)
    return a


CHOLON = re.compile(r"Quận (5|6|11)\b|Chợ Lớn|An Đông|Minh Phụng|Bình Phú|Bình Thới|Bình Tây|Phú Lâm|"
                    r"Chợ Hòa Bình|Phùng Hưng|Hải Thượng Lãn Ông|Lương Nhữ Học|Phạm Phú Thứ|Bình Tiên|Hà Tôn Quyền|"
                    r"Châu Văn Liêm|Nguyễn Trãi|Ngô Nhân Tịnh|Bùi Hữu Nghĩa|Tản Đà|Nguyễn Trì Phương|Hồng Bàng", re.I)


def area_of(p):
    a = p.get("addr") or ""
    hay = a + " " + p["name"]
    m = re.search(r"Quận (\d+)", a)
    if CHOLON.search(hay):
        return "Cholon (District %s)" % m.group(1) if m and m.group(1) in ("5", "6", "11") else "Cholon"
    if m:
        return "District " + m.group(1)
    if "Ông Lãnh" in a:
        return "District 1"
    if "Tân Phú" in a:
        return "Tan Phu"
    return "Ho Chi Minh City"


def in_cholon(p):
    return area_of(p).startswith("Cholon")


def yt_id(u):
    m = re.search(r"(?:v=|youtu\.be/|shorts/)([\w-]{11})", str(u or ""))
    return m.group(1) if m else ""


def platform(u):
    u = str(u).lower()
    for key, name in (("youtu", "YouTube"), ("facebook.", "Facebook"), ("fb.watch", "Facebook"),
                      ("tiktok.", "TikTok"), ("instagram.", "Instagram")):
        if key in u:
            return name
    return "Web"


def compact(n):
    n = int(n or 0)
    if n >= 1_000_000:
        return ("%.1fM" % (n / 1e6)).replace(".0M", "M")
    if n >= 1000:
        return ("%.1fK" % (n / 1e3)).replace(".0K", "K")
    return str(n)


def has_xy(p):
    try:
        float(p.get("lat")); float(p.get("lng"))
        return True
    except (TypeError, ValueError):
        return False


def dir_link(p):
    from urllib.parse import quote
    if has_xy(p):
        return "https://www.google.com/maps/dir/?api=1&destination=" + quote("%s,%s" % (p["lat"], p["lng"]))
    if str(p.get("maps", "")).startswith("http"):
        return p["maps"]
    return "https://www.google.com/maps/search/?api=1&query=" + quote(p["name"] + " " + (p.get("addr") or "") + " Hồ Chí Minh")



TIPS = {}


def tips_html(p):
    t = TIPS.get(p["id"])
    if not t:
        return ""
    rows = [(k, lab) for k, lab in (("hours", "Hours"), ("price", "Price"), ("order", "What to order"), ("note", "Good to know")) if t.get(k)]
    if not rows:
        return ""
    dl = "".join('<div><dt>%s</dt><dd>%s</dd></div>' % (lab, E(t[k])) for k, lab in rows)
    src = ", ".join(t.get("src") or [])
    return ('<section class="box ltips"><h2>Local tips</h2><dl>%s</dl><p class="small">From the video description%s by %s. '
            'Hours and prices change, so check before you go.</p></section>') % (dl, "s" if len(t.get("src") or []) > 1 else "", E(src))

# ---------------------------------------------------------------- shared layout
LOGO = None  # filled from favicon.svg


def logo_svg(size=34):
    svg = open(os.path.join(ROOT, "favicon.svg"), encoding="utf-8").read().strip()
    return svg.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
                       '<svg width="%d" height="%d" viewBox="0 0 100 100" aria-hidden="true">' % (size, size), 1)


AFF = [("Get a Vietnam eSIM", "https://airalo.tpo.lu/KP1dEp49"),
       ("Airport pickup", "https://kiwitaxi.tpo.lu/cz2amFE5"),
       ("Food tours & day trips", "https://klook.tpo.lu/FZ8vNhYU")]


def page(path, title, desc, body, jsonld=(), og_image=None):
    url = SITE + path
    ld = "".join('<script type="application/ld+json">%s</script>\n' % json.dumps(x, ensure_ascii=False) for x in jsonld)
    nav = ('<header class="nav"><div class="wrap"><a class="logo" href="/">%s<span>HCMC <b>Insider</b></span></a>'
           '<nav class="links" aria-label="Main"><a href="/#eat">Eat</a><a href="/guides/">Guides</a>'
           '<a href="/guides/hcmc-metro/">Metro</a><a href="/#plan">Plan</a></nav></div></header>') % logo_svg()
    plan = ('<aside class="plan"><div class="wrap"><p class="kicker">Plan your trip</p><div class="planrow">%s</div>'
            '<p class="small">Affiliate links: if you book, we may earn a small commission at no extra cost to you.</p></div></aside>'
            % "".join('<a href="%s" target="_blank" rel="sponsored noopener">%s ↗</a>' % (u, E(t)) for t, u in AFF))
    foot = ('<footer><div class="wrap"><a class="logo" href="/">%s<span>HCMC <b>Insider</b></span></a>'
            '<p>An independent guide to Ho Chi Minh City by locals. Videos belong to their creators; we only link to the original platforms. '
            'Places are suggestions, not endorsements: check opening hours before you go. '
            '<a href="mailto:hello@hcmcinsider.com">hello@hcmcinsider.com</a> · <a href="/privacy.html">Privacy</a> · '
            '<a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">YouTube Terms</a></p></div></footer>') % logo_svg(28)
    return """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0E6655">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700;800&display=swap">
<link rel="stylesheet" href="/assets/page.css">
{ld}</head>
<body>
{nav}
<main>
{body}
</main>
{plan}
{foot}
</body>
</html>
""".format(title=E(title), desc=E(desc), url=url, og=og_image or SITE + "/og-image.png", ld=ld,
           nav=nav, body=body, plan=plan, foot=foot)


def crumbs(items):
    """items: [(name, path or None)]"""
    parts = []
    for i, (name, path) in enumerate(items):
        parts.append('<a href="%s">%s</a>' % (path, E(name)) if path else '<span aria-current="page">%s</span>' % E(name))
    ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, **({"item": SITE + p} if p else {})} for i, (n, p) in enumerate(items)]}
    return '<nav class="crumbs" aria-label="Breadcrumb">%s</nav>' % ' <span aria-hidden="true">›</span> '.join(parts), ld


# ---------------------------------------------------------------- guides config
NOODLES = {"Hu tieu noodle soup", "Egg noodles & wontons", "Herbal duck noodles", "Goat noodle soup",
           "Satay venison noodles", "Pho", "Spicy Hue beef noodles", "Crab noodle soup", "Thick noodle soup",
           "Crab & tomato noodles"}

GUIDES = [
    dict(slug="cholon-food-guide", nav="Cholon food guide",
         title="Cholon Food Guide: Where to Eat in Saigon's Chinatown",
         h1="Cholon food guide: where to eat in Saigon's Chinatown",
         desc="Where locals eat in Cholon, Ho Chi Minh City's Chinatown: noodle carts, dim sum, herbal duck noodles, sweet soups and Chinese-Vietnamese kitchens, with Vietnamese names, addresses and directions.",
         pick=lambda p, d: p["cat"] == "food" and in_cholon(p),
         intro=["Cholon is Ho Chi Minh City's historic Chinatown, spread across the old Districts 5, 6 and 11. Families of Cantonese, Teochew, Hokkien, Hakka and Hainanese origin have cooked here for generations, and it is one of the best neighbourhoods in Vietnam to eat.",
                "Expect tiny noodle shops that have done one dish for decades, dim sum halls that are busiest in the morning, herbal duck noodles, sweet-soup shops and family-run Chinese-Vietnamese kitchens. Most places are cheap, cash-friendly and have little English, so every spot below shows its Vietnamese name for you to show a driver or the cook."],
         tips=["Go hungry and graze: share one dish at each place and keep walking.",
               "Mornings are best for dim sum and noodles; sweet-soup shops come alive in the evening.",
               "Carry small notes (10,000–100,000 dong). Many stalls take cash only.",
               "Ride-hailing apps are the easiest way to get there; Metro Line 1 does not reach Cholon yet."]),
    dict(slug="noodle-soups-ho-chi-minh-city", nav="Noodle soups",
         title="Best Noodle Soups in Ho Chi Minh City, Picked by Locals",
         h1="The best noodle soups in Ho Chi Minh City",
         desc="Hu tieu, wonton egg noodles, herbal duck noodles, pho, spicy Hue beef noodles and more: local noodle shops in Ho Chi Minh City (Saigon) with addresses, directions and creator videos.",
         pick=lambda p, d: d in NOODLES,
         intro=["Noodle soup is breakfast, lunch and late-night food in Saigon. Pho gets the fame, but locals are just as loyal to hu tieu (a clear pork-and-seafood broth with rice noodles, often in Phnom Penh style), Chinese egg noodles with wontons, herbal duck noodles and spicy Hue-style beef noodles.",
                "These are shops local food creators keep coming back to, from an 8,000-dong cart to old family shops in Cholon. Prices are low, portions are made to order, and most places add fresh herbs, lime and chilli at the table."],
         tips=["Order 'kho' (dry) to get the noodles with sauce and the broth on the side.",
               "Fresh herbs and chilli on the table are free; taste the broth before you add sauces.",
               "Popular carts sell out early, so go before noon for morning-only places."]),
    dict(slug="dim-sum-and-wontons-saigon", nav="Dim sum & wontons",
         title="Dim Sum, Wontons and Egg Noodles in Saigon (Cholon)",
         h1="Dim sum, wontons and egg noodles in Saigon",
         desc="Where to eat dim sum, har gow, wonton dumplings and Chinese egg noodles in Ho Chi Minh City's Cholon, with Vietnamese names, addresses and directions.",
         pick=lambda p, d: d in ("Dim sum", "Wonton dumplings", "Egg noodles & wontons"),
         intro=["Cantonese and Teochew families brought dim sum, wontons and springy egg noodles to Cholon, and the old shops still make them by hand. In Vietnamese you will see há cảo (har gow), xíu mại (siu mai), sủi cảo (wonton dumplings) and mì (egg noodles).",
                "Dim sum here is a morning meal: go early for the freshest steamers. Wonton and egg-noodle shops open from breakfast until they sell out, and some carts only appear in the evening."],
         tips=["Point at what other tables are eating; steamers are usually priced per basket.",
               "Ask for 'mì khô' for dry egg noodles with soup on the side.",
               "Cash is the norm at older shops."]),
    dict(slug="chinese-vietnamese-restaurants-cholon", nav="Chinese-Vietnamese kitchens",
         title="Chinese-Vietnamese Restaurants and Chicken Rice in Cholon",
         h1="Chinese-Vietnamese kitchens and chicken rice in Cholon",
         desc="Old family restaurants in Cholon serving Teochew and Cantonese-style stir-fries, chicken rice and braised pork rice, with Vietnamese names, addresses and directions.",
         pick=lambda p, d: d in ("Chinese-Vietnamese kitchen", "Chicken rice", "Braised pork rice"),
         intro=["Beyond street stalls, Cholon is full of family restaurants cooking Teochew and Cantonese dishes for big tables: stir-fries, soups, roast meats and rice plates. Many have been run by the same family for decades.",
                "Chicken rice (cơm gà) is a local favourite: poached or crispy-fried chicken with rice cooked in chicken fat and ginger sauce. Go with a group to order several dishes and share."],
         tips=["Big menus are often only in Vietnamese and Chinese; a translation app's camera mode helps.",
               "Lunch and early dinner are the busiest times.",
               "Ask the price of seafood dishes before ordering; they are often priced by weight."]),
    dict(slug="vegetarian-food-ho-chi-minh-city", nav="Vegetarian food",
         title="Vegetarian Food in Ho Chi Minh City: Local Chay Shops",
         h1="Vegetarian food in Ho Chi Minh City",
         desc="Local vegetarian (chay) noodle shops and kitchens in Ho Chi Minh City and Cholon, with Vietnamese names, addresses, directions and creator videos.",
         pick=lambda p, d: d == "Vegetarian",
         intro=["Eating vegetarian in Saigon is easy once you know the word chay. Buddhist vegetarian shops are everywhere in Cholon, serving noodle soups, rice plates and mock-meat dishes made from tofu, mushrooms and wheat gluten.",
                "Many Vietnamese eat vegetarian on the 1st and 15th days of the lunar month, so chay shops are extra busy, and extra good, on those days."],
         tips=["Look for 'chay' on signs and menus; 'mặn' means the dish has meat.",
               "Fish sauce is common in regular Vietnamese food; chay shops use soy sauce instead.",
               "Some charity kitchens serve free or pay-what-you-can meals: be respectful and leave room for those who need it."]),
    dict(slug="che-sweet-soup-saigon", nav="Sweet soups (chè)",
         title="Chè: Where to Try Vietnamese Sweet Soups in Saigon",
         h1="Chè: Vietnamese sweet soups in Saigon",
         desc="Where to eat chè, Vietnamese sweet soups and desserts, in Ho Chi Minh City's Cholon: old dessert shops with Vietnamese names, addresses and directions.",
         pick=lambda p, d: d == "Sweet soup desserts",
         intro=["Chè is the Vietnamese word for sweet soups and puddings: beans, jellies, lotus seeds, taro and fruit, served hot or over ice, often with coconut milk. In Cholon you will also find Chinese-style desserts such as black sesame soup and herbal jelly.",
                "Dessert shops are an evening ritual. Locals stop by after dinner, so many places open in the afternoon and stay busy late."],
         tips=["Ask for 'chè nóng' (hot) or 'chè đá' (with ice).",
               "Mixed bowls let you try several toppings at once.",
               "Small shops are cash-only; a bowl usually costs less than a coffee in the city centre."]),
    dict(slug="cholon-markets-and-old-streets", nav="Markets & old streets",
         title="Cholon Markets and Old Streets: Binh Tay, Lantern Street and More",
         h1="Markets and old streets of Cholon",
         desc="Binh Tay Market, Hoa Binh and Phung Hung markets, Lantern Street and the herbal medicine street: what to see in Cholon, Ho Chi Minh City, with directions.",
         pick=lambda p, d: p["cat"] in ("shop", "culture"),
         intro=["Cholon's markets and trade streets are where the neighbourhood's daily life happens. Binh Tay Market is the grand old wholesale market; smaller wet markets like Hoa Binh and Phung Hung are where locals buy breakfast, snacks and fresh food.",
                "Some streets still specialise in one trade: lanterns on Luong Nhu Hoc (especially before the Mid-Autumn Festival) and traditional Chinese medicine on Hai Thuong Lan Ong, where the air smells of dried herbs."],
         tips=["Markets are busiest and most interesting in the early morning.",
               "Keep your phone and bag on the side away from passing motorbikes.",
               "Ask before photographing vendors, and buy a snack if you linger at a stall."]),
]


def guide_cards(items):
    out = []
    for p in items:
        out.append(card_html(p))
    return '<div class="grid">%s</div>' % "".join(out)


def card_html(p):
    t = p["_thumb"]
    img = ('<img src="%s" alt="" loading="lazy" width="320" height="180" onerror="this.remove()">' % t) if t else ""
    return ('<a class="pcard" href="/places/%s/" style="--cc:var(--c-%s)"><div class="thumb"><span class="ph">%s</span>%s</div>'
            '<div class="pbody"><span class="dish">%s</span><h3>%s</h3><span class="vn" lang="vi">%s</span><span class="area">%s</span>%s</div></a>') % (
        p["slug"], p["cat"] if p["cat"] in CATS else "other", E(p["_dish"]), img, E(p["_dish"]), E(p["_name"]),
        E(p["name"]), E(p["_area"]), ('<p>%s</p>' % E(p["noteEn"])) if p.get("noteEn") else "")


# ---------------------------------------------------------------- metro guide
STOPS = [("Ben Thanh", "Ben Thanh Market, Bui Vien Street, Tao Dan Park", 1, 1),
         ("Opera House", "Opera House, Nguyen Hue walking street; Notre Dame and the Post Office a short walk away", 1, 1),
         ("Ba Son", "Bach Dang Wharf and the riverside park", 1, 1), ("Van Thanh Park", "", 0, 0),
         ("Tan Cang", "Landmark 81 and Vinhomes Central Park", 1, 0),
         ("Thao Dien", "Cafes, restaurants and boutiques of the expat quarter", 1, 0), ("An Phu", "Vincom Mega Mall", 0, 0),
         ("Rach Chiec", "", 0, 0), ("Phuoc Long", "", 0, 0), ("Binh Thai", "", 0, 0), ("Thu Duc", "Thu Duc Market", 0, 0),
         ("High-Tech Park", "", 0, 0), ("National University", "", 0, 0),
         ("Suoi Tien Bus Station", "End of the line; Suoi Tien Theme Park is nearby", 1, 0)]

METRO_FAQ = [
    ("How much does the Ho Chi Minh City metro cost?", "A single trip costs 7,000–20,000 dong depending on distance, or 1,000 dong less when you pay by card or app. A 1-day pass is 40,000 dong and a 3-day pass is 90,000 dong."),
    ("Can I pay with my foreign Visa or Mastercard?", "Yes. Contactless Visa, Mastercard, JCB, Amex and UnionPay cards, plus Apple Pay and Samsung Pay, work directly at the gates. Tap in and out with the same card or phone."),
    ("What are the metro opening hours?", "Monday to Friday from 5:00 am to 10:00 pm; on weekends and public holidays until 11:00 pm. Trains run every 6–8 minutes at rush hour and every 10–12 minutes at other times."),
    ("Does the metro go to the airport or Cholon?", "Not yet. Line 1 runs east from Ben Thanh to Suoi Tien. Line 2 (Ben Thanh – Tham Luong) started construction in January 2026. For the airport and Cholon, use a ride-hailing app, taxi or bus."),
]


def metro_page():
    stops = "".join('<li class="%s"><b>%s</b>%s%s</li>' % ("key" if k else "", E(n), '<span class="ug">underground</span>' if u else "",
                                                          ('<em>%s</em>' % E(t)) if t else "") for n, t, k, u in STOPS)
    faq = "".join('<details class="faq"><summary>%s</summary><p>%s</p></details>' % (E(q), E(a)) for q, a in METRO_FAQ)
    bc, bld = crumbs([("Home", "/"), ("Guides", "/guides/"), ("Metro guide", None)])
    body = """<div class="wrap narrow">%s
<p class="kicker">Getting around</p>
<h1>Ho Chi Minh City metro guide for visitors</h1>
<p class="lead">Metro Line 1 is the fastest way to cross the eastern half of the city: air-conditioned, cheap and easy to use with a contactless bank card. Here is everything a visitor needs, checked against official sources.</p>
<div class="metro"><div class="line"><h2>Line 1 · Ben Thanh – Suoi Tien</h2><p class="sub">14 stations, about 20 km, roughly 30 minutes end to end. Orange dots are the stops most visitors use.</p><ol class="stops">%s</ol></div>
<div class="facts">
<div class="fact"><h3>Hours</h3><ul><li><strong>Mon–Fri:</strong> 5:00 am – 10:00 pm</li><li><strong>Weekends and holidays:</strong> until 11:00 pm</li><li>Every 6–8 min at rush hour, 10–12 min otherwise</li></ul></div>
<div class="fact"><h3>Fares</h3><ul><li><strong>Single trip:</strong> 7,000–20,000 dong cash, 1,000 less by card or app</li><li><strong>1-day pass:</strong> 40,000 dong</li><li><strong>3-day pass:</strong> 90,000 dong</li></ul></div>
<div class="fact"><h3>How to pay</h3><ul><li><strong>Tap your bank card or phone</strong> at the gate (Visa, Mastercard, JCB, Amex, UnionPay, Apple Pay, Samsung Pay). Use the same card to tap out.</li><li><strong>Ticket machines</strong> take cash (1,000–200,000 dong notes) and issue a card with a refundable deposit.</li><li><strong>HCMC Metro app:</strong> buy a ticket and scan the QR code.</li></ul></div>
<div class="fact"><h3>Good to know</h3><ul><li>No eating, drinking or smoking in stations or on trains; no pets.</li><li>Large or bulky luggage may be refused. A carry-on is fine.</li><li>Line 1 does not go to the airport or Cholon yet. Line 2 (Ben Thanh – Tham Luong) started construction in January 2026.</li></ul></div>
</div></div>
<h2 class="h2s">Questions visitors ask</h2>%s
<p class="small">Last checked: %s. Sources: <a href="https://www.sggp.org.vn/tphcm-ban-hanh-gia-ve-metro-so-1-ben-thanh-suoi-tien-post769364.html" target="_blank" rel="noopener">fares (SGGP)</a> · <a href="https://news.tuoitre.vn/ho-chi-minh-city-metro-line-adds-more-trips-extends-operating-hours-on-weekends-103250817102502158.htm" target="_blank" rel="noopener">hours (Tuoi Tre News)</a> · <a href="https://www.visa.com.vn/en_VN/about-visa/newsroom/press-releases/visa-offers-seamless-tap-to-ride-experiences-for-visa-cardholders-on-ho-chi-minh-city-metro-line-1.html" target="_blank" rel="noopener">tap to ride (Visa)</a>. Times and prices can change; check the signs at the station.</p>
</div>""" % (bc, stops, faq, MONTH)
    faqld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in METRO_FAQ]}
    return page("/guides/hcmc-metro/", "Ho Chi Minh City Metro Guide: Stations, Fares, Hours (2026) | HCMC Insider",
                "How to ride Ho Chi Minh City Metro Line 1 as a visitor: all 14 stations and nearby sights, fares and day passes, opening hours, and paying with a foreign Visa or Mastercard.",
                body, [bld, faqld])


# ---------------------------------------------------------------- build
def main():
    d = load()
    tp = os.path.join(ROOT, "tips.json")
    if os.path.exists(tp):
        TIPS.update({k: v for k, v in json.load(open(tp, encoding="utf-8")).items() if not k.startswith("_")})
    rules = dish_rules()
    places, videos = d["places"], d["videos"]
    vids = {}
    for v in videos:
        vids.setdefault(v.get("placeId"), []).append(v)
    for k in vids:
        vids[k].sort(key=lambda v: -(int(v.get("views") or 0)))

    used = set()
    for p in places:
        base = slugify(p.get("nameEn") or p["name"])
        s, i = base, 2
        while s in used:
            s, i = "%s-%d" % (base, i), i + 1
        used.add(s)
        p["slug"] = s
        p["_name"] = p.get("nameEn") or p["name"]
        p["_dish"] = next((lab for rx, lab in rules if rx.search(p["name"])), CATS.get(p["cat"], "Other"))
        p["_area"] = area_of(p)
        p["_vids"] = vids.get(p["id"], [])
        p["_views"] = sum(int(v.get("views") or 0) for v in p["_vids"])
        yid = next((yt_id(v["url"]) for v in p["_vids"] if yt_id(v["url"])), "")
        p["_yt"] = yid
        p["_thumb"] = "https://i.ytimg.com/vi/%s/mqdefault.jpg" % yid if yid else ""
    places_sorted = sorted(places, key=lambda p: -p["_views"])

    # guides membership
    guides_out = []
    for g in GUIDES:
        g["items"] = [p for p in places_sorted if g["pick"](p, p["_dish"])]
    for p in places:
        p["_guides"] = [g for g in GUIDES if p in g["items"]]

    # clean old output
    for sub in ("places", "guides"):
        shutil.rmtree(os.path.join(ROOT, sub), ignore_errors=True)

    def write(rel, text):
        path = os.path.join(ROOT, rel.strip("/"), "index.html") if rel.endswith("/") else os.path.join(ROOT, rel.strip("/"))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    urls = ["/", "/guides/", "/guides/hcmc-metro/"]

    # ---- place pages
    for p in places:
        name, dish, area = p["_name"], p["_dish"], p["_area"]
        g0 = p["_guides"][0] if p["_guides"] else None
        bc_items = [("Home", "/")] + ([(g0["nav"], "/guides/%s/" % g0["slug"])] if g0 else []) + [(name, None)]
        bc, bld = crumbs(bc_items)
        vl = ""
        for v in p["_vids"]:
            tr = v.get("titleEn") and v["titleEn"] != v.get("title")
            meta = " · ".join(x for x in [platform(v["url"]), v.get("creator", ""),
                                          (compact(v["views"]) + " views") if int(v.get("views") or 0) else "",
                                          "in Vietnamese" if tr else ""] if x)
            vl += ('<a class="vid" href="%s" target="_blank" rel="noopener"><strong>%s</strong>%s<span>%s</span></a>' % (
                E(v["url"]), E(v.get("title") or "Watch on " + platform(v["url"])),
                ('<em>%s</em>' % E(v["titleEn"])) if tr else "", E(meta)))
        hero = ""
        if p["_yt"]:
            first = next(v for v in p["_vids"] if yt_id(v["url"]) == p["_yt"])
            hero = ('<a class="hero-thumb" href="%s" target="_blank" rel="noopener" aria-label="Watch a video about %s">'
                    '<img src="https://i.ytimg.com/vi/%s/hqdefault.jpg" alt="" width="480" height="360" onerror="this.remove()"><span class="play"></span></a>') % (
                E(first["url"]), E(name), p["_yt"])
        else:
            hero = '<div class="hero-thumb ph" style="--cc:var(--c-%s)"><span>%s</span></div>' % (p["cat"] if p["cat"] in CATS else "other", E(dish))
        addr = (TIPS.get(p["id"]) or {}).get("addr") or p.get("addr") or ""
        related = [q for q in places_sorted if q is not p and (q["_dish"] == dish)][:3]
        related += [q for q in places_sorted if q is not p and q not in related and q["_area"] == area][:6 - len(related)]
        guides_links = "".join('<a class="chip" href="/guides/%s/">%s</a>' % (g["slug"], E(g["nav"])) for g in p["_guides"])
        body = """<div class="wrap narrow">%s
<div class="place">
<div class="phead">
<p class="kicker">%s · %s</p>
<h1>%s</h1>
<p class="vnname" lang="vi">%s</p>
%s
<div class="acts"><a class="cta" href="%s" target="_blank" rel="noopener">Directions</a>%s</div>
</div>
%s
</div>
%s<section class="box driver"><h2>Show this to your driver</h2><p class="big" lang="vi">%s</p>%s<p class="small">Ride-hailing apps work best: paste the name or address, or tap Directions above.</p></section>
%s
%s
%s
</div>""" % (
            bc, E(dish), E(area), E(name), E(p["name"]),
            ('<p class="lead">%s</p>' % E(p["noteEn"])) if p.get("noteEn") else "",
            E(dir_link(p)),
            ('<a class="btn" href="%s" target="_blank" rel="noopener">Watch video</a>' % E(p["_vids"][0]["url"])) if p["_vids"] else "",
            hero, tips_html(p), E(p["name"]),
            ('<p class="addr" lang="vi">%s</p><p class="small">%s</p>' % (E(addr), E(addr_en(addr)))) if addr else "",
            ('<section><h2 class="h2s">Creator videos</h2><div class="vlist">%s</div><p class="small">Videos belong to their creators and open on the original platform.</p></section>' % vl) if vl else "",
            ('<section><h2 class="h2s">In these guides</h2><div class="chips">%s</div></section>' % guides_links) if guides_links else "",
            ('<section><h2 class="h2s">More like this</h2>%s</section>' % guide_cards(related)) if related else "")
        ld = {"@context": "https://schema.org", "@type": SCHEMA_TYPE.get(p["cat"], "Place"), "name": name,
              "alternateName": p["name"], "url": SITE + "/places/%s/" % p["slug"]}
        if p.get("noteEn"):
            ld["description"] = p["noteEn"]
        if addr:
            ld["address"] = {"@type": "PostalAddress", "streetAddress": addr, "addressLocality": "Ho Chi Minh City", "addressCountry": "VN"}
        if has_xy(p):
            ld["geo"] = {"@type": "GeoCoordinates", "latitude": float(p["lat"]), "longitude": float(p["lng"])}
        ld["image"] = SITE + "/og-image.png"
        if p["cat"] == "food" and dish not in CATS.values():
            ld["servesCuisine"] = dish
        where = area if area != "Ho Chi Minh City" else "Saigon"
        title = "%s – %s in %s | HCMC Insider" % (name, dish if dish not in CATS.values() else "local spot", where)
        desc = (p.get("noteEn") or "%s in %s." % (dish, area)).rstrip(".") + ". Vietnamese name, address, directions and local creator videos."
        write("/places/%s/" % p["slug"], page("/places/%s/" % p["slug"], title, desc[:300], body, [ld, bld],
                                              ))
        urls.append("/places/%s/" % p["slug"])

    # ---- guide pages
    for g in GUIDES:
        items = g["items"]
        bc, bld = crumbs([("Home", "/"), ("Guides", "/guides/"), (g["nav"], None)])
        others = "".join('<a class="chip" href="/guides/%s/">%s</a>' % (o["slug"], E(o["nav"])) for o in GUIDES if o is not g)
        body = """<div class="wrap">%s
<div class="narrow0">
<p class="kicker">Local guide · %d places</p>
<h1>%s</h1>
%s
<div class="box tips"><h2>Before you go</h2><ul>%s</ul></div>
</div>
<h2 class="h2s">The places</h2>
%s
<section><h2 class="h2s">More guides</h2><div class="chips">%s<a class="chip" href="/guides/hcmc-metro/">Metro guide</a></div></section>
</div>""" % (bc, len(items), E(g["h1"]), "".join('<p class="lead">%s</p>' % E(x) for x in g["intro"]),
              "".join("<li>%s</li>" % E(t) for t in g["tips"]), guide_cards(items), others)
        il = {"@context": "https://schema.org", "@type": "ItemList", "name": g["h1"], "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "url": SITE + "/places/%s/" % p["slug"], "name": p["_name"]} for i, p in enumerate(items)]}
        write("/guides/%s/" % g["slug"], page("/guides/%s/" % g["slug"], g["title"] + " | HCMC Insider", g["desc"], body, [bld, il]))
        urls.append("/guides/%s/" % g["slug"])
        guides_out.append({"slug": g["slug"], "title": g["nav"], "count": len(items)})

    write("/guides/hcmc-metro/", metro_page())

    # ---- guides index
    bc, bld = crumbs([("Home", "/"), ("Guides", None)])
    gl = "".join('<a class="gcard" href="/guides/%s/"><strong>%s</strong><span>%s</span><em>%d places</em></a>' % (
        g["slug"], E(g["nav"]), E(g["desc"]), len(g["items"])) for g in GUIDES)
    gl += '<a class="gcard" href="/guides/hcmc-metro/"><strong>Metro guide</strong><span>Stations, fares, hours and paying with a foreign card on Metro Line 1.</span><em>Getting around</em></a>'
    body = '<div class="wrap">%s<p class="kicker">Local guides</p><h1>Ho Chi Minh City guides by locals</h1><p class="lead">Food, markets and getting around in Ho Chi Minh City (Saigon), built from places local creators keep coming back to.</p><div class="ggrid">%s</div></div>' % (bc, gl)
    write("/guides/", page("/guides/", "Ho Chi Minh City (Saigon) Travel Guides by Locals | HCMC Insider",
                           "Local guides to Ho Chi Minh City: Cholon food, noodle soups, dim sum, vegetarian food, sweet soups, markets and the metro.", body, [bld]))
    guides_out.append({"slug": "hcmc-metro", "title": "Metro guide", "count": 0})

    # ---- data.json: keep only real fields + slug + guides
    for p in places:
        for k in [k for k in p if k.startswith("_")]:
            del p[k]
    d["guides"] = guides_out
    with open(os.path.join(ROOT, "data.json"), "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)

    # ---- crawlable directory inside #root of index.html (replaced by the app on load)
    idx_path = os.path.join(ROOT, "index.html")
    src = open(idx_path, encoding="utf-8").read()
    dir_html = ('<div id="root"><!--DIR--><nav class="wrap" aria-label="Directory"><h1>HCMC Insider: Ho Chi Minh City food, sights and local tips</h1>'
                '<h2>Guides</h2><ul>%s<li><a href="/guides/hcmc-metro/">Metro guide</a></li></ul><h2>Places</h2><ul>%s</ul></nav><!--/DIR--></div>') % (
        "".join('<li><a href="/guides/%s/">%s</a></li>' % (g["slug"], E(g["nav"])) for g in GUIDES),
        "".join('<li><a href="/places/%s/">%s</a></li>' % (p["slug"], E(p.get("nameEn") or p["name"])) for p in places_sorted))
    src, n = re.subn(r'<div id="root">.*?</div>(?=\n<div hidden>)', lambda m: dir_html, src, count=1, flags=re.S)
    assert n == 1, "root div not found"
    open(idx_path, "w", encoding="utf-8").write(src)

    # ---- sitemap
    urls.append("/privacy.html")
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % "".join(
        "  <url><loc>%s%s</loc><lastmod>%s</lastmod></url>\n" % (SITE, u, TODAY) for u in urls)
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(sm)
    print("built %d place pages, %d guides, %d urls in sitemap" % (len(places), len(GUIDES) + 1, len(urls)))


if __name__ == "__main__":
    main()
