# Maker (World & Scene Editor) — Pro-User Guide & Reference

**Maker** is Small World's standalone, in-browser 3D scene and environment editor (`/tools/maker.html`). Tailored specifically for digital artists and power-users, Maker bridges the gap between procedural engine development and visual scene composition, eliminating the need for hand-coded scene layout files while delivering a zero-latency, keyboard-driven workflow.

```
+-------------------------------------------------------------------------------------------------------+
|  Header: [Maker - Small World]   [📷1][📷2]..[📷9]   [🧲 0.50m][[][]]   [⬇ Ground]   [Save / Status]    |
+-------------------+---------------------------------------------------------------+-------------------+
| Hierarchy & Add   | Viewport & Interactive Tools                                  | Inspector         |
| - Scene Tree      | - Orbit Camera & 9 Fast View Bookmarks (1-9 / Ctrl+1-9)       | - Transform       |
| - Primitives      | - Always-on-Top Transform Gizmo (W: Move / E: Rotate / R: Sc) |   (X/Y/Z Nudge)   |
| - Lights          | - Camera-Cardinal Keyboard Nudging (Arrows / PgUp / PgDn)     | - Materials (PBR) |
| - Prefabs (Thumb) | - Dynamic Snapping (0.1m - 2.0m / 15° / 0.25)                 |   (Rough/Metal/α) |
| - ASCII Map Impt  | - 2D Marquee Box Selection & Cyan/Amber Cluster Highlights   | - Behaviors       |
|                   | - Pivot-Relative Multi-Object Group Transforms                |   (Factory Batch) |
+-------------------+---------------------------------------------------------------+-------------------+
| Footer: Autosave Status (All changes saved to scene.gltf / 500ms debounce)                            |
+-------------------------------------------------------------------------------------------------------+
```

---

## 1. Power-User Ergonomics & High-Speed Keyboard Nudging

Maker is built around a "hands-on-keyboard" philosophy, heavily inspired by professional digital art and 3D modeling packages (Blender, Photoshop, Unreal Engine).

### Camera-Cardinal Directional Nudging
Moving objects via arrow keys is **camera-perspective-aware**:
- **XZ-Plane Ground Movement:** Pressing $\uparrow$, $\downarrow$, $\leftarrow$, or $\rightarrow$ calculates the camera's dominant cardinal orientation in world space (North, East, South, West) in real time. 
  - $\uparrow$ always nudges the selection **away from the viewer** (into the screen depth).
  - $\downarrow$ always nudges the selection **towards the viewer**.
  - $\rightarrow$ always nudges the selection **to the visual right**.
  - $\leftarrow$ always nudges the selection **to the visual left**.
- **Elevation / Height Movement (Y-Axis):**
  - `Shift` + $\uparrow$ or `PageUp`: Moves selected objects **Up (+Y)** by the active grid snap increment.
  - `Shift` + $\downarrow$ or `PageDown`: Moves selected objects **Down (-Y)** by the active grid snap increment.

### Modal Transformation Hotkeys
The arrow keys adapt dynamically to the active gizmo mode or keyboard modifier:
| Mode / Modifier | Arrow Keys Action | Step Size |
|---|---|---|
| **Move Mode (<kbd>W</kbd>)** (Default) | Nudge Position (XZ / Y with Shift) | Current Grid Snap (`0.1m` – `2.0m`) |
| **Rotate Mode (<kbd>E</kbd>)** or <kbd>Alt + Arrows</kbd> | Rotate around Yaw (Y) / Pitch (X) | Angle Snap ($15^\circ$ / $\pi / 12$) |
| **Scale Mode (<kbd>R</kbd>)** or <kbd>Alt + Shift + Arrows</kbd> | Scale Object (Uniform / Axis) | Scale Snap ($0.25$) |

### Snap to Ground (<kbd>End</kbd> / `⬇ Ground`)
Pressing <kbd>End</kbd> (or clicking `⬇ Ground`) calculates the exact world-space bounding box lower bound (`min.y`) for the entire current selection (single object or multi-selection cluster) and translates it vertically so the bottom edge sits perfectly flush at `Y = 0` (the world floor plane).

---

## 2. Dynamic Snapping System & Grid Resolution Stepping

Snapping in Maker is **enabled by default** to ensure clean modular scene assembly without microscopic gaps or misalignments.

- **Instant Toggle:** Press <kbd>X</kbd> or click `🧲 Snap` to toggle snapping on/off on the fly.
- **Fast Grid Stepping Hotkeys:**
  - <kbd>[</kbd> : **Finer Grid** — steps down through resolutions (`2.0m` $\rightarrow$ `1.0m` $\rightarrow$ `0.5m` $\rightarrow$ `0.25m` $\rightarrow$ `0.1m`).
  - <kbd>]</kbd> : **Coarser Grid** — steps up through resolutions (`0.1m` $\rightarrow$ `0.25m` $\rightarrow$ `0.5m` $\rightarrow$ `1.0m` $\rightarrow$ `2.0m`).
- **Precision Parameters:**
  - **Translation Snap:** Default `0.5m` (adjustable from `0.1m` to `2.0m`).
  - **Rotation Snap:** Fixed $15^\circ$ ($0.2618\text{ rad}$) angular quantization.
  - **Scale Snap:** Fixed `0.25` step multipliers.

---

## 3. Multi-Selection, Marquee Box & Pivot-Relative Clusters

Maker supports complete multi-object workflows with full parity across viewport and hierarchy interactions.

```
                    [Primary: Cyan Wireframe] (Active Inspector & Pivot Anchor)
                              |
                              +--- [Secondary: Amber Wireframe]
                              +--- [Secondary: Amber Wireframe]
```

### Selection Mechanics
- **Single Select:** Left-click an object in the viewport or click a row in the Hierarchy panel.
- **Additive Multi-Select:** Hold <kbd>Shift</kbd>, <kbd>Ctrl</kbd>, or <kbd>Cmd</kbd> while clicking objects in the viewport or rows in the Hierarchy panel to add/remove them from the selection set.
- **2D Marquee Box Selection:** Click and drag across any empty region of the viewport to draw a 2D selection rectangle (`.maker-marquee-box`). Maker projects all scene object bounding volumes into screen space using the camera's view-projection matrix to select everything inside the rectangle. Hold <kbd>Shift</kbd> during marquee drag to additively expand the current selection.

### Primary vs. Secondary Objects
- **Primary Object (Cyan Highlight):** The main anchor of the selection. It dictates what appears in the Property Inspector and serves as the 3D center pivot for gizmo transformations.
- **Secondary Objects (Amber Highlight):** Additional members of the multi-selection cluster.

### Pivot-Relative Cluster Transformations
When rotating or scaling a multi-selection with the Gizmo, transformations are performed **relative to the Primary object's world-space pivot point**, keeping the spatial relationship of the cluster intact rather than spinning each object on its own local axis.

### Batch Operations
- **Batch Duplicate (<kbd>Ctrl+D</kbd>):** Deep-clones all selected objects, material properties, and attached behaviors, offsetting them cleanly into the scene under a single Undo transaction.
- **Batch Delete (<kbd>Delete</kbd> / <kbd>Backspace</kbd>):** Moves all selected objects to the soft-delete trash bin in one reversible step.
- **Batch Grouping (<kbd>Ctrl+G</kbd>):** Computes the 3D centroid of all selected objects, creates a new parent `Object3D` group at that centroid, and reparents the children while preserving their exact world matrices.
- **Batch Behaviors:** Adding a behavior from the palette automatically instantiates and attaches fresh, isolated behavior instances to all selected objects in one atomic operation.

---

## 4. Always-on-Top Transform Gizmo

The Maker transform gizmo provides standard **Translation** (<kbd>W</kbd>), **Rotation** (<kbd>E</kbd>), and **Scale** (<kbd>R</kbd>) manipulation directly in the 3D viewport.

- **Occlusion-Proof Rendering:** Rendered with `depthTest: false` and `depthWrite: false`, ensuring transform handles, rotation rings, and scale boxes remain fully visible even when objects are positioned inside dense geometry or behind large meshes.
- **Interactive Highlighting:** Handles highlight when hovered and lock to active drag axes.
- **Dynamic Orientation:** Stays anchored to the primary selected object's world position.

---

## 5. Prefab Pipeline & Isolated 3D Thumbnail Renders

Maker provides a complete, self-contained Prefab authoring and stamping pipeline.

```
[Hierarchy Selection] ---> [Save Prefab] ---> 1. Isolate Object Subtree
                                               2. Reframe 3/4 Camera Angle
                                               3. Render Isolated Thumbnail (.thumb.json)
                                               4. Save glTF Scene Graph (.gltf)
```

1. **Creating Prefabs:** Select any object or grouped hierarchy in the scene, enter a prefab name in the Prefab Palette, and click **Save Selection**.
2. **Automated Isolated Thumbnail Generation:**
   - Maker temporarily hides the transform gizmo, highlight boxes, and all unrelated scene objects while preserving scene lighting (`AbstractLight`).
   - Recursively computes the subtree bounding sphere of the prefab.
   - Automatically positions the snapshot camera at an optimal $3/4$ isometric perspective `(1, 0.75, 1)` framed tightly around the object.
   - Captures an offscreen render into a sidecar thumbnail (`prefabs/<name>.thumb.json`).
   - Fully restores the viewport camera, orbit controller state, and scene visibility without interrupting the user.
3. **Prefab Stamping:** Click any prefab thumbnail or name in the Prefab Palette to stamp a fresh instance directly into the scene at the viewport focus center.

---

## 6. Camera Bookmarks & Viewport Navigation

### 9 Instant Session Bookmarks (<kbd>1</kbd>–<kbd>9</kbd> & <kbd>Ctrl+1</kbd>–<kbd>9</kbd>)
- **Recall View:** Press number keys <kbd>1</kbd> through <kbd>9</kbd> (or click toolbar buttons `📷1`–`📷9`) to immediately animate the camera back to a saved vantage point.
- **Store View:** Press <kbd>Ctrl+1</kbd> through <kbd>Ctrl+9</kbd> (or **Right-Click** any bookmark button `📷1`–`📷9`) to store the current camera position, pitch, yaw, and orbit target into that slot. Slots with saved views are highlighted with an active border.

### Multi-Button Orbit & Pan Navigation
- **Orbit View:** Right-Click + Drag, Middle-Click + Drag, <kbd>Alt</kbd> + Left Drag, or macOS <kbd>Ctrl</kbd> + Left Drag.
- **Pan View:** <kbd>Shift</kbd> + Right/Middle Drag.
- **Zoom View:** Mouse Wheel or <kbd>Ctrl</kbd> + Mouse Wheel.
- **Scroll-Zoom Decoupling:** Scrolling inside the Hierarchy, Object Palette, or Property Inspector is strictly isolated (`stopPropagation()`), preventing unintentional viewport zooming while navigating long UI lists.

---

## 7. ASCII Level & Dungeon Map Import

Maker includes a built-in ASCII tilemap converter (`MapImportPanel.ts`) for rapid retro-style level design and dungeon blocking.

```
ASCII Source:             3D World Generation:
############              #  -> Modular Wall Prefabs (Height: 2m)
#.@...T...D#              .  -> Floor Tiles
#..PP......#              D  -> Doorway Prefabs / Portals
############              T  -> Torch / Point Light with Ambient Glow
                          P  -> Structural Pillar Prefabs
                          @  -> Player Start Spawn Point
```

Paste your text layout into the ASCII Import dialog to instantly generate a 3D level with aligned modular walls, floor tiles, pillars, lights, and spawn markers.

---

## 8. Persistence & glTF 2.0 `SW_*` Extension Engine

Maker utilizes the browser's native **File System Access API** (`showDirectoryPicker`) for direct local workspace binding without uploading data to external servers.

- **Zero-Friction Autosave:** Every edit (transform change, color tweak, hierarchy reorder, prefab creation) triggers a debounced (~500ms) write-through directly to `scene.gltf`.
- **`SW_*` glTF Metadata Extensions:** Non-standard engine data is cleanly stored inside the glTF 2.0 vendor `extras` / `extensions` namespace:
  - `SW_behaviors`: Serialized array of attached behaviors and their configured parameters.
  - `SW_physics`: Rigid body types, collider dimensions, mass, restitution, and friction.
  - `SW_material`: Custom shader properties, roughness, metallic, emissive, and alpha-test thresholds.
- **Portability:** Generated `scene.gltf` files can be directly opened in Blender, Babylon.js, Three.js, or loaded directly into Small World game runtime loops via `GltfLoader`.

---

## 9. Non-Destructive Undo/Redo & Soft-Delete Engine

All scene mutations are tracked on an atomic `UndoStack`:
- **Undo / Redo:** <kbd>Ctrl+Z</kbd> to undo, <kbd>Ctrl+Shift+Z</kbd> (or <kbd>Ctrl+Y</kbd>) to redo.
- **Soft-Delete Architecture:** Deleting an object or hierarchy branch moves it into an off-scene `_trashBin` container rather than disposing its WebGL/WebGPU buffers immediately. This guarantees instantaneous, glitch-free restoration on Undo without GPU stutter.

---

## 10. Master Keyboard Shortcuts Quick Reference

| Category | Shortcut | Action |
|---|---|---|
| **Tools & Modes** | <kbd>W</kbd> | Move / Translate Tool |
| | <kbd>E</kbd> | Rotate Tool |
| | <kbd>R</kbd> | Scale Tool |
| | <kbd>X</kbd> | Toggle Snapping On / Off |
| | <kbd>[</kbd> | Decrease Grid Snap Step (Finer: $0.1\text{m}$) |
| | <kbd>]</kbd> | Increase Grid Snap Step (Coarser: $2.0\text{m}$) |
| **Transform & Nudge** | $\leftarrow$ $\rightarrow$ $\uparrow$ $\downarrow$ | Nudge Selection along Camera-Cardinal XZ Plane |
| | <kbd>Shift</kbd> + $\uparrow$ / $\downarrow$ or <kbd>PgUp</kbd> / <kbd>PgDn</kbd> | Nudge Selection along Y Axis (Height) |
| | <kbd>Alt</kbd> + Arrows | Rotate Selection by Angle Snap ($15^\circ$) |
| | <kbd>Alt</kbd> + <kbd>Shift</kbd> + Arrows | Scale Selection by Scale Snap ($0.25$) |
| | <kbd>End</kbd> | **Snap to Ground:** Drop selection flush to $Y = 0$ floor |
| **Selection & Graph** | <kbd>Left Click</kbd> | Select Single Object |
| | <kbd>Shift</kbd> / <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + Click | Toggle / Additive Multi-Select |
| | <kbd>Empty Drag</kbd> | 2D Marquee Box Selection |
| | <kbd>Ctrl+F</kbd> / <kbd>Cmd+F</kbd> | **Focus Hierarchy Filter:** Live search & filter scene objects by name (<kbd>Enter</kbd> selects, <kbd>Esc</kbd> clears) |
| | <kbd>F2</kbd> / Hierarchy <kbd>Double-Click</kbd> | **Inline Rename Object:** Edit name in Hierarchy row (<kbd>Enter</kbd> commits, <kbd>Esc</kbd> cancels) |
| | Property Panel <kbd>Name Field</kbd> / Title <kbd>Double-Click</kbd> | **Direct Rename:** Edit object name at top of Property Inspector |
| | <kbd>Ctrl+D</kbd> | Duplicate Selection (Atomic Batch) |
| | <kbd>Ctrl+G</kbd> | Group Selection at Centroid |
| | <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete Selection |
| **History** | <kbd>Ctrl+Z</kbd> | Undo |
| | <kbd>Ctrl+Shift+Z</kbd> / <kbd>Ctrl+Y</kbd> | Redo |
| **Camera Bookmarks** | <kbd>1</kbd> – <kbd>9</kbd> | Recall Camera Bookmark 1–9 |
| | <kbd>Ctrl+1</kbd> – <kbd>Ctrl+9</kbd> / Right-Click Button | Save Camera Bookmark 1–9 |
| **Viewport Navigation** | <kbd>Right-Click Drag</kbd> / <kbd>Middle Drag</kbd> | Orbit View |
| | <kbd>Alt</kbd> + Left Drag / macOS <kbd>Ctrl</kbd> + Left Drag | Orbit View (Artist Friendly) |
| | <kbd>Shift</kbd> + Right/Middle Drag | Pan View |
| | <kbd>Mouse Wheel</kbd> | Zoom In / Out |

