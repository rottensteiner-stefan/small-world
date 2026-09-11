# Koordinatensystem & Kameras

Die Raumausrichtung der Engine und die Kamerastrategien zu verstehen ist entscheidend für räumliche Logik, Culling und Eingaben.

## Rechtshändiges Koordinatensystem

Small World nutzt ein **rechtshändiges Koordinatensystem**:

- **X-Achse (+X):** Rechts
- **Y-Achse (+Y):** Oben
- **Z-Achse (+Z):** Rückwärts (aus dem Bildschirm heraus zeigend)
- **-Z-Achse (-Z):** Vorwärts / Front (in den Bildschirm hinein zeigend)

```
        +Y
         ^   -Z (Vorwärts)
         |  /
         | /
         |/
         +-------> +X (Rechts)
        /
       /
     +Z (Rückwärts)
```

## Kamerasteuerung & Blickformeln

Beim Schreiben eigener Blick-/Orbit-Mathematik oder relativer Bewegungssteuerungen (z. B. WASD) blickrelative Trigonometrie nutzen:

- **Winkelausrichtung:** Theta ($\theta$) und Phi ($\phi$) sind relativ zum $-Z$-Vektor definiert.
- **Richtungsvektor:**
  $$\text{dirX} = \sin(\theta) \cdot \cos(\phi)$$
  $$\text{dirY} = \sin(\phi)$$
  $$\text{dirZ} = -\cos(\theta) \cdot \cos(\phi)$$

## Kamerastrategien

Das Kamerasystem unterstützt mehrere Strategiemuster:

1. **Fixed Camera:** Konstante Position und Ziel. Verwendet für isometrische Hintergründe.
2. **Smooth Follow:** Interpoliert Position und Ziel linear zu einem Ziel-Object3D, dämpft die Fokussierung.
3. **FPS Camera:** Volle maus-/tastaturrelative Blicksteuerung und WASD-Bewegung. Unterstützt Terrain-Höhen-Einrasten.
4. **Isometric Camera:** Parallele orthografische Projektionen mit pixelgenauem Viewport-Einrasten.

```typescript
// FPS-Strategie beim Setup einrasten
this.camera.setStrategy(CameraStrategyType.FPS);
this.camera.addBehavior(
  new FPSController({
    moveSpeed: 8.0,
    enableCollision: false,
    scene: this.scene,
  }),
);
```

## Frustum-Culling

Um die Performance zu maximieren, verwirft die Engine Geometrie außerhalb des Sichtfelds dynamisch mittels **Frustum-Culling**:

```typescript
// Wird intern innerhalb des Renderer-Listen-Zusammenstellers aufgerufen
if (frustum.intersectsVolume(object.bounds)) {
  renderList.opaque.add(object);
}
```

Alle Geometrien berechnen dynamisch eine achsenausgerichtete Bounding Box (AABB). Frustum-Culling lässt sich für statische Hintergrund-Overlays deaktivieren, indem `frustumCulled = false` an einem Objekt gesetzt wird (z. B. Skybox).

## 2.5D-Hintergründe & Textur-Ausrichtung

Beim Erstellen von 2.5D-Mattepaintings, UI-Hintergründen oder Billboards:

1. **`Plane`-Geometrie verwenden:** Für flache Hintergründe immer `Plane({ width, height })` verwenden. `Plane` erzeugt Standard-UV-Koordinaten ($U \in [0, 1]$ von links nach rechts, $V \in [1, 0]$ von oben nach unten), ausgerichtet auf $+Z$.
2. **WebGL-Textur-Vertikalspiegelung (`flipY`) & WebP-Format:** DOM/HTML-Bilder haben ihren Pixelursprung $(0,0)$ oben links, während WebGL-Texturkoordinaten $(0,0)$ unten links beginnen. Beim Laden von Texturen immer `{ flipY: true }` übergeben. **WebP (`.webp`)** gegenüber JPEG für 2D-Kunst bevorzugen, um dunkle Block-Artefakte zu vermeiden und Alphakanal-Transparenz für Vordergrund-Ebenen zu ermöglichen:
   ```typescript
   const bgTex = await Texture.fromUrl("/assets/path/image.webp", { flipY: true });
   ```
3. **Keine Negativ-Skalierungs-Hacks:** Nie negative Skalierungsfaktoren (z. B. `scale.set(-1, -1, 1)`) auf 3D-Objekte anwenden, um Texturen zu spiegeln. Negative Skalierung kehrt die räumliche Parität um, dreht die Wickelreihenfolge um und spiegelt horizontale Koordinaten (vertauscht links und rechts).
4. **16:9-Seitenverhältnis-Standard:** 2.5D-Hintergrundebenen und KI-generierte Mattepaintings auf ein 16:9-Verhältnis standardisieren (z. B. `Plane({ width: 16, height: 9 })`). Zentrierung bei $Y = 4.5$ richtet die untere Kante bündig mit dem Bühnenboden bei $Y = 0.0$ aus.
