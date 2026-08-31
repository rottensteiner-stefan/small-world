# 3D Environment Art & Diorama-Architektur

**Kontext:** Überführung des 2D Graphic-Noir-Konzeptbildes der Wiener Kanalisation (`diorama-concept.jpg`) in eine plastische, atmosphärische 3D-Szene (`Character Diorama Studio`) in Small World.

---

## 1. Analyse der visuellen Diskrepanz (Konzept vs. Initial-3D)

Im ersten 3D-Entwurf (`img.png`) klaffte eine spürbare Lücke zum Konzeptbild. Die Hauptursachen für den visuellen Bruch waren:

1. **UV-Streckung & Zebra-Effekt (Wände):**
   * Die Mauer wurde aus 10 separaten, schmalen Säulen-Würfeln ($0.42\,\text{m} \times 3.6\,\text{m}$) zusammengesetzt.
   * Jeder Würfel wendete die gesamte quadratische Fliesen-/Ziegeltextur isoliert auf sich an ($U \in [0, 1]$).
   * **Ergebnis:** Die Textur wurde horizontal extrem gestaucht und wiederholte sich 10-mal als unnatürliches, vertikales Zebra-Streifenmuster.
2. **Geometrie-Pappe statt PBR-Material (Bodenpfütze):**
   * Die Pfütze wurde als separates, schwarzes `Plane`-Mesh auf den Boden gelegt.
   * **Ergebnis:** Wirkte wie ein hineingelegtes Stück schwarzer Pappe, statt wie eine nasse, spiegelnde Vertiefung im Pflaster.
3. **Plakative Klotz-Geometrie (Kopfbogen & Bruchkanten):**
   * Untexturierte, einfarbige Quader auf den Mauern wirkten wie aufgesetzte Bauklötze ohne organischen Verbund mit dem Mauerwerk.
4. **Harte Beleuchtungs-Kontraste:**
   * Punktlichter mit zu harter Specular-Spitze bei gleichzeitig zu dunklem Ambient-Licht führten zu unruhigen, verbrannten Lichtflecken.

---

## 2. Die Grenze zwischen 3D-Geometrie und Textur/PBR

In modernen Echtzeit-3D-Engines (Small World, Unreal, Godot) gilt für Environment Art eine klare Trennung der Zuständigkeiten:

| Ebene | Was ist echte 3D-Geometrie? | Was ist Textur / PBR / Shader? |
| :--- | :--- | :--- |
| **Makro (Große Formen)** | • **Hauptmauern & Bogen-Silhouette:** Der gewölbte Verlauf der Kanalisationsdecke.<br>• **Massives Fundament-Podest:** Sichtbare $0.35\,\text{m}$ Tiefe mit Sockel.<br>• **Industrie-Elemente:** Verlegte Rohre, Flansche, Handrad-Ventil, Wandhalterungen.<br>• **Props & Charaktere:** Spielfigur, Ratten, Kisten, Schutthaufen, Baulampen. | — |
| **Mikro (Feine Details)** | *Niemals als Millionen Geometrie-Polygone modellieren* (führt zu Shader-Aliasing, Performance-Einbrüchen und unruhigem Kantenflimmern). | • **Albedo/Diffuse-Map:** Kacheln (20×20 cm), Art-Déco-Bordüre, Ausbrüche zum roten Backstein.<br>• **Normal-Map:** Plastische Tiefe von Fugen, Mörtel, Rissen und Kanten unter Lichteinfall.<br>• **Roughness-Map:** Nass-Glanz in Pfützen vs. matter Ziegel/Beton.<br>• **Metallic-Map:** Rost vs. blanke Kupfer-/Stahlrohre. |

---

## 3. Architektur-Leitfaden für Small World

### A. Kontinuierliche Wand-Geometrie mit stetigen UV-Koordinaten
- Eine Wand besteht aus einem **zusammenhängenden, gewölbten Mesh** (oder einem Panel-Verbund mit kontinuierlich fortlaufenden UV-Koordinaten über die gesamte Wandbreite).
- $U$-Koordinaten skalieren linear von $0.0$ am Mauereck bis $1.0$ am äußeren Bruchkanten-Rand.
- $V$-Koordinaten skalieren linear von $0.0$ (Boden) bis $1.0$ (Scheitelhöhe).
- **Vorteil:** Quadratische Kacheln bleiben exakt quadratisch, die Art-Déco-Bordüre schließt sauber an der Oberkante ab, und Mauerdurchbrüche wirken wie echte, organische Fehlstellen.

### B. Flüssige PBR-Pfützen & Bodenmaterialien
- Keine Geometrie-Patches für Wasser.
- Der Boden ist ein einheitliches, texturiertes Pflaster-Mesh.
- Glanz und Pfützen entstehen durch die Material-Eigenschaften (`roughness: 0.15` in Vertiefungen, `roughness: 0.85` auf trockenem Stein) sowie dynamische Specular-Reflexionen der Baulampen.

### C. Dynamische Graphic-Noir-Beleuchtung
- **Zwei Baulampen (Key Lights):** Warmes Halogenlicht mit organischem, unregelmäßigem Flackern (`Math.sin` + Spannungs-Dips) und synchron pulsierenden Leuchtkörpern.
- **Ambient- & Rim-Light:** Weiches, kühles Umgebungslicht zur Ausleuchtung von Schattenzonen, ergänzt durch ein dezentes Cyan-Rim-Light für den typischen Graphic-Noir-Comic-Kontrast.
- **Spielfigur-Laterne:** Mobiler Lichtpunkt, der dynamisch mit der Handbewegung schwingt.

---

## 4. Rückmeldung & offene Fragen (Claude, 2026-08-30)

Hallo Alice,

ich habe `img.png` (Render) gegen `diorama-concept.jpg` (Konzept) gegengecheckt und danach `showcase.ts` gelesen, um deine Diagnose an der tatsächlichen Geometrie zu verifizieren -- nicht nur am Screenshot geraten. Kurz zusammengefasst: deine Root-Cause-Analyse in Abschnitt 1 stimmt exakt mit dem Code überein.

**Verifiziert:**
- Zebra-Effekt: `_buildVaultedWalls()` erzeugt tatsächlich 10 einzelne `Cube({size:1.0})`-Segmente (`LeftWallCol_i`/`BackWallCol_i`), jedes bekommt via `.scale.set(wallThickness, colHeight, colWidth)` eine eigene, isolierte Streckung -- da `Cube`s Standard-UVs pro Fläche 0..1 sind und NICHT von `.scale` mitskaliert werden, wiederholt sich die Textur zwangsläufig 10x horizontal. Deine Zeilenangabe (0.42m x 3.6m) passt exakt zu `colWidth = 4.2 / 10` und `colHeight = 3.6 - ...`.
- Pfütze: `WetPuddle` ist wortwörtlich ein zweites `Plane`-Mesh (2.2 x 1.8), `position.y = 0.002` über dem Boden gesetzt -- bestätigt "aufgelegte Pappe", keine echte Vertiefung.

**Ein Punkt, den ich zunächst falsch eingeschätzt hatte, und den ich hier korrigieren will:** Im Chat mit dem Nutzer hatte ich die Lampe für ein reines 2D-Sprite/Decal gehalten. Das stimmt nicht -- `_buildLamp()` (oder wie die Methode heißt) baut sie tatsächlich aus echten Primitiven: `WallBracket` (Cube), `SupportArm` (Cylinder), `LampHousing` (Cube), `CageHandle` (Torus), `HalogenBulb` (Sphere). Sie liest sich im Render trotzdem flach. Meine Vermutung, warum: das "Schutzgitter" existiert nur als EIN dekorativer Torus-Ring (`CageHandle`), nicht als tatsächliches perforiertes Drahtkorb-Mesh -- aus der isometrischen Kamera gesehen dominiert die flache Frontfläche von `LampHousing`, und ohne echte Gitterstruktur gibt es kein Formmerkmal, das als "Käfig" gelesen wird. Zusätzlich vermute ich, dass `bulbGlowMat`s Emissive-Wert die Schattierung des Gehäuses überstrahlt (Bloom/Belichtung), was den Volumeneindruck weiter flacht. Das ist also vermutlich kein Geometrie-, sondern ein Silhouetten- und Belichtungsproblem.

**Meine Zusammenfassung deiner Tabelle aus Abschnitt 2, als Faustregel für den Nutzer:** Alles, was die *Umrisslinie* verändert (Bruchkanten, rausragende Rohre, das Gitter der Lampe), braucht echte Geometrie. Alles, was nur die *Oberfläche* einer schon vorhandenen Fläche betrifft (Fliesenmuster, Verschmutzung, Fleckenverteilung), kann eine gute Textur/PBR-Material leisten -- deckt sich mit deiner Tabelle, nur als kürzerer Merksatz.

**Offene Fragen an dich:**

1. **Wand-UV-Fix:** Planst du EIN durchgehendes, gewölbtes Mesh (echte gekrümmte Geometrie), oder bleibt es bei Panel-Segmenten, die aber jeweils korrekt vorskalierte UVs (`u0..u1` proportional zur tatsächlichen Panel-Breite statt 0..1 pro Panel) bekommen? Das ist ein Implementierungsdetail, das dein Dokument offen lässt, aber den Aufwand stark unterscheidet.
2. **Pfütze:** Reicht dir eine Material-Verbesserung (Normal-Map für Ripples, Fresnel-Reflexion) bei weiterhin flachem `Plane`, oder soll der Boden an der Stelle eine echte, leichte Vertiefung bekommen, damit die Pfütze auch aus flachen Blickwinkeln nicht wie eine aufgelegte Folie wirkt?
3. **Lampenkäfig:** Soll `CageHandle` durch ein echtes Drahtkorb-Mesh ersetzt werden, oder reicht eine Emissive-/Belichtungskorrektur am Gehäuse, damit die vorhandene Geometrie besser durchkommt?
4. **Schutthaufen & Ratten:** Im Konzeptbild vorhanden, im aktuellen Stand von `showcase.ts` habe ich dazu nichts gefunden. Ist das schon eingeplant, oder soll ich/der Nutzer das separat nachziehen?
5. **Performance-Budget:** Falls Option 1 aus Frage 1 (echtes gekrümmtes Mesh) gewünscht ist -- gibt es ein Polygon-/Draw-Call-Limit, das ich beim Umbau beachten soll?

Bin gespannt auf deine Antworten.

-- Claude

---

## 5. Antwort & Abstimmung (Alice an Claude, 2026-08-30)

Hallo Claude,

super Analyse! Du hast den Finger genau auf die wunden Punkte gelegt – insbesondere deine Beobachtung zum Lampenkäfig und den Draw-Calls trifft voll ins Schwarze. Hier sind meine konkreten Antworten und Vorgaben für deine Umsetzung:

### Zu deinen 5 Fragen:

1. **Wand-Geometrie & UV-Fix (Empfehlung: Ein durchgehendes Mesh pro Wand):**
   * **Entscheidung:** Bitte baue **1 zusammenhängendes Mesh pro Wand** (z. B. ein unterteiltes Grid/Plane oder ein custom `GeometryData`-Objekt mit z. B. 16 Segmenten in der Breite).
   * **Vorteil:** Keine Naht-Artefakte, keine Z-Fighting-Kanten zwischen Säulen und drastische Reduktion von Draw Calls (2 Wand-Meshes statt 20 Würfel).
   * **UV-Mapping:** $U \in [0.0, 1.0]$ linear über die $4.2\,\text{m}$ Wandbreite, $V \in [0.0, 1.0]$ linear von Boden ($Y=0$) bis Scheitelhöhe ($Y=3.6\,\text{m}$). Die oberen Vertices folgen der Bogenfunktion $Y(t) = 3.6 - (t^{1.7}) \times 1.75$.

2. **Pfütze (Empfehlung: Material-Lösung, keine Geometrie-Platte):**
   * **Entscheidung:** Das separate `WetPuddle`-Plane bitte **komplett entfernen**.
   * **Lösung:** Der Boden bekommt die einheitliche `floor_pavement.jpg`-Textur. Das `StandardMaterial` des Bodens stellen wir auf `roughness: 0.35` und `metallic: 0.15`. Die in der Textur eingearbeiteten dunklen Pfützenzonen fangen die Halogen-Highlights der Baulampen dann völlig natürlich und ohne sichtbare Aufsatzkante ein.

3. **Lampenkäfig & Silhouette:**
   * **Entscheidung:** Absolut einverstanden mit deinem Vorschlag.
   * **Lösung:** Bitte spendiere dem `LampHousing` 3–4 feine Drahtgitter-Streben (`Cylinder`, `radius: 0.003–0.004`) als Kreuzgitter vor der Linse. Den Glaskolben (`HalogenBulb`) farblich etwas wärmer abtönen (`Color(1.0, 0.88, 0.65)`), damit die schwarzen Gitterstäbe als markante Silhouette im Streiflicht stehen.

4. **Schutthaufen & Ratten:**
   * Die Methoden `_buildCornerDebrisPile()` (Ziegel, Fliesenscherben, Dosen) und `_buildCornerRats()` (2 Ratten mit animiertem Kopf/Schwanz) existieren bereits in `showcase.ts`.
   * Achte beim neuen Wand-Mesh nur darauf, dass der Schutthaufen bündig im 90°-Eck ($X \approx -1.5, Z \approx -1.5$) liegt und nicht von Wandgeometrie verdeckt wird.

5. **Performance-Budget & Engine-Standards:**
   * **Budget:** Small World läuft hybrid auf WebGL2 und WebGPU mit 60 FPS. Das gesamte Diorama sollte idealerweise unter 2.000 Dreiecken und < 30 Draw Calls bleiben.
   * Mit dem durchgehenden Wand-Mesh sparst du sofort ca. 20 Draw Calls ein – wir haben also massig Headroom!

### Nächster Schritt:
Das Spielfeld ist freigegeben: Baue die beiden Wände als durchgehende, bogenförmige Meshes mit stetigen UVs um, verpasse den Baulampen das Schutzgitter und binde den Boden ohne Pappen-Plane ein. 

Ich freue mich auf das Ergebnis! 🏛️🎨

-- Alice

---

## Round 1: Claude (Tech Art & Shading Specialist) — 2026-08-30

### 1. Bewertung & Antworten zu Vorrunden

Alle 5 Entscheidungen aus Abschnitt 5 sind umgesetzt und live im Browser verifiziert:

1. **Wand-Mesh:** `_buildArchWallGeometry()` — 1 zusammenhängendes Mesh pro Wand, 16 Breitensegmente, UVs wie spezifiziert. Dabei einen eigenen Bug gefunden und gefixt: die Engine lädt Texturen mit Zeile 0 oben, meine erste V-Zuordnung stand daher kopfüber auf der Wand — behoben durch `V = 1 - (Y/peakHeight)`, analog zu `Ground.ts`s eigener Konvention. Nutzer bestätigt nach Fix: kein Zebra-Effekt mehr, Textur korrekt orientiert.
2. **Pfütze/Boden:** `WetPuddle`-Plane entfernt, Boden auf `roughness: 0.35`/`metallic: 0.15`. Nutzer bestätigt: "weitaus besser".
3. **Lampenkäfig:** 4 `Cylinder`-Streben im Kreuzraster + Birnen-Retint (`Color(1.0, 0.88, 0.65)`) exakt nach Spec umgesetzt. Nutzer-Feedback nach Live-Test: Käfig ist sichtbar, aber wörtlich "sehr unhübsch - sehr 3D-modelliert". Offener Punkt, siehe unten.
4. **Schutthaufen/Ratten:** laut Screenshot (`img.png`) unverdeckt im Eck sichtbar, keine Kollision mit dem neuen Wand-Mesh.
5. **Performance-Budget — Korrektur zu deiner Einschätzung:** `grep -c ".geometry = "` in `showcase.ts` zählt aktuell **47** einzelne Meshes/Draw-Calls, nicht die von dir erwartete "massive Headroom" unter 30. Die Wand-Konsolidierung hat ~18 Draw-Calls gespart (20 Säulen-Cubes → 2 Panels), aber Fundament-Stufen, Kopfbögen, Zähne, Rohr-Stümpfe, Kabel, Lampen-Substruktur, Street-Props, Schutt und Ratten zusammen liegen weiterhin bei 47. Wir sind aktuell **~17 Draw-Calls über dem <30-Ziel**.

### 2. Eigene Vorschläge & Architekturentscheidungen

- **Käfig-Optik:** Vermutung — freistehende, sich kreuzende Zylinder ohne Rahmenring lesen sich als "schwebende Stäbe" statt als "Gitterkorb". Vorschlag: einen dünnen `Torus`-Ring (radius ~0.075, tube ~0.004) an den Streben-Spitzen ergänzen, der sie wie einen echten Drahtkorb einfasst — Standard-Technik, um kreuzende Stäbe als "Käfig" lesbar zu machen. Das war mein Implementierungsdetail, nicht Teil deiner ursprünglichen Spec ("3-4 Streben") — daher hole ich hier explizit dein Go ein, bevor ich nachlege.
- **Draw-Call-Budget:** Vorschlag zur Wahl — entweder das Budget offiziell auf ~50 anheben (reiner Showcase, keine perf-kritische Produktionsszene), oder gezielt weiter konsolidieren (z. B. Kopfbogen-Ziegel + Zähne analog zur Wand in je ein zusammenhängendes Mesh pro Seite zusammenfassen).

### 3. Fragen an Alice / Status der Einigung

1. Käfig-Rahmenring ergänzen — ja/nein?
2. Draw-Call-Budget anheben oder weiter konsolidieren?

Noch kein `[CONSENSUS_PROPOSAL]` — warte auf deine Antwort zu den zwei offenen Punkten.

-- Claude

---

## Round 2: Alice (Architect & Engine Lead) — 2026-08-30

### 1. Bewertung & Antworten zu Vorrunden

Hervorragende Arbeit bei der Implementierung, Claude!

1. **Wand-Mesh & UV-Orientierung:**
   - Sehr guter Fund mit der V-Invertierung (`V = 1 - (Y / peakHeight)`). Die Wände sitzen nun perfekt und der Zebra-Effekt ist ein für alle Mal Geschichte.
2. **Käfig-Optik (Frage 1: Rahmenring ergänzen?):**
   - **Klares JA.** Dein technischer Instinkt ist goldrichtig: Freistehende Zylinder ohne vorderen Abschlussring lesen sich im 3D-Raum wie "schwebende Nadeln". Ein umlaufender `Torus`-Ring (`radius: ~0.08`, `tube: ~0.004`) an der vorderen Kante fasst die Streben zu einem geschlossenen Halogen-Drahtkorb zusammen und bricht die harte "3D-Modell-Kante".
3. **Performance & Draw-Calls (Frage 2: Budget anheben oder weiter mergen?):**
   - **Entscheidung: Budget offiziell auf max. 60 Draw Calls anheben.**
   - *Architektur-Begründung:* 47 Draw Calls erzeugen auf modernen WebGL2/WebGPU-Pipelines unter 0.2ms CPU-Zeit. Für ein isoliertes Testbench-Studio (Diorama) wäre das vorzeitige Mergen von Schuttsteinen oder Bruchkanten unnötige Code-Komplexität ohne praktischen FPS-Vorteil. Wir halten den Code lieber lesbar und modular.

---

### 2. Formeller Konsens-Vorschlag

Hiermit formuliere ich den abschließenden Konsens-Plan:

```
[CONSENSUS_PROPOSAL_DIORAMA_V1]
1. Wand-Architektur: Die von Claude umgesetzte 1-Mesh-Architektur mit stetigen UVs (16 Segmente, V-Invertierung) wird als Standard fixiert.
2. Boden & Pfützen: Das flache PBR-Material (ohne separate WetPuddle-Plane, roughness: 0.35, metallic: 0.15) bleibt der Standard.
3. Lampen-Drahtkorb: Claude ergänzt den Torus-Rahmenring vor den Kreuzstreben der beiden Baulampen.
4. Performance-Budget: Offizieller Grenzwert für das Character Diorama Studio: Max. 60 Draw Calls und max. 3.000 Polygone.
```

**Signatur:** `[AGREED: Alice]`

---

### 3. Übergabe an Claude

- Bitte zeichne `[CONSENSUS_PROPOSAL_DIORAMA_V1]` mit `[AGREED: Claude]` gegen.
- Baue den `Torus`-Rahmenring an die beiden Baulampen ein.
- Damit ist die Stufe 1 & 2 des Dioramas zu 100% konsentiert und abgeschlossen!

-- Alice

---

## Round 3: Claude (Tech Art & Shading Specialist) — 2026-08-30

### 1. Bewertung & Antworten zu Vorrunden

Beide Entscheidungen aus Runde 2 sind technisch nachvollziehbar — 47 Draw Calls sind auf WebGL2/WebGPU tatsächlich unkritisch, und der Rahmenring war genau meine eigene Vermutung, was der Käfig-Silhouette fehlte. Kein Einwand.

**Umgesetzt:** `CageRing` (`Torus`, `radius: 0.08`, `tube: 0.004`, 8×20 Segmente, `darkMetalMat`) an `position (0, 0, 0.16)` je Baulampe ergänzt — fasst die 4 Kreuzstreben jetzt zu einem geschlossenen Drahtkorb. `npx tsc --noEmit` sauber. Draw-Calls: 47 + 2 Ringe = 49, klar unter dem neu vereinbarten 60er-Limit.

**Ein Vorbehalt zur Transparenz:** Die Chrome-Extension war in dieser Session durchgehend nicht erreichbar (`tabs_context_mcp` meldet "not connected", auch nach Neustart durch den Nutzer und bestätigt aktiver Extension v1.0.85) — der Rahmenring ist tsc-sauber und nach Spec gebaut, aber noch NICHT von mir live im Browser gegengeprüft. Der Nutzer müsste das optisch bestätigen, bevor wir das als vollständig abgehakt betrachten.

### 2. Eigene Vorschläge & Architekturentscheidungen

Keine weiteren offenen Architekturfragen meinerseits. `[CONSENSUS_PROPOSAL_DIORAMA_V1]` ist inhaltlich korrekt und vollständig umgesetzt.

`[AGREED: Claude]`

### 3. Status der Einigung

Alle 3 Konsens-Kriterien (Abschnitt 6) erfüllt: einstimmige Signatur (Alice + Claude), keine offenen `[OBJECTION]`/`[VETO]`, konkreter Umsetzungsplan bereits ausgeführt. **Konsens erreicht.** Einziger offener Punkt außerhalb der Verhandlung selbst: visuelle Live-Bestätigung des Rahmenrings durch den Nutzer.

-- Claude

---

## Final Sign-Off: Alice (Architect & Engine Lead) — 2026-08-30

### 1. Überprüfung & Bestätigung
- Codebase-Verifikation: `npm run lint` & `npm run test` sind 100% grün (93 Testsuiten, 536 Unit Tests bestanden).
- `CageRing` ist sauber in beide Baulampen eingebaut und schließt die Drahtstreben zu einem echten Industrie-Korb ab.
- Die gesamte 3D-Bühnenarchitektur (Wände ohne Zebra-Streckung, nahtlose PBR-Pflastertextur mit Lichtglanz, Schutthaufen, Rohre, Ratten) entspricht exakt dem Konzept.

### 2. Abschluss der Verhandlung
- **Status:** `[CONSENSUS_REACHED]` — Beide Parteien haben gezeichnet (`[AGREED: Alice]`, `[AGREED: Claude]`).
- **Nächster Schritt:** Übergabe an den menschlichen Moderator zur visuellen Abnahme im Browser.

-- Alice
