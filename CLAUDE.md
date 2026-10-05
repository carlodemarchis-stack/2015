# 2015: Esordienti 1° anno 2015 Torino

Static site for parents: 11 gironi, 102 squadre, fixtures, fields, maps, scores and standings.
LIVE at https://2015.aguywithascarf.com (repo carlodemarchis-stack/2015, GitHub Pages from `main` root).
Started as a Cowork artifact (https://claude.ai/artifact/FXF6PXy2bjCJ9r4FAQB5rP); the original page
and its handoff notes are in `legacy/`.

## Files
- `index.html` markup + original styles, `app.css` additions, `app.js` all logic (loads `data/*.json`).
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
- Hash state: `#squadra/I/1/cal|grid|map`, `#classifica/F`, `#mappa`, `#statistiche`.
- If giocaacalcio renames a team, `update.py` fails loudly: add the name to `NAME_FIX`.
- Social preview: `img/og.png` (1200x630, headless-Chrome screenshot of the main grid), referenced as `og.png?v=1`;
  bump `v` when replacing it. Favicon `favicon.svg`, iOS icon `img/apple-touch-icon.png`.
- Version + release notes: `data/releases.json` (newest first, Italian). The footer badge and the Novità
  modal (`#novita`) read it. Add an entry and bump the version when shipping a user-facing change.
- Cache busting: `app.css?v=N` / `app.js?v=N` in index.html. Bump N on every change to either file,
  or browsers mix a fresh index.html with a stale app.js. JSON data uses `cache:"no-cache"`.
