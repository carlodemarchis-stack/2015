"""Add official squad letters (A/B/C) to the Sprint e Sport teams of data/cbs.json for the Torino
Esordienti 2014 and Pulcini 2016/2017 gironi. Sprint e Sport names have no letters; giocaacalcio's
calendars use the official "SQ.B"/"SQ.C" names, matched here by club within the same girone.
Teams with no confident match get no letter (e.g. Centrocampo in Pulcini 2017 girone L).

    python3 scripts/cbs_letters.py      # run again after every Sprint e Sport CBS refresh"""
import collections, json, os, re, sys, unicodedata
from difflib import SequenceMatcher

sys.path.insert(0, os.path.dirname(__file__))
from scrape_giocaacalcio import scrape

ROOT = os.path.join(os.path.dirname(__file__), "..")
CBS = os.path.join(ROOT, "data", "cbs.json")
BASE = "https://giocaacalcio.it/index.php/component/joomsport/calendar/"
CAL = {"e14": BASE + "4983-campionato-2014-torino-esordienti-2-anno-autunno-2026-2027",
       "p16": BASE + "4980-campionato-2016-torino-pulcini-2-anno-autunno-2026-2027",
       "p17": BASE + "4979-campionato-2017-torino-pulcini-1-anno-autunno-2026-2027"}
ALIAS = {"SG CHIERI": "SAN GIACOMO CHIERI", "ABS LA LOGGIA": "ABSOLUTE S G LA LOGGIA",
         "ABSOLUTE MONCA": "ABSOLUTE MONCALIERI", "GARINO": "POL GARINO",
         "CARMAGNOLA": "CSF CARMAGNOLA QUEENCAR", "SANTENA": "SANTENA 2014",
         "CBS": "CBS SCUOLA CALCIO ASD"}


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().upper()
    return re.sub(r"[^A-Z0-9 ]+", " ", s).split()


def split(n):
    m = re.search(r"\s+SQ\.?\s*([A-D])\s*$", n, re.I)
    return (n[:m.start()], m.group(1).upper()) if m else (n, "A")


def main():
    X = json.load(open(CBS))
    names = {}
    for key, url in CAL.items():
        by = collections.defaultdict(set)
        for m in scrape(url):
            by[m["g"]].update([m["h"], m["a"]])
        names[key] = by
    for T in X["teams"]:
        key = T["k"][:3]
        if T.get("src") != "sse" or key not in CAL:
            continue
        cands = [split(n) for n in names[key][T["gir"]]]
        s = []
        for n in T["t"]:
            a = " ".join(norm(n))
            a = ALIAS.get(a, a).split()
            def score(c):
                b = norm(c[0])
                return SequenceMatcher(None, " ".join(a), " ".join(b)).ratio() + 0.4 * (a[0] in b)
            best = max(cands, key=score)
            s.append(best[1] if score(best) >= 0.9 else None)
        T["s"] = s
        print(T["k"], T["gir"], [f"{n}:{x or '-'}" for n, x in zip(T["t"], s)])
    json.dump(X, open(CBS, "w"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
