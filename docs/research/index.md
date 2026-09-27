# Engine-Recherche & Technische Untersuchungen

Tiefgehende technische Untersuchungen, Rendering-Studien, architektonische Nachbetrachtungen und Technologie-Benchmarks, die im Laufe der Entwicklung der Small World Engine entstanden sind.

## Recherche-Papiere & Studien

- **[AAA-Rendering-Techniken](./aaa-engine-techniques.md)** — Ursprünglich eine vergleichende Untersuchung moderner Rendering-Techniken (HBAO/GTAO, TAA, Clustered Forward+, Bloom, Schatten, HZB) über Unreal, Unity und Godot, bewertet für leichtgewichtiges Web-Deployment; umgebaut zur **pflegbaren Wunschliste** (2026-09-27) mit festem Bestand der umgesetzten Punkte — offen: volumetrischer Nebel (Stufe B), volles GTAO, LOD, Billboards, volles TAA.
- **[Öl- & Pfützen-Shader-Techniken](./oil-puddle-shader-technique.md)** — Physikalische Modellierung von Flüssigkeitsoberflächen, Screen-Space-Sampling des undurchsichtigen Bodens, Schlick-Fresnel-Basiswerte ($F_0$), Beer-Lambert-Absorption und Khronos' `KHR_materials_iridescence` Zwei-Strahl-Dünnschicht-Interferenz (Referenzformeln weiterhin gültig, Umsetzungsphasen abgeschlossen).
- **[Showcase-Feature-Audit](./showcase-feature-audit.md)** — Ursprünglich eine Feature-Matrix über alle Showcases/Apps (Stand 2026-08-20); umgebaut zur **pflegbaren Wunschliste** (2026-09-27) der implementierten, aber nie gezeigten Engine-Features (F1–F9), mitsamt bewusst geschlossener Punkte. Die historische Matrix bleibt als Referenz-Anhang erhalten.
- **[Plan 0: Datengetriebene Level-Deskriptoren (2026-09-18)](./plan-0-level-descriptors-2026-09-18.md)** — Ursprüngliche Q&A-Herleitung des Umbaus zu deklarativen Level-Deskriptoren; umgesetzt und abgelöst durch [ADR 0020](../adr/0020-declarative-level-descriptors-and-kit-runtime.md).
