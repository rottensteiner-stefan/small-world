# Maker (World & Scene Editor)

**Maker** is Small World's standalone, in-browser 3D scene and environment editor (`/tools/maker.html`). It provides a persistent, full-featured composition pipeline for 3D worlds without requiring hand-authored TypeScript scene setup.

```
+-----------------------------------------------------------------------------------+
|  Header: [Maker - Small World]                                [Back to Engine]    |
+-------------------+-------------------------------------------+-------------------+
| Hierarchy & Add   | Viewport & View Tools                     | Inspector         |
| - Scene Tree      | - Orbit Camera & Bookmarks (1-9)          | - Transform       |
| - Primitives      | - Transform Gizmo (Move/Rotate/Scale)     | - Materials (PBR) |
| - Lights          | - Snapping (0.5m / 15° / 0.25)            | - Behaviors       |
| - Prefabs (Thumb) | - Multi-Selection & Marquee Box           |                   |
| - ASCII Map Impt  | - glTF 2.0 + SW_* Autosave                |                   |
+-------------------+-------------------------------------------+-------------------+
| Footer: Autosave Status (Saved / Unsaved changes...)                              |
+-----------------------------------------------------------------------------------+
```

## Key Features

1. **glTF 2.0 Persistence & Autosave:**
   - Saves entire scene graphs directly into standard glTF 2.0 format (`scene.gltf`) using the File System Access API.
   - Non-PBR metadata, behaviors, and parameters are cleanly preserved under the vendor-namespaced `SW_*` extension format.
   - Debounced autosave (~500ms write-through) — no modal save dialog required.

2. **Transform Gizmos & Snapping:**
   - Translate (**W**), Rotate (**E**), and Scale (**R**) handles.
   - Configurable grid and angle snapping (**X** / `🧲 Snap` button) for translation (0.5m), rotation (15°), and scale (0.25).
   - **Pivot-relative cluster transforms:** Multi-selection rotates and scales around the active primary object's pivot in 3D space.

3. **Multi-Selection & Selection Tools:**
   - Click to select, `Shift`/`Ctrl`/`Cmd` + Click to toggle selection.
   - **Marquee Selection:** Drag on empty viewport space to draw a 2D selection rectangle projecting 3D bounds to screen space.
   - Batch operations: Duplicate (**Ctrl+D**), Delete (**Delete/Backspace**), Group (**Ctrl+G**), and Batch Behavior attachments.

4. **Prefabs with Isolated 3D Previews:**
   - Save any selection or hierarchy branch as a reusable prefab.
   - Automatically generates isolated 3/4-view thumbnail renders framed directly around the prefab's subtree bounding volume.

5. **Camera Bookmarks & View Controls:**
   - 9 session camera bookmark slots (**1**-**9** to jump, **Ctrl+1**-**9** / Right-click to save view).
   - Orbit, pan, and zoom controls.

6. **Full Undo/Redo History:**
   - Every transform drag, addition, deletion, grouping, reparenting, and behavior edit is recorded on an `UndoStack` (**Ctrl+Z** / **Ctrl+Shift+Z**).
   - Soft-delete trash bin preserves GPU buffer allocations across undo cycles.
