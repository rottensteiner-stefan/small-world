# Gamification & Interaktionen

Die Small World Engine bietet eine eingebaute Interaktionsschicht über den `InteractionManager`. Dieses System lässt euch einfach auf Maus- und Touch-Ereignisse direkt an 3D-Objekten in der Szene reagieren, über eine performance-optimierte, Octree-basierte Raycasting-Pipeline.

## 1. Einrichtung

Der `InteractionManager` wird automatisch während des `SmallWorld`-Lebenszyklus instanziiert und ist als `this.interactionManager` verfügbar.

Damit ein Objekt auf Pointer-Ereignisse reagiert, müsst ihr es nur als pickbar markieren und eure Event-Callbacks zuweisen:

```typescript
const mesh = new Object3D("InteractiveCube");
mesh.geometry = new Cube({ size: 1.0 }).getGeometryData();
mesh.material = new StandardMaterial({ color: Color.RED });

// 1. Picking aktivieren
mesh.isPickable = true;

// 2. Ereignisse definieren
mesh.onPointerEnter = () => {
    mesh.scale.set(1.5, 1.5, 1.5);
};

mesh.onPointerLeave = () => {
    mesh.scale.set(1.0, 1.0, 1.0);
};

mesh.onPointerClick = () => {
    (mesh.material as StandardMaterial).color.set(Math.random(), Math.random(), Math.random());
};

this.scene.add(mesh);
```

## 2. Octree-Beschleunigung (Performance)

Ein naiver Raycaster durchläuft jeden Frame alle $O(n)$ Objekte der Szene, was bei großen Szenen die Bildrate ruiniert. Small World beschleunigt Interaktionen über einen räumlich partitionierenden **Octree**, der den Großteil der Objekte durch günstige Bounds-Checks aussortiert, statt eines vollständigen linearen Durchlaufs.

Um die Octree-Beschleunigung zu nutzen, initialisiert die Octrees der Szene und deklariert eure statischen Objekte:

```typescript
// Abmessungen eurer interaktiven Welt definieren
const bounds = new BoundingBox(new Vector3D(-50, -50, -50), new Vector3D(50, 50, 50));
this.scene.initOctrees(bounds);

const mesh = new Object3D("Tree");
mesh.isStatic = true; // Markiert das Objekt als statisch, damit es in den statischen Octree aufgenommen wird
mesh.isPickable = true;
this.scene.add(mesh);

// Sobald eure statischen Objekte hinzugefügt sind, den Octree aufbauen:
this.scene.updateStaticOctree();
```

Ist ein Octree vorhanden, nutzt der `InteractionManager` automatisch `Octree.queryRay()`, um tausende Objekte sofort zu verwerfen, ohne eine einzige aufwendige Schnittprüfung durchzuführen.

## 3. Fertige Verhalten (Behaviors)

Small World enthält eingebaute Behaviors, die ihr für schnelles Prototyping direkt an Objekte hängen könnt.

### HoverBehavior

Skaliert ein Objekt beim Hovern automatisch sanft hoch und lässt es in Neon-Farbe leuchten.

```typescript
import { HoverBehavior } from "small-world";

// Skaliert beim Hovern auf das 1,5-fache
const hover = new HoverBehavior(1.5);
mesh.addBehavior(hover);
```

### DraggableBehavior

Erlaubt es, Objekte frei im 3D-Raum zu ziehen und abzulegen. Das Objekt bewegt sich dabei entlang einer Ebene, die perfekt zur Kamera ausgerichtet ist.

```typescript
import { DraggableBehavior } from "small-world";

// Benötigt die aktive Kamera, um die Zieh-Ebene zu berechnen
const draggable = new DraggableBehavior(this.camera);
mesh.addBehavior(draggable);
```

> **Hinweis:** Diese Behaviors setzen `isPickable = true` automatisch, sobald sie an ein Objekt gehängt werden.

## 4. Pixelgenaues Picking (Möller-Trumbore)

Für hochpräzise Anwendungen wie CAD-Werkzeuge oder Shooter nutzt der Raycaster einen hybriden Ansatz:
1. Zunächst wird der **Octree** (bzw. die AABB-BoundingBox) abgefragt, um Objekte, die der Strahl klar verfehlt, schnell auszuschließen.
2. Besitzt das Objekt eine `geometry`, iteriert er dynamisch über die tatsächlichen Dreiecks-Vertices des Meshes und transformiert sie in den Weltraum.
3. Er führt eine **Möller-Trumbore-Schnittberechnung** durch, um die exakte Schnittdistanz `t` zu ermitteln.

> **Architektur-Hinweis (Broadphase vs. Narrowphase):** Die `Raycaster`-Kernklasse selbst ist strikt als linearer *Narrowphase*-Evaluator konzipiert. Sie enthält bewusst keine eigene räumliche Beschleunigung (wie BVH oder interne Octrees). Stattdessen wird die räumliche Filterung (die *Broadphase*) eine Ebene darüber von Systemen wie dem `InteractionManager` übernommen (über `scene.staticOctree.queryRay`), der dem `Raycaster` dann nur die stark reduzierte Liste an Kandidaten-Objekten übergibt. Diese klare Trennung der Zuständigkeiten hält den Raycaster einfach und verhindert redundante Beschleunigungsstrukturen.

Das garantiert, dass auch transparente Lücken oder unregelmäßige Meshes pixelgenau anklickbar sind!
