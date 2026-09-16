# 2.5D-Szenen & Hintergründe

2.5D ist kein besonderer Rendering-Modus — es ist eine Familie alter, gut erprobter Tricks, um Tiefe billig vorzutäuschen. Diese Anleitung führt end-to-end durch den Bau einer 2.5D-Szene mit Small World: ein Hintergrundbild auf eine Kamera abstimmen, festlegen, wo eine Figur laufen darf, die richtige Kamerastrategie wählen, Szenen mit mehr als einem Fluchtpunkt, und eine Handvoll echter Bugs, auf die das eigene Referenzspiel dieser Engine ("The Whisper") dabei gestoßen ist.

> **Verwandt:** Die grundlegende Mechanik von Hintergrund-Ebenen — UVs, `flipY`, Seitenverhältnis — wird in [2.5D-Hintergründe & Textur-Ausrichtung](/guides/coordinate-system#_2-5d-backgrounds-texture-orientation) in der Koordinatensystem-Anleitung behandelt. Diese Anleitung baut darauf auf mit Perspektiv-Abgleich, Bewegungszonen und Kamerastrategie-Abwägungen. Für jede unten erwähnte Klasse und Option siehe die **[API-Referenz](/api/index.html)**.

## 1. Was "2.5D" eigentlich bedeutet

Reines 2D: alles ist ein flaches Sprite, die Kamera ist irrelevant, es gibt keine Tiefe. Reines 3D: alles ist echte Geometrie, und die Kamera kann (fast) überallhin. **2.5D sitzt dazwischen** — echte 3D-Objekte (meist nur die Spielfigur) existieren, während die Welt drumherum, die Kamera oder beides bewusst eingeschränkt sind, sodass das Ergebnis *sich liest* wie ein flaches, komponiertes Bild statt wie ein freier 3D-Raum.

"The Whisper"s eigenes Design-Dokument benennt das schon, ohne es "2.5D" zu nennen: das **"Wiener Guckkasten-Prinzip"** — die Außenwelt in isometrischer Draufsicht gezeigt, Innenräume als seitlich aufgeschnittenes Theaterset. Das ist genau diese Familie von Tricks, nur mit einem Wiener Namen dafür.

## 2. Drei Wege, Tiefe vorzutäuschen

Keine dieser Techniken bewegt viel echte 3D-Geometrie — jede "behauptet" Tiefe, während sie so wenig davon wie möglich tatsächlich tut.

### 2.1 Parallax-Ebenen
Mehrere flache Bildebenen, hintereinander gestapelt. Schwenkt die Kamera seitwärts, scrollen nähere Ebenen schneller als weiter entfernte — das Auge liest Tiefe allein aus dem Geschwindigkeitsunterschied, obwohl jede einzelne Ebene völlig flach ist.

- **Beispiele:** klassische 2D-Jump'n'Runs (Super Mario World), die meisten modernen Indie-Plattformer.
- **Vorteile:** günstigste Option, kaum Rechenaufwand; sehr vorhersehbar, keine Kamera-Überraschungen.
- **Nachteile:** die Figur kann nicht wirklich "in die Szene hineinlaufen"; nur seitliche Bewegung funktioniert, keine echte Tiefe.

### 2.2 Vorgerenderter Hintergrund + 3D-Figur
Ein festes, gemaltes oder vorgerendertes Hintergrundbild, mit genau einem echten 3D-Objekt — der Spielfigur —, das sich darüber bewegt. Das ist exakt die `flakturm-tunnel`-Szene: `BACKGROUND_Z` ändert sich nie, die Kamera bewegt sich nie. Der Hintergrund trägt das ganze Bühnenbild; die Engine muss nur ein einziges echtes 3D-Ding berechnen.

- **Beispiele:** Grim Fandango, Broken Sword, die frühen Resident-Evil-Spiele.
- **Vorteile:** der Hintergrund kann so aufwendig/gemalt sein wie gewünscht — kostet zur Laufzeit nichts; sehr kontrollierte, filmische Bildkomposition.
- **Nachteile:** die Kamera kann geometrischen Grenzfällen wie Selbstverdeckung nie ausweichen (§7); die Perspektive der Kunst und die Perspektive der 3D-Kamera müssen *exakt* übereinstimmen (§3).

### 2.3 Erzwungene Perspektive durch Skalierung
Statt eine Figur wirklich tiefer in ein 3D-Volumen zu bewegen, wird sie beim "Zurückweichen" einfach kleiner skaliert — Welt-Z bleibt fast konstant, während die scheinbare Größe schrumpft. Genau das macht `StageZone`: jeder Zonenpunkt trägt seinen eigenen `scale`-Wert (`1.0` unten an einer Treppe, `0.5` weiter oben, `0.3` tief in einem Tunnel), linear zwischen den Punkten interpoliert.

- **Beispiele:** ein klassischer Adventure-Spiel-Trick, schon in Point-and-Click-Spielen der 90er verwendet.
- **Vorteile:** eine einzige einstellbare Zahl pro Zonenpunkt; funktioniert selbst dort, wo die Kamera nie wirklich hinschaut.
- **Nachteile:** braucht sorgfältig gewählte Werte — ein zu großer Sprung zwischen Punkten liest sich als Fehler, ein zu kleiner ist unmerklich; es bleibt eine Illusion, nie echte Tiefenbewegung.

> **Die Diorama-Szene nutzt nichts davon.** Ihre Kamera darf frei um eine echte 3D-Bühne kreisen (`OrbitController`). Beide Ansätze existieren im selben Projekt nebeneinander, für unterschiedliche Zwecke: eine Schaufenster-Präsentation vs. eine steuerbare Spielszene.

## 3. Ein Hintergrundbild anlegen: Perspektive & der Fluchtpunkt

Bevor auch nur eine einzige Zone gezeichnet wird, muss das Bild selbst zur 3D-Kamera passen. Das ist der Schritt, der am leichtesten übersprungen wird.

### Reihenfolge, die tatsächlich funktioniert
1. **Erst die Kamera festlegen** — Position, Blickrichtung, Sichtfeld (FOV). In `flakturm-tunnel`: `camera.position.set(0, 4.5, 10.864)`, Ziel `(0, 4.5, 0)`, Standard-FOV 75°. Die Kamera blickt exakt geradeaus, keine seitliche Neigung.
2. **Das Seitenverhältnis des Bildes daraus ableiten**, nicht umgekehrt. `BACKGROUND_WIDTH = 16`, `BACKGROUND_HEIGHT = 9` — das Bild wird 1:1 auf eine Ebene genau dieser Größe gemappt, kein Zuschneiden oder Strecken nötig, wenn das Verhältnis von Anfang an stimmt.
3. **Erst jetzt die Kunst malen oder generieren** — mit bereits bekannter Kameraposition und Blicktiefe. Erst zu malen und danach eine Kamera dazu passend zu machen bedeutet, das Problem rückwärts zu lösen; geht auch, ist aber unnötig fehleranfällig.

### Wo der Fluchtpunkt sitzen muss
Bei einer geraden, symmetrischen Kamera wie dieser (Kamera-X = Ziel-X, Kamera-Y = Ziel-Y, nur Z unterscheidet sich) gibt es genau **einen** Fluchtpunkt — und er muss exakt dort sitzen, wo die optische Achse der Kamera die Bildebene durchstößt. Bei zentriertem Blick ist das schlicht **die Bildmitte**. Jede Linie im Bild, die "in die Tiefe zurückweicht" (eine Tunnelröhre, eine Zimmerflucht, Schienen), muss dort zusammenlaufen — sonst kämpft die in diese Szene gesetzte 3D-Figur sichtbar gegen eine Perspektive, die nicht zu ihrer eigenen passt.

![Annotierter Flakturm-Tunnel-Hintergrund: Blau markiert die tatsächliche Bildmitte, auf die die fixe 3D-Kamera geradeaus blickt; Orange markiert, wo der gemalte Tunnel selbst optisch zusammenläuft, deutlich versetzt von der Mitte.](/guides/2-5d-scenes/flakturm_bg_fluchtpunkt_analyse_web.jpg)

*Echtes Beispiel aus diesem Projekt, nicht gestellt: Blau markiert die tatsächliche Bildmitte — genau dort, wo die fixe 3D-Kamera geradeaus blickt. Orange markiert, wo der gemalte Tunnel selbst optisch zusammenläuft. Die beiden liegen spürbar auseinander. Das muss nichts kaputt machen (das Auge ist nachsichtig, und diese Kamera bewegt sich nie), aber es ist genau die Art Detail, die es wert ist, bewusst zu prüfen, statt sie dem Zufall zu überlassen.*

**So prüfst du es selbst:** zwei oder drei eindeutig gerade Linien im Bild verlängern (eine Wandkante, eine Rohrleitung, die Kante eines Ganges) und schauen, wo sie sich wirklich treffen. Liegt dieser Punkt nicht dort, wo die Kamera-Achse laut Code hinzeigt, weißt du es wenigstens — und kannst entscheiden, ob es bei diesem konkreten Bild eine Rolle spielt.

> **Was ist mit dem Sichtfeld (FOV)?** Es bestimmt, wie stark zurückweichende Linien zur Mitte hin zusammenlaufen — ein kleines FOV (Tele) staucht kaum, ein großes FOV (Weitwinkel) zieht die Ränder merklich nach außen. Wurde die Kunst mit einer anderen angenommenen Brennweite gemalt oder generiert als der, die die 3D-Kamera später tatsächlich nutzt, wirkt die echte 3D-Figur später zu flach oder zu gestreckt im Vergleich zur gemalten Welt darum. Am einfachsten mit einem einzelnen Platzhalter-Objekt an bekannter Position zu testen, bevor die endgültige Kunst existiert — nicht danach.

### Wann spielt das überhaupt eine Rolle?
Perspektiv-Abgleich ist nur dann ein Thema, wenn eine **echte 3D-Kamera** sowohl ein **flaches, gemaltes/vorgerendertes Bild** als auch **echte 3D-Geometrie** (die Figur) zusammen rendert und erwartet, dass sie sich wie eine einzige, konsistente Einstellung lesen. Konkret in dieser Engine:

- **Spielt eine Rolle — Strategie `FIXED`.** Position/Blick/FOV der Kamera sind einmal festgelegt, sodass die Kunst genau einmal darauf abgestimmt werden kann und für immer gültig bleibt. Das ist der `flakturm-tunnel`-Fall.
- **Spielt keine Rolle — Strategie `ISOMETRIC`.** Orthografische Projektion hat *keinen* Fluchtpunkt, konstruktionsbedingt: parallele Linien bleiben parallel, sie laufen nie zusammen. Die ganze Frage stellt sich nicht.
- **Spielt keine Rolle — freie/bewegliche Kameras, die nur echte Geometrie rendern** (z. B. das `OrbitController` des Dioramas). Es existiert nichts Gemaltes, das zu einer bestimmten Kameraposition passen müsste.

Es ist auch kein rein kosmetisches Anliegen. Der `scale`-Wert an jedem `StageZone`-Punkt ist eigentlich ein von Hand geschätzter Ersatz für "wie tief im Bild liegt dieser Punkt". Den echten Fluchtpunkt zu kennen (und die Horizontlinie, §4) bedeutet, dass dieser Abfall im Prinzip *berechnet* statt geraten werden könnte — und, entscheidend, mehrere Zonen (oder später Hotspots, NPC-Spawnpunkte, Objektplatzierung) könnten alle an derselben, konsistenten Regel verankert werden statt jede ihren eigenen, isoliert geschätzten Verlauf zu tragen. Das wird konkret notwendig, sobald ein Hintergrund mehr als eine zurückweichende Richtung hat — siehe den nächsten Abschnitt.

## 4. Mehr als ein Fluchtpunkt: Straßenecken & verzweigte Hintergründe

Ein einzelner, gerader Korridor (wie der Tunnel oben) braucht immer nur einen Fluchtpunkt. Sobald ein Hintergrund eine **Verzweigung** zeigt — eine Straße, die geradeaus weiterläuft, *und* zum Beispiel eine Türöffnung oder ein Torbogen, der in einem Winkel abzweigt —, enthält das Bild korrekterweise **zwei** Fluchtpunkte gleichzeitig. Das ist kein Fehler und kein Perspektivproblem; genau so funktioniert Zweipunktperspektive immer, und sie taucht ständig in handgemalten Adventure-Hintergründen an Straßenecken auf (eine Pariser Straßenecke in *Broken Sword* ist ein bekanntes Beispiel dieser Art: ein Boulevard, der geradeaus zurückweicht, und ein Torbogen, der seitlich in einem anderen Winkel wegführt — zwei unabhängig konvergierende Linienfamilien in einem einzigen Bild).

### Warum zwei Fluchtpunkte korrekt sind, kein Bug
Eine Reihe paralleler Linien, die geradeaus vom Betrachter wegläuft, konvergiert zu genau einem Fluchtpunkt — das ist der Einpunkt-Fall aus §3 (ein Tunnel oder Gang, mittig betrachtet). Sobald eine *zweite*, anders orientierte Reihe paralleler Linien im selben Bild existiert — eine Seitenstraße im Winkel, eine Gebäudefassade, die relativ zur Hauptstraße gedreht ist —, konvergiert diese Reihe zu ihrem eigenen, separaten Fluchtpunkt. Solange beide Linienreihen eben sind (parallel zur Bodenebene, keine Kameraneigung), **liegen beide Fluchtpunkte auf derselben Horizontlinie** — der Linie auf Augenhöhe des Künstlers/der Kamera.

```
                       Horizontlinie (Augenhöhe) — beide Fluchtpunkte liegen hier
      FP-A  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·  FP-B
        \                                                           /
         \    Korridor A                       Korridor B         /
          \   (geradeaus)              (Torbogen, abgewinkelt)   /
           \                                                    /
            \                                                  /
             \________________________●________________________/
                              Straßenecke
                        (Figur steht hier)
```

Drei Konsequenzen davon übertragen sich direkt auf die Werkzeuge, die diese Anleitung bereits behandelt hat:

1. **Eine `StageZone`-Kette pro Verzweigung, nicht ein globaler Verlauf.** Eine einzelne Skalierungs-Interpolation ergibt nur entlang einer einzigen zurückweichenden Richtung Sinn. An einem Verzweigungspunkt braucht es eine *separate* Zonenkette pro Korridor, jede mit ihrem eigenen `scale`-Verlauf, gebunden an ihren eigenen Fluchtpunkt — der Zonen-Autoring-Workflow aus §5 gilt pro Verzweigung, unabhängig voneinander.
2. **Kanten-Abgleich an gemeinsamen Rändern gilt weiterhin, nur pro Verzweigung.** Die Regel "zwei Zonen an einer gemeinsamen Kante verbinden" aus §5 (`(u,v)`-Werte an der Naht exakt abgleichen) gilt an der Eckkachel selbst — beide Zonenketten der Korridore müssen exakt dort in Position und Skalierung übereinstimmen, wo ein Spieler von einem in den anderen wechseln kann.
3. **Die Blickrichtung muss sich an der Verzweigung ändern, nicht nur Position/Skalierung.** Vom einen Korridor in den anderen zu laufen bedeutet, dass sich die Blickrichtung der Figur neu an die eigene zurückweichende Richtung des neuen Korridors ausrichten muss — derselbe Mechanismus wie die Optionen `facingOffset`/`startFacingNudge` von `StageMovementBehavior` (§7), nur an einem Verzweigungsübergang statt am Szenenstart angewendet.

### Die allgemeine Regel: jede Zone ist zwei Fluchtlinien-Paare, nicht "2 waagerecht + 2 Linien"
"2 waagerecht + 2 Fluchtlinien" (§3) ist selbst nur ein Sonderfall. Was für *jedes* flache Rechteck unter einer rollwinkelfreien Kamera tatsächlich gilt: es hat zwei Paare paralleler Kanten, und **jedes Paar konvergiert auf seinen eigenen Fluchtpunkt.** Ein Paar kommt nur dann als reine, nicht konvergierende waagerechte Linien heraus, wenn dieses Paar zufällig *frontal* ist — exakt senkrecht zur Blickachse der Kamera. Das trifft auf einen Korridor zu, der geradeaus entlang der eigenen Z-Achse der Kamera zurückläuft (der Tunnel), aber nichts garantiert das für einen begehbaren Bereich, der in einem Winkel abzweigt.

Eine Treppe, die diagonal statt geradeaus nach hinten wegführt, ist genau dieser Fall. Keines ihrer beiden Kantenpaare ist mehr frontal, also **muss keines waagerecht sein** — beide Paare sind Fluchtlinien, nur zu zwei verschiedenen Punkten (und da die Treppe auch ansteigt, liegt mindestens einer dieser Punkte abseits des Haupt-Horizonts, nicht darauf). Konkret in Zone C von `flakturm-tunnel` (die Treppe, die in einem Winkel vom Vorplatz abzweigt statt wie der Tunnel geradeaus zurückzulaufen): sowohl ihr Kantenpaar "quer zur Treppe" als auch ihr Kantenpaar "entlang der Treppe" sind nicht-waagerechte Fluchtlinien, die jeweils zu ihrem eigenen Punkt konvergieren — das ist zu erwarten, kein Warnsignal. Es ist dieselbe "eigener Fluchtpunkt pro Verzweigung"-Regel von oben, nur direkt in der Form des Zonen-Polygons sichtbar statt nur in der gemalten Kunst.

**So erkennst du, ob die Kanten einer Zone tatsächlich richtig sind, nicht nur in sich stimmig:** verlängere jedes ihrer beiden Kantenpaare zu vollen Linien, über die eigenen Ecken des Polygons hinaus, und prüfe, ob jedes Paar zu einem sinnvollen Punkt konvergiert. Zwei Punkte können perfekt konsistent *zueinander* und trotzdem beide falsch im Vergleich zur Kunst sein — der einzige Weg, das zu erkennen, ist, die nachgezogene Kante direkt gegen die gemalte Linie zu vergleichen, der sie folgen soll, genauso wie §3s Fluchtpunkt-Check funktioniert, nur pro Zonenkante angewendet statt einmal auf den ganzen Hintergrund. Siehe §5s Zonen-Autoring-Schritte für genau diesen Check, samt einem echten Beispiel, wie er in diesem Projekt eine falsch gezogene Kante aufgedeckt hat.

### Ein schneller Plausibilitätscheck für Horizont-Konsistenz
Wenn zwei verschiedene konvergierende Linienfamilien im selben Bild zu Fluchtpunkten führen, die *nicht* auf derselben waagerechten Linie liegen, gilt eines von zwei Dingen: entweder hat der Künstler nicht mit einem einzigen, konsistenten Augenhöhen-System gearbeitet (üblich, und nicht "falsch" in handgemalter Kunst — niemand ist verpflichtet, technisch perfekte Zweipunktperspektive zu zeichnen), oder eine der dargestellten Bodenebenen ist tatsächlich relativ zur anderen geneigt (eine abschüssige Straße, eine Rampe). Gut zu wissen, wenn ein Hintergrundbild passend zu einer echten Kamera zurückkonstruiert wird, statt anzunehmen, jede Kulisse sei standardmäßig geometrisch konsistent.

Ein dritter Fluchtpunkt (Dreipunktperspektive) taucht nur bei starker Auf-/Abwärtsneigung der Kamera auf — etwa beim steilen Hinaufblicken zu einem Turm. Nicht relevant für eine ebene, augenhöhige 2.5D-Kamera wie die bisher in diesem Projekt verwendeten, aber gut, den Namen zu kennen, falls eine künftige Szene die Kamera je neigt.

### Praktische Schritte zum Malen oder Generieren eines solchen Hintergrunds
1. Entscheiden, wie viele unterschiedliche Bewegungsrichtungen die Szene tatsächlich braucht — zwei oder drei sind meist reichlich; mehr wird für den Spieler schwer lesbar.
2. Für jede Richtung die eigene Fluchtpunkt-Position festlegen (auf einer gemeinsamen Horizontlinie, falls eine ebene Welt gewünscht ist), *bevor* die Kunst existiert — dieselbe Reihenfolge "erst Kamera/Plan, dann Malen" wie in §3, nur einmal pro Verzweigung wiederholt.
3. Die Kunst mit diesen Richtungen im Kopf malen oder generieren (bei Bedarf getrennte Prompts/Ebenen pro Richtung, danach zusammengesetzt).
4. Eine `StageZone`-Kette pro Richtung bauen, am Verzweigungspunkt nach der Kanten-Abgleichsregel aus §5 verbunden.
5. Die Verzweigung selbst durchlaufen und prüfen, ob der Wechsel der Blickrichtung/Drehung überzeugend wirkt — genau hier zahlt sich `facingOffset` aus.

## 5. Bewegungsbereiche definieren

Die Grundfrage jeder 2.5D-Szene: **wohin genau darf die Figur gehen?** Ein gemaltes Bild hat keine eingebaute Kollisionsgeometrie — sie muss von Hand hinzugefügt werden. Drei verbreitete Lösungen:

| Ansatz | Beschreibung | Beispiel |
|---|---|---|
| **Walk-Mask (Bitmap)** | Ein zweites, unsichtbares Schwarz-Weiß-Bild — Weiß = begehbar. Sehr alt, sehr einfach, aber pixelgenau und mühsam zu pflegen. | klassische LucasArts-Adventures |
| **Navmesh (3D)** | Ein Dreiecksnetz über echter 3D-Geometrie, meist automatisch aus der Level-Geometrie gebacken. Der Standard in echten 3D-Spielen. | praktisch jedes moderne 3D-Spiel |
| **Normierte Polygon-Zonen** | Eine Handvoll `(u, v)`-Punkte, direkt auf das Bild gezeichnet, in einem Editor verschiebbar. Leichtgewichtig, künstlerfreundlich, kein Bitmap nötig. | Small Worlds eigenes `StageZone`-System |

Small World nutzt den dritten Ansatz. In `flakturm-tunnel/showcase.ts`: `DEFAULT_ZONE_POINTS`, drei benannte Zonen (`zone_a` / `zone_b` / `zone_c`), jede ein Polygon aus vier `(u, v)`-Punkten mit eigenem `scale`-Wert. `StageMovementBehavior._resolveMove()` prüft bei jeder Bewegung, ob die neue Position noch innerhalb eines Polygons liegt, und klemmt sie sonst auf die nächstgelegene gültige Kante — das ist das gesamte "Kollisions"-Modell. Der eingebaute Editor (Taste `[E]`) lässt diese Punkte direkt mit der Maus auf dem Bild ziehen, statt Koordinaten zu tippen.

### Eine Zone in der Praxis anlegen
1. **Die Bodenlinie im Bild finden.** Nicht die Wände oder Decke — die Fläche, auf der Füße stehen würden. Im Tunnel-Hintergrund: die Pflastersteine, nicht das Tunnelgewölbe darüber.
2. **Den Editor öffnen (`[E]`), vier Eckpunkte grob auf dieser Fläche platzieren.** Am einfachsten an der nächstgelegenen Kante beginnen (unten im Bild, wo die Figur spawnt) und sich von dort rückwärts vorarbeiten.
3. **Jeden Punkt einzeln auf die gemalte Kante ziehen**, nicht "ungefähr" platzieren — ein Punkt, der 2 % über die gemalte Wand hinausragt, ist später sofort sichtbar, weil die Figur optisch durch die Wand läuft.
4. **`scale` pro Punkt setzen**, passend zur gemalten Größe an dieser Stelle (`1.0` in Nahaufnahme, spürbar kleiner an einer sichtbar weiter entfernten Engstelle — testen, nicht schätzen).
5. **Zwei Zonen an einer gemeinsamen Kante verbinden**, indem die Nahtpunkte nahezu identische `(u, v)`-Werte erhalten — sonst gibt es an der Zonengrenze einen sichtbaren Sprung in Position oder Größe.
6. **Tatsächlich hindurchlaufen und hinschauen**, nicht nur die Polygone im Editor betrachten — ob sich eine Zone "richtig anfühlt", zeigt sich erst, wenn die Figur sich hindurchbewegt, nicht am Umriss allein.
7. **Beide Kantenpaare verlängern und gegen die Kunst prüfen**, gemäß der allgemeinen Regel aus §4. Eine Zone kann in sich perfekt konsistent sein (ihre eigenen vier Punkte bilden ein sauberes Viereck) und trotzdem an der falschen Stelle im tatsächlichen Gemälde nachgezogen sein — der einzige Weg, das zu erkennen, ist ein direkter Vergleich mit der Kunst, nicht nur mit der eigenen Form der Zone.

### Ein echtes Beispiel, wie Schritt 7 einen Fehler aufdeckt

Zone C von `flakturm-tunnel` (die Treppe) zweigt diagonal vom Vorplatz ab — genau der Fall des gedrehten Rechtecks aus §4, bei dem kein Kantenpaar waagerecht ist. Ihre beiden Kanten wurden gegen die tatsächlich gemalte Treppe geprüft, indem die echten Stufenkanten direkt in der Hintergrundkunst nachgezogen und mit den eigenen Eckpunkten der Zone verglichen wurden:

![Vergleich der nachgezogenen Eckpunkte von Zone C (P0-P3, orange) gegen die echten, direkt in der Kunst gemessenen Treppenkanten (A-D, cyan/magenta): die rechte Kante (P1-P2) stimmt gut überein, aber die linke Kante (P0-P3) driftet zur fernen Ecke hin von der echten Stufenkante ab.](/guides/2-5d-scenes/treppe_kanten_messung_web.jpg)

*Die rechte Kante (P1 → P2, passend zu den gemessenen Punkten A/B) saß fast exakt auf der echten Kante an der Handlaufseite — dort kein Problem. Die linke Kante (P0 → P3) nicht: gegen die echte Stufenkante verlängert (Punkte C/D) zeigte sich, dass die ferne Ecke, P3, spürbar über die gemalten Stufen hinausragte, hinaus in den dunklen Schatten daneben.*

Der Fix war eine Ein-Punkt-Korrektur, keine Neuzeichnung der ganzen Zone — nur die tatsächlich falsche Ecke wurde verschoben (`u: 0.278` → `u: 0.305`, `v` unverändert), P0/P1/P2 blieben unangetastet, da bereits korrekt:

![Die linke Kante von Zone C nach dem Fix (grün) folgt jetzt eng der echten, gemalten Stufenkante, im Vergleich zur alten Kante (weiß, gestrichelt), die durch den Schatten neben der Treppe schnitt.](/guides/2-5d-scenes/treppe_zone_fix_web.jpg)

*Dieselbe Technik wie beim Fluchtpunkt-Foto aus §3 — direkte Messung gegen die Kunst, nicht nach Augenmaß — nur auf eine einzelne Zonenkante angewendet statt einmal auf den ganzen Hintergrund.*

## 6. Verfügbare Kamerastrategien

Die Engine liefert sieben fertige Kamerastrategien — jede ein wiedererkennbares Muster aus echten Spielen, nur unter eigenem Namen:

| Strategie | Verhalten | Typische Verwendung | Abwägung |
|---|---|---|---|
| `FIXED` | Bleibt stehen, blickt immer auf ein Ziel. | klassische Adventures, feste Kameraräume (frühes Resident Evil) | + voll kontrollierte Einstellung / − kann Problemwinkeln nicht ausweichen |
| `HYBRID_SYNC` | Kreist auf einer Kugel um ein Ziel, Maus-Ziehen/Zoom. | Produktkonfiguratoren, Showroom-/"Model Viewer" | + Spieler kann Problemwinkeln selbst ausweichen / − keine komponierte Kameraeinstellung |
| `STIFF` | Folgt der Figur sofort, ohne Verzögerung — hart und direkt. | retro-artige Third-Person-Kameras, Arcade-Titel | + präzise, keine Verzögerung / − kann ruckartig wirken |
| `SMOOTH` | Folgt der Figur, aber gedämpft/eingeschwungen. | die meisten modernen Third-Person-Spiele | + fühlt sich weich/organisch an / − hinkt bei scharfen Wendungen hinterher |
| `ISOMETRIC` | Orthografisch, fester Winkel, kein Fluchtpunkt, kein "näher = größer". | Disco Elysium, Divinity: Original Sin, klassische CRPGs | + lesbar, konsistente Größe / − kann technisch/kühl wirken |
| `FPS` | Sitzt im Kopf der Figur, dreht sich mit deren Blickrichtung. | Ego-Shooter, Erkundungsspiele in Ich-Perspektive | + maximal immersiv / − die eigene Figur bleibt unsichtbar |
| `MANUAL` | Die Engine tut nichts automatisch — volle manuelle Kontrolle, z. B. für Zwischensequenzen. | Kamerafahrten, Zwischensequenzen | + totale Kontrolle / − jede Bewegung von Hand gebaut |

Beachte, dass nur `FIXED` (und, für eine einzelne statische Einstellung, jede Strategie, die momentan genauso geparkt ist) eine echte "muss zum gemalten Hintergrund passen"-Verpflichtung hat, wie in §3 beschrieben — siehe den dortigen Hinweis "wann spielt das überhaupt eine Rolle", warum die anderen sechs diese ganze Frage meist umgehen.

## 7. Selbstverdeckung bei fixem Kamerawinkel

Ein echter, reproduzierbarer geometrischer Effekt tauchte beim Bau von `flakturm-tunnel` auf: bei bestimmten Blickwinkeln verschwand einer der beiden Füße der Figur optisch hinter dem anderen — kein kaputtes Rig, kein fehlendes Mesh, reine Perspektive.

**Die Intuition:** stell dir zwei Zaunpfähle in einer Reihe vor. Läufst du seitlich daran vorbei, sind beide klar getrennt. Stellst du dich an ein Ende der Reihe und schaust genau entlang, verschwindet der hintere Pfahl fast vollständig hinter dem vorderen — nicht, weil er weg ist, sondern weil deine Blicklinie und die Reihe der Pfähle jetzt exakt zusammenfallen.

Dasselbe passiert mit den beiden Füßen einer Figur. Sie stehen nicht exakt nebeneinander — einer ist leicht nach vorne versetzt gegenüber dem anderen (ein kleiner seitlicher Abstand plus ein größerer Vorne-Hinten-Versatz, passend dazu, wie eine Ruhe-/Stehpose tatsächlich gerigged ist). Während sich die Figur dreht, dreht sich die gedachte Linie zwischen den beiden Füßen mit. In dem Moment, in dem diese Linie genau auf eine **fixe** Kamera zeigt, fällt ein Fuß auf dem Bildschirm fast vollständig hinter den anderen. Dasselbe gilt für jedes andere leicht versetzte Detail am Körper (eine Hand, eine Mantelfalte, der Griff der Laterne) — Füße sind schlicht der auffälligste Fall, weil sie am weitesten auseinanderstehen.

Zwei Dinge wurden bei der Untersuchung ausgeschlossen, es lohnt sich, sie explizit zu nennen, da sie die naheliegendsten ersten Vermutungen sind:

- **Kein Frustum-Culling.** Frustum-Culling dauerhaft ein-/auszuschalten machte keinen Unterschied — beide Füße blieben die ganze Zeit innerhalb des Sichtfrustums.
- **Kein Occlusion-Culling.** Der HZB-Occlusion-Culling-Pass der Engine (`config.enableOcclusionCulling`) wurde direkt geprüft; ihn zu deaktivieren änderte ebenfalls nichts.

Es ist reine Projektionsgeometrie: bei einer Kamera, die sich nie von der kritischen Blickachse wegbewegen kann, tritt dieser Winkel **garantiert** irgendwann während normaler Drehung auf — kein seltener Grenzfall. Eine frei kreisende Kamera (`HYBRID_SYNC`/`OrbitController`, wie in der Diorama-Szene) macht dieselbe Geometrie praktisch vermeidbar, weil der Spieler einfach vom kritischen Winkel wegschwenken kann; eine dauerhaft `FIXED`e Kamera kann das nicht.

**Der Fix war nicht "das Bein reparieren".** An der Figur gibt es nichts Kaputtes zu reparieren — das Skelett ist korrekt. Stattdessen bekam `StageMovementBehavior` eine `startFacingNudge`-Option: einen kleinen Winkelversatz (`0.14` rad, ≈ 8°), angewendet auf die anfängliche Blickrichtung der Figur, gerade genug, dass die Szene die Figur nicht exakt auf der kritischen Linie stehend startet.

```typescript
const movement = new StageMovementBehavior({
  input: this.input,
  speed: 0.09,
  zones: [zoneA],
  startFacingNudge: 0.14, // ~8 Grad, lenkt die Start-Blickrichtung von der Selbstverdeckungs-Achse weg
  uvToWorld: (u, v) => ({ x: (u - 0.5) * 16, y: 4.5 + (0.5 - v) * 9, z: 0 }),
});
```

## 8. Eine minimale Referenz-Implementierung

Keine Magie — das gesamte Bewegungssystem von `flakturm-tunnel` sind fünf Bausteine, die alle bereits in der Engine existieren. Das ist eine Skizze, keine Kopiervorlage:

```typescript
// 1. Die Kamera einmal positionieren, nie wieder anfassen
this.camera.position.set(0, 4.5, 10.864);
this.camera.target.set(0, 4.5, 0);

// 2. Gemalter Hintergrund als flache, unbeleuchtete Ebene
const bg = new Plane({ width: 16, height: 9 });
bg.material = new BasicMaterial({ diffuseMap: await new Texture().load("bg.webp") });

// 3. Begehbarer Bereich als Polygon in Bildkoordinaten (u,v 0..1)
const zoneA = new StageZone({
  id: "zone_a",
  points: [
    { u: 0.46, v: 0.90, scale: 1.0 },
    { u: 0.83, v: 0.89, scale: 1.0 },
    { u: 0.77, v: 0.82, scale: 1.0 },
    { u: 0.51, v: 0.82, scale: 1.0 },
  ],
});

// 4. Bewegung: normierte Zonen + Tastatureingabe, keine echte Kollisionswelt nötig
const movement = new StageMovementBehavior({
  input: this.input,
  speed: 0.09,
  zones: [zoneA],
  uvToWorld: (u, v) => ({ x: (u - 0.5) * 16, y: 4.5 + (0.5 - v) * 9, z: 0 }),
});
playerRig.addBehavior(movement);

// 5. Die Figur selbst braucht ein lichtempfindliches Material; der Hintergrund nicht
character.material = new StandardMaterial({ diffuseMap: charTexture, roughness: 0.92 });
```

Das ist im Wesentlichen schon alles — alles Weitere (Animation, Requisiten wie eine handgetragene Laterne, der Zonen-Editor in der Szene) baut darauf auf. Diese fünf Zeilengruppen zu verstehen bedeutet, das gesamte Bewegungssystem von `flakturm-tunnel` zu verstehen.

## 9. Lektionen aus dem Bau von "The Whisper"

Keine Theorie — was beim Bau dieser Szene tatsächlich schiefging, jetzt als Faustregeln festgehalten:

- **Fixe Kamera:** eine Kamera, die nie ausweicht, macht jeden geometrischen Grenzfall (Selbstverdeckung, eine Verzweigung genau vor dem Kopf) **garantiert reproduzierbar** statt selten — die Start-Blickrichtung der Figur bewusst planen, nicht zufällig (§7).
- **Skalierung als Tiefe:** erzwungene Perspektive braucht genauso sorgfältig gewählte Werte wie echte Beleuchtung — ein zu aggressiver `scale`-Sprung zwischen zwei Zonenpunkten liest sich als Fehler, nicht als Tiefe.
- **Gemalt vs. beleuchtet:** ein gemalter Hintergrund braucht keine 3D-Beleuchtung (`BasicMaterial` ist dort korrekt) — aber die 3D-Figur davor schon (`StandardMaterial`). Beide auf "unbeleuchtet" zu setzen, weil es einfacher aussieht, lässt die Figur unsichtbar flach wirken.
- **Bewegungsgeschwindigkeit ≠ Animationsgeschwindigkeit:** wie schnell eine Figur die Bühne durchquert und wie schnell ihr Animations-Clip abläuft, sind zwei völlig getrennte Zahlen — eine Lauf-Geschwindigkeit zu korrigieren behebt nie einen Animations-Clip, der dafür zu kurz ist.

## 10. Weiterführendes

Spiele, an denen sich die drei Tiefen-Tricks aus §2 gut in Aktion erkennen lassen:

| Spiel | Technik |
|---|---|
| Grim Fandango | vorgerenderter Hintergrund + 3D-Figur |
| Broken Sword | vorgerenderter Hintergrund + 3D-Figur |
| Little Nightmares | echtes 3D, stark eingeschränkte Kamera |
| Disco Elysium | isometrisch, gemalter Look |
| Trine | seitliches 2.5D, echte Tiefe nutzbar |
| Ori and the Blind Forest | Parallax-Ebenen |

---

> **Ausblick:** ein Hintergrundbild samt seiner Bewegungszonen so anzulegen bedeutet heute, Szenen-Code von Hand zu editieren und den `[E]`-Zonen-Editor pro Showcase zu nutzen. Den **Maker**-Editor (aktuell ein 3D-Welteneditor, siehe [Maker (3D-Welteneditor)](/guides/maker)) um einen eigenen 2.5D-Szenen-Autoring-Modus zu erweitern — ein Hintergrundbild importieren, es gegen den Fluchtpunkt der Kamera prüfen, `StageZone`-Ketten samt Verzweigungen wie in §4 zeichnen — ist eine geplante Richtung dafür, aber noch nicht umgesetzt.
