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

Alle in Session 1 identifizierten Bildelemente (1–24) sind durchgesprochen und einvernehmlich festgeschrieben. Referenzbild-Analyse für `room.jpg` damit abgeschlossen. Nächste Phase: aus diesen Findings konkrete Engine-Verbesserungen ableiten (siehe Fortsetzung unten, sobald begonnen).
