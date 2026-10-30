"""Tell IndexNow (Bing, Yandex, Seznam...) which pages changed, by comparing sitemap.xml with the previous commit.

  python3 tools/indexnow.py            # submit URLs whose <lastmod> changed or are new since HEAD~1
  python3 tools/indexnow.py --all      # submit every URL in the sitemap

Runs automatically from .github/workflows/indexnow.yml after each push to main.
"""
import json, re, subprocess, sys, urllib.request

SITE = "https://hcmcinsider.com"
KEY = "a7d5b182ced2ccf0a969a82f6892c538"


def entries(xml):
    return dict(re.findall(r"<loc>(.*?)</loc><lastmod>(.*?)</lastmod>", xml))


def main():
    now = entries(open("sitemap.xml", encoding="utf-8").read())
    if "--all" in sys.argv:
        urls = list(now)
    else:
        try:
            old = entries(subprocess.run(["git", "show", "HEAD~1:sitemap.xml"], capture_output=True, text=True, check=True).stdout)
        except subprocess.CalledProcessError:
            old = {}
        urls = [u for u, m in now.items() if old.get(u) != m]
    if not urls:
        print("nothing changed")
        return
    body = json.dumps({"host": "hcmcinsider.com", "key": KEY, "keyLocation": "%s/%s.txt" % (SITE, KEY), "urlList": urls}).encode()
    req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body, headers={"Content-Type": "application/json; charset=utf-8"})
    with urllib.request.urlopen(req, timeout=30) as r:
        print(r.status, "submitted", len(urls), "urls:")
    print("\n".join(urls))


if __name__ == "__main__":
    main()
