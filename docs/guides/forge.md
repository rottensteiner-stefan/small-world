# The Forge (In-Game Tooling)

Building assets (textures, sprite sheets, level maps) often forces developers to constantly switch context between the game engine and external software like Photoshop or Tiled.

**The Forge** solves this by providing an extensible, in-game window manager and tooling framework. With the Forge, you can run mini-applications directly over your game canvas.

## What is the Forge?

The `Forge` class is an overlay that hosts draggable, resizable windows containing `ForgeTool` instances. It can be toggled via a hotkey (e.g., `F12` or `~`) without leaving the browser.

## Built-In Tools

Small World Engine provides several built-in Forge tools to accelerate your workflow:

1. **Pixler:** A retro 2D pixel-art editor to draw sprites directly in-game. Features a color palette, fill bucket, zooming, and a template generator.
2. **IXtractor:** An image manipulation tool to crop, slice, and generate tile-maps or sprite atlases from existing images or URLs.
3. **MapGenerator:** A visual grid editor to paint generic maps/levels and export them as `GridLevelBuilder` compatible ASCII strings.
4. **GadgetInspector:** An advanced scene inspector that uses Tweakpane to let you adjust lighting, audio, fog, post-processing effects, and object properties in real-time.

## Integrating the Forge into your App

You can enable the Forge globally by initializing it and mapping tools to windows.

```typescript
import { Application } from "small-world";
import { Forge, Pixler, IXtractor, MapGenerator } from "small-world/tools";

class MyGame extends Application {
  constructor() {
    super();

    // 1. Initialize the Forge overlay and bind it to the '~' key
    this.forge = new Forge({ toggleKey: "~" });

    // 2. Open tools in floating windows
    this.forge.openWindow("Pixler Editor", new Pixler(), 50, 50);
    this.forge.openWindow("Map Generator", new MapGenerator(), 400, 50);
    this.forge.openWindow("Asset Extractor", new IXtractor(), 50, 400);
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
