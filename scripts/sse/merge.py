"""Merge a Sprint e Sport browser reading ({"e15":{girone:rows},"cbs":{key:rows}}, rows = [giornata, dataorap,
home, away, risultato]) into data/cbs.json (CBS page) and data/manual.json (2015 site). Scores only for
matches started >= 2h ago; giocaacalcio wins on the 2015 site. Run from the repo root: python3 scripts/sse/merge.py $TMPDIR/sse_raw.json, then python3 scripts/update.py"""
import json, re, sys, unicodedata
from datetime import datetime, timedelta
from difflib import SequenceMatcher
raw = json.load(open(sys.argv[1])); now = datetime.now(); NOTE = f"Sprint e Sport, letto {now:%d/%m %H:%M}"
assert not re.search(r"@[a-z0-9.-]+\.[a-z]{2,}", json.dumps(raw)), "email in data"
ok = lambda dt: now - datetime.strptime(dt, "%Y-%m-%d %H:%M") >= timedelta(hours=2)
clean = lambda sc: (sc or "").split("\n")[0].strip()
# --- CBS page
X = json.load(open("data/cbs.json")); cch = []
for T in X["teams"]:
    if T.get("src") != "sse": continue
    rows = raw["cbs"][T["k"]]
    extra = {n for r in rows for n in r[2:4]} - set(T["t"])
    if extra: sys.exit(f"new team names in {T['k']}: {extra}")
    old = {(m[0], m[2], m[3]): m for m in T["m"]}; m = []
    for n, dt, h, a, sc in rows:
        tav = "TAV" in (sc or ""); sc = clean(sc)
        if re.fullmatch(r"\d+-\d+", sc) and not ok(dt): sc, tav = "", False
        r = [n, dt, T["t"].index(h), T["t"].index(a), sc] + (["TAV"] if tav else [])
        o = old.get((n, r[2], r[3]))
        if o != r: cch.append(f"{T['k']} {n}ª {h}-{a}: {o[1][5:] if o else ''} {o[4] if o else ''} -> {dt[5:]} {sc}")
        m.append(r)
    T["m"] = m
X["updated"] = f"{now:%Y-%m-%dT%H:%M}"
json.dump(X, open("data/cbs.json", "w"), ensure_ascii=False, separators=(",", ":"))
# --- 2015 site
D = json.load(open("data/teams_matches.json")); L = json.load(open("data/live.json"))["m"]; M = json.load(open("data/manual.json"))
def nz(s): return " ".join(re.sub(r"[^A-Z0-9 ]", " ", unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().upper()).split())
def sim(a, b):
    a, b = nz(a), nz(b); return SequenceMatcher(None, a, b).ratio() + 0.5 * (a.split()[0] in b.split() or b.split()[0] in a.split())
idx = {tuple(r[:5]): r for r in M}; mch = []; wait = []; conflict = []
NOW = f"{now:%Y-%m-%dT%H:%M}"
def meta_of(r):
    while len(r) < 8: r.append("" if len(r) == 6 else {})
    return r[7]
for g, rows in raw["e15"].items():
    t = D[g]["t"]
    for n, dt, h, a, sc in rows:
        sc = clean(sc)
        if not re.fullmatch(r"\d+-\d+", sc): continue
        best = max((r for r in L[g] if r[0] == n), key=lambda r: sim(h, t[r[1]]["n"]) + sim(a, t[r[2]]["n"]))
        if sim(h, t[best[1]]["n"]) + sim(a, t[best[2]]["n"]) < 1.6: sys.exit(f"weak match {g} {h}-{a}")
        H, A = t[best[1]], t[best[2]]; k = (g, H["n"], H["s"], A["n"], A["s"]); lab = f"{g} {n}ª {H['n']} {H['s']} {sc} {A['n']} {A['s']}"
        # the site already agrees with this score and shows no conflict (row oriented like k: H = t[best[1]])
        agree = re.sub(r"\s", "", best[4] or "") == sc and not (len(best) > 6 and best[6])
        if not ok(dt): wait.append(lab + f" (ore {dt[11:]})"); continue
        r = idx.get(k)
        if r and meta_of(r).get("lock"): continue
        if not r and agree: continue                         # both sources agree, nothing to keep
        if r and r[5] == sc:
            m = meta_of(r); m["reads"] = m.get("reads", 1) + 1; m.setdefault("since", NOW); r[6] = NOTE
        elif r:
            mch.append(f"{lab} (prima {r[5]})"); r[5] = sc; r[6] = NOTE; r[7] = {"since": NOW, "reads": 1}
        else:
            r = list(k) + [sc, NOTE, {"since": NOW, "reads": 1}]; M.append(r); idx[k] = r; mch.append(lab + " (nuova)")
open("data/manual.json", "w").write("[\n" + ",\n".join(" " + json.dumps(x, ensure_ascii=False) for x in M) + "\n]\n")
print("CBS:", len(cch), "changes"); [print("  ", c) for c in cch]
print("2015 manual:", len(mch)); [print("  ", c) for c in mch]
print("2015 waiting (<2h):"); [print("  ", c) for c in wait]
print("2015 conflicts: listed by scripts/update.py, run it next")
