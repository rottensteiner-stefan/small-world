# Asset-Sourcing & Textur-Doktrin für Small World & The Whisper

## 1. Grundsatz: Open Sources & Tripo3D API („Handvoll-Regel“)

- **Pragmatismus vor Neuerfindung:** Wann immer 3D-Meshes oder Basismaterialien benötigt werden, dürfen und sollen freie, hochwertige Quellen im Internet angezapft werden (Poly Haven, ambientCG, Kenney, Sketchfab CC0/CC-BY, OpenGameArt).
- **Die „Handvoll“-Regel (3–5 Varianten testen):** Bevor ein Modell von Grund auf selbst modelliert oder eine endgültige Entscheidung getroffen wird, werden stets **3 bis 5 Kandidaten/Varianten** ausprobiert, verglichen und auf Stilkonsistenz, Polycount und Textur-Mapping geprüft.
- **Tripo3D API & AI-Ingest:** Steht jederzeit zur Verfügung, um schnell maßgeschneiderte Low-Poly-Props (`.glb` mit optimiertem PBR-Atlas) nach 2D-Konzeptvorlagen zu generieren.

---

## 2. Textur-Strategie: Fertige Packages vs. Eigene Erstellung

| Textur-Typ | Empfohlene Quelle | Begründung & Workflow |
| :--- | :--- | :--- |
| **Generische Oberflächen** *(Beton, Asphalt, Mauerwerk, Schotter, rostiges Blech, Holzbretter)* | **CC0-Packages** (*ambientCG, Poly Haven*) | Physikalisch kalibrierte PBR-Karten (Normal, Roughness, AO) ohne KI-Artefakte; spart hunderte Stunden Modellier- und Bäckerei-Zeit. |
| **Grafische Noir-Stilisierung** *(Tusche-Schraffuren, handgezeichnete Fugen, Comic-Inking)* | **Shader-Ebene / Custom Layer** | Der Engine-eigene `OutlinePass` und Custom Post-Processing legen den einheitlichen Graphic-Noir-Look konsistent über alle PBR-Materialien. |
| **Story-kritische Key-Props** *(Františeks Kaffeedose, Amts-Terminal, Blausäure-Decals, Wiener Straßenschilder)* | **Gezielt selbst erstellen** *(KI-Generierung + CAD/SVG + PBR-Finish)* | Narrative Einzigartigkeit und historische/österreichische Details erfordern maßgeschneiderte Typografie und Abnutzungsmuster. |

---

## 3. Empfohlene Textur- & Modell-Bibliotheken

1. **ambientCG (Lennart Demes):** >1.800 CC0 PBR-Materialien, perfekt für Bunker-Beton, feuchte Tunnelwände, Ziegel, Schlamm, Fliesen und rostige Industriemetalle.
2. **Poly Haven:** Höchste Material-Qualität mit 100% sauber kalibrierten Normal- und Roughness-Maps.
3. **Kenney Assets:** Exzellent für UI-Symbole, kleine Requisiten und modulare Prototyping-Elemente.
4. **Tripo3D CLI / API:** Für schnelle 3D-Geometrie-Generierung aus isolierten 2D-Artwork-Referenzen.
