# Session-State / Arbeits-Gedächtnis

> Lebende Datei für die Review-Aufräum-Initiative. Beim nächsten Durchstarten zuerst lesen, um den Stand
> zu haben. Ist eine flache, menschen- und agentenlesbare Markdown-Datei (kein vom Agent automatisch
> injizierter Memory-Kontext) — sie wird nur gesehen, wenn sie explizit gelesen oder verlinkt wird.

Letzter bekannter Stand: **2026-09-04**, Release **0.77.14** (`2f20a63e`, gepusht).

## Was in dieser Review-Initiative bereits erledigt & committed ist

Diese Commits stammen aus der Abarbeitung des Reviews `.agents/notes/full-review-2026-09-03/`. Commit-Messages
sind gemäß Konvention reine Zitate (niemals wiederverwenden!).

- `6931b847` «Everything that can be removed…» — FrustumCuller static→instance, window-gadget-audio-Listener raus, PropertyPanel-Listener-Leak, AsciiMapLegend-Zähler, ShaderRegistry-Cache-Warnung.
- `8573a224` «Even the smallest deviation…» — Skeleton.invert()-Identity-Fallback + Ortho-CSM in DirectionalLight (+Tests).
- `c76aa664` «Great things are not done by impulse…» — Zero-Allocation-Animationen in AnimationMixer/KeyframeTrack (+InteractionManager/Gamepad/Draggable).
- `5841e700` «Genius is eternal patience.» — WebGL/WebGPU-Renderer-Robustheit (TextureManager, RendererFactory-Fallback, GPUGeometryCache).
- `04f63322` «Nothing is wasted, nothing in vain.» — tote/spekulative Codepfade: GeometryWorkerProcessor + PrologueScene gelöscht, Scene._scratchFrustum raus, MathUtils.fastSin/fastCos-Tabellen durch Math.sin/cos ersetzt.
- `2f20a63e` «There is nothing so useless…» — **Release 0.77.14**: Loader-Robustheit (GltfSkinParser-Joint-Validierung, ObjLoader-.mtl-Fallback, AudioSystem wirft statt zu schlucken) + injizierter Audio-Event-Bus (`EventType.AUDIO_LOADED`).

## Noch offen / nicht von mir angefasst

- `src/apps/yad/core/LevelBuilder.ts` — 🟡 "Entwickler-Selbstgespräch als Kommentar" aus Gruppe E (Cleanup, niedrige Priorität).
- Review-Gruppen aus `full-review-2026-09-03/`-Dateien, die **nicht** Teil der bisher gewählten A+B/D-Batches sind, könnten noch unerledigte 🟠/🟡/🟢-Punkte enthalten (nicht geprüft — bei Bedarf pro Datei gegenprüfen, Status-Spalte in `00-index.md`).

## Parallele/andere Arbeit (nicht von dieser Session)

Während der Arbeiten tauchten wiederholt un-/anders committete Änderungen auf, die nicht von mir stammen
(vermutlich paralleler laufender Prozess). Diese **nicht** in meine Commits mischen, getrennt behandeln:
- Früher: BillboardInstancer, WebGPURenderer, WebGPUSkinning, REFERENCES, `.agents/notes/continous-review-2026-09-04/`.
- Zum letzten Check offen: `src/apps/yad/core/Hud.ts`, `src/tools/index.ts`, `REFERENCES.md`.

## Regeln, die in dieser Umgebung gelten

- Versionsnummer lebt in `package.json` (Canonical); `scripts/update-version.js` schreibt sie per prebuild in `src/core/SmallWorld.ts` `ENGINE_VERSION`. Changelog-Freigabe nach `.claude/skills/changelog/SKILL.md`.
- Verifikation nach Änderungen: `npm run lint:fix`, `npx tsc --noEmit`, `npm run test`, `npm run build:lib`.
- Kein Commit nach jedem Micro-Edit; erst wenn Milestone rund oder explizit angefragt. Commit/Quote nie aus `git log` wiederverwenden.
