# Continuous Review 2026-09-04: Tools & Apps (`src/tools/**`, `src/apps/**`, ausgewählte Showcases)

**Reviewer:** Agent E (Fortsetzung) · **Zeitfenster:** `1d70c608..HEAD` (letzte 48h) · **Status:** ⚠️ mit realen, aber niedrigrisikigen Funden fertig

Legende: 🔴 kritisch (Bug/Korrektheit) · 🟠 fragil/Architektur-Risiko · 🟡 Stil/Cleanup/tote Fläche · 🟢 Test-Lücke · ✅ positiv

Referenz: `.agents/notes/full-review-2026-09-03/05-tools-apps.md` (identisches Format/Stil).

---

## Verifikation der beiden vom Vorgänger-Review als kritisch gemeldeten Bugs

### ✅ [BESTÄTIGT BEHOBEN] `ArenaGrid.isFree()` — Eigenkollision fehlte

`git diff 1d70c608..HEAD -- src/apps/light-cycle-arena/core/ArenaGrid.ts` zeigt exakt den im
Vorgänger-Review vorgeschlagenen Fix: die `ownerId`-Ausnahme wurde ersatzlos entfernt --

```ts
public isFree(cx: number, cz: number): boolean {
  if (!this.isInBounds(cx, cz)) return false;
  return !this._occupied.has(`${cx},${cz}`);
}
```

`App.ts:225` und `CycleAI.ts:38` rufen beide jetzt `isFree(cell.cx, cell.cz)` ohne `ownerId`-Parameter
auf; `CycleAI.decide()`s `self: Cycle`-Parameter wurde komplett entfernt (unbenutzt geworden). Verifiziert,
dass die befürchtete Sonderrolle der Start-/aktuellen Zelle nicht mehr gebraucht wird: die Spawn-Zelle wird
in `App.ts:159-162` direkt per `grid.occupy(...)` belegt, nie über `isFree()` abgefragt --
`_onGridIntersection()` (`App.ts:220-228`) wird laut eigenem Docstring ausschließlich beim **Betreten einer
neuen** Zelle aufgerufen, nie für die aktuell besetzte. Der Fix ist also vollständig, nicht nur
oberflächlich korrekt.

`npx vitest run tests/apps/light-cycle-arena/ArenaGrid.test.ts`: **11 Tests grün**, inklusive des exakt
im Vorgänger-Review beschriebenen Szenarios ("a cycle crashes into its own trail when its path loops back
on itself" -- 1×1-Schleife, `isFree(0,0)` liefert jetzt korrekt `false`) und eines neuen `CycleAI.decide`-
Tests, der verifiziert, dass die KI bei zwei durch eigenen Trail blockierten Richtungen zuverlässig die
einzig sichere dritte wählt.

### ✅ [BESTÄTIGT BEHOBEN] `ForgeWindow`/`Forge` — 10 permanente `window`-Listener pro Fenster, `destroy()` nie aufgerufen

`git diff` bestätigt alle drei vom Vorgänger-Review vorgeschlagenen Schritte, exakt umgesetzt:

1. `_bindDrag()`/`_bindResize()` (`ForgeWindow.ts:163-193`, `195-280`) halten `onMouseMove`/`onMouseUp`
   jetzt als benannte `const`-Referenzen und pushen sie in `this._globalListeners` (neues Feld,
   `ForgeWindow.ts:13-14`); `destroy()` (`ForgeWindow.ts:159-172`) iteriert darüber und ruft
   `window.removeEventListener(type, handler)` für jeden Eintrag.
2. Der `ResizeObserver` aus `mountTool()` wird jetzt in `this._resizeObserver` gehalten und in
   `destroy()` per `.disconnect()` beendet.
3. `Forge` bekommt ein eigenes `destroy()` (`Forge.ts:149-165`): iteriert über eine Kopie von
   `this._windows` und ruft `win.destroy()` für jedes, meldet seine eigenen `keydown`/`paste`-Listener ab
   (jetzt ebenfalls als benannte Instanzfelder `_onKeyDown`/`_onPaste` gehalten statt anonymer Inline-
   Arrows) und entfernt `_overlay` aus dem DOM.
4. `SmallWorld.ts:401`: `this.forge?.destroy();` -- bestätigt per `grep`, der bislang tote
   Dokumentationskommentar ("removing all global event listeners") stimmt jetzt tatsächlich für den
   Forge-Subtree.

`npx vitest run tests/tools/ForgeWindow.test.ts`: **grün** (Teil der 53 insgesamt geprüften Tests, s.u.).

**Kleine Randnotiz, kein neuer Fund:** `close()` (`ForgeWindow.ts`) versteckt das Fenster weiterhin nur per
`display: none` statt es zu zerstören -- das ist unverändert gegenüber dem Vorgänger-Review und laut Kontext
("acts like minimizing") bewusst so gewollt (Fenster bleiben persistent/wiederherstellbar). Kein Leck mehr,
weil `destroy()` jetzt überhaupt über den korrekten Pfad (`SmallWorld.destroy()`) erreichbar ist -- die
Fenster selbst leben weiterhin bis zum Enginge-Lifecycle-Ende, was jetzt konsistent mit dem restlichen
Cleanup-Vertrag ist.

---

## Testlauf-Zusammenfassung

```
npx vitest run tests/apps/light-cycle-arena/ArenaGrid.test.ts tests/tools/ForgeWindow.test.ts \
  tests/tools/maker/UndoStack.test.ts tests/tools/maker/MakerFeatures.test.ts
```
→ **4 Testdateien, 53 Tests, alle grün.** Zusätzlich `npx tsc --noEmit -p tsconfig.json` über das gesamte
Projekt: **keine Fehler** (die zahlreichen neuen Interface-Erweiterungen -- `UndoCommand.discard()`,
`PropertyPanelCallbacks.onDetachBehavior`/`onSetMaterial`, `MakerAppOptions` unverändert -- sind an allen
Callsites typkorrekt verdrahtet).

---

## `src/tools/maker/UndoStack.ts`

### ✅ [BESTÄTIGT BEHOBEN] Unbegrenztes History-Wachstum + fehlendes Trash-Bin-Disposal

Auch dies bereits im Vorgänger-Review als ✅ dokumentiert -- hier gegen den tatsächlichen Diff verifiziert,
nicht nur übernommen:

- `MAX_HISTORY = 50` (`UndoStack.ts:19`), `execute()` kürzt `_done` per `shift()?.discard?.()`
  (`UndoStack.ts:43-45`), sobald die Grenze überschritten wird.
- `execute()` verwirft den Redo-Branch jetzt über `_discardAll(this._undone)` (`UndoStack.ts:42`) statt nur
  `_undone.length = 0` -- ruft also `discard()` für jedes verworfene Redo-Kommando auf.
- `clear()` (`UndoStack.ts:71-74`) tut dasselbe für beide Stacks.
- `MakerApp._disposeTrashedObject()` (`MakerApp.ts:917-933`) ist der einzige Konsument von `discard()`,
  implementiert exakt das im Vorgänger-Review vorgeschlagene Reparenting-Muster (`scene.add()` gefolgt von
  `scene.remove()`, beides synchron, um `Scene`s reguläre GPU-Disposal-Queue für ein Objekt auszulösen, das
  nie selbst in `this.scene` war).
- **Alle 6 `_trashBin.add()`-Stellen** in `MakerApp.ts` (`deleteSelection`, `duplicateSelection` [via
  Clones], `groupSelection`, `_groupMultiple`, und der `addObject`-Undo-Zweig) haben per `grep` verifiziert
  je eine korrespondierende `discard: () => this._disposeTrashedObject(...)`-Zeile -- 6 `_trashBin.add`-
  Treffer gegen 6 `discard:`-Treffer, 1:1 zugeordnet.

`npx vitest run tests/tools/maker/UndoStack.test.ts`: grün.

**Randnotiz (kein neuer Fund, nur Beobachtung):** `_disposeTrashedObject()`s eigener Kommentar
(`MakerApp.ts:917-923`) benennt selbst explizit den Sonderfall, den er korrekt behandelt -- ein Kommando,
dessen zuletzt angewendete Seite `redo()` (nicht `undo()`) war, liegt zum Zeitpunkt des `discard()`-Aufrufs
live in der Szene, nicht im Trash-Bin; der `if (obj.parent !== this._trashBin) return;`-Guard
(`MakerApp.ts:930`) verhindert hier korrekt ein versehentliches Entfernen eines aktiven Szenenobjekts.
Sauber durchdacht.

---

## `src/tools/maker/AsciiMapLegend.ts`

### ✅ [BESTÄTIGT BEHOBEN] Modul-globaler `markerCounter`

Der im Vorgänger-Review gefundene "No Global Singletons"-Verstoß (`let markerCounter = 0;` auf Modulebene,
über alle `defaultAsciiMapLegend()`-Aufrufe hinweg geteilt) ist exakt wie vom Vorgänger-Review
vorgeschlagen behoben: `markerCounter` verschwindet komplett aus dem Modul-Scope; `defaultAsciiMapLegend()`
erzeugt jetzt pro Aufruf ein lokales `const counter = { count: 0 };` (`AsciiMapLegend.ts:67`) und reicht es
als zweiten Parameter an `markerEntry(char, counter)` durch, das intern `counter.count++` statt der alten
Modulvariable verwendet. Zwei unabhängige `defaultAsciiMapLegend()`-Aufrufe beginnen jetzt beide
nachweislich wieder bei `Enemy_0` (per Lesen des Codes bestätigt -- jeder Aufruf legt sein eigenes
`counter`-Objekt an, es gibt keinen gemeinsamen Zustand mehr).

---

## `src/tools/maker/LightGizmoManager.ts` (neu, 251 Zeilen)

### 🟠 Weiterhin: `update()` alloziert ein neues `Set` und läuft jeden Frame den kompletten Szenengraphen ab

`update()` (`LightGizmoManager.ts:70-91`) wird von `MakerApp.ts:672` bedingungslos in jedem Frame aus dem
Haupt-Update-Loop aufgerufen (`this._lightGizmos.update(this.scene.root, this._selection, this.camera);`,
direkt neben `this.scene.update(deltaTime)`), nicht nur wenn `_hierarchyDirty` gesetzt ist (dieses Flag
existiert in `MakerApp` bereits für genau diesen Zweck, `MakerApp.ts:667-671`, wird `LightGizmoManager`
aber nicht mitgeteilt). Der erste Schritt:

```ts
const liveLights = new Set<AbstractLight>();
this._findLights(sceneRoot, liveLights);
```

alloziert bei jedem Frame ein neues `Set` und läuft rekursiv über **jeden** `Object3D` der Szene (nicht nur
Lichter) -- `_findLights` (`LightGizmoManager.ts:93-101`) ruft zusätzlich für jeden besuchten Knoten
`this.isHelperMesh(parent)` auf, das selbst wieder bis zur Wurzel hochläuft. Verstößt gegen das
projektweite "Zero-Allocation (Hot Path)"-Prinzip, exakt wie im Vorgänger-Review für eine (git-historisch
andere, aber inhaltlich identische) Vorgänger-Version dieser Datei dokumentiert.

**Kontext, warum das kein neuer Regressions-Fund ist, sondern ein offener Altfund:** `git log --all` zeigt
für `LightGizmoManager.ts` nur einen einzigen Commit (`5236b0e8`), der über den `maker`-Branch-Merge
(`08eed42a`, ebenfalls innerhalb dieses 48h-Fensters) nach `main` gelangt ist -- die Datei wurde also
tatsächlich zum ersten Mal in `main`s Historie sichtbar, aber der identische Code (inkl. identischer
Methodennamen/Struktur) war laut Referenz-Review bereits am 2026-09-03 auf dem `maker`-Branch geprüft und
dort mit derselben 🟠-Einstufung dokumentiert. Für diesen kontinuierlichen main-Review zählt es als
weiterhin offen, nicht als neu eingeführte Regression.

Bei Maker-typischen Szenengrößen (Dutzende bis wenige Hunderte Objekte) vermutlich nicht spürbar, aber
unnötig und leicht behebbar.

**Fix-Richtung (unverändert vom Vorgänger-Review):** `liveLights` als wiederverwendetes Instanzfeld führen
(`this._scratchLiveLights.clear()`), und den vollen Scene-Walk an `_hierarchyDirty` koppeln statt
bedingungslos jeden Frame auszuführen.

### 🟡 Unsaubere Casts für lichttyp-spezifische Felder in `_createEntry()`

```ts
return {
  light, marker, markerMat, rangeGizmo, rangeMat,
  lastDistance: (light as PointLight).distance,
  lastAngle: (light as SpotLight).angle,
};
```

(`LightGizmoManager.ts:173-181`). Für `DirectionalLight`/`AmbientLight` existieren `distance`/`angle` nicht
auf der Klasse -- der Cast liefert zur Laufzeit `undefined`, was harmlos ist, weil beide Felder
ausschließlich innerhalb von `if (light instanceof PointLight)`/`SpotLight`-Zweigen in `_updateEntry()`
gelesen werden (`LightGizmoManager.ts:218-236`). Kein Bug, aber ein unnötiger Typ-Bypass, der bei einer
künftigen Umbenennung von `distance`/`angle` auf `PointLight`/`SpotLight` keinen Compiler-Fehler an dieser
Stelle auslösen würde. Sauberer: `light instanceof PointLight ? light.distance : undefined` statt Cast.

### ✅ Race-Condition-Check: `LightGizmoManager` vs. `PropertyPanel` -- kein Konflikt gefunden

Beide Systeme greifen nicht auf denselben mutablen Zustand konkurrierend zu: `LightGizmoManager` besitzt
sein eigenes `markerMat`/`rangeMat` pro Licht (separates `BasicMaterial`/`WireframeMaterial`, nicht das
Licht selbst), liest aber `light.distance`/`light.angle`/`light.color` nur lesend pro Frame, um seine
eigene Gizmo-Geometrie neu aufzubauen, wenn sich Werte geändert haben (`entry.lastDistance !== light.distance`,
`LightGizmoManager.ts:219`/`229`). `PropertyPanel`s Bindings schreiben `light.distance`/`.angle`/`.color`
direkt (über `Tweakpane`), es gibt keinen Fall, in dem beide Systeme denselben Wert im selben Tick
schreiben -- `LightGizmoManager` ist rein reaktiv/lesend gegenüber dem Light-State. Kein Fund.

---

## `src/tools/maker/MakerApp.ts` (+155 Zeilen) / `PropertyPanel.ts` (+289 Zeilen)

### 🟡 Kontextmenü-`window`-`pointerdown`-Listener-Leak reproduziert sich identisch für die neuen Material-/Behavior-Menüs

Bereits im Vorgänger-Review für `_showBehaviorContextMenu` dokumentiert (dort schon existent) --
`_showMaterialContextMenu` (`PropertyPanel.ts:180-251`, neu in diesem Fenster) wiederholt exakt dasselbe
Muster:

```ts
const closeHandler = (e: MouseEvent): void => {
  if (!menu.contains(e.target as Node)) closeMenu();
};
const closeMenu = (): void => {
  menu.remove();
  window.removeEventListener("pointerdown", closeHandler);
};
setTimeout(() => window.addEventListener("pointerdown", closeHandler), 0);
```

`closeMenu()` wird korrekt aus **beiden** Pfaden aufgerufen (`closeHandler` selbst *und* jede
`addOption(...)`'s `onClick`, `PropertyPanel.ts:198-226`) -- das ist tatsächlich eine Verbesserung
gegenüber der im Vorgänger-Review beschriebenen Variante, wo nur der Außerhalb-Klick-Pfad `closeMenu()`
(damals `menu.remove()` + `removeEventListener` als zwei separate Anweisungen ohne gemeinsame Funktion)
aufrief. **Hier ist der Leak also bereits behoben, nicht neu eingeführt** -- beide Codepfade (Options-Klick
und Außerhalb-Klick) rufen dieselbe `closeMenu()`, die den Listener zuverlässig entfernt.

`_showBehaviorContextMenu` (`PropertyPanel.ts:270-303`) verwendet exakt dasselbe korrekte Muster (eine
gemeinsame `closeMenu()`, aufgerufen sowohl vom `removeOption`-Klick als auch vom `closeHandler`). **Der im
Vorgänger-Review dokumentierte 🟡-Fund für diese Funktion ist damit ebenfalls sauber mitbehoben worden**,
obwohl das nicht explizit im Log dokumentiert ist -- verifiziert per Lesen des aktuellen Codes: kein
Divergenz-Pfad mehr, der den Listener stehen lässt.

**Status:** ✅ kein offener Fund mehr in diesem Bereich (Korrektur/Update gegenüber dem, was aus dem alten
Muster zu befürchten gewesen wäre -- beide Kontextmenüs sind jetzt lecksicher).

### 🟢 `_computeSmartSpawnPosition()` / "Smart Viewport Spawning" -- funktional plausibel, aber ohne dedizierten Edge-Case-Test für den Raycast-Fallback

`MakerApp.ts:868-899`: platziert neu erzeugte Objekte (Ausnahme: Position ist exakt `(0,0,0)`, der
Factory-Default) am Kamera-Blick-Schnittpunkt mit der Bodenebene `Y=0`, mit einem Fallback auf
`this._orbit.target` für den Fall, dass der Blickstrahl (`Math.abs(rayDir.y) <= 0.001`, d.h. nahezu
horizontaler Blick) die Ebene nicht sinnvoll schneidet oder `t` außerhalb `(0, 100)` liegt. Logik selbst ist
korrekt nachvollzogen (Standard-Ray/Plane-Intersection, `t = -camY / rayDir.y`), und
`tests/tools/maker/MakerFeatures.test.ts` ("Smart Viewport Spawning & Ground Resting") deckt den
Normalfall ab. Nicht abgedeckt: der Fallback-Zweig selbst (Kamera blickt exakt horizontal, oder der
Schnittpunkt liegt weiter als 100 Einheiten entfernt) -- funktional harmlos (fällt auf `_orbit.target`
zurück, ein sinnvoller Default), aber ungetestet.

### ✅ Positiv: `addObject()`s Zero-Position-Erkennung ist sicher

`if (0 === obj.position.x && 0 === obj.position.y && 0 === obj.position.z)` (`MakerApp.ts:901`) prüft
exakte Float-Gleichheit gegen `0` -- kein Rundungsrisiko, weil alle Fabriken in `ObjectPalette.ts` neue
Objekte tatsächlich mit dem literalen `Vector3D`-Default `(0,0,0)` erzeugen (nicht z.B. über eine
berechnete, potenziell durch Gleitkomma-Rauschen leicht von Null abweichende Position). Kein Fund.

---

## `src/tools/procgen/` (verschoben von `src/extensions/grid-builder/`)

### ✅ Sauberer, verhaltensidentischer Move

`git show 1d70c608:src/extensions/grid-builder/GridLevelBuilder.ts` gegen den aktuellen
`src/tools/procgen/GridLevelBuilder.ts` verglichen: einzige Differenz sind granularere Einzeldatei-Importe
statt Barrel-Imports (`import { Object3D } from "../../core/Object3D.js"` statt
`from "../../core/index.js"`) -- keine Logikänderung. `src/extensions/grid-builder/` existiert nicht mehr;
`grep -rn "extensions/grid-builder"` findet **keine** verbliebene Referenz im gesamten Baum.
`src/tools/index.ts` re-exportiert `./procgen/index.js` (`src/tools/index.ts:9`), wodurch
`GridLevelBuilder`/`GridLegend` weiterhin über den öffentlichen `src/index.ts`-Barrel erreichbar sind --
identisch zur alten Export-Kette über `extensions/index.js`, also keine Public-API-Regression.
`src/apps/yad/core/LevelBuilder.ts` und `src/tools/maker/AsciiMapLegend.ts` wurden beide korrekt auf den
neuen Pfad umgestellt.

---

## `src/apps/and-now/scenes/prologue/PrologueScene.ts` — Löschung verifiziert sauber

**Verifiziert:** `git diff 1d70c608..HEAD --stat` zeigt die Datei mit `594 ----` (reine Löschung, keine
Verschiebung). `grep -rln "PrologueScene" src/ showcases/ public/` findet nach der Löschung nur noch
`src/apps/and-now/scenes/prologue/prologue.ts` (die tatsächlich geladene, seit jeher separate Datei, exakt
wie im Vorgänger-Review als "die eigentlich benutzte Implementierung" identifiziert) und einen Log-Eintrag
in `src/apps/and-now/docs/log.md`. Kein verbliebener Import, keine Route, keine Registry-Referenz auf die
gelöschte Klasse irgendwo im Quellbaum -- nur `dist/` (Stale-Build-Artefakte, nicht Teil des Quellbaums,
werden beim nächsten `build:lib` ohnehin überschrieben) enthält noch kompilierte Reste.

**Fazit:** Der im Vorgänger-Review als 🟡 gemeldete Fund ("594 Zeilen komplett toter Code") ist exakt wie
dort empfohlen behoben -- die tote Datei wurde gelöscht, ohne dass die tatsächlich genutzte `prologue.ts`
angetastet wurde, und ohne dass irgendeine der beiden im Vorgänger-Review erwähnten möglichen
Feintuning-Divergenzen (`GlassMaterial`-Screen-Glass, `GrainElement`-Filmkorn) an anderer Stelle vermisst
würden -- `and-now`s aktueller Scope in diesem Zeitfenster enthält keine Hinweise auf einen entsprechenden
Nachzieh-Bedarf.

---

## Showcase-Dateien

### ✅ Showcase 25 (Open Water) — vollständig und korrekt entfernt, alle 4 Registrierungspunkte bereinigt

Verifiziert per direktem Diff jeder der vier genannten Stellen:
1. `vite.config.ts`: `showcase25: resolve(...)`-Zeile entfernt (Rollup-Input-Eintrag).
2. `scripts/check-showcases.js`: `"25"` aus dem `numberedShowcases`-Array entfernt.
3. `public/index.html`: Hub-Grid-Eintrag `<a href="./showcases/25/index.html">25: Open Water
   Material</a>` entfernt (Showcase 10s Eintrag gleichzeitig auf den neuen Titel "Waterworld"
   aktualisiert -- konsistent mit der Absorption).
4. Prev/Next-Kette: `showcases/24/index.html` verweist bereits auf `next="../26/index.html"`,
   `showcases/26/index.html` auf `prev="../24/index.html"` -- keine tote Zwischenstation mehr.

Keine der vier Stellen wurde übersehen; `showcases/25/` selbst ist komplett gelöscht (`index.html` +
`showcase.ts`, 75 Zeilen zusammen).

### ✅ Showcase 15/16 — echter Korrektheits-Fix (Self-Sampling-Feedback-Loop), nicht nur Kommentar

Beide Dateien fügen identisch `this._reflectionNode.excludedObjects.push(floor);` hinzu, mit demselben
Kommentar ("must not be rendered while that same texture is bound as the render target of its own
reflection sub-render"). Das behebt einen echten Feedback-Loop-Bug (Boden würde sein eigenes
Reflexions-Render-Target abtasten, während genau dieses Target gerade befüllt wird) -- korrekt als
Positivbefund zu werten, kein neuer Fund.

### ✅ Showcase 10 (569 Zeilen, "Waterworld"-Neubau), Showcase 31 (Rocks & Rubble), 32/33/34 (Kommentar-/Pfad-Updates)

Showcase 10 wurde vollständig neu aufgebaut (4-Pool-Galerie, absorbiert Showcase 25 & 35 laut
`docs/log.md`/Nutzer-Memory) -- durchgesehen auf offensichtliche Bugs: `SplashDropBehavior`s
Zustandsmaschine (`WAITING`→`FALLING`→`BOBBING`→`WAITING`) ist in sich konsistent, Feder-/Dämpfungs-Physik
entspricht demselben Muster wie Showcase 12s dokumentiertes `SinkingBehavior`. Showcase 31s neue
`_buildRocksAndRubble()` nutzt `InstancedMesh` mit korrekt vorab berechneter Kapazität (`rockCount * 2` für
die Doppel-Seiten-Schleife, `idx` erreicht exakt `rockCount * 2 - 1`). Showcase 32/33/34 sind reine
Kommentar-/Importpfad-Updates (`src/extensions/...` → `src/environment/...` bzw. Präzisierung eines
Kommentars zu `FrustumCuller`) ohne Verhaltensänderung. `npx tsc --noEmit` bestätigt keine
Typfehler über alle Showcase-Änderungen hinweg.

---

## `src/apps/yad/core/LevelBuilder.ts` — nur Importpfad geändert

Die im Vorgänger-Review als 🟡 gemeldete "lautes Denken"-Kommentarzeile (`LevelBuilder.ts:~315`, "But...
Wait... Let's refine...") ist in diesem 48h-Fenster **nicht angefasst worden** -- die einzige Änderung an
dieser Datei ist die Umstellung des `GridLevelBuilder`-Imports auf den neuen `tools/procgen`-Pfad. Kein
neuer Fund, alter Fund bleibt unverändert offen (außerhalb des Diffs dieses Fensters, daher hier nicht
erneut als Hauptfund gezählt).

---

## ✅ Was gut gemacht ist

- **Beide vom Vorgänger-Review als kritisch gemeldeten Bugs sind vollständig und korrekt behoben** --
  `ArenaGrid`s Eigenkollision und `ForgeWindow`/`Forge`s Listener-Leak, beide mit begleitenden Unit-Tests,
  die exakt das vorher fehlerhafte Szenario abdecken.
- **`UndoStack`s Kapazitätsgrenze + `discard()`-Hook**: durchdachte, minimal-invasive Lösung für das
  Soft-Delete-Retention-Problem -- alle 6 Callsites in `MakerApp.ts` korrekt verdrahtet, verifiziert per
  1:1-Zuordnung `_trashBin.add()` ↔ `discard()`.
  Ein neuer Trash-Bin-Callsite-Bug wäre hier leicht möglich gewesen (z.B. ein siebter `add()` ohne
  passendes `discard()`); wurde nicht gefunden.
- **`AsciiMapLegend`s modul-globaler Zähler**: sauber in eine Closure verschoben, kein Restrisiko für
  Multi-Instanz-Szenarien mehr.
- **`PrologueScene.ts`-Löschung**: chirurgisch sauber -- die tote Datei ist weg, die tatsächlich genutzte
  `prologue.ts` unangetastet, keine Restreferenzen.
- **Showcase-25-Absorption**: alle vier Registrierungspunkte tatsächlich bereinigt, keine tote
  Zwischenstation in der Prev/Next-Navigationskette.
- **`src/extensions/grid-builder` → `src/tools/procgen`-Move**: verhaltensidentisch, alle Konsumenten
  korrekt umgestellt, keine Public-API-Regression.
- **`tsc --noEmit` grün über das gesamte Projekt**, trotz mehrerer neuer Interface-Erweiterungen
  (`UndoCommand.discard`, zwei neue `PropertyPanelCallbacks`-Hooks) -- alle Callsites typkorrekt.
- **Showcase 15/16s `excludedObjects.push(floor)`-Fix**: ein echter, unauffälliger
  Feedback-Loop-Korrektheitsfix, still und ohne Aufhebens im Kommentar begründet.

## Fazit

Beide vom vorherigen Review als 🔴 kritisch eingestuften Funde (`ArenaGrid`-Eigenkollision,
`ForgeWindow`/`Forge`-Listener-Leak) sind in diesem 48h-Fenster **vollständig und nachweislich korrekt**
behoben worden -- inklusive Tests, die exakt das vorher kaputte Verhalten abdecken. Ebenso vollständig
behoben: `UndoStack`s unbegrenztes Wachstum, `AsciiMapLegend`s globaler Zähler, und der 594 Zeilen tote
Code in `and-now/scenes/prologue/`. Die einzigen substantiellen offenen Punkte sind Altlasten, keine neuen
Regressionen: `LightGizmoManager`s Zero-Allocation-Verstoß (🟠, inhaltlich identisch zum bereits am
2026-09-03 dokumentierten Fund, jetzt lediglich über den `maker`-Branch-Merge nach `main` sichtbar
geworden) und ein kleiner, harmloser Typ-Bypass in derselben Datei (🟡). Die neuen Kontextmenüs in
`PropertyPanel.ts` (Material-Switch, Behavior-Removal) wiederholen **nicht** den zuvor dokumentierten
`window`-Listener-Leak -- beide verwenden bereits eine gemeinsame `closeMenu()`, die von jedem Schließpfad
zuverlässig aufgerufen wird.

**Kein neuer 🔴-Fund in diesem Scope.**

**Restliche offene Punkte, absteigend nach Priorität:**
1. 🟠 `LightGizmoManager.update()`: neues `Set` + voller Szenen-Walk jeden Frame, unabhängig von
   `_hierarchyDirty` -- an dasselbe Dirty-Flag koppeln, das `MakerApp` bereits für Hierarchie-Änderungen
   führt.
2. 🟡 `LightGizmoManager._createEntry()`s `(light as PointLight).distance`/`(light as SpotLight).angle`-
   Casts -- durch `instanceof`-Guards statt Force-Casts ersetzen.
3. 🟢 `_computeSmartSpawnPosition()`s horizontaler-Blick-Fallback-Zweig ist ungetestet (funktional
   plausibel, aber ohne dedizierte Testabdeckung).

Nachrangig, unverändert aus dem Vorgänger-Review übernommen (nicht Teil dieses Fensters, daher nicht erneut
vertieft): `ProjectBinding`s `GltfLoader._parse`-Reflection-Zugriff, `yad/LevelBuilder.ts`s
"lautes Denken"-Kommentar.
