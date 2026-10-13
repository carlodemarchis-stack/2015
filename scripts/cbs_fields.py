"""Fields of the Sprint e Sport CBS gironi from the LND PDFs in source/: Esordienti 2014 and Pulcini 2016/2017
(CU 19 Torino, 3 Oct 2026), Under 19 Torino (CU 17 Torino), Promozione (CU 7 regionale), Under 17/16/15
Elite = "Prima serie" (CU 5 regionale), Under 15 femminile (CU 25 regionale), Under 14 qualificazione
(CU 14 regionale: no field list, the home field comes from its own matches). Writes data/cbs_fields.json: per CBS team key, one entry per team
of T["t"] (same order) with LND name n, field c, address a, home day ("Sab"/"Dom"; "" when the PDF leaves it
to the championship default, as the regional ones do) and time o, lat y / lon x,
under "teams"; "dist" = car km/min from Cavoretto (CBS field, "from") to every field of the 11 CBS gironi
with fields (the Esordienti 2015 ones included), key "lat,lon", via the public OSRM demo server.
Coordinates: reused from teams_matches.json when the address is already there, else Nominatim (1 req/s).
Manual, local run (needs PyMuPDF): python3 scripts/cbs_fields.py"""
import json, os, re, subprocess, sys, time, urllib.parse, urllib.request
from difflib import SequenceMatcher
from datetime import date
import fitz

sys.path.insert(0, os.path.dirname(__file__))
from cbs_letters import ALIAS, norm

ROOT = os.path.join(os.path.dirname(__file__), "..")
# CBS team key (or its first 3 letters) -> (PDF in source/, championship name in the PDF or None, girone or None
# = the team's own "gir")
PDF = {"e14": ("Calendario_ESORDIENTI-2-ANNO_2014_TORINO.pdf", None, None),
       "p16": ("Calendario_PULCINI-2-ANNO_2016_TORINO.pdf", None, None),
       "p17": ("Calendario_PULCINI-1-ANNO_2017_TORINO.pdf", None, None),
       "pro": ("Calendari_ECC_PROMOZ_PRIMA_SECONDA_2026.pdf", "Promozione", "D"),
       "u19": ("Calendario_U19_Torino_2026.pdf", "JUNIORES UNDER 19 PROVINC. -TO", "B"),
       "u17": ("Calendari_SGS_Regionali_U17_U16_U15_2026.pdf", "REGIONALE U17 - PRIMA SERIE", "A"),
       "u16": ("Calendari_SGS_Regionali_U17_U16_U15_2026.pdf", "REGIONALE U16 - PRIMA SERIE", "A"),
       "u15": ("Calendari_SGS_Regionali_U17_U16_U15_2026.pdf", "REGIONALE U15 - PRIMA SERIE", "A"),
       "u15f": ("Calendari_U15_U17_Femminile_2026.pdf", "UNDER 15 FEMMINILE REGIONALE", "B"),
       "u14": ("Calendario_U14_Qualificazione_Regionale_2026.pdf", "MATCHES", "21")}
# Sprint e Sport short names the fuzzy match would miss (normalised -> LND name)
ALIAS2 = {"G CENTALLO": "GIOVANILE CENTALLO 2006", "CUNEO 1905": "A C CUNEO 1905 OLMO",
          "FULGOR CRV": "FULGOR CHIAVAZZESE R V"}
CITY = {"Riva Presso Chieri": "Riva presso Chieri", "Caselle T.Se": "Caselle Torinese",
        "Moncalieri - Loc. Testona": "Moncalieri", "Fenis": "Fenis, Valle d'Aosta"}


def title(s):
    s = " ".join(s.split()).title()
    return re.sub(r"\b(Di|Del|Della|Delle|Dei|E|Presso|Alle|Al)\b", lambda m: m.group(1).lower(), s)


def fields(path):
    """{(championship, girone): [dict(n, s, field, city, dom, o, a)]} from the ELENCO CAMPI tables. Column
    positions come from each table's header row: some PDFs split the "DOM" flag over two cells."""
    text = "\n".join(p.get_text() for p in fitz.open(path))
    out, key, ti, loc = {}, None, None, None
    for line in text.splitlines():
        m = re.search(r"\*\*\s+(.+?)\s+GIRONE:\s+(\S+)", line)
        if m and line.startswith("|"):
            key = (m.group(1).strip(), m.group(2))
            continue
        c = line.split("|")
        if "SOCIETA'" in line and "ORA" in line:
            ti = next(i for i, x in enumerate(c) if x.strip() == "ORA")
            loc = "".join(c[3:ti]).find("LOCALITA'")
            continue
        if key and ti and len(c) > ti + 1 and re.fullmatch(r"\s*\d+\s*", c[2]):
            name = c[1].rstrip()
            sq = re.search(r"\s*SQ\.([A-D])$", name, re.I)
            letter = sq.group(1).upper() if sq else "A"
            name = name[:sq.start()].strip() if sq else name.strip()
            mid = "".join(c[3:ti])
            day = re.search(r"\b(DOM|SAB)\s*$", mid)
            body = mid[:day.start() if day else None]
            parts = re.split(r"\s{2,}", body.strip())  # field and town, when a double space separates them
            fld, city = (parts[0], " ".join(parts[1:])) if len(parts) > 1 else (body[:loc].strip(), body[loc:].strip())
            out.setdefault(key, []).append(dict(
                n=name, s=letter, field=fld, city=city,
                day=day.group(1).title() if day else "", o=c[ti].strip(), a=c[ti + 1].strip()))
    return out


def match_fields(path, gir):
    """Under 14 PDF: no field list; one line per match (home, away, field, date, time, round, town, address).
    Each team's home field is the one of its first home match."""
    text = "\n".join(p.get_text() for p in fitz.open(path))
    out, on = {}, False
    for line in text.splitlines():
        if line.startswith("GIRONE"):
            on = line.split()[1] == gir
            continue
        m = on and re.match(r"(.{26})(.{26})(.{30})\s*(\d+)/(\d+)/(\d+)\s+(\d+:\d+)\s+\d+[AR]\s+(.+?)\s{2,}(.+?)\s*$", line)
        if m and m.group(1).strip() not in out:
            d = date(2000 + int(m.group(6)), int(m.group(5)), int(m.group(4)))
            out[m.group(1).strip()] = dict(n=m.group(1).strip(), s="A", field=m.group(3).strip(), city=m.group(8).strip(),
                                           day=["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"][d.weekday()],
                                           o=m.group(7), a=m.group(9).strip())
    return {("MATCHES", gir): list(out.values())}


def geocode(a, city, known):
    k = (re.sub(r"\W", "", a.upper()), city.upper())
    if k in known:
        return known[k]
    c = CITY.get(city, city)
    a2 = re.sub(r"\bC\.\s*So\b", "Corso", a, flags=re.I)
    a2 = re.sub(r",?\s*(\d+)(/\w)?", r" \1", a2)
    street = re.sub(r" \d+.*", "", a2)
    for q in (f"{a2}, {c}", f"{street}, {c}", c):
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
    try:  # coordinates already found on earlier runs
        for rows in json.load(open(os.path.join(ROOT, "data", "cbs_fields.json")))["teams"].values():
            for r in rows:
                if "y" in r:
                    known[(re.sub(r"\W", "", r["a"].upper()), r["c"].split(" · ")[-1].upper())] = (r["y"], r["x"], bool(r.get("ap")))
    except FileNotFoundError:
        pass
    parsed = {}
    res = {}
    for T in X["teams"]:
        key = T["k"] if T["k"] in PDF else T["k"][:3]
        if T.get("src") != "sse" or key not in PDF:
            continue
        f, camp, gir = PDF[key]
        if f not in parsed:
            path = os.path.join(ROOT, "source", f)
            parsed[f] = match_fields(path, gir) if camp == "MATCHES" else fields(path)
        cands = [r for (cp, g), rows in parsed[f].items() if (camp is None or cp == camp) and g == (gir or T["gir"]) for r in rows]
        rows = []
        for i, n in enumerate(T["t"]):
            letter = (T.get("s") or [None] * len(T["t"]))[i]
            a = " ".join(norm(n))
            a = ALIAS2.get(a, ALIAS.get(a, a))

            def score(c):
                b = " ".join(norm(c["n"]))
                return (SequenceMatcher(None, a, b).ratio() + 0.4 * (a.split()[0] in b.split())
                        + 0.5 * (letter == c["s"]))
            best = max(cands, key=score)
            city = title(best["city"])
            g = geocode(title(best["a"]), city, known)
            # the Torino attività di base PDFs flag only Sunday: blank there means Saturday
            day = best["day"] or ("Sab" if camp is None else "")
            rows.append(dict(n=best["n"], s=best["s"], c=f'{title(best["field"])} · {city}', o=best["o"],
                             day=day, a=title(best["a"]), **({"y": g[0], "x": g[1]} if g else {}),
                             **({"ap": True} if g and g[2] else {})))
            print(T["k"], T["gir"], f"{n:22} -> {best['n']} {best['s']} | {rows[-1]['c']} | {rows[-1]['a']} | {g}", flush=True)
        if len({r["n"] + r["s"] for r in rows}) != len(rows):
            print("!! duplicate match in", T["k"])
        res[T["k"]] = rows
    out = {"from": list(FROM), "dist": distances(X, res, D), "teams": res}
    json.dump(out, open(os.path.join(ROOT, "data", "cbs_fields.json"), "w"), ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
