# Character Pipeline Architecture & Mixamo Rigging Standard

## Context & Problem

Generating playable 3D characters from 2D concepts for the Small World Engine requires a reliable, multi-stage pipeline covering 2D turnarounds, 3D mesh generation, skeletal rigging, motion clips, and engine ingestion.

In early iterations, automated end-to-end rigging via Tripo3D (`tripo anim rig`) proved fundamentally flawed for production use:
1. **Bone Explosion (>64 Bones):** Tripo native rigs generated 66–113 joints (due to uncontrolled dynamic spring bones for coat/hair folds). Small World's WebGL2 skinning shader allocates `u_boneMatrices[64]`. Joints with index $\ge 64$ failed to deform in the shader, causing frozen or severely distorted limbs.
2. **Inconsistent Hierarchies & Naming:** Even with `--spec mixamo`, Tripo produced non-standard joint names (`tripo::*`, `bone_N`) and disconnected bone hierarchies (e.g. limbs parented directly to root), breaking shared mocap clips.
3. **Twist Bone Disconnections:** Unanimated twist bones tore vertex loops during locomotion.

## Decision

We establish a strict division of responsibilities, tool boundaries, and file routing contracts for all humanoid characters:

1. **Tripo3D Scope (Geometry Only):** Tripo3D is strictly limited to 3D mesh and texture atlas generation (`tripo make front.jpg --for game-mobile --param face_limit=15000`). It is fed exclusively with an isolated, text-free frontal view (`front.jpg`) on pure white `#FFFFFF` background to avoid multi-character hallucinations. It is **never** used for skeletal rigging.
2. **Adobe Mixamo Standard (Exclusive Rigging & Auto-Packaging):** Adobe Mixamo is the **exclusive canonical rigging standard** for all playable humanoid figures.
   - *Automated Packaging:* To prevent Mixamo's *"unable to map your existing skeleton"* error (caused by FBX exporter root node metadata), the pipeline automatically converts `base_model.glb` into a clean static Wavefront OBJ (`model.obj` + `model.mtl` + `texture.jpg`) bundled in `<character>_mixamo.zip`.
   - *Rig Ingestion:* Uploading `<character>_mixamo.zip` guarantees clean mesh import and reliably triggers Mixamo's 5-point Auto-Rigger.
   - *Joint Limits:* Clean 52-joint (No Fingers) or 65-joint (Standard) biped hierarchy (`mixamorig:*`) fitting within GPU shader limits ($\le 64$ joints for 52-joint rigs).
3. **Strict File Routing & Handover Contract:**
   - **2D Concepts:** `src/apps/<app>/docs/assets/<character>/` & `raw/.../model_sheet.jpg` (Turnaround) + `raw/.../front.jpg` (Albedo Frontal Input).
   - **DCC/Raw Staging:** `src/apps/<app>/raw/mannequin/<character>/base_model.glb`, `<char>_mixamo.zip`, and `character_rigged.fbx`.
   - **Runtime Models:** `public/assets/<app>/mannequin/<character>/character.glb` (self-contained binary glTF with 2K texture atlas).
   - **Shared Mocap Pool:** `public/assets/<app>/mannequin/shared/anim/*.glb` (all clips in-place).
4. **Engine Ingestion Patterns:**
   - **Rig Wrapper:** The character root is scaled to standard human height (1.80m via `.scale.set(1.8, 1.8, 1.8)`) and wrapped in a parent `_characterRig` (`Object3D`). Movement behaviors (`StageMovementBehavior`) attach to `_characterRig` so perspective scaling does not overwrite local model height.
   - **Semantic Hand Sockets:** Standardized attachment to `mixamorig:LeftHand` (Lantern: local offset `(0.01, 0.06, 0.02)` and rotation `0`).
5. **Canonical Character Gear & Two-Belt Architecture:**
   - **Left-Hand Lantern:** The lantern is exclusively carried in the left hand (`mixamorig:LeftHand`), leaving the right hand unencumbered.
   - **Two-Belt System:**
     - *Belt 1 (Pants & Utility Belt):* Holds trousers, utility pouches, and the gas mask.
     - *Belt 2 (Holster Belt):* Carries a small-caliber pistol holster positioned **front-left** (cross-draw access).
   - **Dual-Filter Gas Mask:** Full-face protective respirator with twin cheek filters. Carried **front-right** on Belt 1 in exploration mode (State 1: BASE) or equipped covering the face (State 2: HAZARD).

## Consequences

- **Manual Step:** Rigging requires a one-time manual upload/marker-placement step in Adobe Mixamo Web UI by the developer.
- **Reliability:** Eliminates vertex tearing, mesh freezes, shader uniform overflows, and custom GLB binary patching.
- **Interchangeability:** All characters share the same animation pool and prop sockets without individual re-targeting or code branching.
