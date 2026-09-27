# Engine-Recherche & Technische Untersuchungen

Tiefgehende technische Untersuchungen, Rendering-Studien, architektonische Nachbetrachtungen und Technologie-Benchmarks, die im Laufe der Entwicklung der Small World Engine entstanden sind.

## Recherche-Papiere & Studien

- **[AAA-Rendering-Techniken](./aaa-engine-techniques.md)** — Ursprünglich eine vergleichende Untersuchung moderner Rendering-Techniken (HBAO/GTAO, TAA, Clustered Forward+, Bloom, Schatten, HZB) über Unreal, Unity und Godot, bewertet für leichtgewichtiges Web-Deployment; umgebaut zur **pflegbaren Wunschliste** (2026-09-27) mit festem Bestand der umgesetzten Punkte — offen: volumetrischer Nebel (Stufe B), volles GTAO, LOD, Billboards, volles TAA.
- **[Öl- & Pfützen-Shader-Techniken](./oil-puddle-shader-technique.md)** — Physikalische Modellierung von Flüssigkeitsoberflächen, Screen-Space-Sampling des undurchsichtigen Bodens, Schlick-Fresnel-Basiswerte ($F_0$), Beer-Lambert-Absorption und Khronos' `KHR_materials_iridescence` Zwei-Strahl-Dünnschicht-Interferenz (Referenzformeln weiterhin gültig, Umsetzungsphasen abgeschlossen).
- **[Showcase-Feature-Audit](./showcase-feature-audit.md)** — Feature-Matrix und Lückenanalyse, Stand 2026-08-20 (veraltet, siehe Hinweis im Dokument).
- **[Thermo-Nuclear Code Quality Review (2026-09-18)](./codebase-review-2026-09-18-thermo-nuclear.md)** — Repo-weiter Prüfbericht nach der strengeren `thermo-nuclear`-Norm; alle Findings behoben, MAJ-10 mit dokumentierter Teil-Ausnahme (`MakerApp.ts` bleibt bei 1698 Zeilen, begründet).
- **[Plan 0: Datengetriebene Level-Deskriptoren (2026-09-18)](./plan-0-level-descriptors-2026-09-18.md)** — Ursprüngliche Q&A-Herleitung des Umbaus zu deklarativen Level-Deskriptoren; umgesetzt und abgelöst durch [ADR 0020](../adr/0020-declarative-level-descriptors-and-kit-runtime.md).
