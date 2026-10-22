#!/usr/bin/env python3
"""Pick places for today's X posts and print their verified facts as JSON.

  python3 tools/x_posts.py            # show the next 3 places (does not change anything)
  python3 tools/x_posts.py --mark     # same, and record them in x-posted.json

Rules: only places with a YouTube video; never repeats a place until every
eligible place has been posted once; facts come only from data.json and tips.json.
"""
import datetime
from zoneinfo import ZoneInfo
import json
import os
import random
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = 3
TODAY = datetime.datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date().isoformat()


def yt(u):
    m = re.search(r"(?:v=|youtu\.be/|shorts/)([\w-]{11})", u or "")
    return m.group(1) if m else ""


def main():
    d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
    tips = json.load(open(os.path.join(ROOT, "tips.json"), encoding="utf-8"))
    log_path = os.path.join(ROOT, "x-posted.json")
    log = json.load(open(log_path, encoding="utf-8")) if os.path.exists(log_path) else {"rounds": 1, "posted": []}

    vids = {}
    for v in d["videos"]:
        if yt(v["url"]):
            vids.setdefault(v["placeId"], []).append(v)
    eligible = [p for p in d["places"] if p["id"] in vids and p.get("slug")]
    done = {x["id"] for x in log["posted"] if x.get("round", 1) == log["rounds"]}
    left = [p for p in eligible if p["id"] not in done]
    if len(left) < N:  # start a new round
        log["rounds"] += 1
        left = list(eligible)
    rng = random.Random(TODAY)
    rng.shuffle(left)
    pick = left[:N]

    out = []
    for p in pick:
        v = max(vids[p["id"]], key=lambda x: int(x.get("views") or 0))
        out.append({
            "id": p["id"], "name": p.get("nameEn") or p["name"], "vietnamese_name": p["name"],
            "category": p["cat"], "address": (tips.get(p["id"]) or {}).get("addr") or p.get("addr", ""),
            "description": p.get("noteEn", ""), "local_tips": {k: v2 for k, v2 in (tips.get(p["id"]) or {}).items() if k != "src"},
            "youtube_url": "https://www.youtube.com/watch?v=" + yt(v["url"]), "video_creator": v.get("creator", ""),
            "video_title_en": v.get("titleEn", ""), "video_views": int(v.get("views") or 0),
            "place_page": "hcmcinsider.com/places/%s/" % p["slug"],
        })
    print(json.dumps({"date": TODAY, "posts": out}, ensure_ascii=False, indent=1))

    if "--mark" in sys.argv:
        for p in pick:
            log["posted"].append({"id": p["id"], "date": TODAY, "round": log["rounds"]})
        json.dump(log, open(log_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
