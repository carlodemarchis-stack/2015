"""Fields of the Sprint e Sport CBS gironi (Esordienti 2014, Pulcini 2016/2017) from the LND Torino PDFs
in source/ (CU 19 Torino, 3 Oct 2026). Writes data/cbs_fields.json: per CBS team key, one entry per team
of T["t"] (same order) with LND name n, field c, address a, home time o, Sunday flag dom, lat y / lon x,
under "teams"; "dist" = car km/min from Cavoretto (CBS field, "from") to every field of the 11 CBS gironi
with fields (the Esordienti 2015 ones included), key "lat,lon", via the public OSRM demo server.
Coordinates: reused from teams_matches.json when the address is already there, else Nominatim (1 req/s).
Manual, local run (needs PyMuPDF): python3 scripts/cbs_fields.py"""
import json, os, re, subprocess, sys, time, urllib.parse, urllib.request
from difflib import SequenceMatcher
import fitz

sys.path.insert(0, os.path.dirname(__file__))
from cbs_letters import ALIAS, norm

ROOT = os.path.join(os.path.dirname(__file__), "..")
PDF = {"e14": "Calendario_ESORDIENTI-2-ANNO_2014_TORINO.pdf",
       "p16": "Calendario_PULCINI-2-ANNO_2016_TORINO.pdf",
       "p17": "Calendario_PULCINI-1-ANNO_2017_TORINO.pdf"}
CITY = {"Riva Presso Chieri": "Riva presso Chieri", "Caselle T.Se": "Caselle Torinese",
        "Moncalieri - Loc. Testona": "Moncalieri"}


def title(s):
    s = " ".join(s.split()).title()
    return re.sub(r"\b(Di|Del|Della|Delle|Dei|E|Presso|Alle|Al)\b", lambda m: m.group(1).lower(), s)


def fields(path):
    """{girone: [(name, letter, field, city, time, dom, address)]} from the ELENCO CAMPI tables."""
    text = "\n".join(p.get_text() for p in fitz.open(path))
    out, gir = {}, None
    for line in text.splitlines():
        m = re.search(r"\*\*\s+.*GIRONE:\s+([A-Z])", line)
        if m and line.startswith("|"):
            gir = m.group(1)
            continue
        c = [x for x in line.split("|")]
        if gir and len(c) >= 6 and re.fullmatch(r"\s*\d+\s*", c[2]):
            name = c[1].rstrip()
            sq = re.search(r"\s*SQ\.([A-D])$", name, re.I)
            letter = sq.group(1).upper() if sq else "A"
            name = name[:sq.start()].strip() if sq else name.strip()
            mid = c[3]
            out.setdefault(gir, []).append(dict(
                n=name, s=letter, field=mid[1:33].strip(), city=mid[33:59].strip(),
                dom=mid[59:].strip() == "DOM", o=c[4].strip(), a=c[5].strip()))
    return out


def geocode(a, city, known):
    k = (re.sub(r"\W", "", a.upper()), city.upper())
    if k in known:
        return known[k]
    c = CITY.get(city, city)
    a2 = re.sub(r"\bC\.\s*So\b", "Corso", a, flags=re.I)
    a2 = re.sub(r",?\s*(\d+)(/\w)?", r" \1", a2)
    street = re.sub(r" \d+.*", "", a2)
    for q in (f"{a2}, {c}", f"{street}, {c}", f"{c}, Torino"):
        u = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
            dict(q=q, format="json", limit=1, countrycodes="it"))
        time.sleep(1.1)
        j = json.load(urllib.request.urlopen(urllib.request.Request(
            u, headers={"User-Agent": "carlo-esordienti-calendar/1.0"}), timeout=20))
        if j:
            r = (round(float(j[0]["lat"]), 5), round(float(j[0]["lon"]), 5), q != f"{a2}, {c}")
            known[k] = r
            return r
    return None


FROM = (45.03787, 7.68004)


def road(b):
    u = (f"https://router.project-osrm.org/route/v1/driving/{FROM[1]},{FROM[0]};{b[1]},{b[0]}?overview=false")
    for _ in range(3):
        try:
            # curl: the system Python's TLS fails the handshake with the OSRM server
            r = json.loads(subprocess.run(["curl", "-s", "-m", "20", "-A", "carlo-esordienti/1.0", u],
                                          capture_output=True, text=True).stdout)["routes"][0]
            time.sleep(0.4)
            return [round(r["distance"] / 1000, 1), round(r["duration"] / 60)]
        except Exception:
            time.sleep(2)
    return None


def distances(X, res, D):
    pts = {(r["y"], r["x"]) for rows in res.values() for r in rows if "y" in r}
    for T in X["teams"]:
        if T.get("src") == "2015":
            pts |= {(t["y"], t["x"]) for t in D[T["gir"]]["t"] if t.get("y") is not None}
    return {f"{y},{x}": ([0, 0] if (y, x) == FROM else road((y, x))) for y, x in sorted(pts)}


def main():
    X = json.load(open(os.path.join(ROOT, "data", "cbs.json")))
    known = {}
    D = json.load(open(os.path.join(ROOT, "data", "teams_matches.json")))
    for v in D.values():
        for t in v["t"]:
            if t.get("y") and t.get("a"):
                known[(re.sub(r"\W", "", t["a"].upper()), t["c"].split(" · ")[-1].upper())] = (t["y"], t["x"], bool(t.get("ap")))
    pdf = {k: fields(os.path.join(ROOT, "source", f)) for k, f in PDF.items()}
    res = {}
    for T in X["teams"]:
        key = T["k"][:3]
        if T.get("src") != "sse" or key not in PDF:
            continue
        cands = pdf[key][T["gir"]]
        rows = []
        for i, n in enumerate(T["t"]):
            letter = (T.get("s") or [None] * len(T["t"]))[i]
            a = " ".join(norm(n))
            a = ALIAS.get(a, a)

            def score(c):
                b = " ".join(norm(c["n"]))
                return (SequenceMatcher(None, a, b).ratio() + 0.4 * (a.split()[0] in b.split())
                        + 0.5 * (letter == c["s"]))
            best = max(cands, key=score)
            city = title(best["city"])
            g = geocode(title(best["a"]), city, known)
            rows.append(dict(n=best["n"], s=best["s"], c=f'{title(best["field"])} · {city}', o=best["o"],
                             dom=best["dom"], a=title(best["a"]), **({"y": g[0], "x": g[1]} if g else {}),
                             **({"ap": True} if g and g[2] else {})))
            print(T["k"], T["gir"], f"{n:22} -> {best['n']} {best['s']} | {rows[-1]['c']} | {rows[-1]['a']} | {g}", flush=True)
        if len({r["n"] + r["s"] for r in rows}) != len(rows):
            print("!! duplicate match in", T["k"])
        res[T["k"]] = rows
    out = {"from": list(FROM), "dist": distances(X, res, D), "teams": res}
    json.dump(out, open(os.path.join(ROOT, "data", "cbs_fields.json"), "w"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
