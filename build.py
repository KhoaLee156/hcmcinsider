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


# Update these dates when you edit the hand-written pages.
STATIC_LASTMOD = {"/guides/hcmc-metro/": "2026-10-22", "/guides/getting-around-hcmc/": "2026-10-23", "/privacy": "2026-10-23"}
THIN = 4  # pages scoring below this get noindex until they have more data
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
LABELS = {}
SIGHTS_OUT = []


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


# Short, factual explainers per dish label (shown on place pages as "What is …?").
DISH_INFO = {
    "Herbal duck noodles": ("mì vịt tiềm", "Mì vịt tiềm is a Chinese-Vietnamese noodle soup: a duck leg slow-braised in a dark broth with Chinese medicinal herbs, served with springy egg noodles and greens. It is a Cholon classic, rich but not spicy."),
    "Goat noodle soup": ("hủ tiếu dê", "Hủ tiếu dê is a Chinese-Vietnamese noodle soup with tender goat meat in a rich broth. It is a warming dish that Cholon families have cooked for generations."),
    "Satay venison noodles": ("hủ tiếu sa tế nai", "Hủ tiếu sa tế nai is a Teochew-style noodle soup with venison in a red satay broth of chilli, peanut and aromatics. Expect gentle heat and a deep, nutty flavour."),
    "Vegetarian": ("chay", "Chay means vegetarian, usually Buddhist-style: no meat, no fish sauce, and often no garlic or onion. Chay shops make noodle soups, rice plates and mock meats from tofu, mushrooms and wheat gluten. They are busiest on the 1st and 15th days of the lunar month."),
    "Egg noodles & wontons": ("mì and hoành thánh", "Mì are thin, springy wheat-and-egg noodles brought to Saigon by Chinese families, usually served with wontons (hoành thánh), char siu pork or greens. Order them in soup, or khô (dry) with the broth on the side."),
    "Hu tieu noodle soup": ("hủ tiếu", "Hủ tiếu is southern Vietnam's favourite noodle soup: rice noodles in a clear, slightly sweet pork-bone broth with pork, shrimp or offal. Nam Vang (Phnom Penh) style is the best known; hủ tiếu gõ is the cheap street-cart version, named after the knocking sound vendors make."),
    "Wonton dumplings": ("sủi cảo", "Sủi cảo are plump Chinese dumplings, usually filled with shrimp and pork and served in a clear broth, sometimes with egg noodles."),
    "Dim sum": ("dim sum (điểm tâm)", "Dim sum are small Cantonese dishes served in steamers or on plates: há cảo (har gow, shrimp dumplings), xíu mại (siu mai), buns and rice rolls. In Saigon it is mostly a morning and weekend meal, best shared."),
    "Sweet soup desserts": ("chè", "Chè is the Vietnamese family of sweet soups and puddings: beans, jellies, lotus seeds, taro and fruit, served hot or over ice and often with coconut milk. Chinese-style shops in Cholon add desserts like black sesame soup and herbal jelly."),
    "Chicken rice": ("cơm gà", "Cơm gà is chicken rice. Some shops serve Hainanese-style poached chicken over rice cooked in chicken stock; others make cơm gà xối mỡ, chicken fried until the skin crackles, with golden fried rice."),
    "Braised pork rice": ("cơm with braised pork", "A Chinese-Vietnamese comfort plate: rice with slow-braised pork in a savoury, slightly sweet sauce, often with pickles and soup on the side."),
    "Chinese-Vietnamese kitchen": ("Hoa cooking", "Cholon's family restaurants cook Teochew and Cantonese dishes for sharing: wok-fried noodles and rice, roast meats, seafood and soups. Go with a group and order several dishes."),
    "Crab noodle soup": ("bánh canh cua", "Bánh canh cua is a thick, slightly chewy noodle soup in a rich, thickened crab broth, topped with crab meat and often quail eggs or pork."),
    "Thick noodle soup": ("bánh canh", "Bánh canh is a noodle soup with thick, chewy noodles made from tapioca or rice flour, usually in a pork-bone broth."),
    "Spicy Hue beef noodles": ("bún bò Huế", "Bún bò Huế comes from the old imperial city of Hue: round rice noodles in a beef broth scented with lemongrass and chilli, with beef shank and pork. It is spicier and punchier than pho."),
    "Crab & tomato noodles": ("bún riêu", "Bún riêu is rice vermicelli in a tangy tomato broth with soft crab cakes, tofu and herbs. A popular breakfast and lunch dish."),
    "Pho": ("phở", "Phở is the rice noodle soup Vietnam is famous for: beef or chicken broth simmered with star anise, cinnamon and charred onion, topped with sliced meat and fresh herbs."),
    "Snails & shellfish": ("ốc", "Saigon's quán ốc are casual evening spots serving snails, clams and shellfish cooked with garlic, tamarind, chilli or coconut. Order several plates to share."),
    "Crab soup": ("súp cua", "Súp cua is a thick crab soup with shredded crab meat, egg and sometimes fish maw. Locals eat it as an afternoon or evening snack."),
    "Stuffed bitter melon": ("khổ qua nhồi", "Bitter melon stuffed with seasoned fish or pork paste is a Chinese-Vietnamese favourite. The bitterness softens as it cooks; many stalls serve it in a light broth with stuffed chillies."),
    "Goat dishes": ("món dê", "Goat restaurants serve goat hotpot, grilled and stir-fried goat and goat curry, often cooked at the table for a group."),
    "Mooncakes": ("bánh trung thu", "Mooncakes are rich baked or soft 'snow skin' cakes made for the Mid-Autumn Festival, with fillings like lotus seed, mung bean and salted egg yolk. Cholon's bakeries are busiest in the weeks before the festival."),
    "Lantern street": ("phố lồng đèn", "Before the Mid-Autumn Festival, the streets around Lương Nhữ Học in Cholon fill with handmade and modern lanterns. It is one of Saigon's most colourful evening walks."),
    "Herbal medicine street": ("phố thuốc Bắc", "Hải Thượng Lãn Ông street is lined with traditional Chinese medicine shops selling dried roots, herbs and tonics. Come for the smells, the old shopfronts and a glimpse of Cholon's trade history."),
    "Local market": ("chợ", "Vietnamese markets are busiest and most interesting early in the morning, when locals shop for fresh food and stop for breakfast at the stalls."),
    "Café": ("cà phê", "Vietnamese coffee is strong and usually drip-brewed in a phin filter. Try cà phê sữa đá (iced with condensed milk); old Cholon cafés still make cà phê vợt, filtered through a cloth sock."),
}


def nice_date(iso):
    return datetime.date.fromisoformat(iso).strftime("%-d %B %Y")


def dish_html(dish):
    info = DISH_INFO.get(dish)
    if not info:
        return ""
    term, text = info
    return '<section class="box"><h2>What is %s?</h2><p>%s</p></section>' % (E(term), E(text))


def richness(p):
    """Rough content-depth score used to keep very thin pages out of the index until they have more data."""
    t = TIPS.get(p["id"]) or {}
    addr = t.get("addr") or p.get("addr") or ""
    street = bool(re.match(r"\s*(\d|Đối diện|Opposite|Góc|Chợ )", addr)) and addr.strip() != "Chợ Lớn"
    return (len(p.get("noteEn", "")) // 40 + 2 * len([k for k in ("hours", "price", "order", "note") if t.get(k)])
            + (2 if street else 0) + min(len(p["_vids"]), 3))

# ---------------------------------------------------------------- shared layout
LOGO = None  # filled from favicon.svg


def logo_svg(size=34):
    svg = open(os.path.join(ROOT, "favicon.svg"), encoding="utf-8").read().strip()
    return svg.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
                       '<svg width="%d" height="%d" viewBox="0 0 100 100" aria-hidden="true">' % (size, size), 1)


AFF = [("Get a Vietnam eSIM", "https://airalo.tpo.lu/KP1dEp49"),
       ("Airport pickup", "https://kiwitaxi.tpo.lu/cz2amFE5"),
       ("Food tours & day trips", "https://klook.tpo.lu/FZ8vNhYU")]


def page(path, title, desc, body, jsonld=(), og_image=None, robots=None):
    url = SITE + path
    ld = "".join('<script type="application/ld+json">%s</script>\n' % json.dumps(x, ensure_ascii=False) for x in jsonld)
    nav = ('<header class="nav"><div class="wrap"><a class="logo" href="/" aria-label="HCMC Insider home">%s<span>HCMC <b>Insider</b></span></a>'
           '<nav class="links" aria-label="Main"><a href="/#eat">Eat</a><a href="/see-and-do/">See &amp; Do</a><a href="/guides/">Guides</a>'
           '<a href="/guides/getting-around-hcmc/">Getting around</a><a href="/#plan">Plan</a></nav></div></header>') % logo_svg()
    plan = ('<aside class="plan"><div class="wrap"><p class="kicker">Plan your trip</p><div class="planrow">%s</div>'
            '<p class="small">Affiliate links: if you book, we may earn a small commission at no extra cost to you.</p></div></aside>'
            % "".join('<a href="%s" target="_blank" rel="sponsored noopener">%s ↗</a>' % (u, E(t)) for t, u in AFF))
    foot = ('<footer><div class="wrap"><a class="logo" href="/" aria-label="HCMC Insider home">%s<span>HCMC <b>Insider</b></span></a>'
            '<p>An independent guide to Ho Chi Minh City by locals. Videos belong to their creators; we only link to the original platforms. '
            'Places are suggestions, not endorsements: check opening hours before you go. '
            '<a href="mailto:hello@hcmcinsider.com">hello@hcmcinsider.com</a> · '
            '<a href="https://x.com/HCMCInsider" target="_blank" rel="noopener me">X</a> · <a href="https://www.facebook.com/share/1JL6tXwJwd/" target="_blank" rel="noopener me">Facebook</a> · <a href="/privacy">Privacy</a> · '
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
{robots}<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/be-vietnam-pro-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/be-vietnam-pro-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
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
           nav=nav, body=body, plan=plan, foot=foot,
           robots=('<meta name="robots" content="%s">\n' % robots) if robots else "")


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
         title="Cholon Food Guide: Where to Eat in Saigon Chinatown (District 5)",
         h1="Cholon food guide: where to eat in Saigon Chinatown (Chợ Lớn)",
         desc="Where locals eat in Cholon (Chợ Lớn), Saigon's Chinatown in Districts 5, 6 and 11: noodle carts, dim sum, herbal duck noodles, sweet soups and Chinese-Vietnamese kitchens, with Vietnamese names, addresses and directions.",
         pick=lambda p, d: p["cat"] == "food" and in_cholon(p),
         intro=["Cholon is Ho Chi Minh City's historic Chinatown, spread across the old Districts 5, 6 and 11. Families of Cantonese, Teochew, Hokkien, Hakka and Hainanese origin have cooked here for generations, and it is one of the best neighbourhoods in Vietnam to eat.",
                "Expect tiny noodle shops that have done one dish for decades, dim sum halls that are busiest in the morning, herbal duck noodles, sweet-soup shops and family-run Chinese-Vietnamese kitchens. Most places are cheap, cash-friendly and have little English, so every spot below shows its Vietnamese name for you to show a driver or the cook."],
         tips=["Go hungry and graze: share one dish at each place and keep walking.",
               "Mornings are best for dim sum and noodles; sweet-soup shops come alive in the evening.",
               "Carry small notes (10,000–100,000 dong). Many stalls take cash only.",
               "Ride-hailing apps are the easiest way to get there; Metro Line 1 does not reach Cholon yet."]),
    dict(slug="noodle-soups-ho-chi-minh-city", nav="Noodle soups",
         title="Best Noodle Soups in Saigon: Hu Tieu, Duck Noodles, Pho & More",
         h1="Where to eat noodle soup in Saigon: hu tieu, duck noodles, pho and more",
         desc="Hu tieu, wonton egg noodles, herbal duck noodles, pho, spicy Hue beef noodles and more: local noodle shops in Ho Chi Minh City (Saigon) with addresses, directions and creator videos.",
         pick=lambda p, d: d in NOODLES,
         intro=["Noodle soup is breakfast, lunch and late-night food in Saigon. Pho gets the fame, but locals are just as loyal to hu tieu (a clear pork-and-seafood broth with rice noodles, often in Phnom Penh style), Chinese egg noodles with wontons, herbal duck noodles and spicy Hue-style beef noodles.",
                "These are shops local food creators keep coming back to, from an 8,000-dong cart to old family shops in Cholon. Prices are low, portions are made to order, and most places add fresh herbs, lime and chilli at the table."],
         tips=["Order 'kho' (dry) to get the noodles with sauce and the broth on the side.",
               "Fresh herbs and chilli on the table are free; taste the broth before you add sauces.",
               "Popular carts sell out early, so go before noon for morning-only places."]),
    dict(slug="dim-sum-and-wontons-saigon", nav="Dim sum & wontons",
         title="Dim Sum in Saigon: Where Locals Go in Cholon (District 5)",
         h1="Dim sum in Saigon: dumplings, wontons and egg noodles in Cholon",
         desc="Where to eat dim sum, har gow, wonton dumplings and Chinese egg noodles in Ho Chi Minh City's Cholon, with Vietnamese names, addresses and directions.",
         pick=lambda p, d: d in ("Dim sum", "Wonton dumplings", "Egg noodles & wontons"),
         intro=["Cantonese and Teochew families brought dim sum, wontons and springy egg noodles to Cholon, and the old shops still make them by hand. In Vietnamese you will see há cảo (har gow), xíu mại (siu mai), sủi cảo (wonton dumplings) and mì (egg noodles).",
                "Dim sum here is a morning meal: go early for the freshest steamers. Wonton and egg-noodle shops open from breakfast until they sell out, and some carts only appear in the evening."],
         tips=["Point at what other tables are eating; steamers are usually priced per basket.",
               "Ask for 'mì khô' for dry egg noodles with soup on the side.",
               "Cash is the norm at older shops."]),
    dict(slug="chinese-vietnamese-restaurants-cholon", nav="Chinese-Vietnamese kitchens",
         title="Chinese Restaurants in Saigon Chinatown & Cholon Chicken Rice",
         h1="Chinese restaurants and chicken rice in Saigon Chinatown",
         desc="Old family restaurants in Cholon serving Teochew and Cantonese-style stir-fries, chicken rice and braised pork rice, with Vietnamese names, addresses and directions.",
         pick=lambda p, d: d in ("Chinese-Vietnamese kitchen", "Chicken rice", "Braised pork rice"),
         intro=["Beyond street stalls, Cholon is full of family restaurants cooking Teochew and Cantonese dishes for big tables: stir-fries, soups, roast meats and rice plates. Many have been run by the same family for decades.",
                "Chicken rice (cơm gà) is a local favourite: poached or crispy-fried chicken with rice cooked in chicken fat and ginger sauce. Go with a group to order several dishes and share."],
         tips=["Big menus are often only in Vietnamese and Chinese; a translation app's camera mode helps.",
               "Lunch and early dinner are the busiest times.",
               "Ask the price of seafood dishes before ordering; they are often priced by weight."]),
    dict(slug="vegetarian-food-ho-chi-minh-city", nav="Vegetarian food",
         title="Vegetarian Food in Ho Chi Minh City: Local Chay Shops in Cholon",
         h1="Vegetarian food in Ho Chi Minh City: where locals eat chay",
         desc="Local vegetarian (chay) noodle shops and kitchens in Ho Chi Minh City and Cholon, with Vietnamese names, addresses, directions and creator videos.",
         pick=lambda p, d: d == "Vegetarian",
         intro=["Eating vegetarian in Saigon is easy once you know the word chay. Buddhist vegetarian shops are everywhere in Cholon, serving noodle soups, rice plates and mock-meat dishes made from tofu, mushrooms and wheat gluten.",
                "Many Vietnamese eat vegetarian on the 1st and 15th days of the lunar month, so chay shops are extra busy, and extra good, on those days."],
         tips=["Look for 'chay' on signs and menus; 'mặn' means the dish has meat.",
               "Fish sauce is common in regular Vietnamese food; chay shops use soy sauce instead.",
               "Some charity kitchens serve free or pay-what-you-can meals: be respectful and leave room for those who need it."]),
    dict(slug="che-sweet-soup-saigon", nav="Sweet soups (chè)",
         title="Chè in Saigon: Where to Try Vietnamese Sweet Soup Desserts",
         h1="Chè: Vietnamese sweet soups in Saigon",
         desc="Where to eat chè, Vietnamese sweet soups and desserts, in Ho Chi Minh City's Cholon: old dessert shops with Vietnamese names, addresses and directions.",
         pick=lambda p, d: d == "Sweet soup desserts",
         intro=["Chè is the Vietnamese word for sweet soups and puddings: beans, jellies, lotus seeds, taro and fruit, served hot or over ice, often with coconut milk. In Cholon you will also find Chinese-style desserts such as black sesame soup and herbal jelly.",
                "Dessert shops are an evening ritual. Locals stop by after dinner, so many places open in the afternoon and stay busy late."],
         tips=["Ask for 'chè nóng' (hot) or 'chè đá' (with ice).",
               "Mixed bowls let you try several toppings at once.",
               "Small shops are cash-only; a bowl usually costs less than a coffee in the city centre."]),
    dict(slug="cholon-markets-and-old-streets", nav="Markets & old streets",
         title="Cholon Markets: Binh Tay, Lantern Street & Saigon Chinatown Streets",
         h1="Markets and old streets of Cholon",
         desc="Binh Tay Market, Hoa Binh and Phung Hung markets, Lantern Street and the herbal medicine street: what to see in Cholon, Ho Chi Minh City, with directions.",
         pick=lambda p, d: p["cat"] in ("shop", "culture"),
         intro=["Cholon's markets and trade streets are where the neighbourhood's daily life happens. Binh Tay Market is the grand old wholesale market; smaller wet markets like Hoa Binh and Phung Hung are where locals buy breakfast, snacks and fresh food.",
                "Some streets still specialise in one trade: lanterns on Luong Nhu Hoc (especially before the Mid-Autumn Festival) and traditional Chinese medicine on Hai Thuong Lan Ong, where the air smells of dried herbs."],
         tips=["Markets are busiest and most interesting in the early morning.",
               "Keep your phone and bag on the side away from passing motorbikes.",
               "Ask before photographing vendors, and buy a snack if you linger at a stall."]),
]


def short_answer(items):
    top = items[:3]
    if len(top) < 2:
        return ""
    names = ['<a href="/places/%s/">%s</a> (%s)' % (p["slug"], E(p["_name"]), E(p["_dish"].lower() if p["_dish"] not in CATS.values() else p["_area"])) for p in top]
    lst = ", ".join(names[:-1]) + " and " + names[-1]
    return ('<div class="box answer"><p><strong>Short answer:</strong> if you only have time for a few, start with the spots local creators\' videos '
            'have been watched most: %s. Every place below shows its Vietnamese name, address and directions.</p></div>' % lst)


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


BUS_FAQ = [
    ("Are buses in Ho Chi Minh City free?", "Yes, for now. From 1 July to 31 December 2026 the city has waived fares on 134 city bus routes, including airport routes 109 and 152. Intercity routes and open-top sightseeing buses are not included."),
    ("Do I need to tap a card on a free bus?", "Since 1 October 2026 every passenger has to check in when boarding, to count the trip. Nothing is charged. You can tap a Visa or Mastercard contactless card, Apple Pay, Google Pay or Samsung Pay at the reader by the door; Vietnamese residents can also use their ID card or the VNeID app. If it doesn't work, the driver or attendant will help."),
    ("How do I get from Tan Son Nhat airport to the city centre by bus?", "Take bus 152 (via Ben Thanh Market) or bus 109 (to Saigon bus station near Ben Thanh). Both are on the free-fare list until the end of 2026. Look for the bus stop signs outside arrivals and ask airport staff if you are unsure which terminal the bus stops at."),
    ("Can I get to the Cu Chi Tunnels by public bus?", "Yes, but it is slow. Take bus 13 from Saigon bus station to Cu Chi bus station, then bus 79 to Ben Duoc. Allow two hours or more each way. Most visitors book a tour or transfer instead."),
    ("How much does the Saigon river bus cost?", "About 15,000 dong per trip on the Bach Dang – Linh Dong route. Boats start at 8:30 am from Bach Dang pier in District 1."),
]


def transport_page():
    faq = "".join('<details class="faq"><summary>%s</summary><p>%s</p></details>' % (E(q), E(a)) for q, a in BUS_FAQ)
    bc, bld = crumbs([("Home", "/"), ("Guides", "/guides/"), ("Getting around", None)])
    body = """<div class="wrap narrow">%s
<p class="kicker">Getting around</p>
<h1>Getting around Ho Chi Minh City: buses, airport and river bus</h1>
<p class="lead">City buses are free until the end of 2026, the airport has its own cheap bus lines, and the river bus is one of the nicest rides in Saigon. Here is what visitors need to know, checked against official announcements and Vietnamese news sources.</p>
<div class="box driver"><h2>Buses are free until 31 December 2026</h2><p>The city has waived fares on 134 bus routes. Since 1 October 2026, tap a contactless bank card or phone (Visa, Mastercard, Apple Pay, Google Pay, Samsung Pay) on the reader when you board. It only records the trip; nothing is charged.</p></div>
<h2 class="h2s">From the airport (Tan Son Nhat, SGN)</h2>
<div class="facts two">
<div class="fact"><h3>Bus 152</h3><ul><li>Airport → Ben Thanh Market → Trung Son</li><li>The easiest bus to the city centre</li><li>On the city's free-fare list until 31 Dec 2026</li></ul></div>
<div class="fact"><h3>Bus 109</h3><ul><li>Airport → Saigon bus station (near Ben Thanh and 23/9 Park)</li><li>On the city's free-fare list until 31 Dec 2026</li></ul></div>
</div>
<p class="small">Bus stops are outside the arrivals halls; ask airport staff which terminal your bus serves. Late at night, use a ride-hailing app or a <a href="https://kiwitaxi.tpo.lu/cz2amFE5" target="_blank" rel="sponsored noopener">pre-booked transfer ↗</a>.</p>
<h2 class="h2s">City buses visitors use</h2>
<div class="facts two">
<div class="fact"><h3>Bus 1 · to Cholon</h3><ul><li>Ba Son metro station → city centre → Cholon bus station (Chinatown)</li><li>Handy for the food spots on this site</li></ul></div>
<div class="fact"><h3>Bus 150 · Cholon to the east</h3><ul><li>Cholon bus station → New Mien Dong bus station</li><li>Crosses the city from Chinatown to the big new eastern bus station</li></ul></div>
<div class="fact"><h3>Bus 13 + 79 · Cu Chi Tunnels</h3><ul><li>Bus 13: Saigon bus station → Cu Chi bus station</li><li>Bus 79: Cu Chi bus station → Ben Duoc</li><li>Slow: allow 2+ hours each way. <a href="https://klook.tpo.lu/FZ8vNhYU" target="_blank" rel="sponsored noopener">Tours ↗</a> are easier.</li></ul></div>
<div class="fact"><h3>Bus 94 · Cholon to Cu Chi</h3><ul><li>Cholon bus station → Cu Chi bus station</li><li>An alternative start if you stay in Chinatown</li></ul></div>
</div>
<p class="small">For routes and live arrival times, use the BusMap app or Google Maps. Wave clearly at the bus as it approaches; buses may not stop if nobody signals.</p>
<h2 class="h2s">Saigon river bus</h2>
<div class="facts two">
<div class="fact"><h3>Route</h3><ul><li>Bach Dang pier (District 1) → Binh An → Thanh Da → Hiep Binh Chanh → Linh Dong</li><li>Great views of the skyline and the Saigon River</li></ul></div>
<div class="fact"><h3>Times and fares</h3><ul><li>From 8:30 am daily, last departures in the evening</li><li>About 15,000 dong per trip</li><li>Tickets at the pier or online</li></ul></div>
</div>
<h2 class="h2s">Sightseeing bus</h2>
<div class="fact"><ul><li>Open-top double-decker buses leave from 92–96 Nguyen Hue (District 1), roughly every 30 minutes from 9:00 am to 10:30 pm; a loop takes about an hour.</li><li>The route passes the Zoo, the War Remnants Museum, Bui Vien, Ben Thanh Market, Nguyen Hue and the Opera House, with an audio guide.</li><li>This is a paid tourist service and not part of the free-bus programme; check prices at the counter.</li></ul></div>
<h2 class="h2s">Stay safe on the move</h2>
<div class="fact"><ul><li>Phone and bag snatching from passing motorbikes happens. Keep your phone away from the street side and bags zipped and across your body.</li><li>Carry a light rain jacket from May to November; afternoon downpours are common.</li><li>Offer your seat to older people, pregnant women and children.</li></ul></div>
<h2 class="h2s">Questions visitors ask</h2>%s
<p class="small">Last checked: %s. Sources: <a href="https://thuvienphapluat.vn/phap-luat/ho-tro-phap-luat/danh-sach-134-tuyen-xe-buyt-duoc-mien-phi-ve-tai-tphcm-tu-172026-den-het-31122026-chi-tiet-ra-sao-276012.html" target="_blank" rel="noopener">free route list (Thu Vien Phap Luat)</a> · <a href="https://baoxaydung.vn/tphcm-hanh-khach-di-xe-buyt-mien-phi-phai-xac-thuc-luot-su-dung-tu-1-10-192260930141026672.htm" target="_blank" rel="noopener">check-in from 1 Oct (Bao Xay Dung)</a> · <a href="https://thanhnien.vn/tphcm-mien-phi-134-tuyen-xe-buyt-tu-hom-nay-nhung-dieu-hanh-khach-can-biet-185260630230637782.htm" target="_blank" rel="noopener">free buses (Thanh Nien)</a> · <a href="https://vnexpress.net/cam-nang-du-lich-tp-hcm-4608205.html" target="_blank" rel="noopener">river bus and sightseeing bus (VnExpress)</a>. Routes and rules can change; check at the stop.</p>
<p><a class="btn" href="/guides/hcmc-metro/">Metro Line 1 guide →</a></p>
</div>""" % (bc, faq, MONTH)
    faqld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in BUS_FAQ]}
    return page("/guides/getting-around-hcmc/", "Ho Chi Minh City Buses 2026: Airport to District 1, Free City Buses, River Bus | HCMC Insider",
                "How to get around Ho Chi Minh City as a visitor: free city buses until end of 2026 and how to tap in, airport buses 109 and 152, bus to Cholon and Cu Chi, Saigon river bus and sightseeing bus.",
                body, [bld, faqld])


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
<p><a class="btn" href="/guides/getting-around-hcmc/">Buses, airport and river bus →</a></p>
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
        p["_updated"] = max([v.get("added") or "" for v in p["_vids"]] + ["2026-10-17"])
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

    urls = ["/", "/guides/", "/guides/hcmc-metro/", "/guides/getting-around-hcmc/"]
    thin_list, lastmod = [], {}

    sp0 = os.path.join(ROOT, "sights.json")
    SIGHT_SLUGS = {s["slug"] for s in json.load(open(sp0, encoding="utf-8"))["sights"]} if os.path.exists(sp0) else set()
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
        if p["slug"] in SIGHT_SLUGS:
            guides_links = '<a class="chip" href="/see-and-do/%s/">Full visitor guide</a>' % p["slug"] + guides_links
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
%s
</div>""" % (
            bc, E(dish), E(area), E(name), E(p["name"]),
            ('<p class="lead">%s</p>' % E(p["noteEn"])) if p.get("noteEn") else "",
            E(dir_link(p)),
            ('<a class="btn" href="%s" target="_blank" rel="noopener">Watch video</a>' % E(p["_vids"][0]["url"])) if p["_vids"] else "",
            hero, tips_html(p), E(p["name"]),
            ('<p class="addr" lang="vi">%s</p><p class="small">%s</p>' % (E(addr), E(addr_en(addr)))) if addr else "",
            dish_html(dish),
            ('<section><h2 class="h2s">Creator videos</h2><div class="vlist">%s</div><p class="small">Videos belong to their creators and open on the original platform.</p></section>' % vl) if vl else "",
            ('<section><h2 class="h2s">In these guides</h2><div class="chips">%s</div></section>' % guides_links) if guides_links else "",
            ('<section><h2 class="h2s">More like this</h2>%s</section>' % guide_cards(related)) if related else "")
        head, tail = body.rsplit("\n</div>", 1)
        body = head + '\n<p class="small">Last updated: %s. Facts come from local creators\' videos and their descriptions; hours and prices change, so check before you go.</p>\n</div>' % nice_date(p["_updated"]) + tail
        ld = {"@context": "https://schema.org", "@type": SCHEMA_TYPE.get(p["cat"], "Place"), "name": name,
              "alternateName": p["name"], "url": SITE + "/places/%s/" % p["slug"]}
        if p.get("noteEn"):
            ld["description"] = p["noteEn"]
        if addr:
            ld["address"] = {"@type": "PostalAddress", "streetAddress": addr, "addressLocality": "Ho Chi Minh City", "addressCountry": "VN"}
        if has_xy(p):
            ld["geo"] = {"@type": "GeoCoordinates", "latitude": float(p["lat"]), "longitude": float(p["lng"])}
        ld["image"] = (SITE + "/og/%s.jpg" % p["slug"]) if os.path.exists(os.path.join(ROOT, "og", p["slug"] + ".jpg")) else SITE + "/og-image.png"
        if p["cat"] == "food" and dish not in CATS.values():
            ld["servesCuisine"] = dish
        where = area if area != "Ho Chi Minh City" else "Saigon"
        dish_words = set(re.findall(r"[a-z]+", dish.lower())) - {"and", "the"}
        if dish in CATS.values() or dish_words & set(re.findall(r"[a-z]+", name.lower())):
            title = "%s (%s), %s | HCMC Insider" % (name, p["name"], where) if p["name"] != name else "%s, %s | HCMC Insider" % (name, where)
        else:
            title = "%s – %s in %s | HCMC Insider" % (name, dish, where)
        if len(title) > 70:
            title = title.replace(" | HCMC Insider", "")
        desc = (p.get("noteEn") or "%s in %s." % (dish, area)).rstrip(".") + ". Vietnamese name, address, directions and local creator videos."
        thin = richness(p) + (2 if dish in DISH_INFO else 0) < THIN
        write("/places/%s/" % p["slug"], page("/places/%s/" % p["slug"], title, desc[:300], body, [ld, bld],
                                              og_image=(SITE + "/og/%s.jpg" % p["slug"]) if os.path.exists(os.path.join(ROOT, "og", p["slug"] + ".jpg")) else None,
                                              robots="noindex,follow" if thin else None))
        if thin:
            thin_list.append(p["slug"])
        else:
            urls.append("/places/%s/" % p["slug"])
        lastmod["/places/%s/" % p["slug"]] = p["_updated"]

    # ---- share-card data for tools/og-cards.js
    os.makedirs(os.path.join(ROOT, "og"), exist_ok=True)
    cards = [{"slug": p["slug"], "name": p["_name"], "vn": p["name"], "dish": p["_dish"], "area": p["_area"], "cat": p["cat"],
              "hours": (TIPS.get(p["id"]) or {}).get("hours", ""), "price": (TIPS.get(p["id"]) or {}).get("price", "")} for p in places]
    with open(os.path.join(ROOT, "og", "cards.json"), "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=1)

    # ---- guide pages
    for g in GUIDES:
        items = g["items"]
        bc, bld = crumbs([("Home", "/"), ("Guides", "/guides/"), (g["nav"], None)])
        others = "".join('<a class="chip" href="/guides/%s/">%s</a>' % (o["slug"], E(o["nav"])) for o in GUIDES if o is not g)
        g_updated = max([p["_updated"] for p in items] + ["2026-10-23"])
        body = """<div class="wrap">%s
<div class="narrow0">
<p class="kicker">Local guide · %d places · updated %s</p>
<h1>%s</h1>
%s
%s
<div class="box tips"><h2>Before you go</h2><ul>%s</ul></div>
</div>
<h2 class="h2s">The places</h2>
%s
<section><h2 class="h2s">More guides</h2><div class="chips">%s<a class="chip" href="/guides/hcmc-metro/">Metro guide</a><a class="chip" href="/guides/getting-around-hcmc/">Buses &amp; river bus</a></div></section>
</div>""" % (bc, len(items), nice_date(g_updated), E(g["h1"]), short_answer(items), "".join('<p class="lead">%s</p>' % E(x) for x in g["intro"]),
              "".join("<li>%s</li>" % E(t) for t in g["tips"]), guide_cards(items), others)
        il = {"@context": "https://schema.org", "@type": "CollectionPage", "name": g["h1"], "url": SITE + "/guides/%s/" % g["slug"],
              "description": g["desc"], "inLanguage": "en", "dateModified": g_updated,
              "publisher": {"@type": "Organization", "name": "HCMC Insider", "url": SITE + "/"},
              "mainEntity": {"@type": "ItemList", "numberOfItems": len(items), "itemListElement": [
                  {"@type": "ListItem", "position": i + 1, "url": SITE + "/places/%s/" % p["slug"], "name": p["_name"]} for i, p in enumerate(items)]}}
        write("/guides/%s/" % g["slug"], page("/guides/%s/" % g["slug"], g["title"] + " | HCMC Insider", g["desc"], body, [bld, il]))
        urls.append("/guides/%s/" % g["slug"])
        lastmod["/guides/%s/" % g["slug"]] = g_updated
        guides_out.append({"slug": g["slug"], "title": g["nav"], "count": len(items)})

    write("/guides/hcmc-metro/", metro_page())
    write("/guides/getting-around-hcmc/", transport_page())

    # ---- See & Do (landmark pages from sights.json)
    sp = os.path.join(ROOT, "sights.json")
    sights = json.load(open(sp, encoding="utf-8"))["sights"] if os.path.exists(sp) else []
    by_slug = {p["slug"]: p for p in places}
    sight_map = {s["slug"]: s for s in sights}
    cardsf = os.path.join(ROOT, "og", "cards.json")
    cards_all = json.load(open(cardsf, encoding="utf-8"))
    for s in sights:
        path = "/see-and-do/%s/" % s["slug"]
        bc, bld = crumbs([("Home", "/"), ("See & Do", "/see-and-do/"), (s["name"], None)])
        img = os.path.exists(os.path.join(ROOT, "og", "sight-%s.jpg" % s["slug"]))
        photos = "".join('<figure class="photo"><img src="%s" alt="%s" loading="lazy"><figcaption>%s</figcaption></figure>' % (E(ph["src"]), E(ph["alt"]), E(ph.get("credit", ""))) for ph in s.get("photos", []))
        hero = photos or (('<img class="hero-card" src="/og/sight-%s.jpg" alt="%s, Ho Chi Minh City" width="1200" height="630">' % (s["slug"], E(s["name"]))) if img else "")
        facts = "".join('<div><dt>%s</dt><dd>%s</dd></div>' % (E(k), E(v)) for k, v in s["facts"])
        ul = lambda xs: "<ul>%s</ul>" % "".join("<li>%s</li>" % E(x) for x in xs)
        near_p = [by_slug[x] for x in s.get("nearby_places", []) if x in by_slug]
        near_s = "".join('<a class="chip" href="/see-and-do/%s/">%s</a>' % (x, E(sight_map[x]["name"])) for x in s.get("nearby_sights", []) if x in sight_map)
        tour = ('<section class="box tourbox"><h2>Prefer a guided tour?</h2><p>Many half-day city tours include this stop with transport and a guide.</p>'
                '<p><a class="cta" href="https://klook.tpo.lu/FZ8vNhYU" target="_blank" rel="sponsored noopener">See Saigon city tours on Klook ↗</a></p>'
                '<p class="small">Affiliate link: same price for you, a small commission for us.</p></section>') if s.get("tour") else ""
        src = " · ".join('<a href="%s" target="_blank" rel="noopener">%s</a>' % (E(u), E(t)) for t, u in s["sources"])
        body = """<div class="wrap narrow">%s
<p class="kicker">%s</p>
<h1>%s</h1>
<p class="vnname" lang="vi">%s</p>
<div class="box answer"><p><strong>Is it worth visiting?</strong> %s</p></div>
%s
%s
<section class="box ltips"><h2>At a glance</h2><dl>%s</dl></section>
<section><h2 class="h2s">Why go</h2>%s</section>
<section><h2 class="h2s">How to get there</h2>%s</section>
<section><h2 class="h2s">Local tips</h2>%s</section>
<section class="box driver"><h2>Show this to your driver</h2><p class="big" lang="vi">%s</p><p class="addr" lang="vi">%s</p></section>
%s
%s
%s
<p class="small">Last checked: %s. Sources: %s. Hours and access can change, so check on the day.</p>
</div>""" % (bc, E(s["kicker"]), E(s["name"]), E(s["vn"]), E(s["short"]), hero,
             ('<section class="box status"><h2>Current status</h2><p>%s</p></section>' % E(s["status"])) if s.get("status") else "",
             facts, ul(s["why"]), ul(s["getting"]), ul(s["tips"]), E(s["vn"]), E(s["addr"]), tour,
             ('<section><h2 class="h2s">Eat nearby</h2>%s</section>' % guide_cards(near_p)) if near_p else "",
             ('<section><h2 class="h2s">See next</h2><div class="chips">%s<a class="chip" href="/see-and-do/">All sights</a></div></section>' % near_s) if near_s else "",
             nice_date(s["checked"]), src)
        ld = {"@context": "https://schema.org", "@type": "TouristAttraction", "name": s["name"], "alternateName": s["vn"],
              "description": s["short"], "url": SITE + path,
              "address": {"@type": "PostalAddress", "streetAddress": s["addr"], "addressLocality": "Ho Chi Minh City", "addressCountry": "VN"},
              "isAccessibleForFree": True}
        if img:
            ld["image"] = SITE + "/og/sight-%s.jpg" % s["slug"]
        write(path, page(path, "%s: Is It Worth Visiting? Tips & How to Get There | HCMC Insider" % s["name"] if len(s["name"]) < 34 else "%s: Visitor Tips | HCMC Insider" % s["name"],
                         s["short"][:300], body, [ld, bld], og_image=(SITE + "/og/sight-%s.jpg" % s["slug"]) if img else None))
        urls.append(path)
        lastmod[path] = s["checked"]
        cards_all = [c for c in cards_all if c["slug"] != "sight-" + s["slug"]] + [
            {"slug": "sight-" + s["slug"], "name": s["name"], "vn": s["vn"], "dish": s["kicker"].split(" · ")[0], "area": s["area"],
             "cat": "culture" if "Market" not in s["kicker"] else "shop", "hours": dict(s["facts"]).get("Hours", ""), "price": ""}]
    json.dump(cards_all, open(cardsf, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if sights:
        bc, bld = crumbs([("Home", "/"), ("See & Do", None)])
        gl = "".join('<a class="gcard" href="/see-and-do/%s/"><em>%s</em><strong>%s</strong><span>%s</span></a>' % (
            s["slug"], E(s["kicker"]), E(s["name"]), E(s.get("teaser") or s["short"])) for s in sights)
        body = ('<div class="wrap">%s<p class="kicker">See &amp; Do</p><h1>Saigon\'s icons, the local way</h1>'
                '<p class="lead">The landmarks every visitor asks about, with honest advice on whether to go, current status, how to get there by metro or bus, and where to eat nearby.</p><div class="ggrid">%s</div></div>') % (bc, gl)
        write("/see-and-do/", page("/see-and-do/", "Things to Do in Ho Chi Minh City: Landmarks, Markets & Temples | HCMC Insider",
                                   "Saigon's must-see landmarks the local way: Notre-Dame Cathedral, Central Post Office, Nguyen Hue, Ben Thanh and Binh Tay markets, Thien Hau Temple, with current status and how to get there.", body, [bld]))
        urls.append("/see-and-do/")
        lastmod["/see-and-do/"] = max(s["checked"] for s in sights)
    d["sights"] = [{"slug": s["slug"], "name": s["name"], "kicker": s["kicker"], "short": s.get("teaser") or s["short"]} for s in sights]
    SIGHTS_OUT[:] = sights

    # ---- guides index
    bc, bld = crumbs([("Home", "/"), ("Guides", None)])
    gl = "".join('<a class="gcard" href="/guides/%s/"><strong>%s</strong><span>%s</span><em>%d places</em></a>' % (
        g["slug"], E(g["nav"]), E(g["desc"]), len(g["items"])) for g in GUIDES)
    gl += '<a class="gcard" href="/guides/hcmc-metro/"><strong>Metro guide</strong><span>Stations, fares, hours and paying with a foreign card on Metro Line 1.</span><em>Getting around</em></a>'
    gl += '<a class="gcard" href="/guides/getting-around-hcmc/"><strong>Getting around</strong><span>Free city buses until end of 2026, airport buses 109 and 152, buses to Cholon and Cu Chi, the river bus and sightseeing bus.</span><em>Buses &amp; boats</em></a>'
    body = '<div class="wrap">%s<p class="kicker">Local guides</p><h1>Ho Chi Minh City guides by locals</h1><p class="lead">Food, markets and getting around in Ho Chi Minh City (Saigon), built from places local creators keep coming back to.</p><div class="ggrid">%s</div></div>' % (bc, gl)
    write("/guides/", page("/guides/", "Ho Chi Minh City (Saigon) Travel Guides by Locals | HCMC Insider",
                           "Local guides to Ho Chi Minh City: Cholon food, noodle soups, dim sum, vegetarian food, sweet soups, markets and the metro.", body, [bld]))
    guides_out.append({"slug": "hcmc-metro", "title": "Metro guide", "count": 0})
    guides_out.append({"slug": "getting-around-hcmc", "title": "Buses & river bus", "count": 0})

    # ---- data.json: keep only real fields + slug + guides
    for p in places:
        p_dish, p_area = p["_dish"], p["_area"]
        LABELS[p["id"]] = (p_dish, p_area)
    for p in places:
        for k in [k for k in p if k.startswith("_")]:
            del p[k]
    d["guides"] = guides_out
    with open(os.path.join(ROOT, "data.json"), "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)

    # ---- crawlable directory inside #root of index.html (replaced by the app on load)
    idx_path = os.path.join(ROOT, "index.html")
    src = open(idx_path, encoding="utf-8").read()
    dir_html = ('<div id="root"><!--DIR--><nav class="wrap" aria-label="Directory"><h1>HCMC Insider: Ho Chi Minh City food, sights and local tips</h1><p>HCMC Insider is an independent English guide to Ho Chi Minh City (Saigon) by locals. It lists NPLACES food spots, markets and sights, mostly in Cholon (Saigon Chinatown), each with its Vietnamese name, address, directions and links to local creators\' videos, plus practical guides to the metro, free city buses and the airport bus.</p>'
                '<h2>See and do</h2><ul>SIGHTLIST</ul><h2>Guides</h2><ul>%s<li><a href="/guides/hcmc-metro/">Metro guide</a></li><li><a href="/guides/getting-around-hcmc/">Getting around: buses and river bus</a></li></ul><h2>Places</h2><ul>%s</ul></nav><!--/DIR--></div>') % (
        "".join('<li><a href="/guides/%s/">%s</a></li>' % (g["slug"], E(g["nav"])) for g in GUIDES),
        "".join('<li><a href="/places/%s/">%s</a></li>' % (p["slug"], E(p.get("nameEn") or p["name"])) for p in places_sorted))
    dir_html = dir_html.replace("NPLACES", str(len(places)), 1).replace("SIGHTLIST", "".join('<li><a href="/see-and-do/%s/">%s</a></li>' % (s["slug"], E(s["name"])) for s in SIGHTS_OUT), 1)
    src, n = re.subn(r'<div id="root">.*?</div>(?=\n<div hidden>)', lambda m: dir_html, src, count=1, flags=re.S)
    assert n == 1, "root div not found"
    # Inline the data so the homepage renders complete on the first paint (no fetch, no layout shift).
    blob = json.dumps(d, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    tag = '<script id="hi-data">window.__DATA__=%s;</script>\n' % blob
    if '<script id="hi-data">' in src:
        src = re.sub(r'<script id="hi-data">.*?</script>\n', lambda m: tag, src, count=1, flags=re.S)
    else:
        src = src.replace('<div hidden><div id="lmap"></div></div>\n', '<div hidden><div id="lmap"></div></div>\n' + tag, 1)
    assert '<script id="hi-data">' in src, "data script not placed"
    open(idx_path, "w", encoding="utf-8").write(src)

    # ---- llms.txt (for AI assistants)
    L = ["# HCMC Insider", "",
         "> An independent English guide to Ho Chi Minh City (Saigon), Vietnam, written by locals for international visitors. "
         "It covers where locals eat (mostly Cholon, Saigon's Chinatown, in old Districts 5, 6 and 11), markets and old streets, "
         "and practical transport: Metro Line 1, free city buses (until 31 Dec 2026), airport buses and the river bus.", "",
         "Every place page gives the English and Vietnamese name, address, directions, local tips taken from creators' video descriptions "
         "(hours, prices, what to order) and links to the original YouTube videos. Facts are checked against creators' descriptions and "
         "Vietnamese news sources; each page shows when it was last updated. Contact: hello@hcmcinsider.com", "",
         "## Guides", ""]
    L += ["- [%s](%s/guides/%s/): %s" % (g["title"], SITE, g["slug"], g["desc"]) for g in GUIDES]
    L += ["- [Ho Chi Minh City metro guide](%s/guides/hcmc-metro/): Metro Line 1 stations, fares, opening hours and paying with a foreign bank card." % SITE,
          "- [Getting around Ho Chi Minh City](%s/guides/getting-around-hcmc/): free city buses in 2026 and how to tap in, airport buses 109 and 152, buses to Cholon and Cu Chi, Saigon river bus." % SITE,
          "", "## Places", ""]
    for p in places_sorted:
        if p["slug"] in thin_list:
            continue
        L.append("- [%s (%s)](%s/places/%s/): %s, %s. %s" % (p.get("nameEn") or p["name"], p["name"], SITE, p["slug"],
                                                          LABELS[p["id"]][0], LABELS[p["id"]][1], p.get("noteEn", "")))
    if SIGHTS_OUT:
        L += ["", "## See & Do", ""] + ["- [%s (%s)](%s/see-and-do/%s/): %s" % (s["name"], s["vn"], SITE, s["slug"], s["short"]) for s in SIGHTS_OUT]
    L += ["", "## Optional", "", "- [All guides](%s/guides/)" % SITE, "- [Privacy](%s/privacy)" % SITE, ""]
    open(os.path.join(ROOT, "llms.txt"), "w", encoding="utf-8").write("\n".join(L))
    open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8").write(
        "# Search engines and AI assistants are welcome to read and cite this site.\n"
        "User-agent: *\nAllow: /\n\n"
        "User-agent: GPTBot\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\n"
        "User-agent: PerplexityBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\n"
        "Sitemap: %s/sitemap.xml\n" % SITE)

    # ---- sitemap
    urls.append("/privacy")
    newest = max(lastmod.values())
    if thin_list:
        print("noindex (thin, add tips or a better description to publish):", ", ".join(thin_list))
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % "".join(
        "  <url><loc>%s%s</loc><lastmod>%s</lastmod></url>\n" % (SITE, u, lastmod.get(u) or STATIC_LASTMOD.get(u) or newest) for u in urls)
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(sm)
    print("built %d place pages, %d guides, %d urls in sitemap" % (len(places), len(GUIDES) + 1, len(urls)))


if __name__ == "__main__":
    main()
