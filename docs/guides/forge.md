# The Forge (In-Game Tooling)

Building assets (textures, sprite sheets, level maps) often forces developers to constantly switch context between the game engine and external software like Photoshop or Tiled.

**The Forge** solves this by providing an extensible, in-game window manager and tooling framework. With the Forge, you can run mini-applications directly over your game canvas.

## What is the Forge?

The `Forge` class is an overlay that hosts draggable, resizable windows containing `ForgeTool` instances. It can be toggled via a hotkey (e.g., `F12` or `~`) without leaving the browser.

## Built-In Tools

Small World Engine provides several built-in Forge tools to accelerate your workflow:

1. **[Pixler](/guides/pixler):** A retro 2D pixel-art editor to draw sprites directly in-game. Features a full UI toolbar with Pencil, Bucket Fill, Color Picker, and Line drawing tools. Supports Symmetry Mode (X/Y axis), auto-trimming borders, canvas panning, flipping, and full Undo/Redo history.
2. **[Xtractor](/guides/xtractor):** An image cropping/slicing tool that can hand crops straight to Pixler. Includes a mock AI assistant UI as a starting point for integrating a real vision model backend.
3. **[Map Generator](/guides/map-generator):** A visual grid editor to paint generic maps/levels and export them as `GridLevelBuilder` compatible ASCII strings.
4. **[Gadget Inspector](/guides/gadget-inspector):** A Tweakpane-based scene inspector that lets you pick any object and adjust its transform, material, light, and behavior properties live.
5. **[Material Studio](/guides/material-studio):** A PBR texture-map generator that derives normal/roughness/AO/etc. maps from a single diffuse image and previews them on a sample mesh.

::: tip Standalone Tool Pages
Pixler, Xtractor, and Map Generator are also available as **standalone web pages** (`/tools/pixler.html`, `/tools/map-gen.html`, `/tools/xtractor.html`) that run independently without requiring a game canvas or Forge overlay — the recommended approach for a dedicated asset-editing workflow. Gadget Inspector and Material Studio have no standalone page; they're only available docked inside a running engine's Forge overlay.
:::

::: warning Tools are not part of the published package yet
`Forge`, `ForgeTool`, and every built-in tool live in `src/tools/` but are not re-exported from the engine's root entry point, and `small-world/tools` is not (yet) a resolvable package subpath (no `exports` map is configured). The code below reflects the intended API and works if you're building against the engine's own source tree; until a dedicated `tools` build/export exists, `enableInspector: true` (for Gadget Inspector/Material Studio/etc.) or the [standalone tool pages](#built-in-tools) (for Pixler/Xtractor/Map Generator) are the supported paths for a real project.
:::

## Integrating the Forge into your App

::: tip The quick path: `enableInspector`
You don't need to wire any of this up by hand. Setting `enableInspector: true` in your `SmallWorld` config auto-creates a Forge hub with all five built-in tools already docked — Gadget Inspector, Map Generator, Pixler, Xtractor, and Material Studio — bound to **Ctrl+Alt+G** (Cmd+Alt+G on macOS) to toggle. See each tool's own guide for what it does. The manual setup below is for building your **own** custom tools, or if you want a different subset of windows than `enableInspector` gives you.
:::

To dock your own `ForgeTool`s (or a hand-picked subset of the built-in ones), initialize a `Forge` yourself and open windows on it directly. Note that `Xtractor` *requires* an `EventDispatcherImpl` as its first constructor argument (used for its Pixler hand-off), and `Pixler` accepts one optionally (to receive that hand-off) — pass your `SmallWorld` instance's own `events` bus to both so they can talk to each other:

```typescript
import { SmallWorld } from "small-world";
import { Forge, Pixler, Xtractor, MapGenerator } from "small-world/tools";

class MyGame extends SmallWorld {
  constructor() {
    super();

    // 1. Initialize the Forge overlay and bind it to the '~' key
    this.forge = new Forge({ toggleKey: "~" });

    // 2. Open tools in floating windows, sharing `this.events` so Xtractor can hand crops to Pixler
    this.forge.openWindow("Pixler Editor", new Pixler(this.events), 50, 50);
    this.forge.openWindow("Map Generator", new MapGenerator(), 400, 50);
    this.forge.openWindow("Asset Extractor", new Xtractor(this.events), 50, 400);
  }
}
```

When you start your game and press `~`, a semi-transparent overlay appears with your docked tools. You can draw sprites in Pixler, copy them to the clipboard, and immediately paste them into your game's asset configurations.

## Creating Custom Tools

You can build your own `ForgeTool` to edit specific parts of your game logic (e.g., a dialogue editor, a quest tracker).

```typescript
import { ForgeTool, ForgeToolOptions } from "small-world/tools";

export class MyCustomTool extends ForgeTool {
  constructor(options: ForgeToolOptions = {}) {
    super(options);
    
    // Build your tool's HTML interface inside this._container
    this._container.innerHTML = `
      <div style="padding: 10px; color: white;">
        <h3>My Tool</h3>
        <button id="my-btn">Click Me!</button>
      </div>
    `;

    this._container.querySelector("#my-btn")?.addEventListener("click", () => {
      console.log("Custom tool logic executed!");
    });
  }
}
```

Then simply inject it:
```typescript
this.forge.openWindow("My Tool", new MyCustomTool(), 100, 100);
```
