"""Read the giocaacalcio.it calendar and write data/live.json: the real date/time, score and
match id of every game, keyed to our own team indexes in data/teams_matches.json.

    python3 scripts/update.py            # writes data/live.json only if something changed

live.json: {"updated": iso, "m": {girone: [[giornata, homeIdx, awayIdx, "YYYY-MM-DDTHH:MM", score, id], ...]}}
Home/away come from giocaacalcio, so a swapped fixture shows up with the real home team.
Exits non-zero if a team name cannot be matched (see NAME_FIX) so the Action fails loudly.

Source rule: giocaacalcio supplies only date/time, home/away order and scores. Team names,
fields, addresses and home times always come from the LND PDF (teams_matches.json), which
this script only reads."""
import json, os, re, sys, unicodedata
from datetime import datetime, timezone
from difflib import SequenceMatcher

sys.path.insert(0, os.path.dirname(__file__))
from scrape_giocaacalcio import scrape

ROOT = os.path.join(os.path.dirname(__file__), "..")
TEAMS = os.path.join(ROOT, "data", "teams_matches.json")
OUT = os.path.join(ROOT, "data", "live.json")
# Results entered by hand (read by Carlo elsewhere): [girone, home, homeSquad, away, awaySquad, score, note].
# Names and squad letters as in the LND PDF. They only fill matches giocaacalcio has no score for.
MANUAL = os.path.join(ROOT, "data", "manual.json")
NAME_FIX = {}  # "GIOCA NAME": "Our name" when the fuzzy match gets one wrong


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().upper()
    return re.sub(r"[^A-Z0-9]+", " ", s).strip()


def split_squad(name):
    m = re.search(r"\s+SQ\.?\s*([A-D])\s*$", name, re.I)
    return (name[: m.start()], m.group(1).upper()) if m else (name, "A")


def map_names(teams, names):
    """giocaacalcio name -> our team index within one girone."""
    out = {}
    for gn in names:
        base, sq = split_squad(NAME_FIX.get(gn, gn))
        cands = [i for i, t in enumerate(teams) if t["s"] == sq] or list(range(len(teams)))
        score = lambda i: SequenceMatcher(None, norm(base), norm(teams[i]["n"].replace(" (femm.)", " FEMMINILE"))).ratio() + (norm(teams[i]["n"]) in norm(base)) * 0.5
        out[gn] = max(cands, key=score)
    if len(set(out.values())) != len(out):
        raise SystemExit(f"ambiguous names: {out}")
    return out


def build(D, G, old=None):
    # Finished matches lose their date on giocaacalcio: keep the one stored earlier, by match id.
    prev = {r[5]: r[3] for rows in (old or {}).values() for r in rows}
    live = {}
    for g, v in D.items():
        rows = [m for m in G if m["g"] == g]
        if len(rows) < len([m for m in v["m"] if m[2] != -1]):
            raise SystemExit(f"girone {g}: {len(rows)} matches read, calendar has more; not writing")
        idx = map_names(v["t"], {m["h"] for m in rows} | {m["a"] for m in rows})
        rnd = {frozenset((h, a)): n for n, _, h, a in v["m"] if h != -1}
        out = []
        for m in rows:
            h, a = idx[m["h"]], idx[m["a"]]
            n = rnd.get(frozenset((h, a)))
            if n is None:
                raise SystemExit(f"girone {g}: {m['h']} - {m['a']} is not in our calendar")
            out.append([n, h, a, m["dt"] or prev.get(m["id"]), m["score"], m["id"]])
        live[g] = sorted(out)
    apply_manual(D, live)
    return live


def apply_manual(D, live):
    if not os.path.exists(MANUAL):
        return
    for g, hn, hs, an, as_, score, *_ in json.load(open(MANUAL)):
        idx = {(t["n"], t["s"]): i for i, t in enumerate(D[g]["t"])}
        if (hn, hs) not in idx or (an, as_) not in idx:
            raise SystemExit(f"manual.json: unknown team in {g}: {hn} {hs} / {an} {as_}")
        h, a = idx[(hn, hs)], idx[(an, as_)]
        row = next((r for r in live[g] if {r[1], r[2]} == {h, a}), None)
        if row is None:
            raise SystemExit(f"manual.json: {hn} - {an} is not a match of girone {g}")
        if not row[4]:
            row[4] = score if row[1] == h else "-".join(reversed(score.split("-")))


def main():
    D = json.load(open(TEAMS))
    old = json.load(open(OUT)) if os.path.exists(OUT) else {}
    live = build(D, scrape(), old.get("m"))
    if old.get("m") == live:
        print("no change")
        return
    json.dump({"updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "m": live},
              open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    n = sum(len(x) for x in live.values())
    print(f"live.json written: {n} matches, {sum(1 for x in live.values() for r in x if r[4])} with score")


if __name__ == "__main__":
    main()
