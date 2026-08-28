---
name: character-pipeline
description: End-to-end workflow from 2D concept sketch to game-ready, rigged 3D character in Small World.
---

# 2D to 3D Character Pipeline — Das vollständige Rezeptbuch

Dieses Dokument definiert den verbindlichen, praxiserprobten End-to-End-Workflow zur Erstellung spielbarer, geriggter und sauber animierter 3D-Charaktere für die **Small World Engine**.

---

## 🗺️ Pipeline-Architektur im Überblick

```text
[ 1. 2D-Konzept & 3-in-1 Albedo Model-Sheet ]
  - 🤖 AUTOMATISCH: Gemini API / generate_image / ImageMagick Stitching
  - 👤 MANUELL: Optionaler Konzept-Import / Photoshop-Touchup
  - Pure Albedo, ZERO directional shadows, pure white (#FFFFFF) background
                        │
                        ▼
[ 2. 3D-Geometrie & Texturatlas (Tripo3D) ]
  - 🤖 AUTOMATISCH: `tripo make <sheet> --for game-mobile --param face_limit=15000`
  - 10k–25k Triangles, 2K Textur-Budget (NO 4K/8K)
                        │
                        ▼
[ 3. Skeletal Rigging & Skinning (Adobe Mixamo Standard) ]
  - 👤 MANUELL: Adobe Mixamo Web (52/65-Joint Biped Rig, 100% Mocap- & Socket-Garantie)
  - 🤖 AUTOMATISCH: Konvertierung nach GLB (`character.glb`) & Bone-Validierung
                        │
                        ▼
[ 4. In-Place Motion Library & Prop-Stabilisierung ]
  - 🤖 AUTOMATISCH / 👤 MANUELL: In-Place Clips (`idle_torch`, `walk_torch`, `ascending_stairs`)
  - Fixierte Handhaltung für getragene Ausrüstung (Laterne, Waffe)
                        │
                        ▼
[ 5. Small World Runtime-Integration ]
  - 🤖 AUTOMATISCH: Multiplikativer `_characterRig` Wrapper (1.80m Skalierungsschutz)
  - PBR-Sanitizing (`clampMetallic`) / Graphic-Noir `BasicMaterial`
  - Semantischer Hand-Socket (Laterne: (0.01, 0.09, 0.02), Z = π/2)
  - AnimationMixer mit Cross-Fading
```

---

## 📋 File Handover & Workflow Contract (Wer liefert was wohin?)

Dieser Vertrag definiert für jeden Schritt exakt:
1. **Modus:** `🤖 AUTOMATISCH` (Agent/CLI) vs. `👤 MANUELL` (User/Web-UI)
2. **Input:** Woher die Eingabedatei stammt
3. **Output:** Wo die erzeugte Datei abgelegt werden **MUSS**

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ÜBERSICHT ALLER PFADE & ORDNER                                 │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. 2D-Konzepte & Dossier:    src/apps/<app>/docs/assets/<character>/                            │
│ 2. DCC- & Authoring-Daten:   src/apps/<app>/raw/mannequin/<character>/                          │
│ 3. Shared Raw Mocap (.fbx):  src/apps/<app>/raw/mannequin/shared/                              │
│ 4. Runtime-Charakter (.glb): public/assets/<app>/mannequin/<character>/character.glb           │
│ 5. Runtime-Mocap (.glb):     public/assets/<app>/mannequin/shared/anim/*.glb                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Stufen-Matrix:

| Stufe | Modus | Input-Pfad (Erwartet) | Output-Pfad (Erzeugt) | Ausführendes Tool / Aktion |
| :--- | :---: | :--- | :--- | :--- |
| **1. 2D Model-Sheet** | `🤖` / `👤` | `src/apps/<app>/docs/assets/<char>/hoodie.jpg` *(optional)* | `src/apps/<app>/raw/mannequin/<char>/model_sheet.jpg`<br>*(Kopie: `docs/assets/<char>/hoodie_model_sheet.jpg`)* | Gemini API / `generate_image`<br>+ `magick convert +append` |
| **2. 3D-Mesh & Atlas** | `🤖` | `src/apps/<app>/raw/mannequin/<char>/model_sheet.jpg` | `src/apps/<app>/raw/mannequin/<char>/base_model.glb`<br>`src/apps/<app>/raw/mannequin/<char>/task.json` | `tripo make model_sheet.jpg --for game-mobile` |
| **3. Mixamo Rigging** | `👤` *(User)* | `src/apps/<app>/raw/mannequin/<char>/base_model.glb` | `src/apps/<app>/raw/mannequin/<char>/character_rigged.fbx` | User lädt in [Mixamo Web](https://mixamo.com) hoch, riggt & lädt `.fbx` herunter |
| **3. GLB-Export** | `🤖` *(Agent)*| `src/apps/<app>/raw/mannequin/<char>/character_rigged.fbx` | `public/assets/<app>/mannequin/<char>/character.glb` | Konvertierung FBX ➔ GLB (FBX2glTF / gltf-transform) |
| **4. Shared Mocap** | `🤖` / `👤` | `src/apps/<app>/raw/mannequin/shared/*.fbx` | `public/assets/<app>/mannequin/shared/anim/*.glb` | In-Place Studio-Clips (`idle_torch`, `walk_torch`, `ascending_stairs`) |
| **5. Engine-Ingest** | `🤖` *(Agent)*| `public/assets/<app>/mannequin/<char>/character.glb`<br>`public/assets/<app>/mannequin/shared/anim/*.glb` | `src/apps/<app>/scenes/<scene>/` | `GltfLoader` + `_characterRig` Wrapper + Sockets + `AnimationMixer` |

---


## 🍳 Rezept 1: 2D-Konzept ➔ 3-in-1 Albedo Model-Sheet

Das 3D-Modellierungs-Tool benötigt eine konsistente Vorlage ohne perspektivische Verzerrung und **ohne gebackene Schatten**.

### 1. Das Albedo-First-Mandat (Unabdingbare 3D-Regel)
* **Keine Richtungsschatten oder Lichtkegel:** Schatten und Glanzlichter werden zur Laufzeit von Small World in Echtzeit berechnet (`PointLight`, `DirectionalLight`, `OutlineElement`).
* **Pflicht-Keywords für alle Turnaround-Prompts:**
  > *„Pure unshaded flat Albedo diffuse reference, neutral diffuse color map, perfectly even flat ambient studio lighting, ZERO cast shadows, ZERO highlights, solid pure white background (#FFFFFF).“*

### 2. Posen-Geometrie
* **Front & Back:** Symmetrische **A-Pose (45°)** (empfohlen) oder **T-Pose (90°)**. Beide Hände leer. Füße zeigen exakt parallel nach vorne (0° Auswärtsdrehung).
* **Right Profile (90° nach rechts gewandt):** **Arme hängen entspannt am Körper herab** (Arme in T-Pose würden das Profil verdecken).
* **Ausrüstungs-Zustand für Turnarounds (State 1: BASE):**
  * Gesicht und Haare vollständig sichtbar (Kapuze liegt im Nacken auf den Schultern).
  * Loop-Schal locker als Kragen um den Hals.

### 3. Zwei Generierungs-Methoden

#### Methode A: Single 16:9 Composite Sheet (Standard)
Erzeugt Front, Profil und Rücken in einem einzigen 16:9-Bild:
```text
Full-body 3-view turnaround character model sheet (Front view, Right side profile view, Back view) of [CHARACTER DESCRIPTION].
Pure unshaded flat Albedo diffuse reference, neutral diffuse color map, perfectly even flat ambient studio lighting, ZERO cast shadows, ZERO highlights, solid pure white background.
Left: Front view in symmetrical 45-degree A-pose, feet pointing dead straight forward.
Center: Exact 90-degree right profile view with arms hanging naturally at sides.
Right: Back view in matching symmetrical A-pose.
All three views at exact same scale and eye-level horizon.
```

#### Methode B: Sequenzielle Generierung + ImageMagick Stitching (Fallback bei Composite-Glotzen)
*Wenn das Modell bei Multi-Panel-Bildern Rücken oder Profil verdoppelt/abschneidet:*
1. **Front-View generieren** (Referenz: Konzeptgrafik).
2. **Profil-View generieren** (Referenzen: Konzeptgrafik + generierte Front-View für Proportionen).
3. **Rücken-View generieren** (Referenzen: Konzeptgrafik + Front-View für Ausrüstung).
4. **Zusammensetzen via ImageMagick:**
   ```bash
   magick convert front.png right.png back.png +append model_sheet.jpg
   ```

---

## 🍳 Rezept 2: 3D-Mesh & Textur-Generierung (Tripo3D)

Tripo3D wird **ausschließlich für die 3D-Geometrie und den Texturatlas** eingesetzt — niemals für Auto-Rigging.

### 1. Ausführung via `tripo-cli`
```bash
tripo make model_sheet.jpg --for game-mobile --param face_limit=15000 --json --yes
```

### 2. Parameter & Performance-Budgets
| Parameter | Vorgabe | Grund / Regel |
| :--- | :--- | :--- |
| **Preset** | `--for game-mobile` | Garantiert saubere Quad/Tri-Topologie für Echtzeit-Deformation. |
| **Polycount** | `10.000 – 25.000` Triangles | Optimale WebGL/WebGPU Performance bei stabilen 60 FPS. |
| **Textur-Größe** | **2K (2048x2048)** | **Strikt kein 4K/8K!** Schützt VRAM & Texture-Unit-Limits (`MAX_TEXTURE_IMAGE_UNITS(16)`). |
| **UV-Packing** | Konsolidierter Atlas | 1 einzelner Texturatlas pro Charakter. |
| **Koordinatensystem** | `+Y = Up`, `-Z = Forward` | Right-Handed System von Small World. |
| **Normierung** | 1.0m Bounding Box | Wird in der Engine mit Faktor `1.8` auf 1.80m skaliert. |

---

## 🍳 Rezept 3: Skeletal Rigging & Skinning (Adobe Mixamo Standard)

> **Architektur-Entscheidung:** Für alle spielbaren Charaktere in Small World ist **Adobe Mixamo der einzige verbindliche Rigging-Standard**. Tripo Auto-Rigging wird nicht verwendet, da es zu Knochen-Explosionen (>64 Bones), nicht-standardisierten Benennungen und zerreißenden Gliedmaßen führt.

### 1. Manueller User-Schritt (Mixamo Web-UI)
1. Base-Mesh [`src/apps/<app>/raw/mannequin/<char>/base_model.glb`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/raw/mannequin/) in [Adobe Mixamo](https://www.mixamo.com/) hochladen (Drag & Drop).
2. **Auto-Rigger Marker platzieren:**
   - `Chin` (Kinn)
   - `Wrists` (Handgelenke)
   - `Elbows` (Ellbogen)
   - `Knees` (Knie)
   - `Groin` (Schritt)
3. **Skeleton LOD:** Standard `Standard Skeleton (65 Bones)` oder `No Fingers (52 Bones)` wählen. Beide liegen sicher unter dem 64- bzw. Shader-Limit und besitzen saubere Edge-Loop-Gewichtungen.
4. Nach erfolgreichem Rigging als **FBX (.fbx) mit T-Pose** herunterladen.
5. Datei ablegen unter:
   `src/apps/<app>/raw/mannequin/<char>/character_rigged.fbx`

### 2. Automatischer Agent-Schritt (GLB-Konvertierung & Validierung)
Sobald die geriggte `.fbx` in `raw/` liegt, konvertiert der Agent das Modell nach `.glb` und deployt es ins Runtime-Verzeichnis:
```bash
# Konvertierung via fbx2gltf oder gltf-transform
npx @gltf-transform/cli copy src/apps/<app>/raw/mannequin/<char>/character_rigged.fbx public/assets/<app>/mannequin/<char>/character.glb
```
**Validierungs-Check:**
- Knochenstruktur enthält saubere `mixamorig:Hips`, `mixamorig:LeftHand`, `mixamorig:RightHand`.
- Bone-Anzahl liegt sicher bei $\le 65$ Joints.

---

## 🍳 Rezept 4: Motion Library & Prop-Stabilisierung

1. **In-Place Mandat:**
   * Animationen müssen immer **In-Place** sein (`--animate-in-place` bei Tripo, Checkbox *„In Place“* bei Mixamo).
   * *Grund:* Bewegung und Positionsfortschritt werden von Small World Behaviors (`StageMovementBehavior`, `FPSController`) gesteuert. Root-Motion im Clip führt zu Glitches.
2. **Prop-Tragehaltung (Laterne, Fackel, Waffe):**
   * Verwende für Figuren mit Ausrüstung dedizierte Studio-Mocap-Clips mit fixiertem Tragearm (z. B. `idle_torch.glb`, `walk_torch.glb`, `ascending_stairs.glb`).
   * Generische AI-Walk-Zyklen schwingen oft wild mit den Armen, was zu taumelnden Props führt.
3. **Knochen-Präfix Aliasing:**
   * [`AnimationMixer.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/animation/AnimationMixer.ts) normalisiert automatisch Präfixe (`mixamorig:`, `mixamorig1:`), sodass Clips universell binden.

---

## 🍳 Rezept 5: Small World Engine-Integration

### 1. Skalierung & der Rig-Wrapper (Kritischer Bug-Schutz)
> **🚨 GOLDENE REGEL:** Niemals `character.scale.set(1.8, 1.8, 1.8)` auf dem Objekt setzen, an dem ein `StageMovementBehavior` hängt! Das Behavior überschreibt `.scale` im Tick mit dem Zonen-Faktor (0.5–1.0).

**Das korrekte Wrapper-Pattern:**
```typescript
import { Object3D, StageMovementBehavior } from "small-world";
import { GltfLoader } from "small-world/loaders/GltfLoader";

const gltfLoader = new GltfLoader({
  clampMetallic: 0.2,   // Drosselt überhöhte Tripo-PBR Metallic-Werte
  clampRoughness: [0.3, 1.0]
});

// 1. Charakter laden und lokale 1.80m Skalierung setzen
const character = await gltfLoader.load("/assets/and-now/mannequin/novotny-male/character.glb");
character.scale.set(1.8, 1.8, 1.8);

// 2. Rig-Wrapper erstellen (Position & Behavior hier anhängen)
const characterRig = new Object3D("CharacterRig");
characterRig.add(character);

const movement = new StageMovementBehavior(zones, { speed: 2.0 });
characterRig.addBehavior(movement);

scene.add(characterRig);
```

### 2. Shading & Graphic Noir Look
Für 2.5D Comic/Noir Szenen ohne volles IBL-Environment:
```typescript
import { BasicMaterial, Color, Object3D } from "small-world";

function applyGraphicNoirMaterial(obj: Object3D): void {
  if (obj.material) {
    const basic = new BasicMaterial({ color: new Color(1, 1, 1) });
    if (obj.material.diffuseMap) {
      basic.diffuseMap = obj.material.diffuseMap;
    }
    obj.material = basic;
  }
  for (const child of obj.children) {
    applyGraphicNoirMaterial(child);
  }
}
applyGraphicNoirMaterial(character);
```

### 3. Semantischer Prop-Socket (z. B. Laterne in linker Hand)
```typescript
const HAND_BONES = [
  "mixamorig:LeftHand",
  "mixamorig1:LeftHand",
  "L_Hand",
  "tripo::0_Left_Limb_2",
  "tripo::0_Left_Limb_3",
];

let handBone: Object3D | undefined;
for (const name of HAND_BONES) {
  const found = character.getObjectByName(name);
  if (found) {
    handBone = found;
    break;
  }
}

if (handBone) {
  const propSocket = new Object3D("LanternSocket");
  // Offset in die Handfläche & 90° Z-Drehung, damit Laterne senkrecht zum Boden hängt
  propSocket.position.set(0.01, 0.09, 0.02);
  propSocket.rotation.set(0, 0, Math.PI / 2);
  
  propSocket.add(lanternMesh);
  propSocket.add(pointLight);
  handBone.add(propSocket);
}
```

### 4. AnimationMixer & Cross-Fading
```typescript
import { AnimationMixer, AnimationClip, AnimationAction } from "small-world";

const mixer = new AnimationMixer(character);

// Eingebettete Clips bevorzugen, ansonsten Studio-Clips aus shared/anim/ laden
let walkClip = character.animations?.find(a => a.name === "preset:walk");
if (!walkClip) {
  const loaded = await gltfLoader.loadAnimations("/assets/and-now/mannequin/shared/anim/walk_torch.glb");
  walkClip = loaded[0];
}

let activeAction: AnimationAction | undefined;

function play(clip: AnimationClip, fadeSec: number = 0.25): void {
  const next = mixer.clipAction(clip);
  if (activeAction && activeAction !== next) {
    activeAction.crossFadeTo(next, fadeSec, true);
  }
  next.play();
  activeAction = next;
}
```

---

## 🍳 Rezept 6: Dateistruktur & Namenskonventionen

Strikte Trennung nach **Figuren-Ordnern** statt nach Asset-Typen:

```text
public/assets/<app>/mannequin/
├── novotny-male/
│   └── character.glb                 # Geriggtes Laufzeit-Modell (inkl. Textur)
├── novotny-female/
│   └── character.glb
└── shared/
    └── anim/                         # Figurenübergreifende Mocap-Clips
        ├── idle_torch.glb
        ├── walk_torch.glb
        └── ascending_stairs.glb

src/apps/<app>/raw/mannequin/
├── novotny-male/                     # .gitkeep, DCC-Quellen, task.json
├── novotny-female/
├── spacegirl/                        # Konzeptbilder & Model-Sheets
└── shared/                           # Original .fbx Mocap-Dateien
```
*Regel:* Dateinamen wiederholen den Figurennamen **nicht** im Dateinamen (`character.glb`, nicht `novotny-male.glb`).

---

## 🛠️ Rezept 7: Troubleshooting Runbook

| Symptom | Ursache | Sofort-Lösung |
| :--- | :--- | :--- |
| **Figur winzig / Puppenhaltung** | `StageMovementBehavior` hat die 1.8er Skalierung überschrieben. | Charakter in `_characterRig` (`Object3D`) einbetten und Behavior auf das Rig setzen. |
| **Laterne schwebt waagerecht** | Hand-Bone hat $X$-Achse Richtung Boden, Laterne fehlt Ausrichtungs-Offset. | Socket mit `position.set(0.01, 0.09, 0.02)` und `rotation.set(0, 0, Math.PI / 2)` versehen. |
| **Gliedmaßen reißen beim Gehen ab** | Rig hat Twist-Hilfsknochen, die im Motion-Clip fehlen und einfrieren. | Mixamo-Standard-Rig nutzen oder Tripo-Retarget direkt gegen das native Tripo-Rig fahren. |
| **Körperteile bewegen sich nicht / verzerren** | Skelett überschreitet das 64-Bone-Limit des WebGL2-Shaders (`u_boneMatrices[64]`). | Rig auf $\le 64$ Bones reduzieren (Spring-Bones auf übergeordnete Joints binden). |
| **Figur ist komplett pechschwarz** | Tripo exportiert PBR mit `metallic: 1.0` ohne passendes IBL/HDRI. | Im `GltfLoader` `clampMetallic: 0.2` setzen oder auf `BasicMaterial` mit `diffuseMap` umstellen. |
| **Turnaround hat Flecken / Schatten** | Konzeptbild hatte gebackenes Chiaroscuro-Licht. | Prompt mit *„Pure unshaded flat Albedo diffuse, zero shadows, pure white background“* re-generieren. |

---

## ✅ Quality Gate Checkliste (Vor Release abhaken)

- [ ] **Albedo:** Textur ist schattenfrei und neutral ausgeleuchtet.
- [ ] **Budget:** Mesh $\le 25.000$ Triangles, Texturatlas $\le 2048\times 2048$ (2K).
- [ ] **Rig:** Entweder sauberes Mixamo-Rig oder Tripo-Rig auf $\le 64$ Bones gestutzt.
- [ ] **Motion:** Locomotion-Clips laufen **In-Place** (`--animate-in-place`).
- [ ] **Props:** Ausrüstung sitzt stabil im Hand-Socket ohne Taumeln.
- [ ] **Skalierung:** 1.80m Human Scale ist über `_characterRig` gekapselt.
- [ ] **Pfade:** Runtime unter `public/assets/`, DCC-Quellen unter `src/apps/<app>/raw/`.

