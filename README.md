# Cotonou 3D

Cotonou, Abomey-Calavi, Ganvié and Ouidah in 3D in the browser. On startup, Google's real view
(satellite imagery and terrain) is displayed beneath the model; the 3D model is built on the buildings
detected by Google (Google Open Buildings, 660,000 footprints on top of OpenStreetMap's 88,000) and on
OpenStreetMap's streets (12,000 ways), Lake Nokoué and the coastline. The major landmarks are rebuilt
from photos, and the **Zém Run** game lets you discover the neighbourhoods riding a zémidjan
or aboard a tokpa-tokpa.

## Try it

**Online, nothing to install**: https://tours-two-ashen.vercel.app — Vercel project “tours”, linked
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
a Google Maps key in it (optional). The tour is set to “Agolo” by Angélique Kidjo (`public/audio/agolo.mp3`): a copyrighted work, whose
rights still need to be obtained for public distribution.

Things to try: the tour (Tour button), the real view, the “On site” cards, the weather
(M key), and Zém Run — ↑ accelerate, ↓ brake, E interact, at a junction slow down then ← or → (T: straight on)
to turn; Xbox and PlayStation controllers are supported.

## Unversioned files

- `.env.local`: the Google Maps key (see below).
- `sources/masques/` and `sources/art/`: original 3D models (Tripo, 60 to 72 MB each);
  the lightweight versions used by the site are in `public/modeles/`.
- `osm/`: raw OpenStreetMap and Google Open Buildings extracts (read by `npm run donnees`).

## Running the project

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # publishable build in dist/
npm run preview    # serves dist/ for checking
npm run verifier   # ESLint on src/
```

## Layout

| Folder, file | Contents |
| --- | --- |
| `index.html` | page, UI (panels, dock, game, tour) |
| `src/main.js` | startup and render loop |
| `src/scene.js` | rendering, camera, sky, lights |
| `src/ville.js` | ground, water, roads, buildings, palm trees, containers, ships |
| `src/lieux.js` | rebuilt monuments (Étoile Rouge, Amazone, Marina, Congrès, cathedral, stadium, port, airport, Dantokpa, Ganvié, Corniche, UAC, Sèmè One) |
| `src/lieux-videos.js` | places surveyed from the drone videos: Sofitel, BCEAO tower, Erevan and Bio Guéra, airport roundabout, Zongo mosque, cemetery |
| `src/vehicules.js` | zémidjans from “3D monde” (`moto-taxi.glb`, `zem.glb`), tokpa-tokpa, cars |
| `src/trafic.js` | traffic: zémidjans, tokpa-tokpa at the city gates, street lights |
| `src/jeu.js` | Zém Run: routes, obstacles, stops, quiz |
| `src/bordure.js` | what makes a ride recognisable: signs of real businesses (OSM) along the road, petrol stations, container shops, kpayo, MoMo kiosks, tyre repairers (vulcanisateurs), electricity poles, street name plates, “on your right: …” card in front of monuments, mini-map |
| `src/google.js` | Street View, 3D satellite view, “Real view”, photos on the game cards |
| `src/satellite.js` | satellite ground (Map Tiles) under the city |
| `src/rue.js` | street dressing around the camera (400 m squares, close-up view and game): boundary walls and sheet-metal gates, houses behind the walls where OSM has nothing, shops with roller shutters and awnings, block-paved pavements, solar street lights, 4 × 3 billboards, painted lettering, poles and wires, rooftop water tanks |
| `src/facades.js` | façade atlas (garage doors, shops, shutters, balconies, unfinished upper floor) |
| `src/ouidah.js` | Porte du Non-Retour and Arène de Ouidah (taken from the “Arène de Ouidah” artifact, realigned on the Google satellite view), mask show in the arena |
| `src/monde-reel.js` | “Real view”: Google's 3D under the model, Google camera aligned with ours every frame (same position, heading, tilt and field of view) |
| `src/altitude.js` | ground altitude (AWS Terrarium tiles, open data) to align the Google camera |
| `src/discussions.js` | Zém Run that talks (Danfo Run style): speech bubbles above people, groups chatting by the roadside, vendors calling out, reactions to the horn, a zém passenger you haggle over the fare with and who makes small talk (answers 1, 2, 3), the union collector, the tokpa-tokpa apprentice |
| `src/voix.js` | Characters speak out loud: the browser's speech synthesis (free, no key), a woman's or a man's voice per person, only those near the zém; dialogue takes priority over chatter. “Character voices” option in the game menu |
| `src/regles.js` | Zém Run highway code (Schekina's specification): traffic lights on the route (the real OSM lights it crosses), police and fines at red lights, accidents (police report or the customer gets off) |
| `src/feux.js` | The 81 real traffic lights and 38 real pedestrian crossings from OpenStreetMap (`osm/feux.json`, Overpass), placed in the city with a synchronised cycle per junction |
| `src/terre-pleins.js` | Central medians of dual-carriageway boulevards (computed by `scripts/donnees.mjs`, aligned on the Google satellite view): road markings, concrete divider or planted grass depending on width |
| `src/remise.js` | What you buy, you receive: the banknote goes to the vendor, the item (water, beignets, fuel, helmet, phone credit card, souvenir…) arrives in the hand of the zém or the customer |
| `src/musique.js` | Game music by neighbourhood, composed on the fly (Web Audio, original patterns, no copyrighted track), and the event's “concert” atmosphere |
| `src/multijoueur.js` | Two-player mode: direct browser-to-browser connection (WebRTC via the public PeerJS service), 4-letter code; each player sees the other's vehicle and hears their horn |
| `src/evenement.js` | Concert on the Amazone esplanade (stage, screen, lights, dancing crowd), 50 F entry in game money |
| `src/missions.js` | missions (3 at a time), savings, daily streak, garage (horns, new helmet, super jump) |
| `src/artisans.js` | craft markets (Porte du Non-Retour, Arène, Place de l'Amazone): 3D art objects, haggling with the vendor, paying from your savings, “My souvenirs” |
| `src/publicites.js` | catalogue of advertising campaigns (city and game billboards), impression counts, offer for advertisers |
| `src/batiments-google.js` | Google Open Buildings buildings loaded in 1 km tiles around the camera |
| `src/meteo.js` | weather (dock button, M key): sun, clouds, tropical rain, storm with lightning and synthesised thunder; slippery road in Zém Run |
| `src/manette.js` | Xbox / PlayStation controllers (Gamepad API): driving, answers, menus, moving around the city, vibration |
| `src/surplace.js` | “On site” tab of the cards: photos taken in Cotonou and clips from the drone videos (`npm run photos`) |
| `src/egungun.js` | Egungun masks (supplied 3D models, or a drawn fallback version), raffia Zangbeto, processions in the game |
| `src/explorer.js` | filters, radio, Tour mode |
| `src/interface.js` | labels, cards, camera flights, compass and scale |
| `src/ambiances.js` | day, evening, night |
| `src/donnees-lieux.js` | texts for the places and neighbourhoods |
| `src/etat.js` | state shared between modules |
| `public/donnees/cotonou.json.gz` | city data, produced by `npm run donnees` |
| `public/modeles/` | 3D models served by the page |
| `sources/` | original “3D monde” models, from which `npm run modeles` derives the lightweight versions |
| `public/audio/radio.mp3` | music for the Radio button |
| `public/audio/agolo.mp3` | “Agolo” by Angélique Kidjo, played during the tour (Tour) — copyrighted work: obtain the rights before any public release |
| `sources/art/` | original art objects (Tripo); `npm run masques` derives `public/modeles/{tete-sculptee,portrait-cubiste,sphere-rouge,statue,creature-paille}.glb` from them |
| `sources/masques/` | original mask models (Tripo, ~2 M triangles); `npm run masques` derives `public/modeles/zangbeto.glb`, `egungun-traditionnel.glb`, `egungun-groupe.glb` (~1 MB each) from them |
| `scripts/donnees.mjs` | OSM → `cotonou.json.gz` (buildings, roads, water; game routes along the main roads and past the monuments, with street names and nearby businesses) |
| `scripts/modeles.mjs` | lightweight versions of the zémidjans for traffic |
| `artefact/` | old single-HTML-file version (claude.ai artifact) |

## Google Maps

The key goes in `.env.local` (never versioned):

```
VITE_GOOGLE_MAPS_KEY=…
```

It is used for:
- **See it for real** (a place's card): 360° Street View photo and 3D satellite view — *Maps JavaScript* API;
- **Real view** (dock): Google's 3D is displayed beneath the model, aligned with the camera, both while exploring and in
  Zém Run — *Maps JavaScript* API. The **Model** button adds our buildings, trees and monuments on top;
  during the game they are always there (and so are our roads), because the satellite image is blurry at ground level;
- **photos in Zém Run**: the Street View photo of the monument you pass and of the stop you serve — *Maps JavaScript* API;
- **Satellite ground** (dock): the satellite tiles under the 3D buildings — *Map Tiles* API.
  To test without a key: `http://localhost:5179/?satdebug` (test tiles).

Restrictions to put on the key (Google Cloud console → Credentials):
- “Websites” application restriction: `http://localhost:5179/*`, `http://127.0.0.1:5179/*`, then the publishing domain;
- API restriction: *Maps JavaScript API* and *Map Tiles API* only;
- a daily quota on each API and a budget alert on the billing account.

Without a key, these buttons disappear and everything else works.

## Regenerating the data

The raw OpenStreetMap extracts go in `osm/` (unversioned, ~45 MB, downloaded with
the Overpass API). Then:

```bash
npm run donnees    # rebuilds public/donnees/cotonou.json.gz
npm run modeles    # rebuilds public/modeles/*-lod.glb
```

## Zémidjans

The zémidjans come from the “3D monde” project:
- `moto-taxi.glb`: rider in a yellow vest on a dark motorbike. It is the player's bike in
  Zém Run and, in a lightweight version (`moto-taxi-lod.glb`, 11,000 triangles), the traffic
  motorbikes within 300 m of the camera;
- `zem.glb`: red motorbike, rider in a yellow shirt and a female passenger. It is used as an obstacle in the game
  (lightweight version `zem-lod.glb`, with the wax-print blouse added in 3D monde).

The models are straightened on load using the `Rues.redresser` method from 3D monde.

## Good to know

- Only 39 buildings have a number of floors in OpenStreetMap: the other heights are estimated.
- Tokpa-tokpa have been banned in Cotonou since 2021: they only run at the city gates.
- `radio.mp3` comes from a video found online: replace it with royalty-free music
  before any release.
- Data © OpenStreetMap contributors (ODbL). Reference photos: Wikimedia Commons.

## In-game advertising

The 4 × 3 billboards in the city and the large billboards along the Zém Run routes all come from the
`CAMPAGNES` catalogue in `src/publicites.js` (MTN MoMo, Moov Money, Vodun Days, Bénin Révélé, Qualiwo,
“Votre pub ici”…). For a real campaign:

1. add an entry to the catalogue (`id`, `marque`, `titre`, `sous`, colours, `poids` = frequency);
2. drop the advertiser's artwork (4:3, 1024 × 768) into `public/pubs/` and reference it in `image`;
3. fill in `CONTACT_PUB` (shown in the offer, “Advertisers” button in the game menu).

The drawn posters don't use the brands' logos; showing a real brand in a public version
requires the advertiser's consent. Impressions are counted per campaign (on the player's device).

## Façades from photos

`public/textures/erevan-facade.jpg`: upper band of the façade of the Erevan shopping centre, taken from the
photo “Centre commercial Erevan de Cotonou 08” by Alex Ahdn (Wikimedia Commons, CC BY-SA 4.0), straightened,
cropped and cleaned of poles and flags.
`public/textures/cathedrale-facade.jpg`: gable of the Notre-Dame Cathedral, taken from the photo “Cathédrale
Notre-Dame-de-misericordes à Cotonou” by Saliousoft (Wikimedia Commons, CC BY-SA 4.0), straightened by homography,
with the lower part hidden by the fence rebuilt from the stripes.
`public/textures/dantokpa-facade.jpg`: façade of the large Dantokpa market building seen from the lagoon, photo
“Marché Dantokpa (vue arrière)” by jbdodane (Wikimedia Commons, CC BY 2.0).
`public/textures/porte-facade.jpg` + `porte-alpha.jpg`: the Porte du Non-Retour, photo “Porte du non-retour au
Benin” by Borisghost (Wikimedia Commons, CC0), openings cut out by the alpha mask.
`public/textures/bceao-face.jpg`: face of the BCEAO tower (cowries included), photo “BCEAO tower Cotonou, Benin2”
by Adoscam (CC BY-SA 4.0), straightened, lower floors rebuilt. `marina-facade.jpg`: floors of the Palais de la
Marina, photo “Palais de la Marina… 01” by Adoscam (CC BY-SA 4.0). `stade-lames.jpg`: stand of the Stade de
l'Amitié, photo “Vue de côté du stade…” by Adoscam (CC BY-SA 4.0). `sofitel-facade.jpg` + `sofitel-alpha.jpg`:
entrance of the Sofitel, photo “Sofitel Cotonou Marina Hôtel & Spa” by Freed Armel (CC BY-SA 4.0), sky cut out.
Credits shown in the site's footer strip. Same licence (CC BY-SA 4.0, CC BY 2.0) for any reuse of the
textures derived from them.

## Zém Run: Schekina's specification (October 2026)

| Feature | Priority | Status |
|---|---|---|
| Arrow-key controls (no automatic acceleration) | 1 | Done |
| End of ride, payment shown, new customer waving you down | 1 | Done |
| Traffic lights (real OSM lights) | 1 | Done |
| Helmets for the zém and the customer (their own, lent or bought) | 1 | Done |
| Police and fines at red lights | 2 | Done |
| Accidents: police report or lost ride | 2 | Done |
| Chatting and haggling with vendors | 2 | Done |
| Music by area (composed by the game) | 2 | Done |
| Paid shortcut (customer in a hurry) | 3 | Done |
| Unlockable car (taxi, sample price 5 F, to be confirmed) | 3 | Done |
| Two-player mode | 4 | Done, for two, with no server (WebRTC); beyond two players, a real-time server will be needed |
| 3D event | 4 | Done under a generic name, entry paid in game money |

Reservations from the specification, all respected:
- the amounts (fines, helmet, shortcut, car, entry) are in game money. A real MoMo payment would require the MTN MoMo API, a merchant account and approval;
- the event uses neither the name nor the world of WeLoveEya. The organisers' consent is needed to use them;
- the music is generated by the game and doesn't reuse any copyrighted track;
- two-player mode goes through the public PeerJS matchmaking service. Behind some corporate networks, a relay server (TURN) would also be needed.

## Recognisable buildings: 3D models generated from photos

`public/modeles/batiments/<id>.glb` (list in `index.json`): Palais des Congrès, Cathedral, Porte du Non-Retour,
Étoile Rouge column, Bio Guéra horseman, Le Dôme, the large Dantokpa building, BCEAO Tower, Sofitel. Generated with the Tripo API (`npm run tripo -- <id> <photo>`,
`TRIPO_API_KEY` key in `.env.local`, ~40 credits per model) from free photos on Wikimedia Commons
(`scripts/tripo-photos.json`: author, licence, page), then reduced to 80,000 triangles (`alleger`). The per-model colour
adjustments are in `scripts/tripo-reglages.json`, the placement in the city (rotation, offset) in
`src/batiments-tripo.js` (`REGLAGES`). The original models (50 MB each) stay in `sources/tripo/`, unversioned.
These models derive from CC BY / CC BY-SA / CC0 photos: credits in the site's footer strip, same licence for reusing them.

## Where the data comes from

- **Google (Maps JavaScript API)**: the real view (satellite imagery, terrain, 3D buildings where Google has them),
  Street View. Google doesn't allow its maps to be reused to build another map: they are
  displayed in Google's own viewer, aligned beneath the model.
- **Google Open Buildings v3** (Google Research, CC BY 4.0 licence): building footprints detected on
  satellite imagery. Extract of S2 tiles `1023`, `1025` and `103d` (area 6.30–6.50 N, 2.04–2.62 E,
  confidence ≥ 0.70) in `osm/google_open_buildings.csv.gz`; `npm run donnees` drops those OSM
  already has and writes the tiles to `public/donnees/batiments/`.
- **OpenStreetMap** (ODbL licence): streets and roads (game routes, street names), businesses, bodies of water,
  and 88,000 buildings with their tags. Google doesn't publish reusable street data.
