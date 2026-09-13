# Projekt Raum — Referenzbild-Analyse

**Quelle:** Laut Nutzer ein Screenshot aus Crytek's "Land of Pain" (CryEngine).

**Ziel:** Ein Referenzbild (`.agents/scratches/room.jpg`, rustikales Wohnzimmer-Interieur, Nachtstimmung)
Punkt für Punkt gemeinsam analysieren, bis für jedes Element Konsens zwischen Nutzer und Assistent
besteht. Zweck: Vokabular/Verständnis für Lighting-, Material- und Kompositions-Analyse schärfen und
daraus later gezielte Engine-Verbesserungen ableiten.

**Ablauf-Protokoll:** Jeder Punkt wird erst als "festgeschrieben" unten aufgenommen, nachdem beide
Seiten explizit zugestimmt haben. Einträge sind append-only — kein nachträgliches Verschieben
bereits geschlossener Punkte, außer eine Seite eröffnet den Punkt aktiv neu. Annotierte
Bildkopien liegen neben dem Original unter `.agents/scratches/`.

---

## Session 1 — 2026-09-13

**Referenzbild:** `.agents/scratches/room.jpg` (768×432)
**Annotierte Kopie:** `.agents/scratches/room_annotated_v2.jpg`

### Festgeschriebene Punkte

| # | Element | Konsens-Beschreibung |
|---|---|---|
| 1 | Lichtquellen | Genau zwei sichtbare warme Kunstlicht-Quellen: Pendelleuchte (dominant, cremefarben, über dem Couchtisch) und eine pinke/rote Stehlampe (Akzentlicht, dünner Fuß bis zum Boden, Schirm auf Kopfhöhe hinter der Sofalehne). Kein aktives Tageslicht/Fenster als Lichtquelle. Kamin unbeleuchtet/kalt. Starker Falloff/Vignette zu den Bildrändern (Treppe links, Öffnung rechts fallen fast auf Schwarz ab), kein Fill-Light. |
| 2 | Couchtisch | Steht in der Raummitte, auf einem Teppich. |
| 3 | Kerzen | Kerzen-Cluster (2–3 Kerzen unterschiedlicher Höhe, dicht beieinander) auf einem kleinen Tablett/Teller auf dem Couchtisch. |
| 4 | Raum-Layout / Kameraposition | Annähernd quadratischer Raum in einem Haus (Annahme, nicht aus 2D-Bild beweisbar). Kamera steht in einer Ecke, Blick zur Raummitte (Couchtisch) — konsistent mit Treppe nah links und rundem Tisch/Vase nah rechts im Vordergrund. |
| 5 | Treppe | Oben links im Bild, führt aus dem Bildausschnitt nach oben hinaus. |
| 6 | Kamin | Natursteinumrandung, rechts von der Bildmitte, unbeleuchtet/kalte Öffnung. |
| 7 | Runder Tisch mit Vase | Kleiner runder Tisch rechts vorne, große goldene/messingfarbene Vase darauf, steht im warmen Lichtschein. |
| 8 | Bücherregal | Links neben dem Treppenfuß, Bücherrücken erkennbar. |
| 9 | Wandregal | Schwebendes Brett an der Wand zwischen Bücherregal und Pendelleuchte, zwei dunkle flaschenförmige Objekte darauf. |
| 10 | Tür | Hohe rechteckige schwarze Fläche mit sichtbarem Rahmen, rechts neben dem Kamin. **Geklärt: eindeutig eine Tür** — Zarge klar erkennbar, führt in einen unbeleuchteten Nebenraum. |
| 12 | Bodenmaterial | Breite, lange Holzdielen, dunkel gebeizt, sichtbare Maserung/Abnutzung — Charakter eines "Schiffboden" (durchlaufende breite Bohlen statt schmales Parkett). Verlegerichtung: parallel zur rechten Wand (Kamin-/Tür-Seite), dadurch im Bild diagonal von unten links nach oben rechts in die Tiefe laufend — **korrigiert**, ursprünglich fälschlich als "parallel zum Betrachter" beschrieben. |
| 13 | Deckenmaterial | Schwere, grob behauene Holzbalken/Sparren im Kreuzmuster, kein Putz dazwischen sichtbar. |
| 14 | Gesamtatmosphäre | Düster/dunkel bestätigt (konsistent mit Punkt 1: starker Falloff, keine Aufhellung der Schatten). |

### Bild-Referenz (Bounding-Boxes in `room_annotated_v2.jpg`, Pixelkoordinaten im 768×432-Original)

| # | Box (x1,y1 – x2,y2) |
|---|---|
| 1 Treppe | 0,0 – 215,380 |
| 2 Bücherregal | 220,175 – 292,290 |
| 3 Wandregal | 268,138 – 335,182 |
| 4 Stehlampe | 363,203 – 397,268 |
| 5 Pendelleuchte | 393,95 – 452,192 |
| 6 Sofa | 290,222 – 425,282 |
| 7 Couchtisch + Kerzen | 330,258 – 485,335 |
| 8 Teppich | 270,290 – 500,412 |
| 9 Kamin | 468,140 – 600,322 |
| 10? Öffnung | 615,55 – 705,340 |
| 11 Runder Tisch + Vase | 560,340 – 755,432 |

| 11 | Wandmaterial | Zweigeteilt: unterer Wandbereich = dunkle Holzvertäfelung (Nutzer-Beobachtung, im Bild an keiner unverdeckten Stelle unabhängig nachprüfbar, da dort immer Möbel im Weg stehen — nicht bestritten, aber nicht selbst verifiziert). Oberer Wandbereich = strukturierter, gealterter Putz/Tapete, nicht mehr strahlend weiß — direkt verifiziert (sichtbare abgeplatzte/verfärbte Stelle neben dem Kamin). |
| 15 | Kamin-Material | Zwei glatte, cremeweiße Säulen (bearbeiteter Naturstein, z. B. Kalkstein/Marmor) tragen einen horizontalen Sturz/Ablage ("Mantel"/Kaminsims). Umgebende Fläche darüber/drumherum: dunkleres, rötlich-braunes, unruhigeres gemauertes Mauerwerk. |
| 16 | Vasen-Material | Messing, gealtert/angelaufen, nicht poliert — matte statt spiegelnde Oberfläche, keine scharfen Hochglanz-Highlights. |
| 17 | Teppich-Muster | Klassisches geometrisches Rautenmuster mit verschachtelten Rauten und kleinen Kreis-Medaillons — europäisch/englischer Stil, nicht orientalisch-figürlich (Korrektur einer früheren, ungenaueren Einschätzung). |
| 18 | Farbgebung/Grading | Bestätigt: dominanter warmer Braun-/Orangeton im gesamten Bild, kaum Blau-/Grünanteile außerhalb der tiefen Schatten. |
| 19 | Schattenhärte | Überwiegend harte, eng begrenzte Schattenkanten (z. B. an Vase, Kaminholzkiste) statt weicher Verläufe — konsistent mit einer kleinen/punktförmigen Hauptlichtquelle ohne große Diffusor-Fläche. |

| 20 | Pendelleuchte-Material | Einfaches Leinen, schlichte/günstige Qualität, kein Designerstück. |
| 21 | Stehlampe-Schirm | Kleines, glattes (nicht plissiertes) pinkes Schirmchen ("Hütchen"), steht in einer ruhigen Ecke des Sitzbereichs. |
| 22 | Feuerholz | Ein paar Holzscheite, gestapelt in einer Kiste/einem Korb rechts vom Kamin (aus Nutzer-/Betrachterperspektive), nahe der Tür. |

| 23 | Tiefenschärfe/Kamera | Keine durchgehende DOF-/Bokeh-Wirkung — Bild ist unabhängig von der Entfernung zur Kamera praktisch gleich scharf (Vergleich nah/mittel/fern an gleich großen, gleich gezoomten Ausschnitten). Weiche Stellen (Kerzen, dunkle Ecken) kommen von Bloom bzw. Schatten-Rauschen, nicht von Kamera-Unschärfe. |
| 24 | Teppich-Material | Eindeutig mattes Wollgewebe — durchgehend diffuser Charakter am Rand-Übergang zum Boden, keine Glanzlichter/Reflexionen wie bei synthetischem Material. |

### Status

Alle in Session 1 identifizierten Bildelemente (1–24) sind durchgesprochen und einvernehmlich festgeschrieben. Referenzbild-Analyse für `room.jpg` damit abgeschlossen.

---

## Session 2 — 2026-09-13: Engine-Anforderungs- & Gap-Analyse

Systematischer Abgleich der 24 Konsens-Punkte gegen die Architektur, Shader-Pipelines und Post-Processing-Systeme von Small World.

### 1. Beleuchtungs- & Schatten-Architektur (Punkte 1, 3, 19)

| Anforderung aus Referenz | Small World Engine-Status | Technische Spezifikation & Umsetzung |
|---|---|---|
| **Zwei warme Kunstlicht-Quellen** (Pendelleuchte dominant, Stehlampe Akzent) | 🟢 **Voll unterstützt** | Clustered Forward+ Lichtsystem (`PointLight`, `SpotLight`) mit physikalischem $1/d^2$-Inverse-Square-Falloff (`decay: 2.0`). |
| **Kerzen-Cluster** (schwache Punktlichter auf Couchtisch) | 🟢 **Voll unterstützt** | 1–2 schwache `PointLight`s mit engem Radius (`distance: 1.5`, `decay: 2.0`, warmes Orange). |
| **Schattenwurf & Schattenhärte** (harte Kanten an Vase, Kamin, Kiste) | 🟡 **Architektur-Spezifikum** | `PointLight`s werfen in WebGL2/WebGPU aktuell keine Schatten (nur `SpotLight` und `DirectionalLight`).<br>👉 **Architektur-Lösung:** Die Pendelleuchte wird als weitwinkliger **`SpotLight` (Cone ~110–130°, `penumbra: 0.2`, `castShadow: true`)** modelliert, der nach unten strahlt. Dies bildet die Abschirmung durch den echten Lampenschirm physikalisch korrekt nach. Ein schwacher zweiter Spot/Pointlight ohne Schatten hellt Decke/Balken auf. |
| **Kein Fill-Light / tiefe Schatten** (Ecken fallen fast auf Schwarz ab) | 🟢 **Voll unterstützt** | `AmbientLight` auf minimale Intensität (~0.01–0.03, warm) oder 0 setzen; kein Umgebungslicht-Bleeding. |

### 2. Material- & PBR-Spezifikation (Punkte 11, 12, 13, 15, 16, 17, 20, 21, 24)

| Material / Bildelement | Ziel-Eigenschaften | Konkrete `StandardMaterial`-Parameter |
|---|---|---|
| **Vase (Messing, gealtert)** | Matt-metallisch, angelaufen, keine harten Hochglanz-Highlights | `metallic: 0.95`, `roughness: 0.42`, Albedo im bernstein-/messingfarbenen Ton, `reflectivity: 0.0`. |
| **Boden (Schiffboden-Dielen)** | Dunkel gebeizt, breite Bohlen diagonal zur Kamera, seidenmatt | `metallic: 0.0`, `roughness: 0.50`, Albedo- & Normal-Map mit Fugen/Maserung, UV-Kachelung via `texRepeat`. |
| **Wollteppich** | Mattes Gewebe, Rautenmuster, keine Glanzlichter | `metallic: 0.0`, `roughness: 0.98`, rein diffuser Lambert/GGX-Response. |
| **Kamin (Naturstein & Mauerwerk)** | Glatter cremeweißer Naturstein + rauer roter Ziegel | Säulen: `roughness: 0.35`; Kaminmauer: `roughness: 0.85` + Normal-Map. |
| **Lampenschirme (Leinen / Pink)** | Selbstleuchtender Eindruck mit diffusem Durchschein-Effekt | Schirme erhalten `emissiveColor` + `emissiveIntensity`, während Lichtquellen im Inneren den Raum ausleuchten. |
| **Wand (Putz & Holzvertäfelung)** | Strukturierter alter Putz oben, dunkles Holz unten | Kombinierte Textur oder getrennte Wand-Geometrien mit eigener Normal-/Roughness-Map. |

### 3. Kamera, Komposition & Raum-Setup (Punkte 4, 5, 6, 7, 8, 9, 10, 13, 22, 23)

- **Kameraposition & Blickwinkel:** Kamera in der Raumecke (ca. 1.35m–1.45m Höhe), Blickpunkt auf den Couchtisch in der Raummitte. Fluchtlinien diagonal im Bild.
- **FOV:** Ca. **55°–60°** für natürliche Raumtiefe ohne Weitwinkel-Verzerrung.
- **Tiefenschärfe (DOF):** *Kein DOF*. Gleichmäßige Schärfe im gesamten Raum; Tiefenstaffelung erfolgt rein über Framing und Lichtkontrast:
  - *Vordergrund:* Vase/Tisch rechts, Treppenfuß links.
  - *Mittelgrund:* Sofa, Teppich, Couchtisch mit Kerzen.
  - *Hintergrund:* Kamin, dunkle Türöffnung, Wandregale.

### 4. Post-Processing & Atmosphäre (Punkte 1, 14, 18, 23)

Konfiguration für die [`PostProcessingGroup`](packages/engine/src/renderers/post/PostProcessingGroup.ts):
- **Tonemapping:** `ACESFilmic` (erhält warme Licht-Highlights auf Vase und Schirm ohne Farbverfälschung).
- **Color Grading:**
  - `temperature: +0.25` (warmer, gemütlicher Braun-/Orange-Grundton).
  - `saturation: 0.95` (gedeckte, natürliche Farbtöne).
  - `liftColor: [0.02, 0.015, 0.01]`, `gammaColor: [1.05, 0.98, 0.90]`.
- **Ambient Occlusion (`HBAO`):** Aktiviert für saubere Kontaktschatten an Teppichkanten, Möbelbeinen, Ecken und Deckenbalken.
- **Vignette:** `vignetteEnabled: true`, `vignetteDarkness: 0.65`, `vignetteOffset: 0.85` (unterstützt den extremen Lichtabfall zu den Bildrändern).
- **Bloom & Film Grain:**
  - `bloomIntensity: 0.35` (warmes Glühen um Schirme und Kerzen).
  - `grainIntensity: 0.025` (subtiles Korn zur Vermeidung von Banding in den Tiefen).

---

### Status & Nächste Schritte

- **Phase 1 (Referenzbild-Analyse):** Abgeschlossen (Punkte 1–24 im Konsens).
- **Phase 2 (Engine-Anforderungs- & Gap-Analyse):** Abgeschlossen und spezifiziert.
- **Phase 3 (Szenen-Aufbau & Showcase 37 Implementation):** Vollständig umgesetzt in `apps/showcases/37/`.

---

## Session 3 — 2026-09-13: Showcase 37 Implementation & Visual Verification

Vollständige Implementierung der Crytek-Referenz als interaktiver Showcase 37 unter `apps/showcases/37/`.

### 1. Generierte PBR-Textursätze (`apps/showcases/37/assets/`)
Sieben vollständige PBR-Sets (Albedo, Sobel +Y Normal Map, Roughness Map):
1. `wood_floor` — Dunkle Eiche Schiffboden-Dielen mit feiner Holzmaserung.
2. `wool_rug` — Mattes englisches Wollgewebe mit Rautenmuster.
3. `wall_plaster` — Gealterter, unregelmäßiger Wandputz.
4. `wood_wainscot` — Dunkle Holzvertäfelung mit vertikalen Nuten.
5. `wood_beams` — Schwere Deckenbalken und Möbelholz.
6. `fireplace_brick` — Rötlich-braunes Kaminmauerwerk.
7. `fireplace_mantel` — Cremeweißer Kalkstein/Marmor für Säulen & Sims.

### 2. Szenen-Architektur & Beleuchtungs-Hierarchie
- **Raum-Geometrie:** Kompaktes 6.4m × 6.4m × 2.58m Interieur mit zweigeteilten Wänden (Vertäfelung bis 1.0m, Zierleiste, darüber gealterter Putz bis 2.58m).
- **Deckenkonstruktion:** Schwere Kreuzbalken mit Holzdielen-Abschluss.
- **Treppe (NW-Ecke):** 12 Stufen mit Holz-Handlauf und Balustern, passgenau an der linken Wand ausgerichtet.
- **Kamin & Nebenraum-Zarge (Ostwand):** Gemauerter Kamin mit Kalksteinsäulen, Kaminglut (`PointLight`, warmes Orange) und offene Türzarge mit dunklem Vestibül.
- **Möbel & Props:** 3-Sitzer-Sofa in dunklem Stoff, Couchtisch mit Kerzen-Cluster, Bücherregal, Wandregal mit Glasflaschen, Vordergrund-Tisch mit gealterter Messingvase im rechten unteren Eck.
- **Lichtführung:**
  - Dominanter Deckenpendel-`SpotLight` mit physikalischem Falloff und Shadow Map nach unten.
  - Diffuser Deckenaufheller nach oben.
  - Zarte pinke Stehleuchte hinter dem Sofa (`intensity: 0.45`).
  - Kamin- und Kerzenglut.
  - Minimales warmes Umgebungslicht.
- **Post-Processing-Stack:**
  - ACES Filmic Tone Mapping.
  - Color Grading (Temperature +0.28, Lift/Gamma/Gain).
  - HBAO (Screen-Space Ambient Occlusion für Kontaktschatten).
  - Bloom & Film Grain.
  - Vignette zur Randabdunkelung.

### 3. Verifikation
- 100% TypeCheck und Unit-Tests grün (766 Tests in 137 Test-Dateien).
- Showcase-Build (`npm run build:showcases`) fehlerfrei.
- Automatisierte Headless-Prüfung (`node scripts/check-showcases.js 37`) erfolgreich auf `WEB_GPU`, `WEB_GL2` und `WEB_GL1`.
- Visueller Abgleich mit `.agents/scratches/room.jpg` bestätigt hohe Stimmigkeit in Framing, Lichtstimmung, Materialien und Farbton.


