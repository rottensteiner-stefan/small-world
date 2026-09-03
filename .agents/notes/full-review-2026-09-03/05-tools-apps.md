# Review: Tools & Apps (`src/tools/**` — maker, forge, common; `src/apps/**` — yad, neon-labyrinth, and-now, light-cycle-arena)

**Reviewer:** Agent E · **Status:** ⚠️ mit kritischen Funden fertig

Legende: 🔴 kritisch (Bug/Korrektheit) · 🟠 fragil/Architektur-Risiko · 🟡 Stil/Cleanup/tote Fläche · 🟢 Test-Lücke · ✅ positiv

---

## `src/tools/maker/UndoStack.ts`

### ✅ [ERLEDIGT] Unbegrenztes History-Wachstum, kombiniert mit Soft-Delete-Retention
*(Behoben 2026-09-03: `UndoStack` auf `MAX_HISTORY = 50` begrenzt (gleicher Wert wie Pixlers eigene `_history`) — beim Überschreiten wird das älteste `_done`-Kommando per `shift()` verworfen; zusätzlich verwirft `execute()` jetzt auch konsequent den kompletten Redo-Branch (`_undone`) bei jedem neuen Kommando, nicht nur dessen Array-Referenz. Neues optionales `UndoCommand.discard()`-Hook wird für jedes Kommando aufgerufen, das die Historie permanent verlässt (Kapazitäts-Trim, Redo-Branch-Verwurf, oder `clear()`), damit ein `_trashBin`-Objekt eines verworfenen Kommandos nicht für immer unerreichbar-aber-referenziert hängen bleibt, sondern über `MakerApp._disposeTrashedObject()` (kurzzeitiges Reparenting via `scene.add()`+`scene.remove()`, um Scenes reguläre GPU-Freigabe-Queue auszulösen) wirklich freigegeben wird. Alle 6 `_trashBin.add()`-Stellen in `MakerApp.ts` implementieren jetzt `discard()`. Unit-Tests in `tests/tools/maker/UndoStack.test.ts` ("history capacity + discard()") und `tests/renderers/GeometryRefCounting.test.ts` (Trash-Bin-Discard-Pattern).)*

`UndoStack` (`UndoStack.ts:16-54`) hat keinerlei Kapazitätsgrenze — `_done`/`_undone` sind reine
`UndoCommand[]`, die bei jedem `execute()` nur wachsen (`_done.push(command)`, `UndoStack.ts:23`) und
ausschließlich zwischen den beiden Arrays hin- und hergeschoben werden (`undo()`/`redo()`), nie tatsächlich
entfernt. `clear()` (`UndoStack.ts:50-53`) existiert, wird aber **an keiner einzigen Stelle im gesamten
Baum aufgerufen** — verifiziert per `grep -rn "_undo.clear\|undoStack.*\.clear" src/`: kein Treffer außer der
Methode selbst. Das heißt: In der aktuellen Codebasis gibt es keinen einzigen Zeitpunkt (auch kein "neues
Projekt starten"), an dem die Undo-Historie je geleert wird.

Das trifft in Maker besonders hart, weil Löschen **kein** echtes Freigeben ist, sondern bewusst als
Soft-Delete implementiert wurde: `deleteSelection()` (`MakerApp.ts:927-947`) verschiebt gelöschte Objekte nur
in `_trashBin` (`this._trashBin.add(obj)`, `MakerApp.ts:935`) — ein Off-Scene-`Object3D`, das laut
`docs/log.md` bewusst dafür da ist, GPU-Buffer-Disposal beim Undo zu verhindern. Das ist für sich genommen
eine gute, dokumentierte Design-Entscheidung — aber ihre Kehrseite ist, dass jedes gelöschte Objekt (inkl.
Geometrie-/Textur-Referenzen) für den Rest der Session am Leben bleibt, **solange der zugehörige
`UndoCommand` im Stack referenziert wird** — und da der Stack nie beschnitten wird, ist das faktisch für
immer. Bei einer langen Power-User-Session (Maker richtet sich explizit an Digital Artists mit intensiver
Iteration, `AGENTS.md` §1) mit vielen Lösch-/Duplicate-/Group-Zyklen sammelt sich so unbegrenzt Alt-Geometrie
im Speicher, ganz ohne dass der Nutzer je wieder Undo drückt.

Kein GC-Leck im engeren Sinne (alles bleibt über eine erreichbare Referenzkette an `_done`/`_undone`
hängen, es ist also kein Speicher, den der Browser fälschlich für kollektierbar hält), aber ein reales,
unbegrenztes Speicherwachstum über die Session hinweg, exakt das im Auftrag genannte Muster.

**Fix-Richtung:** entweder (a) eine Kapazitätsgrenze in `UndoStack.execute()` einziehen (z.B.
`if (this._done.length > MAX_HISTORY) this._done.shift()`, mit dem Nebenaspekt, dass verworfene Commands für
Soft-Delete-Fälle dann ihr `_trashBin`-Kind auch wirklich disposen müssten, sonst wird der Leak nur
verschoben statt behoben), oder (b) zumindest `_undo.clear()` an sinnvollen Schnittstellen aufrufen (z.B.
sobald Maker einen "Projekt schließen/neu laden"-Flow bekommt — aktuell laut `MakerApp.ts:268-269` bewusst
noch nicht gebaut, s. Kommentar "Merge-in rather than replace ... later-phase concern", also kein Bug für
sich, aber der Anschlusspunkt für einen künftigen Clear-Aufruf).

**Sonst:** Undo/Redo-Logik selbst ist korrekt — Command-Pattern lehrbuchmäßig umgesetzt (`execute` verwirft
den Redo-Branch via `_undone.length = 0`, `UndoStack.ts:24`, exakt wie im Klassenkommentar dokumentiert),
und die `MakerApp.ts`-Callsites (`addObject`, `deleteSelection`, `duplicateSelection`, `groupSelection`/
`_groupMultiple`, `attachBehaviorToSelection`, …) capturen ihre Vorher/Nachher-Zustände sauber per Closure
ohne Referenz-Aliasing-Fehler. Stichprobenartig geprüft: `deleteSelection()` mit einer Multi-Selektion, die
sowohl ein Elternobjekt als auch dessen Kind enthält (`objs = [P, C]`) — `redo()` reparented beide
unabhängig voneinander in `_trashBin` (das zweite `add()` hängt `C` dabei von `P` ab und macht es zum
direkten Trash-Kind), aber `undo()` stellt beide über explizit gecachte `parents[i]`-Referenzen wieder her,
nicht über den aktuellen Trash-Zustand — Endergebnis bleibt korrekt trotz der zwischenzeitlichen
Hierarchie-Umhängung.

---

## `src/tools/maker/LightGizmoManager.ts`

### 🟠 Verstoß gegen "Zero-Allocation Hot Path": neues `Set` + voller Szenen-Walk jeden Frame

`LightGizmoManager.update()` (`LightGizmoManager.ts:70-91`) wird direkt aus `MakerApp`s Haupt-Update-Loop
aufgerufen — `MakerApp.ts:669`: `this._lightGizmos.update(this.scene.root, this._selection, this.camera);`,
selbst innerhalb von `protected override update(deltaTime: number)` (`MakerApp.ts:657`), also **jeden
gerenderten Frame**, nicht nur bei Szenenänderungen. Der erste Schritt darin:

```ts
const liveLights = new Set<AbstractLight>();
this._findLights(sceneRoot, liveLights);
```

(`LightGizmoManager.ts:71-72`) alloziert bei jedem einzelnen Frame ein neues `Set`, und `_findLights`
(`LightGizmoManager.ts:93-101`) läuft dafür **den kompletten Szenengraphen rekursiv ab** — nicht nur bis zu
den Lichtern, sondern jeden `Object3D` inklusive aller Meshes/Behaviors/Kind-Hierarchien. Zusätzlich ruft
`_findLights` für jeden besuchten Knoten `this.isHelperMesh(parent)` auf (`LightGizmoManager.ts:94`), das
selbst wieder bis zur Wurzel hochläuft (`LightGizmoManager.ts:33-40`) — in Summe pro Frame eher
$O(n \times \text{Tiefe})$ als $O(n)$ für die gesamte Szene, plus eine garantierte Heap-Allokation.

Das ist exakt das in `CONTEXT.md` als **"Zero-Allocation (Hot Path)"** benannte, projektweit verbindliche
Prinzip ("per-frame code ... must not allocate new objects, so it never triggers a GC pause" — dort explizit
als wiederkehrende, nicht verhandelbare Regel dokumentiert, nicht als vage Performance-Empfehlung). Bei
Maker-typischen Szenengrößen (Dutzende bis wenige Hunderte Objekte) ist der GC-Druck vermutlich nicht
spürbar, aber es ist eine unnötige, leicht vermeidbare Regelverletzung an einer Stelle, die *jeden* Frame
läuft, unabhängig davon ob sich überhaupt etwas an Lichtern geändert hat.

**Fix-Richtung:** `liveLights`-Set als wiederverwendetes Instanzfeld (`this._scratchLiveLights.clear()` statt
neu allozieren) führen; zusätzlich den vollen Scene-Walk nur auslösen, wenn sich die Hierarchie tatsächlich
geändert hat (`MakerApp` hat mit `_hierarchyDirty`, `MakerApp.ts:664-667`, bereits genau das richtige Dirty-
Flag-Muster für diesen Zweck etabliert, aber `LightGizmoManager.update()` bekommt es nicht mitgeteilt und
läuft stattdessen bedingungslos jeden Frame voll durch).

---

## `src/tools/maker/ProjectBinding.ts`

### 🟠 Reflection-Zugriff auf `GltfLoader`s `private _parse()` — zweimal, ohne Compiler-Absicherung

`load()` (`ProjectBinding.ts:97-101`) und `loadPrefab()` (`ProjectBinding.ts:172-180`) rufen beide:

```ts
const loader = new GltfLoader();
return (loader as unknown as { _parse: ParseFn })._parse(
  { json, buffers: ProjectBinding._decodeBuffers(json) },
  "",
);
```

`GltfLoader._parse` ist tatsächlich `private` (`src/loaders/GltfLoader.ts:134`:
`private async _parse(gltf: GltfData, baseUrl: string): Promise<Object3D>`) — der Zugriff geht über einen
`as unknown as {...}`-Cast, der TypeScript bewusst belügt, um am `private`-Modifier vorbeizukommen. Grund
laut `GltfLoader`s öffentlicher API (`src/loaders/GltfLoader.ts`, nur `load(url)`, `loadAnimations(url)` und
das statische `decodeDataUri()`): es gibt **keine** öffentliche Methode, die ein bereits im Speicher
vorliegendes `{ json, buffers }`-Paar parsen kann, ohne selbst von einer URL zu fetchen — genau das, was
`ProjectBinding` braucht, da es via File System Access API liest, nicht per Netzwerk-Request. `ParseFn`
(`ProjectBinding.ts:38-41`) ist eine von Hand nachgezeichnete Kopie der echten `_parse`-Signatur, nicht davon
abgeleitet.

**Warum das ein echtes Risiko ist, nicht nur Stil:** Weil der Cast über `unknown` geht, prüft `tsc` an dieser
Stelle **nichts** mehr — ändert sich `_parse`s echte Signatur in `GltfLoader.ts` (Parametername, zusätzlicher
Parameter, Rückgabetyp, oder wird die Methode umbenannt/entfernt), meldet der Compiler an `ProjectBinding.ts`
keinen Fehler; es bricht erst zur Laufzeit, beim nächsten Prefab-Laden oder Szenen-Reload. Verifiziert: `grep
-n "_parse\b" src/loaders/GltfLoader.ts` zeigt nur die eine private Methode, keine öffentliche Variante mit
kompatibler Signatur.

Kein akuter Bug heute (der bestehende `ProjectBinding.test.ts` deckt beide Callsites ab, und `tsc --noEmit`
ist grün, weil der Cast genau dafür da ist, grün zu bleiben), aber genau die Art stiller Kopplung, die bei
einem GltfLoader-Refactor (nicht mein Scope, aber ein plausibles künftiges Ereignis) unbemerkt durchrutscht.

**Fix-Richtung:** `GltfLoader` um eine schmale öffentliche/protected Methode ergänzen, die direkt
`{ json, buffers, baseUrl }` entgegennimmt (z.B. `parseDocument()`), und `load()`/`loadAnimations()` intern
darauf umstellen. `ProjectBinding` ruft dann diese echte, typgeprüfte API statt der Reflection auf. (Ändert
eine Datei außerhalb meines Scopes — nur als Empfehlung, nicht umgesetzt.)

---

## `src/tools/maker/AsciiMapLegend.ts`

### 🟠 Modul-globaler, sitzungsübergreifend geteilter Zähler (`markerCounter`)

```ts
let markerCounter = 0;
// ...
function markerEntry(char: string): GridLegendEntry {
  // ...
  onBuild: (_x, _y, worldX, worldZ): Object3D => {
    const marker = new Object3D(`${label}_${markerCounter++}`);
```

(`AsciiMapLegend.ts:26`, `44-54`). `markerCounter` ist ein **Modul-Level `let`**, nicht Teil irgendeiner
Klasseninstanz — es zählt über alle Aufrufe von `markerEntry(...).onBuild(...)` im gesamten Prozess hinweg
hoch, unabhängig davon, welcher `MakerApp` (welche Engine-Instanz) den ASCII-Import gerade auslöst.

Genau die Kategorie Fund, die `AGENTS.md`s **"No Global Singletons"**-Gesetz benennt ("Small World must
support multiple engine instances per page ... Never use global singletons"): zwei gleichzeitig auf einer
Seite laufende Maker-Instanzen (oder — praktischer — zwei ASCII-Map-Importe nacheinander in *derselben*
Session/demselben Modul-Scope) teilen sich denselben Zähler-Zustand, statt dass jeder Import bei `0`
beginnt. Funktional harmlos (nur kosmetische Objektbenennung `Enemy_0`, `Enemy_1`, ... in der Hierarchy,
keine Kollisionsgefahr für UUIDs oder echte Objekt-Identität), aber ein klarer Architekturverstoß und
überraschend für jeden, der einen zweiten Import erwartet, wieder bei `Enemy_0` zu starten.

**Verifiziert** (Wegwerf-Test unter `tests/tools/maker/`, danach wieder gelöscht): zwei unabhängig
aufgerufene `defaultAsciiMapLegend()`-Instanzen (simuliert: zwei separate Import-Vorgänge) — die erste
erzeugt `Enemy_0`/`Enemy_1` wie erwartet, aber der allererste `onBuild()`-Aufruf der *zweiten*,
"frischen" Legende liefert bereits `Enemy_2` statt wieder bei `0` zu beginnen. `npx vitest run` auf dem
Wegwerf-Test bestätigte das (grün, d.h. der geteilte Zustand ist real, nicht nur eine Vermutung).

**Fix-Richtung:** `markerCounter` aus dem Modul-Scope in eine Closure innerhalb von
`defaultAsciiMapLegend()` verschieben, sodass jeder Aufruf seinen eigenen, bei `0` startenden Zähler bekommt
— `wallEntry`/`markerEntry` müssten den Zähler dann als Parameter statt als geschlossene Modulvariable
erhalten (oder ein kleines `{ count: 0 }`-Objekt pro `defaultAsciiMapLegend()`-Aufruf durchreichen).

### 🟢 Test-Lücke

`grep -rn "AsciiMapLegend\|defaultAsciiMapLegend" tests/` findet **keine** Tests für diese Datei — weder für
die Wand-/Marker-Geometrie-Zuordnung noch für das oben gefundene Zähler-Verhalten. Einziger indirekter
Konsument ist `MakerApp._importAsciiMap()` (`MakerApp.ts:487-509`), dessen eigene Tests (falls vorhanden)
vermutlich nur den Undo-Wrapper prüfen, nicht die Legend-Logik selbst.

---

## `src/tools/maker/PropertyPanel.ts` (zusätzlich zum bereits dokumentierten Row-Grouping-Leak)

### 🟡 `window`-`pointerdown`-Listener der Kontextmenüs wird beim erfolgreichen Klick nie entfernt

Sowohl `_showMaterialContextMenu` (`PropertyPanel.ts:168-239`) als auch `_showBehaviorContextMenu`
(`PropertyPanel.ts:262-296`) registrieren beim Öffnen einen `closeHandler` auf `window`:

```ts
const closeHandler = (e: MouseEvent): void => {
  if (!menu.contains(e.target as Node)) {
    menu.remove();
    window.removeEventListener("pointerdown", closeHandler);
  }
};
setTimeout(() => { window.addEventListener("pointerdown", closeHandler); }, 0);
```

Das Entfernen des Listeners passiert **ausschließlich** im "Klick außerhalb"-Zweig. Klickt der Nutzer
stattdessen eine echte Menü-Option (`addOption(...)`'s eigener `click`-Handler, `PropertyPanel.ts:183-187` bzw.
`removeOption`, `PropertyPanel.ts:272-276`), wird zwar `menu.remove()` aufgerufen, aber
`window.removeEventListener("pointerdown", closeHandler)` **nicht** — der Listener bleibt auf `window`
registriert und hält den (jetzt DOM-losen) `menu`-Node sowie die geschlossenen `obj`/`material`/`behavior`-
Referenzen per Closure am Leben.

**Verifiziert** (Wegwerf-Test unter `tests/tools/maker/`, danach wieder gelöscht, jsdom-Umgebung): Dots-Button
geklickt → 1 `pointerdown`-Listener auf `window` registriert (bestätigt per instrumentiertem
`window.addEventListener`/`removeEventListener`). Danach eine echte Menü-Option ("Switch: Basic") geklickt →
Menü-DOM-Node korrekt entfernt, aber der Listener-Zähler blieb bei `1` statt auf `0` zurückzugehen —
Leck bestätigt.

**Relativierung (deshalb 🟡, nicht 🔴/🟠):** Der Leak ist praktisch selbstheilend — jedes *nächste*
`⋮`-Öffnen anderswo im Panel löst selbst wieder einen `pointerdown` auf `window` aus, gegen den auch der
alte, verwaiste `closeHandler` läuft; da sein (bereits entferntes) `menu` das neue Klick-Ziel nicht enthält,
räumt er sich in genau diesem Moment selbst ab. In der Praxis wächst die Zahl verwaister Listener also nie
über ~1 hinaus (nur zwischen "Option geklickt" und "irgendein nächster Klick irgendwo im Dokument"), aber
korrekt ist der Code trotzdem nicht — ein automatisierter Test, der Listener-Counts direkt nach einer
Menü-Aktion prüft (wie der Wegwerf-Test oben), würde das zuverlässig aufdecken.

**Fix-Richtung:** `window.removeEventListener("pointerdown", closeHandler)` zusätzlich in jedes
`addOption`/`removeOption`-`onClick` aufnehmen, oder besser: eine gemeinsame `closeMenu()`-Funktion, die
sowohl `menu.remove()` als auch das Listener-Cleanup übernimmt, und die von *beiden* Pfaden (Options-Klick
und Außerhalb-Klick) aufgerufen wird.

---

## `src/tools/forge/ForgeWindow.ts` + `Forge.ts`

### ✅ [ERLEDIGT] Jedes ForgeWindow hinterließ 10 permanente `window`-Listener — `destroy()` existierte, wurde aber nirgends aufgerufen und konnte sie strukturell auch nicht entfernen
*(Behoben 2026-09-03: `_bindDrag`/`_bindResize` halten ihre `mousemove`/`mouseup`-Handler jetzt als benannte Funktionsreferenzen in `_globalListeners`, die `ForgeWindow.destroy()` per `removeEventListener` wieder entfernt; der `ResizeObserver` aus `mountTool()` wird ebenfalls gespeichert und in `destroy()` disconnected. `Forge` bekommt ein eigenes `destroy()`, das über alle `_windows` iteriert (`win.destroy()`), seine eigenen `keydown`/`paste`-Listener abmeldet und `_overlay` aus dem DOM entfernt. `SmallWorld.destroy()` ruft jetzt `this.forge?.destroy()` auf, womit dessen eigener Dokumentationskommentar ("removing all global event listeners") für den Forge-Subtree tatsächlich stimmt. Unit-Tests in `tests/tools/ForgeWindow.test.ts` ("window listener/ResizeObserver cleanup on destroy") und `tests/tools/Forge.test.ts` ("destroy()").)*

`_bindDrag()` (`ForgeWindow.ts:163-193`) und `_bindResize()` (`ForgeWindow.ts:195-254`, einmal pro
Resize-Handle aufgerufen — 4 Handles: `nw`/`ne`/`sw`/`se`, `ForgeWindow.ts:55-61`) registrieren jeweils
**direkt auf `window`**:

```ts
window.addEventListener("mousemove", (e) => { ... });
window.addEventListener("mouseup", () => { ... });
```

Macht **5 Aufrufstellen × 2 Events = 10 `window`-Listener pro `ForgeWindow`-Instanz** (1× Drag + 4× Resize),
jede als anonyme Inline-Arrow-Function ohne gespeicherte Referenz. Damit gibt es **keine Möglichkeit**, sie
später gezielt per `removeEventListener` zu entfernen — dafür bräuchte man exakt dieselbe Funktionsreferenz,
die hier nirgends aufgehoben wird.

`ForgeWindow.destroy()` (`ForgeWindow.ts:153-161`) existiert zwar und entfernt Tool + DOM-Element korrekt,
räumt aber diese 10 Listener **nicht** ab (kann es strukturell auch nicht, s.o.) — und ist zusätzlich toter
Code: `grep -rn "\.destroy()" src/tools/forge/ src/core/SmallWorld.ts public/` findet **keinen einzigen
Aufruf** von `ForgeWindow.prototype.destroy` irgendwo im Baum. `close()` (`ForgeWindow.ts:148-151`) — der
einzige tatsächlich benutzte Pfad zum "Schließen" eines Fensters (`ForgeWindow.ts:40-43`, Klick auf `✖`) —
versteckt das Fenster nur per `display: none` ("We change close() to just hide the window, so it acts like
minimizing!"), das Fenster bleibt für immer im DOM und alle seine Listener bleiben aktiv.

Zusätzlich: `mountTool()` (`ForgeWindow.ts:87-100`) erstellt pro Fenster einen `ResizeObserver`, der ebenfalls
nie `disconnect()`t wird — auch dieser hält `this._tool` und `this._contentEl` für immer per Closure am
Leben.

**Wer das aufruft und warum es zählt:** `SmallWorld.ts:337-366` — jede `SmallWorld`-Instanz mit
`config.enableInspector: true` erstellt einen eigenen `new Forge()` und öffnet **4** Tool-Fenster (Map
Generator, Pixler, Xtractor, Material Studio) → **40 permanente, nie entfernbare `window`-Listener** pro
Engine-Instanz, allein aus `ForgeWindow`. Das architektonische Gesetz in `AGENTS.md` ("No Global Singletons
... Small World must support multiple engine instances per page") ist hier direkt betroffen: Werden mehrere
`SmallWorld`-Instanzen mit `enableInspector` je auf einer Seite erstellt (explizit unterstütztes Szenario),
vervielfacht sich das ungebremst. Sogar der einfache Ein-Instanz-Fall bleibt für die gesamte Seiten-Lebensdauer
mit 40 toten `mousemove`/`mouseup`-Listenern behaftet, die bei jeder Mausbewegung auf der gesamten Seite
laufen (die `isDragging`/`isResizing`-Flags sind zwar `false`, aber die Callbacks selbst werden trotzdem
jedes Mal ausgeführt).

**Bestätigt durch `SmallWorld.destroy()`s eigenen Dokumentationskommentar:** `SmallWorld.ts:397-411`
verspricht explizit *"Destroys the engine instance, freeing memory and removing all global event listeners"*
— entfernt aber nur seine eigenen `resize`/`keydown`/`pagehide`-Listener (`SmallWorld.ts:404-406`) und ruft
weder `this.forge` noch irgendeine Fenster-Teardown-Logik auf. Das Versprechen im Kommentar wird für den
kompletten Forge-Subsystem-Teilbaum nicht eingehalten — kein Sonderfall, sondern schlicht: es gibt aktuell
**keinen einzigen Codepfad**, der ein geöffnetes Forge-Fenster jemals wirklich abbaut.

**Fix-Richtung:**
1. `_bindDrag`/`_bindResize` so umbauen, dass die `mousemove`/`mouseup`-Handler als benannte, in der Instanz
   gehaltene Funktionsreferenzen existieren, damit `destroy()` sie per `removeEventListener` wieder entfernen
   kann (und `ro.disconnect()` für den `ResizeObserver` ergänzen).
2. `Forge` selbst braucht ein eigenes `destroy()`, das über `this._windows` iteriert und jedes `win.destroy()`
   aufruft, plus seine eigenen `paste`/`keydown`-Window-Listener abmeldet und `this._overlay` aus dem DOM
   entfernt.
3. `SmallWorld.destroy()` so erweitern, dass es `this.forge?.destroy()` aufruft, damit der bestehende
   Dokumentationskommentar ("removing all global event listeners") tatsächlich stimmt.

---

## `src/tools/common/dsp/{CanvasOperations,TextureFilters}.ts`

Kurz durchgesehen (reine Pixel-Math, kein Editor-Lifecycle/State) — `bresenhamLine`, `floodFill`,
`computeTrimBounds`, `flipCanvas`, `fastBoxBlur`, die Sobel-basierten `generateNormalMap`/`generateEdgeMap`
und die AO-/Roughness-/Specular-Map-Generatoren sind alle in sich konsistent (z.B. dieselbe
Sobel-dx/dy-Konvention in `generateNormalMap` und `generateEdgeMap`, korrekt übereinstimmend) und ohne
erkennbaren Bug. `floodFill`s Stack-Ansatz pusht Nachbarn ungeprüft und verwirft sie erst beim Pop
(`CanvasOperations.ts:68`) — funktional korrekt, nur die aus dem Lehrbuch bekannte, leicht redundante
Variante, kein Fehler.

### 🟢 Test-Lücke

`grep -rln "CanvasOperations\|TextureFilters" tests/` findet **keine** Tests für beide Dateien. Anders als
z.B. bei DOM-lastigem Code ist das hier besonders unnötig: alle Kernfunktionen (`fastBoxBlur`,
`sigmoidalContrast`, `generateNormalMap`, `generateAOMap`, `generateEdgeMap`, `bresenhamLine`, `floodFill`,
`computeTrimBounds`) sind reine `Array`-rein/`Array`-raus-Funktionen ohne DOM- oder GPU-Abhängigkeit (einzige
Ausnahme: `flipCanvas`, das `document.createElement("canvas")` braucht) — also ohne Mocking-Aufwand
Vitest-testbar. Nicht-triviale Numerik (Sobel-Ableitungen, AO-Kombinationsformel, Box-Blur-Sliding-Window)
ganz ohne automatisierte Verifikation ist ein reales Regressions-Risiko für den nächsten Refactor.

---

## `src/apps/light-cycle-arena/` — `ArenaGrid.ts` / `App.ts`

### ✅ [ERLEDIGT] Ein Cycle kollidierte nie mit seiner eigenen Trail-Schleife (Kernregel des Genres fehlte)
*(Behoben 2026-09-03: `ArenaGrid.isFree()` prüft jetzt ausschließlich `owner === undefined` — die `ownerId`-Ausnahme wurde ersatzlos entfernt, da beide Callsites (`App.ts`, `CycleAI.ts`) `isFree()` nur für die neu zu betretende Zelle abfragen, nie für die aktuell belegte, wodurch die Ausnahme nie nötig war. `ownerId`/`self`-Parameter dadurch aus `isFree()`/`CycleAI.decide()` entfernt. Unit-Tests in `tests/apps/light-cycle-arena/ArenaGrid.test.ts`.)*

`ArenaGrid.isFree()` (`ArenaGrid.ts:34-39`):

```ts
/** A cell is free if it's in bounds and either unclaimed or already owned by `ownerId`. */
public isFree(cx: number, cz: number, ownerId: number): boolean {
  if (!this.isInBounds(cx, cz)) return false;
  const owner = this._occupied.get(`${cx},${cz}`);
  return owner === undefined || owner === ownerId;
}
```

Jede vom eigenen Cycle bereits als Trail belegte Zelle bleibt für genau diesen Cycle für immer "frei"
(`owner === ownerId`-Zweig). Bei einer reinen Geraden-Fahrt ist das nie relevant — aber `GridMovementBehavior`
erlaubt beliebige 90°-Abbiegungen an jeder Kreuzung (`CycleAI.decide`, `CycleAI.ts:27-31`, wählt aus
"geradeaus/links/rechts"; der Spieler kann über `_playerDesiredDir`, `App.ts:188-213`, genauso frei abbiegen).
Fährt ein Cycle (Spieler oder KI) eine geschlossene Schleife — im Grid-Bewegungssystem geometrisch bereits mit
vier 90°-Abbiegungen erreichbar, z.B. eine simple 1×1-Zellen-Quadratschleife Ost→Nord→West→Süd zurück zum
Ausgangspunkt — kollidiert er beim Wiedereintritt in seine eigene, bereits gelegte Trail-Zelle **nicht**,
weil `owner === ownerId` weiterhin `true` zurückgibt. Das widerspricht der zentralen, genrebestimmenden
Tron-Regel ("crashing into your own trail"), auf die sich sowohl der Klassennamen-Kontext (`App.ts`s eigener
Kopfkommentar: "a Tron-style grid duel") als auch das gesamte Spielprinzip stützen — ohne Eigenkollision kann
sich weder Spieler noch KI je durch eine enge Schleife selbst aus dem Spiel nehmen, was die beabsichtigte
Spannung (Platz wird durch beide Trails zunehmend knapper) für die eigene Trail-Hälfte komplett aushebelt.

**Verifiziert** (Wegwerf-Test unter `tests/apps/`, danach wieder gelöscht, reine Logik ohne DOM/Renderer
nötig): `ArenaGrid` mit einer simulierten 1×1-Schleife (`(0,0)→(1,0)→(1,1)→(0,1)`, alle für `ownerId=0`
belegt) — `isFree(0, 0, 0)` (Wiedereintritt in die eigene erste Zelle) liefert `true` statt `false`. Kein
Sonderfall der Testbedingungen: `App.ts:225` (`this._grid.isFree(cell.cx, cell.cz, cycle.id)`) übergibt exakt
denselben `ownerId` = die eigene Cycle-ID, die Produktionslogik ist identisch zur getesteten.

**Vermutliche Absicht vs. tatsächlicher Effekt:** Der `owner === ownerId`-Zweig sieht so aus, als sollte er
nur die *aktuell gerade selbst besetzte* Startzelle (die am Spawn einmalig besetzt wird, `App.ts:159-162`)
vor einem sofortigen Fehlstart schützen — tatsächlich gilt die Ausnahme aber pauschal für **jede** je selbst
belegte Zelle, nicht nur die aktuelle.

**Fix-Richtung:** Für die Eigenkollisions-Prüfung nur die *unmittelbar aktuelle* Zelle (bzw. die beiden
Zellen der laufenden Bewegung) als Ausnahme behandeln, nicht `ownerId` pauschal — z.B. einen separaten
`isFreeForOwnMovement(cx, cz, ownerId, currentCx, currentCz)` oder schlicht `owner === undefined` als einzige
Freigabe-Bedingung verwenden und die eine notwendige Ausnahme (Startzelle) am Spawn-Zeitpunkt gesondert
behandeln.

---

## `src/apps/and-now/scenes/prologue/`

### 🟡 594 Zeilen komplett toter Code: `PrologueScene.ts` wird nirgends importiert

`src/apps/and-now/scenes/prologue/PrologueScene.ts` (594 Zeilen) deklariert eine vollständige eigene
`export class PrologueScene extends AbstractShowcase`-Implementierung der Bunker-Prolog-Szene — Kamera-Setup,
Post-Processing, komplette 3D-Raumgeometrie (`_buildBunkerRoom`), Staubpartikel, Timeline-FSM
(`_updateTimeline`, Phasen 0-8), UI-Listener, alles vollständig ausprogrammiert. Das tatsächlich von
`scenes/prologue/index.html:254` geladene Skript ist aber `./prologue.ts`
(`<script type="module" src="./prologue.ts">`), das **seine eigene, separate** `class PrologueScene` mit
identischen Methodennamen deklariert (`_buildBunkerRoom`, `_buildDustParticles`, `_initUiListeners`,
`togglePlayback`, `selectQuestion`, `_updateTimeline` — per `grep` abgeglichen, alle sechs Namen exakt
gleich) und am Dateiende selbst instanziiert (`prologue.ts:556`: `const app = new PrologueScene({...})`).

**Verifiziert:** `grep -rln "from.*PrologueScene" src/` findet **keinen einzigen** Import von
`PrologueScene.ts`s exportierter Klasse irgendwo im Baum — die Datei exportiert eine Klasse, die niemand
konsumiert. `git log --oneline --follow` zeigt, dass beide Dateien im selben Commit (`b3066f09`) eingeführt
wurden; ein `diff` der beiden zeigt `prologue.ts` als eine leicht nachjustierte Variante (andere
Kamera-Projektion-Handhabung, andere Farbwerte/Post-Processing-Werte, `GlassMaterial`/`GrainElement` entfernt,
`RendererType`-Import ergänzt) — ganz offensichtlich eine Iteration auf demselben Entwurf, bei der die
Vorgänger-Datei nie gelöscht wurde.

---

## `src/apps/yad/core/LevelBuilder.ts`

### 🟡 Entwickler-Selbstgespräch als Kommentar stehen gelassen

`LevelBuilder.ts:320-325`:

```ts
// Pass lava and slime floor chars to GridLegend floor overrides
// But GridLevelBuilder doesn't have a direct char match for default floor overrides!
// So we need to add explicit floor entries for 'char' if they are lava/slime.
// Wait, the lava chars are usually just '~' or 'w' mapped to "floor" type.
// We already handle this in the outer loop for 'char'.
// Let's refine how lava floors are made:
```

Liest sich wie unbereinigtes lautes Denken während der Implementierung ("But...", "Wait...", "Let's
refine...") statt eines fertigen WHY-Kommentars — genau das, was `coding-guide`s Kommentar-Regel ausschließt
("Refactor before you comment... A comment standing in for a name should become the name"). Funktional
harmlos, aber für den nächsten Leser verwirrend, da der Kommentar eine bereits überholte Zwischenüberlegung
dokumentiert statt die tatsächlich finale Logik (den nachfolgenden `for`-Loop, `LevelBuilder.ts:326-333`) zu
erklären. Kleiner Cleanup: auf einen einzeiligen WHY-Kommentar kürzen (warum lava/slime-Chars nachträglich
als Overrides in `gridLegend` gepatcht werden, statt direkt beim Aufbau berücksichtigt).

---

## `src/apps/neon-labyrinth/` und `src/apps/yad/` — sonstige Beobachtungen

Beide Apps' zentrale Gameplay-Dateien (`App.ts`, `core/behaviors/Controller.ts`, `EnemyBehavior.ts`,
`WispBehavior.ts`, `ImpactFlashBehavior.ts`) wurden vertieft gelesen — keine weiteren konkreten Bugs
gefunden. Beide sind spürbar sorgfältiger geschrieben als der Durchschnitt: Neon Labyrinths
`Controller.ts:122-131` dokumentiert einen bereits-gefundenen-und-gefixten Ground-Snap-Bug direkt im
Code (s. "Was gut gemacht" unten), `ImpactFlashBehavior` räumt seine kurzlebigen Objekte korrekt via
`scene.remove()` auf (`ImpactFlashBehavior.ts:42-44`), und YADs `EnemyBehavior`/`Controller`-Kombination
nutzt `MathPool` und Octree-Queries konsistent mit dem Rest des Engine-Patterns. Einzige Randnotiz: YADs
`Controller.ts:132` iteriert jeden Frame über `scene.objects` komplett, um Lava-/Slime-Tiles per Tag zu
finden (statt eine beim Level-Bau einmalig gefilterte Hazard-Liste zu cachen) — bei YADs Levelgrößen
vermutlich unkritisch (Lava/Slime-Tiles sind wenige, einzelne Objekte neben ansonsten gemergter
Wand-/Boden-Geometrie), aber derselbe vermeidbare Full-Scan-pro-Frame-Stil wie beim `LightGizmoManager`-Fund
oben.

---

## ✅ Was gut gemacht ist

- **`UndoStack`/Command-Pattern in Maker** (`UndoStack.ts`, `MakerApp.ts`): lehrbuchmäßig korrekt umgesetzt,
  inklusive sauberer Redo-Branch-Invalidierung und sorgfältig gecachter Vorher/Nachher-Zustände in jeder
  einzelnen `execute()`-Callsite — auch in Fällen mit nicht-trivialer Hierarchie-Umhängung (Multi-Select
  Delete/Group) bleibt das Endergebnis korrekt.
- **`PropertyPanel`s Value-Copy-Semantik bei Vector3D/Color-Feldern** (`cloneVal`/`copyVal`,
  `PropertyPanel.ts:399-420`): mutiert bestehende Objekte in-place statt Referenzen zu tauschen — korrekt für
  Handles wie `Object3D.position`, die anderswo live referenziert werden.
- **`ArenaGrid`/`CycleAI`s Trennung von Broadphase-Occupancy-Map und Ein-Schritt-Heuristik**
  (`ArenaGrid.ts`, `CycleAI.ts`): klar, lesbar, mit dokumentierter bewusster Abgrenzung zu `PhysicsSystem`
  ("exact integer cell-occupancy map is simpler and more precise... here") — abgesehen vom oben gefundenen
  Eigenkollisions-Bug ist die Konstruktion sauber.
- **Neon Labyrinths `Controller.ts:122-131`**: ein Ground-Snap-Bug, der leicht hätte unentdeckt bleiben
  können (unbegrenzt wachsende `_fallVelocityY` beim Stehen auf festem Boden durch eine "Big Fallback Void
  Zone"), wird nicht nur gefixt, sondern der komplette Denkweg im Kommentar dokumentiert — genau die Art
  Post-Mortem-Doku, die einer zukünftigen Regression vorbeugt.
- **`ImpactFlashBehavior`/`WispBehavior`**: sauberes, explizites Lifecycle-Management für kurzlebige
  Effekt-Objekte (`scene.remove()` nach Ablauf der Dauer) und durchgängige `MathPool`-Nutzung im Hot Path,
  konsistent mit dem projektweiten Zero-Allocation-Versprechen.
- **`Forge`/`ForgeTool`-Architektur im Kern (jenseits des Listener-Leaks)**: die Trennung Dockable-Fenster
  (`ForgeWindow`) / Mini-App-Contract (`ForgeTool`) / Fenstermanager (`Forge`) ist sauber geschnitten, und
  `restoreState()`/`localStorage`-Persistenz pro Fenster ist ein durchdachtes kleines Detail.
- Durchgängig: alle vier Showcase-Apps folgen konsequent demselben `AbstractShowcase`/`SmallWorld`-Vererbungs-
  und Datei-Layout-Muster (`App.ts`/`Events.ts`/`core/`) — keine der von mir geprüften Dateien wich
  überraschend von den projektweiten Konventionen ab.

## Fazit

Der Maker-Editor-Kern (Undo, die meisten Panels, Gizmos) ist solide bis sehr gut gebaut; die eine neue
Kategorie echter DOM-Leaks, die ich über das bereits dokumentierte `PropertyPanel`-Row-Grouping-Problem hinaus
gefunden habe (Kontextmenü-Listener), ist selbstheilend und niedrigrisikig. Der mit Abstand gravierendste
Fund im gesamten Scope liegt in `src/tools/forge/`: **jedes** geöffnete Forge-Fenster hinterlässt zehn nie
entfernbare `window`-Listener, `destroy()` existiert nirgends aufgerufen, und `SmallWorld.destroy()`s eigenes
Versprechen ("removing all global event listeners") wird für den gesamten Forge-Subsystem-Teilbaum nicht
eingehalten — das ist ein echter, unbegrenzter Ressourcen-Leak, keine Theorie. Der zweite schwere Fund liegt
in `light-cycle-arena/ArenaGrid.ts`: die fehlende Eigenkollision hebelt die genrebestimmende Tron-Kernregel
komplett aus. Beide sind mit kleinen, chirurgischen Fixes behebbar.

**Top-3-Priorität für den nächsten Schritt:**
1. 🔴 `ForgeWindow`/`Forge` Listener-Leak schließen (`_bindDrag`/`_bindResize` refaktorieren, `Forge.destroy()`
   ergänzen, `SmallWorld.destroy()` daran anschließen).
2. 🔴 `ArenaGrid.isFree()`s Eigenkollisions-Ausnahme auf die tatsächlich aktuelle Zelle begrenzen statt
   pauschal auf `ownerId`.
3. 🟠 `UndoStack` eine Kapazitätsgrenze geben (oder zumindest an einer sinnvollen Stelle `clear()` verdrahten),
   bevor Maker einen "Projekt schließen/neu laden"-Flow bekommt, der sonst denselben Soft-Delete-Retention-
   Mechanismus sofort erneut treffen würde.

Nachrangig, aber real: der `ProjectBinding`→`GltfLoader._parse`-Reflection-Zugriff, `LightGizmoManager`s
Allocation-pro-Frame, `AsciiMapLegend`s modul-globaler Zähler, und die 594 Zeilen toter Code in
`and-now/scenes/prologue/PrologueScene.ts`.

**Warum das mehr als Kosmetik ist:** 594 Zeilen ausprogrammierter, aber unerreichbarer Szenen-/FSM-Logik
verwirren jeden künftigen Edit an "der" Prolog-Szene — ein Fix in `PrologueScene.ts` (dem Datei, deren Name
exakt zum Feature passt) hätte schlicht keine Wirkung im Spiel, weil `prologue.ts` geladen wird. Erhöht auch
unnötig die von `npm run build:lib`/`tsc` zu prüfende Codemenge.

**Fix-Richtung:** `PrologueScene.ts` löschen (nachdem geprüft ist, dass keine der beiden divergenten
Feintuning-Änderungen — z.B. der `GlassMaterial`-Screen-Glass-Effekt oder der `GrainElement`-Filmkorn, die
`prologue.ts` nicht hat — eigentlich noch übernommen werden sollten, bevor die Datei verschwindet).

---
