# Material Studio (PBR Map Generator)

::: tip What this tool actually is
The name suggests a material *editor* — something that lets you tweak a `StandardMaterial`/`GlassMaterial` on a selected scene object, the way [Gadget Inspector](/guides/gadget-inspector) does. It isn't that. **Material Studio is a PBR texture-map generator**: you give it one diffuse image, and it derives a height, normal, specular, roughness, ambient-occlusion, and edge map from it using 2D image-processing heuristics — then lets you preview the result on a sample mesh in an isolated sandbox scene. It never touches your actual running game scene.
:::

## Enabling it

Set `enableInspector: true` on your `SmallWorld` config and Material Studio opens as one of the docked Forge windows:

```typescript
import { SmallWorld } from "small-world";

class MyGame extends SmallWorld {
  constructor() {
    super({ enableInspector: true });
  }
}
```

Press **Ctrl+Alt+G** (or **Cmd+Alt+G**) to show/hide the Forge overlay.

::: tip Standalone page
A close cousin lives at `/tools/pbr-gen.html` — it duplicates the same image-processing pipeline and UI inline (rather than importing the `MaterialStudio` class), reusing only the 3D-preview half (`MaterialStudioApp`) from the shared module. Treat it as a separately-maintained fork, not a thin wrapper.
:::

## Loading a source image

Drag-and-drop an image onto the dropzone, click it to open a file picker, or paste one directly (`Ctrl/Cmd+V`, while Material Studio is the topmost Forge window). PNG/JPG/WebP up to 8MB. If nothing is loaded, it defaults to a bundled rock texture — and falls back to a synthetic procedural noise texture if even that fails to fetch.

## Generating maps

A "Preset Profile" dropdown (Default, Stone, Metal, Wood) sets a starting point for seven groups of sliders, each tuning one derived map:

- **Height Map** — blur radius, contrast, invert.
- **Normal Map** — bump strength, OpenGL/DirectX format, invert red channel.
- **Specular Map** — sigmoidal contrast and midpoint threshold.
- **Roughness Map** — gamma exponent.
- **Ambient Occlusion** — soft-shadow blur, crevice strength, intensity.
- **Edge Map** — contrast threshold and thickness.
- **3D Preview** — metallic base and roughness override, which only affect the local preview, not any exported map.

Every slider change reprocesses the image immediately (with a short loading overlay). At higher "Working Max Resolution" settings (1024px or original size), this recalculation runs on the main thread and can noticeably stall the UI for a moment — the tradeoff for not shipping a worker-based pipeline.

::: warning These are fast approximations, not baked PBR maps
Normal maps come from a Sobel gradient over the height map's luminance, not a real high-to-low-poly bake. Ambient occlusion is a Laplacian-crevice-plus-blur heuristic, not ray-traced or SSAO. Specular/roughness are gamma/sigmoid curve transforms of the same height data. This is a genuinely useful quick-start for a plausible-looking material, not a physically accurate map baker — don't expect studio-grade output from a single diffuse photo.
:::

## Previewing and exporting

Switch tabs to view any individual map, the full grid of all seven, or a **"Small World Engine Preview"** — a live, auto-rotating Sphere/Cube/Torus/Plane rendered with your generated maps applied to a `StandardMaterial`, in Material Studio's own isolated preview scene (it has nothing to do with your game's actual scene or objects).

Export is PNG-only, no bundling:

- Click any single map's canvas, or its grid-view download icon, to save that one map as `<filename>_<maptype>.png`.
- **Download All Maps** triggers all six downloads (height/normal/specular/roughness/ao/edge) one after another — there's no zip bundling.

There's no material-JSON export and no way to apply the result back onto an object in your running scene — carrying the generated textures into your actual game is a manual step (load the downloaded PNGs the same way you'd load any other texture asset).

## Limitations

- **Only `StandardMaterial` is supported** — there's no material-type selector, and none of the engine's other material classes (Glass, Terrain, Phong, custom shaders, etc.) are represented anywhere in this tool.
- **No scene integration.** You can't select a live object/material and edit it — everything happens in an isolated preview sandbox.
- **No persistence.** Reopening the window always starts from the default image and default preset; nothing you configured survives a reload.
- **PNG-only export**, no material-config JSON, no zip bundling of the six maps.
- The generated maps are approximate, image-processing-based heuristics — see the warning above.
