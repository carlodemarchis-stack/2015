"""Read the full giocaacalcio.it calendar (all 11 gironi, 423 matches).
Each row: girone, ISO start datetime, home, away, score ('' until entered), match id.
Match pages (/match/<id>/...) carry the field address and a Google Maps link.

    python3 scripts/scrape_giocaacalcio.py [out.json]   # dump the raw rows"""
import re, html, json, sys, urllib.request
URL = "https://giocaacalcio.it/index.php/component/joomsport/calendar/4982-campionato-2015-torino-esordienti-1-anno-autunno-2026-2027"
def name(cell):
    m = re.findall(r'<div>\s*([^<]+?)\s*</div>', cell); return html.unescape(m[-1]) if m else ''
def scrape():
    s = urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"}), timeout=60).read().decode("utf-8", "ignore")
    rows = re.findall(r'<td class="team-h">(.*?)</td>\s*<td class="score"[^>]*>(.*?)</td>\s*<td class="team-a">(.*?)</td>', s, re.S)
    ms = []
    for h, sc, a in rows:
        g = re.search(r'girone-([a-z])\b', sc); d = re.search(r'startDate"?\s+content=[\'"]([^\'"]+)', sc); mid = re.search(r'/match/(\d+)/', sc)
        score = re.sub(r'<[^>]+>', '', re.search(r'<span>(.*?)</span>', sc, re.S).group(1)).strip()
        ms.append(dict(g=g.group(1).upper() if g else None, dt=d.group(1) if d else None, h=name(h), a=name(a), score=score, id=mid.group(1) if mid else None))
    # Fail loudly on a layout change instead of letting update.py write an empty live.json.
    bad = sum(1 for m in ms if not (m["g"] and m["dt"] and m["id"]))
    if len(ms) < 400 or bad:
        raise SystemExit(f"{len(ms)} rows read, {bad} without girone/date/id: page layout probably changed")
    return ms
def main(out="data/giocaacalcio_matches.json"):
    ms = scrape()
    json.dump(ms, open(out, "w"), ensure_ascii=False, indent=1)
    print(len(ms), "matches,", sum(1 for m in ms if m["score"]), "with score")
if __name__ == "__main__": main(*sys.argv[1:])
