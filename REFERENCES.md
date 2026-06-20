# Quellen & Referenzen (Sources & References)

Dieses Dokument dient dazu, externe Quellen, Algorithmen, mathematische Herleitungen und Inspirationen festzuhalten, die in die Entwicklung von **small-world** geflossen sind.

## Geometrien & Mathematik

### `Gear` (Zahnrad)

- **Datei:** `src/geometry/Gear.ts`
- **Quelle:** [Rechneronline - Zahnrad berechnen](https://rechneronline.de/pi/zahnrad.php)
- **Verwendung:** Die zugrundeliegenden Formeln zur Generierung der isometrischen Trapez-Zähne, Teilkreise, und Radien für das 3D-Zahnrad wurden aus diesem Tool entnommen und adaptiert.

### Matrix- und Quaternionen-Herleitungen (Allgemeines Nachschlagewerk)

- **Datei:** Betrifft hauptsächlich `src/math/Matrix4x4.ts`, `src/math/Quaternion.ts`, `src/math/Matrix3x3.ts` sowie die Kameras/Projektionen.
- **Quelle:** [Mathematische Grundlagen der 3D-Grafik (David Nadlinger, 2008/2009)](https://klickverbot.at/science/3d-mathematics/3d-mathematics.pdf)
- **Verwendung:** Eine hervorragende und kompakte deutschsprachige Zusammenfassung der zugrundeliegenden 3D-Mathematik. Enthält Herleitungen für Rotationen (Vermeidung von Gimbal Lock durch Quaternionen), View Matrix und Projektionsmatrix (inkl. Frustum und Clipping). Dient als generelles Nachschlagewerk für die Engine-Mathematik, da `small-world` wie dort beschrieben das OpenGL-Konzept (rechtshändiges System, Spaltenvektoren) nutzt.

### Einführung in die 3D-Grafik und Rendering-Pipeline (David Scherfgen)

- **Datei:** Betrifft die generelle Architektur der Engine (z.B. Beleuchtung, Shader, Geometrie-Puffer, Kameras).
- **Quelle:** [Einführung in die 3D-Grafik (David Scherfgen)](https://www.david-scherfgen.de/downloads/neues-buch-kapitel-3d-grafik.pdf)
- **Verwendung:** Dieses Buchkapitel bietet einen phänomenalen Überblick über die gesamte Rendering-Pipeline (vom Vektor bis zum Pixel auf dem Bildschirm). Es behandelt detailliert Themen wie das Phong-Beleuchtungsmodell (Ambient, Diffuse, Specular), Shading-Arten (Flat, Gouraud, Phong), Texturierung (MIP-Mapping, Anti-Aliasing) und den Z-Buffer. **Achtung:** Im Gegensatz zu `small-world` (OpenGL-Konvention) verwendet dieses Skript primär die Direct3D-Konvention (linkshändiges Koordinatensystem, Zeilenvektoren).

## Rendering Architecture & Best Practices

### Physically Based Rendering (PBR)

- **Autoren/Gurus:** Matt Pharr, Wenzel Jakob, Greg Humphreys
- **Quelle:** [Physically Based Rendering: From Theory to Implementation (PBRT)](https://www.pbrt.org/)
- **Verwendung:** Die mathematische Basis für PBR, Raytracing, Refraction (Lichtbrechung) und Energieerhaltung (Energy Conservation: `Diffuse + Specular <= 1.0`).

### Real-Time Rendering Pipeline & State Minimization

- **Autoren/Gurus:** Tomas Akenine-Möller, Eric Haines, Naty Hoffman
- **Quelle:** [Real-Time Rendering (RTR)](https://www.realtimerendering.com/)
- **Verwendung:** Die Bibel für Echtzeit-Rendering. Daraus leiten sich grundlegende Konzepte wie Opaque vs. Transparent Rendering Order, Back-to-Front Sorting und State Minimization ab (Minimierung der Draw Calls durch effizientes Gruppieren nach Pass -> Shader -> Material).

### Linear Color Space & Gamma Correctness

- **Autoren/Gurus:** Naty Hoffman, Sebastien Lagarde (Frostbite Engine)
- **Quelle:** SIGGRAPH Presentations & "Moving Frostbite to Physically Based Rendering"
- **Verwendung:** Das Gesetz des linearen Farbraums: Alle Farbtexturen (Albedo) müssen vor der Lichtberechnung im Shader in den Linear Space (sRGB -> Linear) umgewandelt werden. Nach allen Lichtberechnungen muss das Resultat vor der Ausgabe auf den Bildschirm in den sRGB Space (Gamma Correction) umgewandelt werden.

### Data-Oriented Design (DOD)

- **Autoren/Gurus:** Mike Acton (Insomniac Games, Unity)
- **Verwendung:** Die Architekturrichtlinie, dass Datenstrukturen (wie TypedArrays und flache Arrays) gegenüber OOP und tief verschachtelten Objekten bevorzugt werden sollen, um CPU-Cache-Misses während der Rendering-Schleife zu vermeiden.

## Graphics APIs (WebGPU / WebGL)

### W3C WebGPU Specification

- **Quelle:** [WebGPU W3C Working Draft](https://www.w3.org/TR/webgpu/)
- **Verwendung:** Die absolute Single Source of Truth für WebGPU-Mechanismen. Sie begründet die strengen Validierungsregeln und expliziten Ressourcen-Anforderungen (z.B. warum `GPUTextureUsage` exakt definiert werden muss, bevor eine Operation wie `copyTextureToTexture` ausgeführt werden kann).

### WebGPU Fundamentals

- **Autoren/Gurus:** Gregg Tavares
- **Quelle:** [WebGPU Fundamentals](https://webgpufundamentals.org/)
- **Verwendung:** Eine hervorragende Quelle, um den konzeptionellen Unterschied zwischen implizitem Status (WebGL) und expliziten Pipelines/Layouts (WebGPU) zu verstehen. Dient als Vorlage für Best Practices rund um Texture-Bindings, Memory Alignments (Uniforms/UBOs) und den sicheren Umgang mit Render Passes.

### Tour of WebGPU

- **Autoren/Gurus:** Alain Galvan
- **Quelle:** [Raw WebGPU (Tour of WebGPU)](https://alain.xyz/blog/raw-webgpu)
- **Verwendung:** Dient als wichtige architektonische Referenz zum Verständnis der Bind Group Layouts, Command Buffer Encoding und dem Mapping von Konzepten wie Vulkan/Metal/D3D12 auf den Web-Standard.

## Bildverarbeitung & Texturgenerierung (Image Processing & Texture Generation)

### Perlin Noise (2D Rauschen)

- **Datei:** `public/tools/splatter-gen.html` (sowie Engine-Noise in `src/utils/Noise.ts`)
- **Autoren/Gurus:** Ken Perlin (1985 / Improved Noise 2002)
- **Quelle:** [Making Noise (Ken Perlin)](https://mrl.cs.nyu.edu/~perlin/doc/oscar.html)
- **Verwendung:** Das 2D Perlin-Rauschen wird verwendet, um weiche, organische Störungen und Kräuselungen auf Kreisen zu berechnen (Noise Warp). So entstehen aus einfachen geometrischen Formen natürlich wirkende Spritzkanten für Flüssigkeiten und Matsch-Splatters.

### Flüssigkeits-Metaballs (Liquid Blobs)

- **Datei:** `public/tools/splatter-gen.html`
- **Autoren/Gurus:** James Blinn (1982)
- **Verwendung:** Das physikalische Konzept der Metaballs beschreibt organisch verschmelzende Kugeloberflächen. Im Splatter-Generator zeichnen wir dazu mehrere Kreise auf einer Offscreen-Leinwand, zeichnen sie weich (Dichtefeld) und schneiden sie über einen Schwellenwert (Alpha-Thresholding) wieder scharf ab. So verschmelzen nebeneinander liegende Tropfen wie Flüssigkeiten ineinander.

### Box-Blur (Weichzeichner)

- **Datei:** `public/tools/splatter-gen.html`, `public/tools/pbr-gen.html`
- **Verwendung:** Zur Simulation von Gaußscher Unschärfe auf Pixel-Arrays wird ein zweistufiger, linearer Box-Blur (horizontaler und vertikaler Durchlauf) in reinem JavaScript implementiert. Dies ermöglicht extrem schnelle Bildglättung in Echtzeit bei O(N) Komplexität (unabhängig vom Radius).

### Normal-Map Generierung (Sobel-Filter)

- **Datei:** `public/tools/pbr-gen.html`, `src/tools/pbr-preview.ts`
- **Autoren/Gurus:** Irwin Sobel (1968)
- **Quelle:** Sobel-Operatoren zur Bildsegmentierung / Kantendetektion.
- **Verwendung:** Die Normalenkarte wird erzeugt, indem die Ableitungen der Höhenkarte in X- und Y-Richtung mithilfe eines diskreten 3x3 Sobel-Faltungs-Kernels berechnet werden. Der Normalenvektor berechnet sich aus n = normalize(-dx * s, -dy * s, 1.0) und wird in RGB-Farbwerte im Bereich [0, 255] codiert.

### Sigmoidaler Kontrast (Specular S-Kurven)

- **Datei:** `public/tools/pbr-gen.html`
- **Quelle:** ImageMagick `-sigmoidal-contrast` Funktion.
- **Verwendung:** Um Glanzlichter weich aber kontrastreich anzuheben, wird eine sigmoidale Kurvenfunktion f(x) = 1 / (1 + exp(-c * (x - t))) auf die Helligkeitswerte angewendet. Dies verhindert ein hartes Abschneiden (Clipping) und simuliert realistischeres Specular-Verhalten.

### Laplacian Crevice Cavity Mapping (Ambient Occlusion)

- **Datei:** `public/tools/pbr-gen.html`
- **Quelle:** Diskrete Laplace-Filter / Kantenoperatoren.
- **Verwendung:** Zur Approximation lokaler Selbstbeschattung (Ambient Occlusion / Risse) wird die Krümmung (zweite Ableitung) der Höhenwerte über einen Laplace-Kernel berechnet (4 * center - sum(neighbors)). Dies hebt Vertiefungen und Spalten hervor, die mit einer weichgezeichneten Makro-Höhenkarte multipliziert werden.
