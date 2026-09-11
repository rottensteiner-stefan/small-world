# Erste Schritte

Small World ist eine leichtgewichtige, hochperformante, modulare 3D-Game-Engine für das Web, gebaut mit TypeScript.

## Installation

Das Paket via NPM installieren:

```bash
npm install small-world
```

## Grundlegende Einrichtung

Die Engine nutzt einen strategiebasierten Lebenszyklus. Man leitet von `SmallWorld` ab (oder von `AbstractShowcase`, das ein paar Demo-/Debug-Annehmlichkeiten oben auf `SmallWorld` hinzufügt) und überschreibt die Lebenszyklus-Methoden `setupScene` und `update`.

### 1. Grundlegende Showcase-Implementierung

Eine Datei namens `app.ts` erstellen, um die Engine zu starten:

```typescript
import {
  AbstractShowcase,
  Color,
  Cube,
  Object3D,
  RendererType,
  StandardMaterial,
} from "small-world";

class MyFirstWorld extends AbstractShowcase {
  protected override async setupScene(): Promise<void> {
    // 1. Einen grünen PBR-Würfel erstellen
    const cubeObj = new Object3D("RotatingCube");
    cubeObj.geometry = new Cube({ size: 1.5 }).getGeometryData();
    cubeObj.material = new StandardMaterial({
      color: Color.GREEN,
      metallic: 0.5,
      roughness: 0.3,
    });
    cubeObj.position.set(0, 1.0, 0);

    // 2. Zur Szene hinzufügen
    this.scene.add(cubeObj);

    // 3. Die Kamera zurückbewegen, um die Szene zu sehen
    this.camera.position.set(0, 3.0, 6.0);
    this.camera.target.set(0, 1.0, 0);
  }

  protected override update(deltaTime: number): void {
    super.update(deltaTime);

    // Das Würfel-Objekt rotieren
    const cube = this.scene.getObjectByName("RotatingCube");
    if (cube) {
      cube.rotation.y += 1.0 * deltaTime;
    }
  }
}

// Instanziieren und starten
const app = new MyFirstWorld({
  rendererType: RendererType.BEST,
});

app.start().then(() => {
  console.log("Small World initialized!");
});
```

### 2. SPA- & Framework-Integration (React / Vue / Angular)

Wird Small World in eine Single-Page-Application (SPA) eingebettet, aktualisiert der Browser sich bei Routenwechseln nicht automatisch. Um Speicherlecks oder mehrere gleichzeitig im Hintergrund laufende Render-Schleifen zu verhindern, muss die Engine beim Unmount der eigenen Komponente sauber zerstört werden.

Einfach die Methode `destroy()` aufrufen. Das stoppt sofort die `requestAnimationFrame`-Schleife, entfernt alle globalen Window-Event-Listener und leert den WebGPU-/WebGL-Speicher.

```tsx
import { useEffect, useRef } from "react";
import { MyFirstWorld } from "./MyFirstWorld";

export function GameComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let app: MyFirstWorld | null = null;
    
    if (canvasRef.current) {
      app = new MyFirstWorld({
        canvasId: "SmallWorldCanvas"
      });
      app.start();
    }

    return () => {
      // Die Engine beim Unmount der React-Komponente vollständig aufräumen!
      if (app) {
        app.destroy();
      }
    };
  }, []);

  return <canvas id="SmallWorldCanvas" ref={canvasRef} />;
}
```

*Hinweis: Die Engine verfügt bereits von Haus aus über ein automatisches Sicherheitsnetz. Erkennt sie, dass ihr Canvas-Element von einem Framework gewaltsam aus dem DOM entfernt wurde, ohne dass `destroy()` explizit aufgerufen wurde, fängt sie das ab und zerstört sich selbst sicher!*
