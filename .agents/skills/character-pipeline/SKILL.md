---
name: character-pipeline
description: End-to-end workflow from 2D concept sketch to game-ready, rigged 3D character in Small World.
---

# 2D to 3D Character Pipeline Guide

This skill documents the complete, reproducible pipeline for turning a 2D concept sketch into a fully rigged, animated, game-ready 3D character integrated into the Small World Engine.

---

## Pipeline Overview

```
[ 1. 2D Concept, 3-in-1 Albedo Model-Sheet / Turnarounds (A-Pose / T-Pose) ]
                                 │
                                 ▼
[ 2. Tripo3D Mesh & Texture Generation (`tripo make --for game-mobile`) ]
                                 │
                                 ▼
[ 3. Tripo3D Skeletal Auto-Rigging & Retargeting (`tripo anim rig --spec mixamo`, `tripo anim retarget`) ]
                                 │
                                 ▼
[ 4. Direct glTF (.glb) Export, Shared Animation Library & Asset Separation ]
                                 │
                                 ▼
[ 5. Small World Engine Ingestion, Semantic Sockets, Animation Mixer & Shading ]
```

---

## Step 1: 2D Concept, 3-in-1 Model-Sheet & Turnarounds

### 1. Silhouette, Style & Albedo-First Mandate:
- **Art Style:** Define distinctive silhouette (coat, hats, accessories, proportions) and style (e.g. Graphic Noir, Stylized Ink, PBR).
- **Albedo-First Prompting (Crucial 3D Rule):**
  - **Never bake directional shadows or lighting into the 2D turnaround.**
  - Turnaround prompts must explicitly demand:
    > *„Pure unshaded flat Albedo diffuse reference, neutral diffuse color map, perfectly even flat ambient studio lighting, ZERO cast shadows, ZERO highlights, solid pure white background.“*
  - *Rationale:* Small World's real-time lighting (`PointLight`, `DirectionalLight`, `OutlineElement`) dynamically renders shading and comic ink contours at runtime. Baked shadows look unnatural when the character rotates.

### 2. Posen-Architektur: A-Pose (45°) vs. T-Pose (90°):
- **A-Pose (Recommended Studio Standard):**
  - Arms angled ~45° downwards from the torso, hands relaxed with palms facing inwards/downwards.
  - *Advantage:* Minimal deltoid muscle distortion and clean, pinch-free armpit edge loops when transitioning to *Idle* and *Locomotion*.
- **T-Pose (Strict Orthographic Alternative):**
  - Arms strictly horizontal at 90°.

### 3. 3-in-1 Model-Sheet Workflow (Consistency Standard):
- **Single 16:9 Reference Generation:** Generate a single composite image showing Front, Right Profile, and Back side-by-side in identical scale (e.g. [`novotny_hoodie_model_sheet.jpg`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/docs/assets/novotny_hoodie_model_sheet.jpg)). This guarantees 100% feature and proportion parity across views.

### 4. Orthographic Turnaround Constraints:
- **FRONT View (Strict Bilateral CAD-Symmetry):**
  - **Arms:** Symmetrical 90° T-Pose or 45° A-Pose, both hands empty.
  - **Gaze:** Level head, eyes looking straight ahead (0° tilt/rotation).
  - **Legs & Stance:** Mirror-symmetrical slight neutral A-stance (50/50 weight distribution, no lunge, no step forward).
  - **Feet & Boots:** Pointing **dead-straight forward** (0° outward rotation, parallel like tracks).
  - **Face & Gear:** Face and hair visible (hood down on shoulders, loop scarf worn loose around neck as collar).
  - **Background:** Solid pure white (`#FFFFFF`) with zero ground shadows.
- **RIGHT Profile View:**
  - Strict **90° side profile** facing screen-right.
  - **Arms hanging straight down along the torso** so as not to occlude the profile silhouette.
- **BACK View:**
  - Exact mirror of Front view with matching arm angle, stance, and parallel heels.

---

## Step 2: Tripo3D Mesh & Texture Generation

Tripo3D generates watertight 3D models with UVs and PBR textures directly from prompts or orthographic images via `tripo-cli`.

1. **Generation via CLI:**
   - **Multi-View Orthographics (Recommended for Characters):**
     ```bash
     tripo make front.png right.png back.png --for game-mobile --json --yes
     ```
   - **Single Image / Model-Sheet:**
     ```bash
     tripo make concept.png --for game-mobile --json --yes
     ```
   - **Text Prompt:**
     ```bash
     tripo make "post-apocalyptic bunker explorer, heavy trenchcoat, gas mask, T-pose" --for game-mobile --json --yes
     ```

2. **Mandatory Web Performance & Parameter Rules:**
   - **Preset:** Always use `--for game-mobile` or `--for ar-web` to enforce optimized game-ready topology with clean quad/tri edge loops.
   - **Polycount Budget:** Default to `--param face_limit=15000` (target 10k–25k triangles max for 60fps real-time web rendering).
   - **Texture Resolution (Strict Rule: NO 4K/8K):**
     - Target **2K (2048x2048)** or `--param texture_quality=standard`.
     - *Why no 4K/8K?* 4K/8K textures blow up VRAM, slow initial download times over HTTP, and exceed hardware limits (`MAX_TEXTURE_IMAGE_UNITS`, `MAX_TEXTURE_SIZE`) on mobile devices and Apple Silicon integrated GPUs.
   - **UV Packing:** Always enabled (single consolidated texture atlas per character).
   - **Coordinate Frame:** Up = +Y, Forward = -Z.
   - **Metric Normalization Scale:** Tripo normalizes models to a 1.0-meter bounding box. In Small World, scale human characters by `1.8` (`obj.scale.set(1.8, 1.8, 1.8)`) to match the canonical 1.80m character scale.

---

## Step 3: Tripo3D Skeletal Auto-Rigging & Animation

Tripo3D provides API endpoints for automated biped rigging (compatible with the standard Mixamo skeleton hierarchy) and locomotion retargeting.

1. **Auto-Rigging (`tripo anim rig`):**
   ```bash
   # Rig model with standard Mixamo bone naming (mixamorig:*)
   tripo anim rig character.glb --spec mixamo --out-format glb -o ./tripo-out/rigged --json --yes
   ```
   - `--spec mixamo`: Ensures bone names match standard Small World conventions (`mixamorig:Hips`, `mixamorig:LeftHand`, etc.).
   - `--out-format glb`: Produces a ready-to-use binary glTF file.

2. **Locomotion Clip Retargeting (`tripo anim retarget`):**
   ```bash
   # Generate in-place walk animation clip
   tripo anim retarget ./tripo-out/rigged/character.glb --animation preset:walk --animate-in-place --out-format glb -o ./tripo-out/walk --json --yes

   # Generate in-place run animation clip
   tripo anim retarget ./tripo-out/rigged/character.glb --animation preset:run --animate-in-place --out-format glb -o ./tripo-out/run --json --yes
   ```
   - `--animate-in-place`: Strips root motion translation so Small World behaviors (`StageMovementBehavior`, `FPSController`) maintain full positional authority.

3. **End-to-End Chained One-Liner (Alternative):**
   ```bash
   tripo make front.png right.png back.png --for game-mobile --then rig:spec=mixamo,retarget:animation=preset:walk:animate-in-place --json --yes
   ```

*(Fallback: [Adobe Mixamo Web](https://www.mixamo.com/) can still be used manually if custom non-preset motion clips are required).*

---

## Step 4: Asset Organization & Shared Motion Library

Because Tripo3D exports binary glTF (`.glb`) natively, intermediate `FBX2glTF` conversions are no longer required for generated assets.

1. **Strict Small World Asset Separation:**
   - **🌐 App Runtime Assets (`public/assets/<app>/mannequin/`):**
     - ONLY files loaded via HTTP by the engine at runtime:
       - `character.glb` (base model or rigged character)
       - `character_diffuse.png` (if texture is separated)
   - **🌐 Shared Motion Library (`public/assets/shared/animations/`):**
     - Shared Mixamo/Tripo in-place animation clips usable by all humanoid characters:
       - `humanoid_idle.glb`
       - `humanoid_walk.glb`
       - `humanoid_stairs.glb`
       - `humanoid_run.glb`
   - **🛠️ Raw / DCC Authoring Assets (`src/apps/<app>/raw/mannequin/`):**
     - `task.json`, `preview.png`, prompt notes, source orthographics, `.fbx`, `.obj`, `.blend` files.

---

## Step 5: Small World Engine Integration

### 1. Loading Character, Scaling & Material Setup

```typescript
import { GltfLoader } from "../../src/loaders/GltfLoader.js";
import { BasicMaterial, Color, Texture, Object3D } from "../../src/index.js";

const gltfLoader = new GltfLoader();
const character = await gltfLoader.load("/assets/and-now/mannequin/novotny-male.glb");

// Scale normalized 1.0m Tripo model to standard human height (1.80m)
character.scale.set(1.8, 1.8, 1.8);

// Apply Graphic Noir unlit material or preserve embedded PBR texture
const applyMaterial = (obj: Object3D): void => {
  if (obj.material) {
    const bMat = new BasicMaterial({ color: new Color(1, 1, 1) });
    if (obj.material.diffuseMap) {
      bMat.diffuseMap = obj.material.diffuseMap;
    }
    obj.material = bMat;
  }
  for (const child of obj.children) {
    applyMaterial(child);
  }
};
applyMaterial(character);
scene.add(character);
```

### 2. Semantic Socket & Prop Attachment (e.g. Lantern, Weapon)

```typescript
// Resolve hand bone across different rig conventions (Mixamo, Tripo, DCC)
const HAND_BONE_CANDIDATES = [
  "mixamorig:LeftHand",
  "mixamorig1:LeftHand",
  "L_Hand",
  "tripo::0_Left_Limb_2",
  "tripo::0_Left_Limb_3",
];

let handBone: Object3D | undefined;
for (const name of HAND_BONE_CANDIDATES) {
  const found = character.getObjectByName(name);
  if (found) {
    handBone = found;
    break;
  }
}

if (handBone) {
  const propGroup = new Object3D("Lantern");
  propGroup.position.set(0.01, 0.09, 0.02);
  propGroup.rotation.set(0, 0, Math.PI / 2);
  propGroup.add(lanternMesh);
  propGroup.add(pointLight);
  handBone.add(propGroup);
}
```

### 3. Animation Mixer & State Machine Coupling

```typescript
import { AnimationMixer, AnimationClip, AnimationAction } from "../../src/index.js";

const mixer = new AnimationMixer(character);
const clips = new Map<string, AnimationClip>();

const idleClips = await gltfLoader.loadAnimations("/assets/and-now/mannequin/idle_torch.glb");
if (idleClips[0]) clips.set("idle", idleClips[0]);

const walkClips = await gltfLoader.loadAnimations("/assets/and-now/mannequin/standing_torch_walk_forward.glb");
if (walkClips[0]) clips.set("walk", walkClips[0]);

let activeAction: AnimationAction | undefined;

function playAnimation(name: string, fadeSeconds: number = 0.25): void {
  const clip = clips.get(name);
  if (!clip) return;

  const newAction = mixer.clipAction(clip);
  if (activeAction && activeAction !== newAction) {
    activeAction.crossFadeTo(newAction, fadeSeconds, true);
  }
  newAction.play();
  activeAction = newAction;
}

playAnimation("idle", 0);
```

---

## Verification & Debugging Checklist

- [ ] Character is visible and scaled to ~1.80m (`scale.set(1.8, 1.8, 1.8)`).
- [ ] Diffuse texture uses pure Albedo maps (zero baked shadows; lighting calculated in real time).
- [ ] Textures strictly adhere to 2K budget (NO 4K/8K) to safeguard browser VRAM.
- [ ] Mesh triangle budget is within 10k–25k triangles (`--for game-mobile`).
- [ ] Skeletal rig binds cleanly with Mixamo bone conventions (`--spec mixamo`).
- [ ] Locomotion clips use `In Place` (`--animate-in-place`) so movement behaviors retain positional authority.
- [ ] Props attach cleanly to semantic hand bones and follow character motion without jitter.
- [ ] Inspector (`Cmd+Option+G`) allows live tuning with `Object Axes`.
- [ ] Runtime assets strictly in `public/assets/`, raw files strictly in `src/apps/<app>/raw/`.
