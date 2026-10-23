#!/usr/bin/env python3
"""Pick today's three X posts for @HCMCInsider and print their verified facts as JSON.

  python3 tools/x_posts.py            # preview (changes nothing)
  python3 tools/x_posts.py --mark     # same, and record the picks in x-posted.json

Daily mix (based on what works for new accounts):
  1. place    – one place, posted with its own share image (og/<slug>.jpg); YouTube + website links go in the reply
  2. tip      – a practical tip or a "What is …?" dish explainer, alternating day by day
  3. question – a poll or open question to start conversations

Rotation: nothing repeats until its whole list has been used once.
Facts come only from data.json, tips.json, tools/x_topics.json and build.py DISH_INFO.
"""
import datetime
import importlib.util
import json
import os
import random
import re
import sys
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()

DISH_GUIDE = [
    (("Dim sum", "Wonton dumplings", "Egg noodles & wontons"), "dim-sum-and-wontons-saigon"),
    (("Hu tieu noodle soup", "Herbal duck noodles", "Goat noodle soup", "Satay venison noodles", "Pho",
      "Spicy Hue beef noodles", "Crab noodle soup", "Thick noodle soup", "Crab & tomato noodles"), "noodle-soups-ho-chi-minh-city"),
    (("Sweet soup desserts",), "che-sweet-soup-saigon"),
    (("Vegetarian",), "vegetarian-food-ho-chi-minh-city"),
    (("Chicken rice", "Braised pork rice", "Chinese-Vietnamese kitchen"), "chinese-vietnamese-restaurants-cholon"),
    (("Local market", "Lantern street", "Herbal medicine street"), "cholon-markets-and-old-streets"),
]


def yt(u):
    m = re.search(r"(?:v=|youtu\.be/|shorts/)([\w-]{11})", u or "")
    return m.group(1) if m else ""


def load_build():
    spec = importlib.util.spec_from_file_location("build", os.path.join(ROOT, "build.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def next_from(log, key, ids, rng):
    """Pick the next unused id for this list; start a new round when exhausted."""
    state = log.setdefault(key, {"round": 1, "used": []})
    left = [i for i in ids if i not in state["used"]]
    if not left:
        state["round"] += 1
        state["used"] = []
        left = list(ids)
    choice = rng.choice(left)
    return choice, state


def main():
    d = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
    tips = json.load(open(os.path.join(ROOT, "tips.json"), encoding="utf-8"))
    topics = json.load(open(os.path.join(ROOT, "tools", "x_topics.json"), encoding="utf-8"))
    build = load_build()
    log_path = os.path.join(ROOT, "x-posted.json")
    log = json.load(open(log_path, encoding="utf-8")) if os.path.exists(log_path) else {}
    # migrate the old format {"rounds": n, "posted": [...]}
    if "posted" in log:
        log = {"place": {"round": log.get("rounds", 1), "used": [x["id"] for x in log["posted"]]}, "history": log["posted"]}
    rng = random.Random(TODAY.isoformat())

    # 1. place
    vids = {}
    for v in d["videos"]:
        if yt(v["url"]):
            vids.setdefault(v["placeId"], []).append(v)
    eligible = {p["id"]: p for p in d["places"] if p["id"] in vids and p.get("slug")}
    pid, pstate = next_from(log, "place", sorted(eligible), rng)
    p = eligible[pid]
    v = max(vids[pid], key=lambda x: int(x.get("views") or 0))
    t = tips.get(pid) or {}
    rules = build.dish_rules()
    dish = next((lab for rx, lab in rules if rx.search(p["name"])), "")
    place = {
        "name": p.get("nameEn") or p["name"], "vietnamese_name": p["name"], "dish": dish,
        "address": t.get("addr") or p.get("addr", ""), "description": p.get("noteEn", ""),
        "local_tips": {k: x for k, x in t.items() if k != "src"},
        "youtube_url": "https://www.youtube.com/watch?v=" + yt(v["url"]), "video_creator": (v.get("creator") or "").strip(),
        "place_page": "hcmcinsider.com/places/%s/" % p["slug"],
        "share_image": "og/%s.jpg" % p["slug"],
    }

    # 2. tip: odd days practical tip, even days dish explainer
    if TODAY.toordinal() % 2:
        tid, tstate = next_from(log, "tip", [x["id"] for x in topics["tips"]], rng)
        x = next(x for x in topics["tips"] if x["id"] == tid)
        tip = {"kind": "practical", "topic": x["topic"], "facts": x["facts"], "link": x["link"]}
    else:
        tid, tstate = next_from(log, "dish", sorted(build.DISH_INFO), rng)
        term, text = build.DISH_INFO[tid]
        guide = next((g for names, g in DISH_GUIDE if tid in names), "cholon-food-guide")
        tip = {"kind": "dish", "topic": "What is %s?" % term, "facts": text, "link": "hcmcinsider.com/guides/%s/" % guide}

    # 3. question / poll
    qid, qstate = next_from(log, "question", [x["id"] for x in topics["questions"]], rng)
    q = next(x for x in topics["questions"] if x["id"] == qid)
    question = {"question": q["q"], "poll_options": q["options"]}

    print(json.dumps({"date": TODAY.isoformat(), "place": place, "tip": tip, "question": question}, ensure_ascii=False, indent=1))

    if "--mark" in sys.argv:
        pstate["used"].append(pid)
        tstate["used"].append(tid)
        qstate["used"].append(qid)
        log.setdefault("history", []).append({"date": TODAY.isoformat(), "place": pid, "tip": tid, "question": qid})
        json.dump(log, open(log_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
