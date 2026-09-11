# Empfohlene externe Werkzeugkette

Während die **Small World**-Engine und ihr Node/Vite-Ökosystem das Kern-Rendering und die Logik übernehmen, braucht der Bau eines vollständigen 3D-/2.5D-Spiels ein unterstützendes Ökosystem aus externen Art- und Asset-Werkzeugen.

Hier die empfohlene Werkzeugkette, um effizient mit der Engine zu arbeiten:

## 1. 3D-Modellierung & Rigging: Blender
* **Rolle:** Der absolute Standard für 3D-Modellierung, Rigging und Animation.
* **Nutzung:**
  * Mixamo-/Sketchfab-Modelle importieren, um Skelette zu bearbeiten, Gewichtungen anzupassen oder Animationen zu kombinieren.
  * Level designen und NavMeshes (unsichtbare Kollisions-/begehbare Bereiche) für die Engine exportieren.
  * Geometrie optimieren (Polygone reduzieren) und PBR-Texturen in einzelne Atlanten backen, um WebGL-/WebGPU-Draw-Calls zu reduzieren.
* **Status:** Unverzichtbar.

## 2. GLTF/GLB-Optimierung: glTF-Transform
* **Rolle:** CLI-Werkzeugsuite der Khronos Group für starke Asset-Kompression.
* **Nutzung:**
  * Unoptimierte `.glb`-Dateien (z.B. direkte Mixamo-Exporte) enthalten oft unkomprimierte Daten, ungenutzte Bones oder massive Animations-Tracks (30MB+).
  * `gltf-transform` erlaubt es, **Draco**- oder **Meshopt**-Kompression, Quantisierung und Pruning direkt im Terminal anzuwenden, was Assets oft auf 1-2 MB schrumpft.
  * *Tipp:* Kann lokal über `npx @gltf-transform/cli` ausgeführt werden.
* **Status:** Sehr empfohlen (für Produktions-Builds).

## 3. 2.5D-Kunst & Texturen: Krita / Photoshop / Affinity
* **Rolle:** 2D-Bildbearbeitung, Matte Painting und Layer-Ausschnitte.
* **Nutzung:**
  * Die statischen 2.5D-Hintergründe ("Guckkasten-Prinzip") erstellen, indem über 3D-Blockouts oder KI-generierte Konzepte gemalt wird.
  * Vordergrund-Ausschnitte erstellen (transparente Ebenen wie Säulen, Geländer, Rohre), hinter denen Figuren hergehen können.
  * Alpha-Masken für Tiefen-Compositing im Shader erstellen.
  * **Dateiformat-Standard:** Fertige 2D-Assets als **WebP (`.webp`)** exportieren, für verlustfreie/verlustbehaftete Kompression ohne JPEG-Blockartefakte, mit voller Alpha-Transparenz-Unterstützung und kleinem Fußabdruck (~200KB pro 1080p-Tafel).
* **Status:** Unverzichtbar.

## 4. Audio-Engineering: Audacity
* **Rolle:** Freier, quelloffener Audio-Editor.
* **Nutzung:**
  * Rohe Soundeffekte (Schritte, UI-Klicks, Ambient-Tracks) zuschneiden, loopen und mischen.
  * Optimierte `.ogg`- oder `.mp3`-Dateien für den Audio-Context der Engine exportieren.
* **Status:** Unverzichtbar (sobald die Audio-Implementierung beginnt).

## 5. FBX-zu-GLTF-Konvertierung: fbx2gltf / Web-Konverter
* **Rolle:** Formatkonvertierung für 3D-Assets.
* **Nutzung:**
  * Small World nutzt ausschließlich den offenen `glTF/GLB`-Standard über `GltfLoader`.
  * Beim Herunterladen von `.fbx`-Dateien (z.B. von Mixamo) müssen diese konvertiert werden. Das geht über das `fbx2gltf`-CLI-Werkzeug oder schnell über Web-Konverter wie [AnyConv](https://anyconv.com/fbx-to-glb-converter/).
* **Status:** Notwendiges Hilfswerkzeug.

## 6. KI-Konzeptkunst & Hintergrund-Inpainting: Integrierter Bildgenerator
* **Rolle:** Automatisierte Erzeugung und Bearbeitung von 2.5D-Matte-Painting-Hintergründen und Konzeptkunst.
* **Nutzung:**
  * Konsistente, im Graphic-Noir-Stil gehaltene Umgebungs-Skizzen und Szenenhintergründe erzeugen.
  * Bild-zu-Bild-Bearbeitung/Inpainting (z.B. temporäre Figuren/Objekte aus Hintergrundtafeln entfernen, um saubere, leere 2.5D-Bühnen zu erstellen).
  * Direkte Ausführung über das `generate_image`-Werkzeug des Agenten mit Referenzbild-Eingaben.
  * **Seitenverhältnis-Standard:** Immer `AspectRatio: "16:9"` erzwingen, um zur 3D-Bühne `Plane({ width: 16, height: 9 })` verzerrungsfrei 1:1 zu passen.
* **Status:** Integrierte Agenten-Fähigkeit.
