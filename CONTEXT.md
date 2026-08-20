# Small World Core Context

The foundational domain model for the Small World 3D engine. It defines the core architectural concepts for the hybrid WebGL/WebGPU rendering and entity logic system.

## Language

**Behavior**:
An attachable logic component for entities (e.g., Cameras, Meshes) that encapsulates specific functionality or interaction rules.
_Avoid_: Script, Controller (as a standalone manager array)

**Broadphase / Narrowphase**:
Broadphase is the cheap, approximate spatial pass (an Octree query) that narrows a large candidate set down to a few; Narrowphase is the exact, expensive test run only on that narrowed set (e.g. ray-triangle intersection, collision resolution).
_Avoid_: Coarse/Fine pass — this project's docs consistently say Broadphase/Narrowphase across both the physics and interaction systems, the same two-stage principle reused deliberately in both places.

**Camera Strategy**:
The pattern (e.g. STIFF, SMOOTH, FPS, ISOMETRIC) that governs how a camera's transform updates each frame.
_Avoid_: Controller — a Controller is a Behavior that drives input; Strategy is the update math itself, a different layer on the same camera.

**Cluster**:
A single cell of the 3D frustum-aligned grid used to narrow which lights a fragment needs to evaluate, instead of testing every light in the scene.
_Avoid_: Tile (tiled forward+ is a 2D-only variant of this idea that we don't use — our grid is depth-sliced), Cell (used informally in code, but "Cluster" is the term that carries architectural weight across docs/ADRs). Deliberately does NOT claim "Froxel" either, even though the underlying grid math is the same kind of structure — Froxel is reserved for the not-yet-built volumetric fog subsystem, which will reuse this grid but is a distinct future consumer, not another name for the same concept.

**Clustered/Tiled Forward+ Lighting**:
The overall technique: culling lights per Cluster so each fragment only evaluates the lights in its own cell's Per-Cell Light List, instead of testing every light in the scene.
_Avoid_: Deferred Lighting — a different, unrelated technique (separates a geometry pass from a lighting pass) that's easy to conflate with this one since both exist to cut per-fragment light cost.

**Context Object**:
An explicit dependency container passed through constructors or lifecycle methods to avoid global state.
_Avoid_: Global Singleton, Universal EventBus

**Culling**:
Cheaply discarding candidates before expensive work runs on the survivors. This engine has two unrelated cullings — visibility culling (`FrustumCuller`, discards whole objects) and light culling (builds a Cluster's Per-Cell Light List, discards lights) — always name which one is meant.
_Avoid_: using "culling" bare when the subsystem isn't already obvious from context — say "visibility culling" or "light culling".

**Event Bus**:
The typed, per-`SmallWorld`-instance event dispatcher (`app.events`) that replaces DOM `CustomEvent` for engine-internal notifications.
_Avoid_: Global Event Bus, Universal EventBus — rejected under Context Object; this bus is scoped to one engine instance, never a shared global.

**Forge / ForgeTool**:
Forge is the dockable window-manager overlay; a ForgeTool is a single mini-app hosted inside it (e.g. Gadget Inspector, Pixler, Material Studio).
_Avoid_: Panel, Plugin — Tool names a specific contract (the `ForgeTool` class), not a generic panel.

**Light Coverage**:
The range of Clusters — a screen-space X/Y range plus a depth-slice range — that a single light's bounding sphere can possibly reach.
_Avoid_: Light Bounds, Footprint

**Material**:
A rendering definition that encapsulates both the visual properties (e.g., color, shininess) and the underlying shader logic for WebGL/WebGPU.
_Avoid_: Shader Program (Material is the higher-level abstraction)

**MathPool**:
The shared pool of scratch vectors/matrices that hot-path code borrows from and returns, instead of allocating its own.
_Avoid_: Temp Vector, Scratch Buffer — informal; MathPool is the one canonical, engine-wide facility for this.

**Per-Cell Light List**:
The stored data a Cluster reads at lookup time: an offset+count into a flat list of light indices. The read-side counterpart to Light Coverage, which is the write-side view (from a light's perspective, which cells it reaches).
_Avoid_: Light Grid (ambiguous with "Cluster grid", the whole 3D structure, rather than one cell's list)

**Scene Graph**:
The hierarchical tree of 3D objects that defines spatial relationships, transformations, and rendering order.
_Avoid_: World Map, Entity List

**State Data**:
The user-defined payload object passed into a Finite State Machine's `onEnter`/`onUpdate`/`onExit` callbacks.
_Avoid_: Context, FSM Context — collides with Context Object, an unrelated DI concept; "State" is already the FSM's node/mode (`idle`, `patrolling`, ...), so State Data is deliberately a third, distinct word rather than overloading either.

**Zero-Allocation (Hot Path)**:
The design rule that per-frame code (physics step, event dispatch, FSM update) must not allocate new objects, so it never triggers a GC pause.
_Avoid_: Performance Optimization (generic) — this is a specific, named commitment repeated verbatim across the physics, event bus, and FSM docs, not a vague performance goal.
