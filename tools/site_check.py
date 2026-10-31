"""Weekly health check for hcmcinsider.com: broken links, removed videos and facts that are getting old.

  python3 tools/site_check.py                 # full check, report printed as Markdown
  python3 tools/site_check.py --offline       # only local checks (internal links, dates); no network
  python3 tools/site_check.py --out report.md # also write the report to a file

Runs every Monday from .github/workflows/site-check.yml, which opens or updates a GitHub issue
labelled "site-check" when something needs attention, and closes it when everything is fine.
Exit code is always 0 unless the script itself fails; the report is the result.

What it checks
  1. Internal links  every href/src in the built pages points to a file that exists (and #anchors exist).
  2. External links  each unique outside link answers (404, 410, 5xx, DNS errors are reported).
                      Sites that block robots (403/429) are listed separately as "could not check".
  3. Videos           every YouTube video in data.json and sights/events still exists (oEmbed).
  4. Facts to recheck sights.json / events.json entries whose "checked" date is older than CHECK_DAYS.
  5. Events           events that are over (update to the next edition) or start within EVENT_SOON days.
  6. Dated promises   text such as "free until the end of 2026" whose date has passed or is close.
  7. Hand-written pages in STATIC_LASTMOD (build.py) not touched for STATIC_DAYS.
"""
import concurrent.futures as cf
import datetime
import html
import json
import os
import re
import socket
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://hcmcinsider.com"
TODAY = datetime.date.today()

CHECK_DAYS = 120   # sights/events facts older than this get listed for re-checking
EVENT_SOON = 30    # events starting within this many days get a "check the details" reminder
DEADLINE_SOON = 75 # "until end of 2026" style text: warn this many days before the date
STATIC_DAYS = 180  # hand-written guide pages not updated for this long

SKIP_DIRS = {".git", ".wrangler", "node_modules", "__pycache__", "assets", "og", "pins"}
# Hosts that refuse automated requests or where a request would count as a click; not checked.
SKIP_HOSTS = {"x.com", "twitter.com", "www.facebook.com", "facebook.com", "www.google.com", "maps.google.com",
              "maps.apple.com", "www.instagram.com", "www.tiktok.com"}
# Affiliate short links: only check that the short link itself answers, never follow it (no fake clicks).
NO_FOLLOW_HOSTS = {"klook.tpo.lu", "kiwitaxi.tpo.lu", "airalo.tpo.lu", "saily.tpo.lu"}
UA = "Mozilla/5.0 (compatible; HCMCInsiderLinkCheck/1.0; +https://hcmcinsider.com)"
MONTHS = {m: i for i, m in enumerate(["january", "february", "march", "april", "may", "june", "july", "august",
                                      "september", "october", "november", "december"], 1)}


# ---------------------------------------------------------------- pages
def pages():
    """Yield (url path, file path) for every built HTML page."""
    for d, dirs, files in os.walk(ROOT):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
        for f in files:
            if f.endswith(".html"):
                fp = os.path.join(d, f)
                rel = os.path.relpath(fp, ROOT).replace(os.sep, "/")
                path = "/" + (rel[:-len("index.html")] if rel.endswith("index.html") else rel)
                yield path, fp


LINK_RE = re.compile(r'\s(?:href|src)="([^"]+)"')
ID_RE = re.compile(r'\sid="([^"]+)"')


def resolve(path):
    """Does this site path exist as a static file (Cloudflare assets: /x, /x.html, /x/index.html)?"""
    p = urllib.parse.unquote(path.split("?")[0].split("#")[0]).lstrip("/")
    base = os.path.join(ROOT, p)
    if not p:
        return os.path.join(ROOT, "index.html")
    for cand in (base, base + ".html", os.path.join(base, "index.html")):
        if os.path.isfile(cand):
            return cand
    return None


def text_of(src):
    src = re.sub(r"(?s)<script.*?</script>|<style.*?</style>", " ", src)
    return html.unescape(re.sub(r"<[^>]+>", " ", src))


def scan_pages():
    internal, external, texts = [], {}, {}
    ids = {}
    for path, fp in pages():
        src = open(fp, encoding="utf-8").read()
        ids[fp] = set(ID_RE.findall(src))
        texts[path] = text_of(src)
        for raw in LINK_RE.findall(re.sub(r"(?s)<script.*?</script>", " ", src)):  # links built by JS are not real hrefs
            u = html.unescape(raw)
            if u.startswith(("mailto:", "tel:", "data:", "javascript:", "sms:")):
                continue
            if u.startswith(SITE):
                u = u[len(SITE):] or "/"
            if u.startswith("//"):
                u = "https:" + u
            if u.startswith(("http://", "https://")):
                external.setdefault(u, set()).add(path)
            elif u.startswith("/") or u.startswith("#"):
                internal.append((path, fp, u))
    return internal, external, texts, ids


def check_internal(internal, ids):
    bad = {}
    for page, fp, u in internal:
        if u.startswith("#"):
            target, frag = fp, u[1:]
        else:
            target, frag = resolve(u), (u.split("#", 1)[1] if "#" in u else "")
            if not target:
                bad.setdefault(u.split("#")[0], set()).add(page)
                continue
        # fragments that the page's JavaScript handles (#near, #stay=…, #plan with ids added later) are fine if any id matches
        if frag and "=" not in frag and target.endswith(".html") and frag not in ids.get(target, set()):
            if target not in ids:
                ids[target] = set(ID_RE.findall(open(target, encoding="utf-8").read()))
            src = open(target, encoding="utf-8").read()
            if frag not in ids[target] and ('"%s"' % frag) not in src and ("'#%s'" % frag) not in src and ('"#%s"' % frag) not in src:
                bad.setdefault(u, set()).add(page)
    return bad


# ---------------------------------------------------------------- network
CTX = ssl.create_default_context()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def fetch_status(url, follow=True):
    """Return (status code or None, short error)."""
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=CTX), *([] if follow else [NoRedirect()]))
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, method=method, headers={"User-Agent": UA, "Accept": "*/*", "Accept-Language": "en,vi;q=0.8"})
        try:
            with opener.open(req, timeout=25) as r:
                return r.status, ""
        except urllib.error.HTTPError as e:
            if not follow and 300 <= e.code < 400:
                return e.code, ""
            if method == "HEAD" and e.code in (400, 403, 404, 405, 429, 500, 501, 503):
                continue  # many servers answer HEAD badly; try a real GET
            return e.code, ""
        except (urllib.error.URLError, socket.timeout, ssl.SSLError, ConnectionError, OSError) as e:
            reason = getattr(e, "reason", e)
            if method == "HEAD":
                continue
            return None, str(reason)[:120]
    return None, "no answer"


YT_RE = re.compile(r"(?:youtube\.com/(?:watch\?v=|shorts/|embed/|live/)|youtu\.be/)([\w-]{11})")


def check_video(vid):
    u = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote("https://www.youtube.com/watch?v=" + vid)
    code, err = fetch_status(u)
    if code == 200:
        return "ok"
    if code in (400, 404):
        return "removed"
    if code == 401:
        return "private"
    if code == 403:
        return "ok"  # exists, only embedding is turned off; we link to YouTube, so that is fine
    return "unknown (%s)" % (code or err)


def check_external(external):
    todo = {}
    for u, where in external.items():
        host = urllib.parse.urlsplit(u).hostname or ""
        if host in SKIP_HOSTS or YT_RE.search(u) or host.endswith("ytimg.com"):
            continue
        todo[u] = where
    broken, blocked = [], []
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(fetch_status, u, (urllib.parse.urlsplit(u).hostname or "") not in NO_FOLLOW_HOSTS): u for u in todo}
        for f in cf.as_completed(futs):
            u = futs[f]
            code, err = f.result()
            if code and code < 400:
                continue
            row = (u, code or err, sorted(todo[u]))
            if code in (401, 403, 429, 999):
                blocked.append(row)
            else:
                broken.append(row)
    if todo and sum(1 for r in broken if not isinstance(r[1], int)) > len(todo) / 2:
        raise SystemExit("More than half of the outside links gave no answer: the network looks down, not the links. No report made.")
    return sorted(broken), sorted(blocked), len(todo)


def collect_videos():
    vids = {}
    d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
    names = {p["id"]: (p.get("nameEn") or p["name"], "/places/%s/" % p.get("slug", "")) for p in d["places"]}
    for v in d["videos"]:
        m = YT_RE.search(v.get("url", ""))
        if m:
            name, path = names.get(v.get("placeId"), ("?", ""))
            vids.setdefault(m.group(1), []).append("%s (%s)" % (name, path))
    for fname, key in (("sights.json", "sights"), ("events.json", "events"), ("visitor_videos.json", None), ("stories.json", None)):
        fp = os.path.join(ROOT, fname)
        if not os.path.exists(fp):
            continue
        for m in YT_RE.finditer(open(fp, encoding="utf-8").read()):
            vids.setdefault(m.group(1), []).append(fname)
    return vids


# ---------------------------------------------------------------- dates
def parse_date(s):
    try:
        return datetime.date.fromisoformat(str(s)[:10])
    except (TypeError, ValueError):
        return None


def stale_facts():
    rows, events = [], []
    for fname, key, base in (("sights.json", "sights", "/see-and-do/"), ("events.json", "events", "/events/")):
        fp = os.path.join(ROOT, fname)
        if not os.path.exists(fp):
            continue
        for x in json.load(open(fp, encoding="utf-8")).get(key, []):
            path = base + x.get("slug", "") + "/"
            c = parse_date(x.get("checked"))
            if not c:
                rows.append((path, "no \"checked\" date"))
            elif (TODAY - c).days > CHECK_DAYS:
                rows.append((path, "last checked %s (%d days ago)" % (c, (TODAY - c).days)))
            if key == "events":
                st, en = parse_date(x.get("start")), parse_date(x.get("end") or x.get("start"))
                if en and en < TODAY:
                    events.append((path, "ended %s: move it to the next edition's dates" % en))
                elif st and 0 <= (st - TODAY).days <= EVENT_SOON:
                    events.append((path, "starts %s (in %d days): re-check times, route and prices" % (st, (st - TODAY).days)))
    return rows, events


DEADLINE_RE = re.compile(r"\b(?:until|till|through|by)\s+(?:the\s+)?(?:end\s+of\s+)?"
                         r"(?:(\d{1,2})\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)?\s*(20\d\d)\b", re.I)


def deadline_of(m):
    day, month, year = m.group(1), m.group(2), int(m.group(3))
    if month:
        mo = MONTHS[month.lower()]
        if day:
            return datetime.date(year, mo, int(day))
        nxt = datetime.date(year + (mo == 12), mo % 12 + 1, 1)
        return nxt - datetime.timedelta(days=1)
    return datetime.date(year, 12, 31)


def dated_promises(texts):
    """One row per deadline date: the pages that mention it and a sample of the wording."""
    found = {}
    for path, t in texts.items():
        for m in DEADLINE_RE.finditer(t):
            try:
                dl = deadline_of(m)
            except ValueError:
                continue
            if (dl - TODAY).days > DEADLINE_SOON:
                continue
            a = max(0, m.start() - 50)
            snippet = " ".join(t[a:m.end()].split())
            row = found.setdefault(dl, {"pages": set(), "snips": []})
            row["pages"].add(path)
            if len(row["snips"]) < 2 and snippet not in row["snips"]:
                row["snips"].append(snippet)
    return [(dl, " / ".join("…" + x for x in r["snips"]), sorted(r["pages"])) for dl, r in sorted(found.items())]


def static_pages():
    src = open(os.path.join(ROOT, "build.py"), encoding="utf-8").read()
    m = re.search(r"STATIC_LASTMOD = (\{.*?\})", src)
    rows = []
    if m:
        for path, d in json.loads(m.group(1)).items():
            dd = parse_date(d)
            if dd and (TODAY - dd).days > STATIC_DAYS:
                rows.append((path, "last edited %s (%d days ago)" % (dd, (TODAY - dd).days)))
    return rows


# ---------------------------------------------------------------- report
def where(paths, n=3):
    paths = sorted(paths)
    s = ", ".join("`%s`" % p for p in paths[:n])
    return s + (" and %d more" % (len(paths) - n) if len(paths) > n else "")


def main():
    offline = "--offline" in sys.argv
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else None

    internal, external, texts, ids = scan_pages()
    sections, problems = [], 0

    def section(title, rows, hint=""):
        nonlocal problems
        if not rows:
            return
        problems += len(rows)
        sections.append("### %s (%d)\n%s%s" % (title, len(rows), (hint + "\n\n") if hint else "", "\n".join("- [ ] " + r for r in rows)))

    bad = check_internal(internal, ids)
    section("Broken internal links", ["`%s` on %s" % (u, where(p)) for u, p in sorted(bad.items())],
            "Usually a renamed place or guide slug. Fix the link in `build.py` or the JSON, then run `python3 build.py`.")

    blocked, checked, vstats = [], 0, {}
    if not offline:
        broken, blocked, checked = check_external(external)
        section("Broken outside links", ["%s → **%s** on %s" % (u, c, where(p)) for u, c, p in broken],
                "Swap in a working source, or remove the link.")
        vids = collect_videos()
        with cf.ThreadPoolExecutor(max_workers=8) as ex:
            res = dict(zip(vids, ex.map(check_video, vids)))
        vstats = {"total": len(vids), "ok": sum(1 for r in res.values() if r == "ok")}
        section("Videos removed or made private", ["https://www.youtube.com/watch?v=%s **%s**: %s" % (v, r, "; ".join(sorted(set(vids[v]))))
                                                   for v, r in sorted(res.items()) if r != "ok"],
                "Remove the video from `data.json` (or the JSON it came from). If it was the only video, the place may need a new source.")

    facts, events = stale_facts()
    section("Facts due for a re-check", ["`%s`: %s" % r for r in facts],
            "Re-check hours, prices and tickets against the sources, then update `checked` in the JSON.")
    section("Events", ["`%s`: %s" % r for r in events])
    section("Dated promises in the text", ["**%s** (%s) on %s: “%s”" % (dl, "passed" if dl < TODAY else "in %d days" % (dl - TODAY).days, where(p, 6), s)
                                          for dl, s, p in dated_promises(texts)],
            "Text that promises something until a date. Confirm whether it was extended and update the wording.")
    section("Hand-written pages not updated for a while", ["`%s`: %s" % r for r in static_pages()],
            "Review the page, then update its date in `STATIC_LASTMOD` in `build.py`.")

    head = "## Weekly site check · %s\n\n" % TODAY
    head += "Checked %d pages, %d internal links" % (len(texts), len(internal))
    head += (", %d outside links and %d/%d videos OK" % (checked, vstats.get("ok", 0), vstats.get("total", 0))) if not offline else " (offline run: outside links and videos skipped)"
    head += ".\n\n"
    head += ("**%d item(s) need attention.** Tick them off here as you fix them.\n\n" % problems) if problems else "✅ Nothing to fix this week.\n\n"
    body = head + "\n\n".join(sections)
    if blocked:
        body += "\n\n<details><summary>Could not check %d link(s): the site blocks robots</summary>\n\n%s\n\n</details>" % (
            len(blocked), "\n".join("- %s → %s on %s" % (u, c, where(p)) for u, c, p in blocked))
    body += "\n\n<sub>Made by `tools/site_check.py`. Thresholds: facts %d days, events %d days, dated text %d days, static pages %d days.</sub>\n" % (
        CHECK_DAYS, EVENT_SOON, DEADLINE_SOON, STATIC_DAYS)

    print(body)
    if out:
        with open(out, "w", encoding="utf-8") as f:
            f.write(body)
    gh = os.environ.get("GITHUB_OUTPUT")
    if gh:
        with open(gh, "a") as f:
            f.write("problems=%d\n" % problems)


if __name__ == "__main__":
    main()
