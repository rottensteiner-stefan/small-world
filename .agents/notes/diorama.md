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
