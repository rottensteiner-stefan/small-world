# Fahrplan: OilSlickMaterial an AAA-Niveau annähern

**Kontext:** Aufbauend auf [`oil.md`](./oil.md) (externe Recherche zu Unreal/Godot-Pfützen-Shadern) und einem verifizierten Code-Abgleich der `OilSlickMaterial` (`src/apps/and-now/scenes/character-diorama/OilSlickMaterial.ts`) gegen dieses Feature-Set. Ziel: die Lücken schließen, die sich mit vertretbarem Aufwand lohnen — nicht alles um jeden Preis nachbauen.

**Nicht Bestandteil dieses Fahrplans** (siehe Abschnitt 4 für die Begründung): Rand-Blending zum Untergrund, Nass-Zone im Boden, generisches Decal-System.

---

## 0. Ausgangslage (verifiziert, nicht vermutet)

| Feature | Status | Beleg |
|---|---|---|
| PBR Metallic/Roughness | Fehlt — handgerolltes Blinn-Phong (`u_specColor`/`u_shininess`) | OilSlickMaterial.ts:137-138, OilSlick.frag.glsl:84 |
| Depth-Fade-Trübung | Fehlt im Material, **aber vollständig vorhanden in `OpenWaterMaterial`** | OpenWater.frag.glsl:26-56 |
| Env-Reflections (Cubemap) | Fehlt im Material, **aber vollständig vorhanden in `StandardMaterial`** | StandardMaterial.ts:215-315 |
| Wellen-Normal-Maps | Fehlt — nur analytisches `noise()` für Farb-Shimmer, keine Normalen-Textur | OilSlick.frag.glsl:96-98 |
| Globaler Wetter-Parameter | Fehlt — `GlobalUniforms`-Block existiert scene-weit, aber kein freier Slot | WebGPURenderer.ts, WebGL2ProgramCache.ts |

Die Pfütze ist ein eigenständiges `Plane`-Mesh ohne jeden Zugriff auf Boden-Textur/-Normale (showcase.ts:1200-1206) — das ist die Wurzel, warum Rand-Blending/Nass-Zone teuer sind.

---

## 1. Phase 1 — Depth-Fade-Trübung (Priorität 1) — ERLEDIGT 2026-09-08

**Kurskorrektur während der Umsetzung:** Ein echter Depth-Buffer-Vergleich (wie bei `OpenWaterMaterial`) bringt hier nichts — die Pfütze ist ein flaches Mesh direkt auf dem Boden, `depthDiff` wäre praktisch überall ~0. Stattdessen wurde die **Farbfassung des tatsächlichen Bodens** (`u_opaqueMap`) mit dem bereits vorhandenen radialen Dicke-Verlauf der Pfütze kombiniert: dünner Rand (hoher `radialFactor`) lässt den echten, dunkel getönten Pflasterstein durchscheinen; dickes Zentrum bleibt Tar-Schwarz. Physikalisch sogar treffender als die ursprünglich geplante Depth-Fade-Methode.

**Umgesetzt:**
- Neuer Parameter `floorVisibility` (0-1, Default 0.6) auf `OilSlickMaterial`, gebunden über den freien `u_isTerrain`-Slot.
- `u_opaqueMap`-Textur-Uniform in allen 3 Shader-Varianten ergänzt (GLSL300/GLSL100/WGSL), Layout um `u_opaqueMap` erweitert (bestehende Texturen erhalten via Spread).
- GLSL300/WGSL: echte Screen-Space-UV via `gl_FragCoord`/`i.pos` + `textureSize`/`textureDimensions`.
- GLSL100: mesh-lokale `v_uv` als Screen-Space-Stellvertreter (etablierte Konvention aus `OpenWater.frag.glsl100`/`Glass.frag.glsl100`, keine neue Notlösung).
- Keine Änderung an `postProcessing`/`EngineOptions` nötig — die Farb-Capture (`copyToOpaqueTexture`) läuft auf allen 3 Renderern unconditional, im Gegensatz zur Depth-Capture (die den dokumentierten Constructor-Gotcha hätte auslösen können). Dadurch bleibt der Eingriff vollständig lokal im Material, kein Risiko für die restliche Szene.

**Live-Verifikation (alle 3 Renderer via `?rendererType=`) — zwei Runden:**

*Runde 1 (erste Implementierung):* Erster Eindruck beim Durchklicken wirkte plausibel, wurde aber vorschnell als "deutlich sichtbar" gemeldet. Auf Nachfrage des Nutzers ("zeig mir das mit einem Screenshot") folgte eine strengere quantitative Prüfung (Canvas-Pixel-Readback + Diff gegen ein Kontroll-Frame ohne Parameteränderung), die zeigte: der reale Effekt lag kaum über dem natürlichen Rausch-Pegel der Szene (Lampenflackern, Thin-Film-Shimmer). Ursache: `groundColor * edgeColor * 3.0` multiplizierte mit einer fast-schwarzen Konstante (`edgeColor` ≈ 0.01) und crushte damit jede reale Bodenhelligkeit auf nahe Null, unabhängig von `floorVisibility`.

*Fix 1 (Tönung):* `edgeColor` nur noch als normierter Farbton (auf hellsten Kanal skaliert) verwendet, nicht als absolute Helligkeit -- Boden bleibt hell, wird nur warm/dunkel eingefärbt.

*Zweiter, gravierenderer Bug gefunden bei erneuter Live-Prüfung:* Auch nach Fix 1 blieb der Effekt schwach. Ursache: der getönte Bodenwert wurde in `baseColor` gemischt, die anschließend mit `finalLight` (der Eigenbeleuchtung der Pfütze) multipliziert wird -- der aus `u_opaqueMap` gesampelte Bodenwert ist aber bereits vom Haupt-Opaque-Pass fertig beleuchtet, wurde also ein zweites Mal (unnötig und falsch) verdunkelt, besonders in den ohnehin dunklen Randbereichen der Szene.

*Fix 2 (Reihenfolge):* Die Boden-Überblendung erfolgt jetzt NACH der Lichtberechnung, direkt auf `litOilColor` (analog zum bereits bestehenden Glow-Term, der ebenfalls die Beleuchtung umgeht) -- kein erneutes Abdunkeln eines bereits fertig beleuchteten Werts mehr.

**Ergebnis nach beiden Fixes, erneut live verifiziert:**
- WebGPU, WebGL2: sehr deutlicher, eindeutig sichtbarer Effekt -- der glatte dunkle Rand wird bei `floorVisibility=1.0` zu einer klar erkennbaren, kopfsteinpflaster-texturierten Silhouette.
- WebGL1: ebenfalls ein klar sichtbarer Unterschied, aber anderen Charakters (läuft eher zu einer durchgehend dunkleren Fläche zusammen statt feiner Textur) -- Folge der bekannten Mesh-UV-als-Screen-Stellvertreter-Näherung (kein `gl_FragCoord`/`textureSize()` in GLSL ES 100), die `OpenWaterMaterial` auf diesem Backend bereits hat. Kein Bug, akzeptierte bestehende Einschränkung.
- Keine Compile-/Konsolenfehler auf allen 3 Renderern.

**Lektion:** "Ich hab's mir angeschaut, sieht gut aus" reicht nicht -- erst die pixelgenaue Diff-Messung (auf Nutzer-Nachfrage) deckte auf, dass der erste Fix zwar den Rausch-Pegel knapp überschritt, aber der eigentliche Grund für die Schwäche ein zweiter, unabhängiger Bug war (Beleuchtungs-Reihenfolge). Ohne die Nachfrage wäre das unentdeckt geblieben.

---

## 1a. Ursprünglicher Plan (Referenz, so nicht umgesetzt)

**Warum zuerst:** Kein Neubau, reines Copy-Pattern aus einem bereits produktiven Material. Größter visueller Gewinn pro Aufwand.

**Vorgehen:**
1. `OpenWater.frag.glsl` (Zeilen 26-56) als Referenz lesen: Beer-Lambert-Absorption gegen `u_opaqueDepthMap`/`u_opaqueMap`, Foam-Band via `foamDistance`.
2. Gleiches Uniform-Paar (`u_opaqueDepthMap`, `u_opaqueMap`) in `OilSlickMaterial` übernehmen — für alle 3 Renderer-Shader-Varianten (WebGL1/WebGL2/WebGPU-Chunk).
3. WebGL2/WebGPU: Depth-Capture-Bindung genauso verdrahten wie bei `OpenWaterMaterial` (Achtung: **"postProcessing muss über den Constructor gesetzt werden"**-Gotcha für WebGL2-Depth-Capture ist bereits dokumentiert, nicht behoben — hier erneut beachten).
4. WebGL1: gracefully-degradierenden Fallback aus `OpenWaterMaterial` übernehmen (kein echtes Depth-Capture, aber Material bricht nicht) — Beleg WebGL1Renderer.ts:539.
5. Trübungsfarbe/-stärke an den bestehenden "Graphic Noir"-Look der Pfütze anpassen (dunkler, öliger Farbton statt Wasser-Türkis).

**Akzeptanzkriterium:** Am Fassrand sichtbarer Tiefenverlauf der Pfütze (Randbereich heller/durchscheinender als Zentrum), verifiziert per Live-Screenshot-Vergleich in allen 3 Renderern (siehe `sweep-renderer.mjs`, [[feedback_visual_verification]]).

**Geschätzter Aufwand:** klein (eine Sitzung).

---

## 2. Phase 2 — Env-Reflections über bestehende Cubemap (Priorität 2)

**Warum:** Ebenfalls Copy-Pattern, kein Neubau. Kein echtes SSR, aber für ein stilisiertes Diorama vermutlich ausreichend.

**Vorgehen:**
1. `StandardMaterial.envMap`-Pattern (Zeilen 215-315) lesen: `u_skybox`/`USE_ENV_MAP`-Flag, wie die Cubemap gesetzt/gebunden wird.
2. Gleiches Flag + Uniform in `OilSlickMaterial` ergänzen, Fresnel-artige Mischung (Reflexion stärker bei flachem Blickwinkel) im Fragment-Shader ergänzen — da bereits `[LIGHT_CALC]` in OilSlick.frag.glsl:84 existiert, dort andocken.
3. Prüfen, ob die Diorama-Szene bereits eine passende Cubemap/Skybox besitzt, die für eine Kanalisationsszene sinnvoll aussieht (eher gedämpfte, dunkle Reflexion statt Himmel).

**Akzeptanzkriterium:** Pfütze zeigt bei flachem Kamerawinkel eine erkennbare, gedämpfte Umgebungsreflexion statt rein lokaler Beleuchtung.

**Geschätzter Aufwand:** klein bis mittel.

---

## 3. Phase 3 — Zweite Wellen-Normal-Map-Schicht (Priorität 3, bedingt)

**Warum bedingt:** Shader-seitig trivial (Textur-Sampler-Pattern existiert bereits: `u_normalMap`+Flag, StandardMaterial.ts:31,209), aber es fehlt eine passende Asset-Textur — nur Holz-/Pflaster-Normalmaps sind im Projekt vorhanden, keine Wellen-/Noise-Normalmap.

**Vorgehen:**
1. Normal-Map-Textur beschaffen: entweder generieren (Gemini-Image-Helper, siehe [[reference_gemini_image_generation]]) oder eine kachelbare Noise-Normalmap aus einer bestehenden Quelle ableiten.
2. Zwei Textur-Samples mit gegenläufigem Scrolling (UV-Offset über `time`-Uniform, der laut OilSlickMaterial.ts:91 bereits existiert) im Fragment-Shader addieren und normalisieren — analog zum Godot-Referenzcode in `oil.md` Abschnitt 3.
3. Ergebnis nur als leichte Störung der bestehenden analytischen Noise-Shimmer-Logik einmischen, nicht ersetzen (sonst geht der stilisierte Look verloren).

**Akzeptanzkriterium:** Sichtbare, langsam wandernde Wellenstruktur statt statischem Shimmer, ohne dass der "Graphic Noir"-Comic-Look verloren geht.

**Geschätzter Aufwand:** mittel (Asset-Beschaffung ist der unsichere Teil).

---

## 4. Bewusst zurückgestellt

| Feature | Warum nicht jetzt |
|---|---|
| Rand-Blending zum Untergrund | Bräuchte entweder einen Decal-Ansatz oder geteiltes Boden-Material — die Pfütze ist architektonisch isoliert (eigenes `Plane`-Mesh). Kein Shader-Tweak, sondern eine Architektur-Änderung. |
| Nass-Zone im Boden | Direkt an obigen Punkt gekoppelt, gleiches Problem. |
| Generisches Decal-System | Kein einziger Decal-Codepfad existiert in der gesamten Engine (`grep` leer). Neue Pass-Klasse + Shader-Chunk + Render-Order-Eingriff über alle 3 Renderer — das ist ein neues Subsystem, kein Pfützen-Fix. Lohnt sich nur, wenn Decals als wiederkehrendes Feature gewollt sind (Kratzer, Blutspritzer, Schmutzflecken anderswo), nicht isoliert für eine Pfütze. |
| Globaler Wetter-/Wachstumsparameter | Für eine einzelne statische Diorama-Pfütze aktuell kein Bedarf; würde `GlobalUniforms`-Layout in allen 3 Renderern gleichzeitig anfassen (std140-Alignment-Risiko). Erst relevant, wenn ein echtes Wettersystem geplant ist. |

---

## 5. Reihenfolge & Zeitschätzung

1. Phase 1 (Depth-Fade) — 1 Sitzung
2. Phase 2 (Env-Reflection) — 1 Sitzung
3. Phase 3 (Wellen-Normal-Map) — 1-2 Sitzungen, abhängig von Asset-Beschaffung

Nach jeder Phase: Live-Verifikation in allen 3 Renderern per Browser-Screenshot-Vergleich, kein Abschluss allein durch Build/Test-Grün (siehe [[feedback_collaborate_verification_discipline]]).
