> The site has a FR / EN switch and is live at https://tours-two-ashen.vercel.app (English at `/en/`); the French source lives at https://github.com/MuriellekPINSO/Benin3D.

# Cotonou 3D

Cotonou, Abomey-Calavi, Ganvié and Ouidah in 3D in the browser. On start-up, Google's real view
(satellite imagery and terrain) is displayed under the model; the 3D model is built on the buildings
detected by Google (Google Open Buildings, 660,000 footprints on top of OpenStreetMap's 88,000) and on
OpenStreetMap's streets (12,000 roads), Lake Nokoué and the coastline. The major places are rebuilt
from photos, and the **Zém Run** game lets you discover the neighbourhoods on the handlebars of a zémidjan
or aboard a tokpa-tokpa.

## Try it

**Online, nothing to install**: https://tours-two-ashen.vercel.app — Vercel project "tours", linked
to this repository: every push to `main` republishes it. The Google key there is an environment variable
of the project (`VITE_GOOGLE_MAPS_KEY`), to be restricted to the domain in the Google Cloud console.

**On your own computer** (Node.js 20 or later):

```bash
git clone https://github.com/MuriellekPINSO/Benin3D.git
cd Benin3D
npm install
npm run dev          # then open http://localhost:5173
```

Everything you need is in the repository: city data, buildings, 3D models, photos and
videos. For Google's real view and Street View, copy `.env.example` to `.env.local` and put
a Google Maps key in it (optional). The tour plays "Agolo" by Angélique Kidjo (`public/audio/agolo.mp3`): a copyrighted work, whose
rights still have to be obtained before any public release.

Things to try: the tour (Tour button), the real view, the "On site" cards, the weather
(M key), and Zém Run — ↑ accelerate, ↓ brake, E interact, at a junction slow down then ← or → (T: straight on)
to turn; Xbox or PlayStation controllers are supported.

## Unversioned files

- `.env.local`: the Google Maps key (see below).
- `sources/masques/` and `sources/art/`: original 3D models (Tripo, 60 to 72 MB each);
  the lightweight versions used by the site are in `public/modeles/`.
- `osm/`: raw OpenStreetMap and Google Open Buildings extracts (read by `npm run donnees`).

## Running the project

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # publishable version in dist/
npm run preview    # serves dist/ for checking
npm run verifier   # ESLint on src/
```

## Project structure

| Folder, file | Contents |
| --- | --- |
| `index.html` | page, interface (panels, dock, game, tour) |
| `src/main.js` | start-up and render loop |
| `src/scene.js` | rendering, camera, sky, lights |
| `src/ville.js` | ground, water, roads, buildings, palm trees, containers, ships |
| `src/lieux.js` | rebuilt monuments (Étoile Rouge, Amazone, Marina, Congrès, cathedral, stadium, port, airport, Dantokpa, Ganvié, Corniche, UAC, Sèmè One) |
| `src/lieux-videos.js` | places surveyed from the drone videos: Sofitel, BCEAO tower, Erevan and Bio Guéra, airport roundabout, Zongo mosque, cemetery |
| `src/vehicules.js` | zémidjans from "3D monde" (`moto-taxi.glb`, `zem.glb`), tokpa-tokpa, cars |
| `src/trafic.js` | traffic: zémidjans, tokpa-tokpa at the gates of the city, street lamps |
| `src/jeu.js` | Zém Run: lines, obstacles, stops, quiz |
| `src/bordure.js` | what makes a route recognisable: signs of real shops (OSM) by the roadside, petrol stations, container shops, kpayo, MoMo kiosks, tyre repairers, power poles, street signs, an "on your right: …" card in front of monuments, minimap |
| `src/google.js` | Street View, 3D satellite view, "Real view", photos for the game cards |
| `src/satellite.js` | satellite ground (Map Tiles) under the city |
| `src/rue.js` | street dressing around the camera (400 m squares, close-up view and game): boundary walls and corrugated-iron gates, houses behind the walls where OSM has nothing, shops with metal shutters and awnings, paved pavements, solar street lamps, 4 × 3 billboards, painted lettering, poles and wires, water tanks on the roofs |
| `src/facades.js` | facade atlas (garage doors, shops, louvred shutters, balconies, unfinished upper floor) |
| `src/ouidah.js` | Porte du Non-Retour and Arène de Ouidah (adapted from the "Arène de Ouidah" artifact, realigned on the Google satellite view), mask show in the arena |
| `src/monde-reel.js` | "Real view": Google's 3D under the model, with the Google camera matched to ours every frame (same position, heading, tilt and field of view) |
| `src/altitude.js` | ground elevation (AWS Terrarium tiles, open data) to align the Google camera |
| `src/discussions.js` | Zém Run that talks (Danfo Run style): bubbles above people, groups chatting by the roadside, vendors calling out, reactions to the horn, the zém's passenger who haggles over the price and makes small talk (answers 1, 2, 3), the union fare collector, the tokpa-tokpa apprentice |
| `src/voix.js` | The characters speak out loud: the browser's speech synthesis (free, no key), a female or male voice per person, only those near the zém; dialogue takes priority over chit-chat. "Character voices" option in the game menu |
| `src/regles.js` | Zém Run's highway code (Schekina's specification): traffic lights along the route (the real OSM lights it passes through), police and fine for running a red light, accidents (police report or the passenger gets off) |
| `src/feux.js` | The 81 real traffic lights and 38 real pedestrian crossings from OpenStreetMap (`osm/feux.json`, Overpass), placed in the city with a cycle synchronised per junction |
| `src/terre-pleins.js` | Central medians of the dual-carriageway boulevards (computed by `scripts/donnees.mjs`, aligned with the Google satellite view): road markings, concrete divider or planted grass depending on the width |
| `src/remise.js` | What you buy, you receive: the banknote goes to the vendor, the item (water, doughnuts, petrol, helmet, credit card, souvenir…) lands in the hand of the zém or the passenger |
| `src/musique.js` | Game music by neighbourhood, composed on the fly (Web Audio, original patterns, no copyrighted track), and the event's "concert" mood |
| `src/multijoueur.js` | Two-player mode: direct connection between browsers (WebRTC via the PeerJS public service), 4-letter code; each player sees the other's vehicle and hears their horn |
| `src/evenement.js` | Concert on the Esplanade de l'Amazone (stage, screen, lights, dancing crowd), 50 F entry in game currency |
| `src/personnages.js` | Realistic, animated Beninese characters (Tripo models with a skeleton): loading, choice by gender or role (police officer, zém), animations (idle, walking, greeting, talking, phone, seated, laughing), head and hand tracked for the bubbles, the helmet and the objects handed over. Without them, the game keeps its code-drawn characters |
| `src/pietons.js` | Zém Run passers-by: they walk on the pavements along the ride and cross at the pedestrian crossing when the light is red for motorbikes (accident if you hit them on red); market women with their basin on their head |
| `src/missions.js` | missions (3 at a time), savings, day streak, garage (horns, new helmet, super jump) |
| `src/artisans.js` | craft markets (Porte du Non-Retour, Arène, Place de l'Amazone): 3D art objects, haggling with the vendor, payment from the savings, "My souvenirs" |
| `src/publicites.js` | catalogue of advertising campaigns (billboards in the city and the game), counted impressions, offer for advertisers |
| `src/batiments-google.js` | Google Open Buildings loaded in 1 km tiles around the camera |
| `src/meteo.js` | weather (dock button, M key): sun, clouds, tropical rain, storm with lightning and synthesised thunder; slippery road in Zém Run |
| `src/manette.js` | Xbox / PlayStation controllers (Gamepad API): driving, answers, menus, moving around the city, vibration |
| `src/surplace.js` | "On site" tab of the cards: photos taken in Cotonou and clips from the drone videos (`npm run photos`) |
| `src/egungun.js` | Egungun masks (supplied 3D models, or a drawn fallback version), raffia Zangbeto, game processions |
| `src/explorer.js` | filters, radio, Tour mode |
| `src/interface.js` | labels, cards, camera flights, compass and scale |
| `src/ambiances.js` | day, evening, night |
| `src/donnees-lieux.js` | texts for the places and neighbourhoods |
| `src/etat.js` | state shared between modules |
| `public/donnees/cotonou.json.gz` | city data, produced by `npm run donnees` |
| `public/modeles/` | 3D models served by the page |
| `sources/` | original "3D monde" models, from which `npm run modeles` derives the lightweight versions |
| `public/audio/radio.mp3` | music for the Radio button |
| `public/audio/agolo.mp3` | "Agolo" by Angélique Kidjo, played during the tour (Tour) — a copyrighted work: get the rights before any public release |
| `sources/art/` | original art objects (Tripo); `npm run masques` derives `public/modeles/{tete-sculptee,portrait-cubiste,sphere-rouge,statue,creature-paille}.glb` from them |
| `sources/masques/` | original mask models (Tripo, ~2 M triangles); `npm run masques` derives `public/modeles/zangbeto.glb`, `egungun-traditionnel.glb`, `egungun-groupe.glb` (~1 MB each) from them |
| `scripts/donnees.mjs` | OSM → `cotonou.json.gz` (buildings, roads, water; game lines along the main roads and past the monuments, with street names and nearby shops) |
| `scripts/modeles.mjs` | lightweight versions of the zémidjans for the traffic |
| `artefact/` | old single-HTML-file version (claude.ai artifact) |

## Google Maps

The key goes in `.env.local` (never committed):

```
VITE_GOOGLE_MAPS_KEY=…
```

It is used for:
- **See it for real** (a place's card): Street View 360° photo and 3D satellite view — *Maps JavaScript* API;
- **Real view** (dock): Google's 3D is displayed under the model, matched to the camera, while exploring as well as in
  Zém Run — *Maps JavaScript* API. The **Model** button adds our buildings, trees and monuments on top;
  during the game they are always there (and our roads too), because the satellite image is blurry at ground level;
- **photos in Zém Run**: the Street View photo of the monument you ride past and of the stop being served — *Maps JavaScript* API;
- **Satellite ground** (dock): the satellite tiles under the 3D buildings — *Map Tiles* API.
  To test without a key: `http://localhost:5179/?satdebug` (test tiles).

Restrictions to put on the key (Google Cloud console → Credentials):
- "Websites" application restriction: `http://localhost:5179/*`, `http://127.0.0.1:5179/*`, then the publishing domain;
- API restriction: *Maps JavaScript API* and *Map Tiles API* only;
- a daily quota on each API and a budget alert on the billing account.

Without a key, these buttons disappear and everything else works.

## Regenerating the data

The raw OpenStreetMap extracts go in `osm/` (not versioned, ~45 MB, downloaded with
the Overpass API). Then:

```bash
npm run donnees    # rebuilds public/donnees/cotonou.json.gz
npm run modeles    # rebuilds public/modeles/*-lod.glb
```

## Zémidjans

The zémidjans come from the "3D monde" project:
- `moto-taxi.glb`: rider in a yellow vest on a dark motorbike. It is the player's motorbike in
  Zém Run and, in a lightweight version (`moto-taxi-lod.glb`, 11,000 triangles), the motorbikes in the
  traffic within 300 m of the camera;
- `zem.glb`: red motorbike, rider in a yellow shirt and a female passenger. It is used as an obstacle in the game
  (lightweight version `zem-lod.glb`, with the wax-print blouse added in 3D monde).

The models are straightened on load using the `Rues.redresser` method from 3D monde.

## Good to know

- Only 39 buildings have a number of storeys in OpenStreetMap: the other heights are estimated.
- Tokpa-tokpa have been banned in Cotonou since 2021: they only run at the gates of the city.
- `radio.mp3` comes from a video found online: replace it with royalty-free music
  before any publication.
- Data © OpenStreetMap contributors (ODbL). Reference photos: Wikimedia Commons.

## Advertising in the game

The 4 × 3 billboards in the city and the big billboards along the Zém Run lines all come from the
`CAMPAGNES` catalogue in `src/publicites.js` (MTN MoMo, Moov Money, Vodun Days, Bénin Révélé, Qualiwo,
"Your ad here"…). For a real campaign:

1. add an entry to the catalogue (`id`, `marque`, `titre`, `sous`, colours, `poids` = frequency);
2. drop the advertiser's artwork (4:3, 1024 × 768) into `public/pubs/` and reference it in `image`;
3. fill in `CONTACT_PUB` (shown in the offer, "Advertisers" button in the game menu).

The drawn posters don't use the brands' logos; showing a real brand in a public version
requires the advertiser's consent. Impressions are counted per campaign (on the player's device).

## Facades from photos

`public/textures/erevan-facade.jpg`: upper band of the facade of the Erevan shopping centre, taken from the
photo "Centre commercial Erevan de Cotonou 08" by Alex Ahdn (Wikimedia Commons, CC BY-SA 4.0), straightened,
cropped and cleaned of poles and flags.
`public/textures/cathedrale-facade.jpg`: gable of the Notre-Dame Cathedral, taken from the photo "Cathédrale
Notre-Dame-de-misericordes à Cotonou" by Saliousoft (Wikimedia Commons, CC BY-SA 4.0), straightened by homography,
with the lower part hidden by the fence rebuilt from the stripes.
`public/textures/dantokpa-facade.jpg`: facade of the large Dantokpa market building seen from the lagoon, photo
"Marché Dantokpa (vue arrière)" by jbdodane (Wikimedia Commons, CC BY 2.0).
`public/textures/porte-facade.jpg` + `porte-alpha.jpg`: the Porte du Non-Retour, photo "Porte du non-retour au
Benin" by Borisghost (Wikimedia Commons, CC0), openings cut out by the alpha mask.
`public/textures/bceao-face.jpg`: face of the BCEAO tower (cowries included), photo "BCEAO tower Cotonou, Benin2"
by Adoscam (CC BY-SA 4.0), straightened, lower floors rebuilt. `marina-facade.jpg`: floors of the Palais de la
Marina, photo "Palais de la Marina… 01" by Adoscam (CC BY-SA 4.0). `stade-lames.jpg`: grandstand of the Stade de
l'Amitié, photo "Vue de côté du stade…" by Adoscam (CC BY-SA 4.0). `sofitel-facade.jpg` + `sofitel-alpha.jpg`:
entrance of the Sofitel, photo "Sofitel Cotonou Marina Hôtel & Spa" by Freed Armel (CC BY-SA 4.0), sky cut out.
Credits are shown in the site's banner. The same licence (CC BY-SA 4.0, CC BY 2.0) applies to any reuse of the
textures derived from them.

## Zém Run: Schekina's specification (October 2026)

| Feature | Priority | Status |
|---|---|---|
| Arrow-key controls (no automatic acceleration) | 1 | Done |
| End of ride, payment shown, new passenger waving | 1 | Done |
| Traffic lights (real OSM lights) | 1 | Done |
| Helmets for the zém and the passenger (their own, lent or bought) | 1 | Done |
| Police and fine for running a red light | 2 | Done |
| Accidents: police report or lost ride | 2 | Done |
| Talking and haggling with the vendors | 2 | Done |
| Music by zone (composed by the game) | 2 | Done |
| Paid shortcut (passenger in a hurry) | 3 | Done |
| Unlockable car (taxi, sample price 5 F, to be confirmed) | 3 | Done |
| Two-player mode | 4 | Done, for two players, with no server (WebRTC); beyond two players, a real-time server will be needed |
| 3D event | 4 | Done under a generic name, entry paid in game currency |

Caveats from the specification, all respected:
- the amounts (fines, helmet, shortcut, car, entry) are in game currency. A real MoMo payment would require the MTN MoMo API, a merchant account and approval;
- the event doesn't use the WeLoveEya name or universe. The organisers' consent is needed to use them;
- the music is generated by the game and doesn't reuse any copyrighted track;
- two-player mode goes through the PeerJS public matchmaking service. Behind some corporate networks, a relay server (TURN) would also be needed.

## Recognisable buildings: 3D models generated from photos

`public/modeles/batiments/<id>.glb` (list in `index.json`): Palais des Congrès, Cathedral, Porte du Non-Retour,
Étoile Rouge column, Bio Guéra horseman, Le Dôme, Dantokpa's large building, BCEAO Tower, Sofitel. Generated with the Tripo API (`npm run tripo -- <id> <photo>`,
`TRIPO_API_KEY` key in `.env.local`, ~40 credits per model) from freely licensed Wikimedia Commons photos
(`scripts/tripo-photos.json`: author, licence, page), then reduced to 80,000 triangles (`alleger`). The per-model colour
tweaks are in `scripts/tripo-reglages.json`, and the placement in the city (rotation, offset) in
`src/batiments-tripo.js` (`REGLAGES`). The original models (50 MB each) stay in `sources/tripo/`, not versioned.
These models derive from CC BY / CC BY-SA / CC0 photos: credits in the site's banner, same licence for reusing them.

## English version (FR / EN button)

The site exists in French (root) and in English (`/en/`), both built from the same code by
`npm run build` (`scripts/i18n/construire.mjs`). During the English build, the Vite module
`scripts/i18n/vite-langue.mjs` replaces the French texts of the code, the page and the stylesheet
with their translation, stored in `i18n/`:

- `en-textes.json` (per file), `en-html.json`: extracted from the first English translation by
  `scripts/i18n/extraire.py` (token-by-token alignment of the old code and its English copy);
- `en-complement.json`: the texts added since then (and a few corrections) — this is where new ones
  go; `node scripts/i18n/manquants.mjs` lists the ones that don't have a translation yet;
- `en-donnees.json`: line names and stop texts; `node scripts/i18n/donnees-en.mjs` derives
  `public/donnees/cotonou.en.json.gz` from it (re-run after `npm run donnees`).

French remains the language of the code. A phrase that needs gender agreement is written out in full (`f ? 'ravie' : 'ravi'`),
not by tacking on an "e", so that it can be translated.

## Animated characters

`public/modeles/personnages/<id>.glb` (list in `index.json`): market woman in a wax-print pagne, young man in a football jersey,
elder in a boubou, female student, office worker in a wax-print shirt, grandmother, police officer, zémidjan in a yellow shirt, and two
schoolchildren in khaki uniforms (passers-by only, never passengers). The concert dances (danse1, danse2, acclame)
are in `<id>-danses.glb`, loaded when you enter the concert. Built by
`npm run personnages -- <id>` (or `tout`) with the Tripo API, from a description (`scripts/personnages.mjs`):
textured model (~30 credits), human skeleton (auto-rig), then one animation per request (~10 credits each),
merged into a single file of ~0.8 MB (13,000 triangles, webp textures). The completed steps are recorded in
`sources/personnages/<id>.json` (not versioned): a network outage doesn't make you pay again. The accessories (basins of
fruit carried on the head) are in `public/modeles/personnages/accessoires/`, put there by `scripts/accessoire.mjs`
from an `npm run tripo -- texte` model.

## Where the data comes from

- **Google (Maps JavaScript API)**: the real view (satellite imagery, terrain, 3D buildings where Google has them),
  Street View. Google doesn't allow its maps to be reused to build another map: we
  display them in its own viewer, aligned under the model.
- **Google Open Buildings v3** (Google Research, CC BY 4.0 licence): building footprints detected in
  satellite imagery. Extracted from S2 tiles `1023`, `1025` and `103d` (area 6.30–6.50 N, 2.04–2.62 E,
  confidence ≥ 0.70) into `osm/google_open_buildings.csv.gz`; `npm run donnees` drops the ones OSM already
  has and writes the tiles to `public/donnees/batiments/`.
- **OpenStreetMap** (ODbL licence): streets and roads (game routes, street names), shops, bodies of water,
  and 88,000 buildings with their tags. Google doesn't publish reusable street data.
