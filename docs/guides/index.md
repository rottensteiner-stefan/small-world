# Anleitungen

Praxisnahe Tiefen-Anleitungen pro Subsystem und Werkzeug der Small World Engine. Für die dahinterliegenden Design-Entscheidungen siehe [Architekturentscheidungen (ADRs)](/adr/); für Vokabular siehe [`CONTEXT.md`](https://github.com/rottensteiner-stefan/small-world/blob/main/CONTEXT.md) im Repo-Root.

## Erste Schritte

| Anleitung | Beschreibung |
|---|---|
| [Installation & Einrichtung](./getting-started.md) | Projekt aufsetzen, erste Szene starten. |
| [Kommerzielle Indie-Roadmap](./commercial-indie-roadmap.md) | Strategischer Fahrplan von Prototyp bis Steam/PlayStation/Xbox-Release. |

## Kernkonzepte

| Anleitung | Beschreibung |
|---|---|
| [Architektur & Überblick](./architecture.md) | Gesamtarchitektur und Code-Showcases. |
| [Materialien & Shader](./materials.md) | PBR-Material-System und Shader-Grundlagen. |
| [Schatten](./shadows.md) | Shadow Mapping, CSM, PCSS. |
| [Ein neues Material hinzufügen](./adding-materials.md) | Schritt-für-Schritt-Rezept für neue Materialien über alle Renderer hinweg. |
| [Shader-Importer](./shader-importers.md) | WGSL/GLSL-Chunk-Zusammenbau. |
| [Konfiguration & Einrichtung](./configuration.md) | `EngineOptions` und Engine-Setup. |
| [Koordinatensystem & Kamerastrategien](./coordinate-system.md) | Rechtshändiges Koordinatensystem, Kamerastrategien. |
| [2.5D-Szenen & Hintergründe](./2-5d-scenes.md) | Perspektiv-Abgleich, Bewegungszonen, Kamerastrategie-Abwägungen. |
| [Gamification & Interaktionen](./interactions.md) | `InteractionManager`, Pointer-Events, Octree-Picking. |
| [Physik & RigidBodies](./physics.md) | Kollisionserkennung, Solver, Constraints/Joints. |
| [Audio-System](./audio.md) | 3D-Audio, Mixer, prozeduraler Synthesizer. |
| [Zustandsautomaten (FSM)](./state-machines.md) | Zero-Allocation Finite State Machine Framework. |
| [EventBus & Game-Loop](./eventbus.md) | Zentraler Event-Dispatch und Render-Loop. |
| [Modulares Ökosystem & Schichtung](./extensions.md) | Abgrenzung Kern-Engine vs. Ökosystem-Pakete (siehe auch [Erweiterungen](/extensions/)). |
| [Ein eigenes Spiel bauen](./custom-game.md) | End-to-End-Anleitung für ein neues Projekt auf Basis der Engine. |

## Werkzeuge & Editoren

| Anleitung | Beschreibung |
|---|---|
| [Werkzeuge im Überblick](./toolchain.md) | Empfohlene externe Werkzeugkette. |
| [Maker (3D-Welteneditor)](./maker.md) | Vollständige Profi-Anleitung & Referenz. |
| [The Forge (Fenstermanager im Spiel)](./forge.md) | In-Game-Diagnose- und Tooling-Overlay. |
| [Material Studio](./material-studio.md) | PBR-Map-Generator. |
| [Pixler (Pixel-Art-Editor)](./pixler.md) | Retro-2D-Sprite-Editor. |
| [Xtractor (Sprite-Extraktor)](./xtractor.md) | Bild-Zuschnitt & -Schnitte für Tile-/Sprite-Atlanten. |
| [Map Generator (ASCII-Raster-Level)](./map-generator.md) | Visueller Grid-Editor für `GridLevelBuilder`-Layouts. |

## Standalone-Referenzmaterial

Eigenständige HTML-Erklärstücke, die aus einer der obigen Anleitungen oder einem `.agents/skills/`-Rezept heraus verlinkt werden (nicht Teil des VitePress-Seitenbaums): siehe `.agents/notes/reference/` im Repo.
