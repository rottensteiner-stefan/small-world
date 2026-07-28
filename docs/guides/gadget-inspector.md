# Gadget Inspector (Live Scene Debugging)

Tweaking a light's intensity or a material's roughness usually means editing code, saving, and waiting for the page to reload. **Gadget Inspector** is a Tweakpane-based overlay that lets you pick any object in a running scene and edit it live — transform, material, light, and behavior properties all update in real time, with zero rebuild.

It's the default tool the engine opens for you, and the one showcase authors are most likely to extend with their own controls.

## Enabling it

Gadget Inspector isn't something you construct yourself — set `enableInspector: true` on your `SmallWorld` config and the engine wires up a whole [Forge](/guides/forge) hub for you, with Gadget Inspector as the first docked window:

```typescript
import { SmallWorld } from "small-world";

class MyGame extends SmallWorld {
  constructor() {
    super({ enableInspector: true });
  }
}
```

Press **Ctrl+Alt+G** (or **Cmd+Alt+G** on macOS) to toggle the whole Forge overlay — this shows/hides Gadget Inspector along with any other dev tools the engine enabled alongside it (Map Generator, Pixler, Asset Extractor, Material Studio).

::: warning Not part of the published package yet
Like the rest of `src/tools/`, `GadgetInspector` isn't re-exported from the engine's root entry point and `small-world/tools` isn't a resolvable subpath yet. The `enableInspector` flag is the supported way to use it today; constructing it directly only works if you're building against the engine's own source tree.
:::

## What you get

Gadget Inspector opens as a tabbed panel with five pages:

- **🌍 Scene** — the per-object inspector (see below), plus any custom folders a showcase registers via `addSceneFolder()`.
- **🔍 Search** — type at least 3 characters to fuzzy-match object names across the whole scene graph; click a result to select and jump to the Scene tab. Truncates to 10 matches with an "...and N more" indicator.
- **📈 Stats & Diag** — live FPS, canvas resolution, total/visible object counts, and active renderer class name, plus a collapsed "Capabilities" folder dumping the device's `DeviceCaps` report (WebGL1/2, WebGPU support, max texture size/units, anisotropy, UBO size, MSAA, vertex/fragment uniform limits, float/compressed texture support).
- **⚙️ Renderer** — currently a single `disableTextures` toggle, and only if the active renderer exposes a `quality` object. There's no fog or post-processing panel here (yet) despite what you might expect from a "renderer settings" tab.
- **🔊 Audio** — four rotary knobs (Master/Music/SFX/Reverb) that drive `this.audio.setMasterVolume()` etc. on your `SmallWorld` instance via a `window` `CustomEvent` bridge — turning a knob really does change what you hear.

## Inspecting an object

Left-click any object in the canvas to select it — Gadget Inspector raycasts against every visible object in the scene (not routed through `InteractionManager`) and drops a cyan wireframe box around whatever it hits, which tracks the object every frame while selected.

The Scene tab then fills in with whichever of these apply to the selected object:

- **General Settings** — `isVisible`, `castShadow`, `receiveShadow`.
- **Hierarchy** — jump to the parent, or to any child, without leaving the panel.
- **Transform** — raw position/rotation/scale, all nine components.
- **Material** *(if the object has one)* — color pickers for diffuse/specular/emissive, plus whichever of `shininess`, `transparent`, `alphaTest`, `depthTest`/`depthWrite`, `wireframe`/`wireframeMode`, `opacity`, `emissiveIntensity`, `metalness`, and `roughness` actually exist on that material — the panel only shows fields the material really has.
- **Light Properties** *(if the object duck-types as a light)* — color, intensity, distance (updates the shadow camera live for spot/point lights), decay.
- **Behaviors** *(if any are attached)* — an `isActive` toggle per behavior, plus whatever fields that behavior class opts into inspecting (see below).

### Making your own behaviors inspectable

A `Behavior` subclass can declare a static `inspector` map to surface custom fields without Gadget Inspector needing to know anything about it in advance:

```typescript
class OrbitBehavior extends Behavior {
  static inspector = {
    speed: { type: "number", label: "Orbit Speed", min: 0, max: 10, step: 0.1 },
    axis: { type: "choice", label: "Axis", options: { X: "x", Y: "y", Z: "z" } },
  };

  public speed = 2;
  public axis: "x" | "y" | "z" = "y";
}
```

## Adding your own controls

Override `onInspectorReady(inspector)` in your `SmallWorld` subclass (or `AbstractShowcase`) to add scene-specific controls on top of the built-in tabs — this is the same hook Showcase 15 uses to expose a live ball-count slider:

```typescript
protected override onInspectorReady(inspector: GadgetInspector): void {
  const sceneFolder = inspector.addSceneFolder("Scene Controls");

  const params = { ballCount: this._activeBallCount, activeInstances: this._activeBallCount };

  const activeBinding = sceneFolder.addBinding(params, "activeInstances", {
    readonly: true,
    label: "Active Instances",
  });

  sceneFolder
    .addBinding(params, "ballCount", { label: "Ball Count", min: 0, max: 200, step: 1 })
    .on("change", (ev) => {
      this._activeBallCount = Math.round(ev.value);
      params.activeInstances = this._activeBallCount;
      activeBinding.refresh();
    });
}
```

`addSceneFolder()` returns a standard Tweakpane `FolderApi` — anything Tweakpane supports (`addBinding`, `addButton`, nested `addFolder`) works on it directly.

## Limitations

- **No persistence.** Selection, panel state, and camera position are all lost on reload — `getState()`/`setState()` are explicit no-op stubs today.
- **No export.** There's no way to dump the current scene/material/light settings back out as JSON or code — edits only ever apply live, in memory.
- **No undo/redo** for edited values.
- **No physics-body inspection** — rigid bodies and colliders aren't exposed, only transform/material/light/behavior properties.
- **No camera controls** — the camera reference passed in is only used to seed the picking raycaster.
- Object picking walks the entire scene graph on every click (and on every search keystroke), with no spatial index — fine for typical scene sizes, worth knowing before dropping it into something with thousands of objects.
