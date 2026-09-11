# Materialien & Shader

Small World nutzt ein flexibles, physikalisch-basiertes Rendering-Fundament (PBR) mit starkem Fokus auf eigene Shader-Integration.

## Kern-Materialien

- `StandardMaterial`: Das primäre PBR-Material, basierend auf dem Cook-Torrance-BRDF-Modell. Unterstützt `color`, `metallic`, `roughness` sowie Diffuse-, Normal-, Roughness- und Emissive-Texturen.
- `PhongMaterial` & `LambertMaterial`: Nicht-PBR-Materialien für Specular und Diffuse, für klassisches stilisiertes Rendering.
- `BasicMaterial` & `WireframeMaterial`: Unlit-Materialien für Wireframe-Debugging, UI-Elemente oder flache stilisierte Assets.
- `GlassMaterial` & `FrostglassMaterial`: Echtzeit-Screen-Space-Refraction (SSR) mit konfigurierbarem `ior`, `thickness` und `transmission`.
- `SpriteMaterial`: 2D/2.5D kamera-zugewandte Billboards und Partikel.
- `RetroScreenMaterial`: Spezialisiertes Material, das alte CRT-Monitore mit Scanlines und chromatischer Aberration nachahmt.

---

## Fluid- & Flüssigkeitsoberflächen (ADR 0013)

Gemäß **ADR 0013** bietet Small World eine vereinheitlichte Architektur für Flüssigkeiten, aufgeteilt in zwei Hauptfamilien, die sich optimierte Shader-Chunks teilen (`liquid_gerstner_wave`, `liquid_worley_noise`):

### 1. Wave-Familie (transparent & refraktiv)

Angetrieben von mathematischer Gerstner-Wellenverschiebung im Vertex-Shader und Worley-Noise-Schnittschaum im Fragment-Shader.

- `OpenWaterMaterial`: Realistisches PBR-Ozean-/Wasser-Material mit Gerstner-Wellen, Fresnel-Reflexionen und **Opaque Depth-Fade** für weiche Uferlinien.
- `StylizedWaterMaterial`: Leichtgewichtiges Toon-/Anime-Wasser mit scharfen Schaum-Abschnitten und Cel-Shading-Tönungsparametern.

```typescript
import { Object3D, Plane, OpenWaterMaterial, Color } from "small-world";

const ocean = new Object3D("Ocean");
ocean.geometry = new Plane({
  width: 100,
  height: 100,
  widthSegments: 128, // Hohe Tessellierung für Gerstner-Wellen-Vertex-Verschiebung
  heightSegments: 128,
}).getGeometryData();

ocean.material = new OpenWaterMaterial({
  waterColor: new Color(0.1, 0.4, 0.6),
  deepWaterColor: new Color(0.01, 0.05, 0.2),
  waveSpeed: 1.0,
  foamDistance: 0.8,
});

this.scene.add(ocean);
```

### 2. Flow-Familie (noise-getrieben & emissive-fähig)

Angetrieben von prozeduralem Noise-Fluss und Verzerrung auf der Oberfläche, unterstützt opakes Depth-Writing oder transluzentes Blending.

- `FluidSurfaceMaterial`: Die generalisierte Basisklasse für flow-basierte Flüssigkeiten.
- `LavaMaterial`: Opakes geschmolzenes Gestein mit einstellbarer Emissive-Glüh-Intensität und thermischen Hitze-Farbverläufen.
- `SlimeMaterial`: Transluzenter, triefender toxischer Schleim mit Umgebungs-Kantenglühen und hoher Oberflächenviskosität.

```typescript
import { Object3D, Plane, LavaMaterial, Color } from "small-world";

const lavaPool = new Object3D("LavaPool");
lavaPool.geometry = new Plane({ width: 30, height: 30 }).getGeometryData();
lavaPool.material = new LavaMaterial({
  color: new Color(0.25, 0.03, 0.0),
  edgeColor: new Color(0.15, 0.02, 0.0),
  emissiveColor: new Color(1.0, 0.35, 0.05),
  emissiveStrength: 2.0,
  flowSpeed: 0.3,
  viscosity: 14.0,
});

this.scene.add(lavaPool);
```
