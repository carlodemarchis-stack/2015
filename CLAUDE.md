# 2015: Esordienti 1° anno 2015 Torino

Static site for parents: 11 gironi, 102 squadre, fixtures, fields, maps, scores and standings.
LIVE at https://2015.aguywithascarf.com (repo carlodemarchis-stack/2015, GitHub Pages from `main` root).
Started as a Cowork artifact (https://claude.ai/artifact/FXF6PXy2bjCJ9r4FAQB5rP); the original page
and its handoff notes are in `legacy/`.

## Files
- `index.html` markup, `base.css` original styles (shared), `app.css` additions, `app.js` all logic (loads `data/*.json`).
- `poly.js` (shared): "Tutti contro tutti" polygon, `polyChart(el, {teams:[{n,pts,me}], ms:[[i,j,gi,gj]|[i,j]]})`, teams in
  standings order; a tab of the Classifica modal (index.html) and of the team detail (cbs.html). Phone width = rank numbers.
- `pins.js` (shared): `pinIcon`, `declutter` (map labels never overlap: leader line + dot), `resetCtl` ("Tutti" button).
- Classifica modal tabs (its top bar): Classifica / Mappa (fields of the girone) / Tutti contro tutti, hash
  `#classifica/I`, `#classifica/I/mappa`, `#classifica/I/tutti`; one view at a time, no scrolling.
- `cbs.html` + `cbs.js` + `cbs.css`: page with the 18 CBS Scuola Calcio teams (own girone: giornate + standings).
  15 teams from `data/cbs.json` (Sprint e Sport snapshot), the 3 Esordienti 2015 teams from this site's own data.
- `data/teams_matches.json` calendar from the FIGC PDF: per girone `t` teams
  {n name, s squad letter, c field, o home time, dom home on Sunday, a address, y/x lat/lon, ap approx},
  `m` = [giornata, Saturday dd/mm/yy, homeIdx, awayIdx], homeIdx -1 = riposo.
- `data/road_distances.json` OSRM car km/min, key "awayLat,awayLon;homeLat,homeLon".
- `data/live.json` written by `scripts/update.py`: real date/time, score, match id from giocaacalcio.it,
  keyed to our team indexes. The page prefers it over the computed day/time.
- `data/logos.json` club logo per team, from `scripts/fetch_logos.py` (files in `logos/`).
- `.github/workflows/update.yml` runs the update every 3h Sat/Sun, daily otherwise; commits only on change.

## Rules
- **Data sources.** giocaacalcio.it is used ONLY for standings, calendar (real date/time, home/away)
  and match results (`data/live.json`), plus club logos (`data/logos.json`). Everything about a team
  (name, field, address, home time, Sunday flag) comes ONLY from the LND PDF (`teams_matches.json`).
  Never copy team data from giocaacalcio, even where the PDF is missing it (Lascaris 1954 C has no field).
- Italian UI. No em-dashes, no "not X but Y" constructions. Plain text.
- Umami website id 15e9daf4-be09-4ec6-9d6d-eee4b0c92bf3; open the site with `?noumami` (see parent CLAUDE.md).
- `localStorage['esordienti2015_mia_squadra']` = "G|index" for "Segui questa squadra"; never rename it.
- Hash state: `#squadra/I/1/cal|grid|map`, `#classifica/F[/mappa|/tutti]`, `#calendario/3`, `#calendario/tutte`, `#novita`, `#statistiche` (Risultati, default), `#statistiche/societa`, `#mappa`.
- If giocaacalcio renames a team, `update.py` fails loudly: add the name to `NAME_FIX`.
- Social preview: `img/og.png` (1200x630, headless-Chrome screenshot of the main grid), referenced as `og.png?v=1`;
  bump `v` when replacing it. Favicon `favicon.svg`, iOS icon `img/apple-touch-icon.png`.
- Version + release notes: `data/releases.json` (newest first, Italian). The footer badge and the Novità
  modal (`#novita`) read it. Add an entry and bump the version when shipping a user-facing change.
- Cache busting: `app.css?v=N` / `app.js?v=N` in index.html. Bump N on every change to either file,
  or browsers mix a fresh index.html with a stale app.js. JSON data uses `cache:"no-cache"`.
- Club codes for the Calendario "Tutte" grid: `data/abbr.json` (57 clubs, 3 letters, unique). A new club
  needs a code there, or the page falls back to the first 3 letters of its name.
- Manual results: `data/manual.json`, rows `[girone, home, squad, away, squad, "h-a", note]` with LND PDF
  names, plus optional meta {since, reads, lock}. Filled by scripts/sse/merge.py (or dictated by Carlo). A manual
  score fills a match with no score; on a conflict giocaacalcio wins for the first 24h, then the manual score wins
  if it was read at least twice (meta.reads >= 2) or Carlo locked it (meta.lock: he knows from the club). The losing
  score goes in live.json as alt (7th element) and both pages show an asterisk with "risulta anche X".
  The pages never name the sources (no giocaacalcio / Sprint e Sport anywhere visible, Carlo's rule). Never fetch Sprint e Sport (`/webservices/` is disallowed in its robots.txt) or
  tuttocampo (403 to bots) from scripts or the Action.
- Short club names for phone portrait: `data/short.json` (57 clubs, max 13 chars). Portrait-only CSS lives in
  `@media (max-width:600px) and (orientation:portrait)`; landscape and desktop must not change with it.
- CBS page data (`data/cbs.json`): refreshed ONLY when Carlo asks ("leggi Sprint e Sport CBS"), in the
  browser pane: on sprintesport.it run the page's own getResults fetch for the 15 gironi listed in cbs.json
  (comitato/categoria/girone ids are in the session notes: Promozione 2/2/4, U19 Torino 4/195/2, U17/U16/U15
  Elite 2/232|344|233/1, U14 qualif 92/174/56, U15F 2/182/2, Esordienti 2014 4/241/8|7, Pulcini 2016
  4/249/8|14|12, Pulcini 2017 4/250/9|12|13). Keep only giornata, dataorap, teams, risultato: the feed also
  carries submitters' emails, never store them. Transfer: set window.name to the JSON, navigate the tab to a
  local page that POSTs it to a localhost receiver (an https page cannot reach localhost directly).
- CBS squad letters: `scripts/cbs_letters.py` adds `s` (A/B/C) to the Esordienti 2014 and Pulcini 2016/2017
  teams of cbs.json from the giocaacalcio calendars (allowed source); rerun it after every CBS refresh.
  Official letters: Pulcini 2016 B = girone L, C = girone N. CBS favourite: localStorage `cbs_preferita`.
- CBS fields and maps: `data/cbs_fields.json` from `scripts/cbs_fields.py` (manual, needs PyMuPDF) reading the LND
  Torino calendars in `source/` (CU 19 Torino, 3 Oct 2026: L9 Esordienti 2° anno, O9 Pulcini 2° anno, Q9 Pulcini
  1° anno). `teams` = per CBS team key, fields aligned to cbs.json `t`; `dist` = car km/min from the CBS field
  (Corso Sicilia 58, Torino; call it that in the UI) via OSRM (curl: the system Python fails its TLS handshake).
  Agonistica teams too (since 13 Oct): Promozione, Under 19 Torino, Under 17/16/15 Elite (= "Prima serie" in the
  regional SGS PDF), Under 15 femminile, Under 14 (no field list: home field from its own matches); the PDF per
  team is in `PDF` of the script. Regional PDFs leave the home day blank = championship default, so `day` is "".
  Rerun after a CBS refresh if the teams change; check the printed matches and any coordinate far from Piemonte.
- CBS team detail tabs (title bar): Classifica / Mappa / Tutti contro tutti, one view at a time (body.v-cla|v-map|v-poly),
  in the hash as `#pro/7/mappa` or `#e15b/tutti`; the polygon is drawn when its tab shows.
- CBS team list tabs: "Squadre" and "Questo weekend" (`#weekend`): map + list of every CBS match of the coming
  (or current) Saturday/Sunday, from cbs.json + live data, fields from cbs_fields.json.
- CBS page version + release notes: `data/releases_cbs.json` (newest first, Italian), separate from the main
  site's `releases.json`; footer badge "vX · Novità" opens them. Add an entry or note on every user-facing
  change to cbs.html/cbs.js/cbs.css.
- "Aggiorna" / "leggi Sprint e Sport" (Carlo's call: giocaacalcio stays the reference and the Action's source;
  Sprint e Sport is read by hand because its results arrive first): tools in `scripts/sse/`. Start
  `python3 scripts/sse/recv.py` (background), copy `scripts/sse/recv.html` into the preview folder as `_recv.html`,
  run `scripts/sse/read.js` in the browser pane on www.sprintesport.it, navigate that tab to the preview's
  `/_recv.html`, then `python3 scripts/sse/merge.py $TMPDIR/sse_raw.json` and `python3 scripts/update.py`.
  merge.py updates cbs.json (CBS page) and manual.json (2015 site, names matched to the LND teams of the same
  giornata; exits on a weak match), keeps scores only for matches started >= 2h ago; update.py then prints every open conflict
  (report those to Carlo, never a conflicting score as a plain new result). giocaacalcio cells with class
  so_not_played carry placeholder scores (seen 1-0 for a 1-10).
