"""Download club logos from the giocaacalcio.it team list into logos/ and write data/logos.json
({girone: {teamIndex: path}}). Teams sharing a club share one file. teams_matches.json is the
LND PDF data and is never written here.

    python3 scripts/fetch_logos.py"""
import html, json, os, re, sys, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from scrape_giocaacalcio import scrape
from update import map_names, TEAMS, ROOT

OUT = os.path.join(ROOT, "data", "logos.json")

URL = "https://giocaacalcio.it/index.php/component/joomsport/teamlist/4982-campionato-2015-torino-esordienti-1-anno-autunno-2026-2027"
UA = {"User-Agent": "Mozilla/5.0"}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()


def main():
    page = get(URL).decode("utf-8", "ignore")
    logo = {html.unescape(alt): src for src, alt in
            re.findall(r'imgres\.php\?src=(media/bearleague/[^&"]+)[^"]*"\s+alt="([^"]+)"', page)}
    D = json.load(open(TEAMS))
    G = scrape()
    os.makedirs(os.path.join(ROOT, "logos"), exist_ok=True)
    missing, out = [], {}
    for g, v in D.items():
        rows = [m for m in G if m["g"] == g]
        for gn, i in map_names(v["t"], {m["h"] for m in rows} | {m["a"] for m in rows}).items():
            src = logo.get(gn)
            if not src:
                missing.append(f"{g} {gn}")
                continue
            rel = "logos/" + os.path.basename(src)
            dst = os.path.join(ROOT, rel)
            if not os.path.exists(dst):
                open(dst, "wb").write(get("https://giocaacalcio.it/" + src))
            out.setdefault(g, {})[str(i)] = rel
    json.dump(out, open(OUT, "w"), separators=(",", ":"))
    print(f"{len(logo)} logos listed, {len(os.listdir(os.path.join(ROOT, 'logos')))} files; missing: {missing or 'none'}")


if __name__ == "__main__":
    main()
