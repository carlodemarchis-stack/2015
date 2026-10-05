# Esordienti 2015 Torino: handoff to Claude Code

Paste this whole file as the first message in Claude Code, from inside this folder.

## What exists
- A working single-page site, built in a Claude (Cowork) session and published as a claude.ai artifact:
  https://claude.ai/artifact/FXF6PXy2bjCJ9r4FAQB5rP (shared by link with parents).
- `index.artifact.html` is that exact page (artifact body: no doctype/head; claude.ai wraps it). All data, Leaflet CSS and three map images (base64) are inline, about 1.7 MB.
- Leaflet 1.9.4 loads from cdnjs.

## Features already built (keep them)
- 11 gironi (A-M, 102 teams) in cards; 6+5 per row on wide/landscape, 1 column on phone. Always-dark theme. Links in light blue.
- Each team: coloured dot with letter for squadra A (red), B (yellow), C (green), D (white). Header shows count per letter.
- Team modal, 3 tabs:
  - Partite: one row per giornata, columns round | date | time | opponent | Casa/Trasferta | surface (Sintetico/Erba/n.d. from field name) | field + address link to Google Maps. Riposo rows.
  - Calendario: Oct-Dec 2026 month grids, weekends wider, opponent name in match cells; tap goes to Partite row. Training Mon/Wed/Fri 17:30 shown only for CBS Scuola Calcio sq.B (girone I).
  - Mappa: Leaflet map of the team's fields with pins labelled by giornata (home pin green); list on the right with km/min by car (OSRM, precomputed) and Google Maps links; trip summary (avg km, avg min, longest).
- Header warning in modal: "Giorno e orario sono indicativi e vengono dall'elenco campi della squadra di casa."
- "Segui questa squadra" (localStorage key `esordienti2015_mia_squadra`, value `G|index`): highlights that team (yellow outline + star), same-club teams (soft green), legend chip opens it, stats and club map highlight that club. No hard-coded CBS highlight anymore.
- Top bar: Mappa (all 57 clubs' fields, searchable list, "Tutte" reset) and Statistiche (11 gironi, 102 squadre, 57 società, clubs grouped by number of teams).
- Book promo pill: "Leggi anche Diamo Un Calcio Alle Regole: Calcio Ribelle" -> https://www.amazon.it/Diamo-Calcio-Alle-Regole-Ribelle/dp/B0DF6CYZMV
- Footer: source note + "Produced with passion by Carlo De Marchis" -> https://www.linkedin.com/in/carlodemarchis/ (URL not verified, check).

## Data
- `data/teams_matches.json`: per girone `t` = teams {n name, s squad letter, c field, o home time, dom (home games on Sunday), a address, y/x lat/lon, ap approx position}; `m` = [giornata, round date dd/mm/yy (Saturday), homeIdx, awayIdx], homeIdx -1 = riposo. Match day = round date, +1 day if home team `dom`.
- Lascaris 1954 sq.C (girone H) has no field in the PDF; giocaacalcio gives Sat 14:30, Via Claviere 16, Pianezza.
- Two approximate positions: Pianezza via Ferrari 3; Chieri strada Andezeno 76.
- `data/road_distances.json`: OSRM car km/min, key "awayLat,awayLon;homeLat,homeLon".
- `source/`: original FIGC/LND PDF and its text.

## Live source for updates
- giocaacalcio.it calendar (all 423 matches, real day/time, score slot):
  https://giocaacalcio.it/index.php/component/joomsport/calendar/4982-campionato-2015-torino-esordienti-1-anno-autunno-2026-2027
- Standings: .../joomsport/table/4982-... ; teams: .../joomsport/teamlist/4982-... ; match page has field address.
- robots.txt allows all. Scores are user-submitted.
- On 2026-10-05, 419/419 matches matched our computed day/time exactly. `scripts/scrape_giocaacalcio.py` reproduces the read.
- Official changes: LND Torino comunicati https://piemontevda.lnd.it/comunicati-ufficiali-d-p-torino-2026-2027/ and variazioni https://piemontevda.lnd.it/variazioni-gare-delegazione-provinciale-torino/

## Next task (what Carlo wants)
1. Turn the artifact into a GitHub Pages site: new repo (e.g. `esordienti-2015-torino`), real `index.html` with doctype/head, data in `data/*.json` loaded by the page.
2. Replace the inline map images with live OSM tiles (attribution required).
3. Add Carlo's usual Umami snippet (ask him for script URL + website ID).
4. GitHub Action on a schedule (e.g. every 3h Sat/Sun, daily otherwise) running the scraper, merging scores/date changes into data, committing only when something changed. Show scores in Partite, a Risultati/Classifica view per girone.
5. Custom domain: CNAME e.g. esordienti.aguywithascarf.com -> <user>.github.io (Carlo adds the DNS record), set it in Pages settings, enforce HTTPS.
6. Afterwards the claude.ai artifact gets replaced by a "moved to" notice.

## Style rules for any text
Italian UI. No em-dashes, no "not X but Y" constructions. Keep it plain.
