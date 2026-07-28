# Map Generator (Grid Level Editor)

**Map Generator** is a manual, tile-by-tile grid painter for building ASCII level layouts that [`GridLevelBuilder`](/guides/extensions) can turn into real 3D geometry. Despite the name, it doesn't generate anything procedurally — think of it as a spreadsheet-like paint tool for level data, not a random-dungeon generator.

## Enabling it

Set `enableInspector: true` on your `SmallWorld` config and Map Generator opens as one of the docked Forge windows:

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
Map Generator is also available at `/tools/map-gen.html` as a self-contained page — it's the same class, just mounted directly into the page instead of a Forge window. It preloads a small demo room instead of reading from `localStorage`.
:::

## Painting a map

The grid starts at 40×25 cells. Click a swatch in the palette to select a tile type, then click-drag on the canvas to paint:

| Char | Tile | Char | Tile |
|---|---|---|---|
| `W` | Wall | `I` | Item |
| `G` | Wall 2 | `l` | Torch |
| `+` | Door | `T` | Lava |
| `O` | Secret | `~` | Slime |
| `P` | Player | `.` | Empty |
| `E` | Enemy | | |
| `b` | Barrel | | |

Other controls:

- **Resize** — set new `W`/`H` values and click Resize; existing content is preserved (anchored top-left), new area is padded with Empty.
- **Bucket Fill (Empty)** — despite the name, this isn't a flood fill from a click point. It replaces *every* Empty (`.`) cell on the whole grid with whichever tile is currently selected — useful for laying a base floor before detailing.
- **Clear Map** — resets every cell to Empty (asks for confirmation first).
- **Export String / Import String** — round-trips the map through the text area as a plain newline-separated grid of characters, one per cell.

There are no keyboard shortcuts — painting is entirely mouse-driven — and no undo/redo.

## Exporting to a game

Click **▶ Play in YAD** to save the current map to `localStorage` (key `yad_custom_map`) and open the [YAD](/guides/custom-game) showcase in a new tab, which reads that key on startup and uses it instead of its bundled default level. This is the only code path that writes that key; Map Generator and YAD only ever read it back.

::: warning Map Generator's palette and YAD's legend don't fully agree
YAD's actual level legend uses `1`/`2`/`3` for health/armor/weapon items — it never reads `I`. And while YAD configures `lavaFloorChars: ["T"]`, its legend has no `T` entry, so a `T` tile painted here currently falls through to plain floor in YAD rather than rendering as lava. If you're building levels for YAD specifically, treat the editor's palette as a starting point, not a guaranteed 1:1 mapping — check YAD's legend in `src/apps/yad/App.ts`'s `setupScene()` for what actually renders.
:::

## Using the exported string yourself

The export format is deliberately generic — it's just rows of characters, one per grid cell — and consumed by `GridLevelBuilder.build(scene, mapString, config)`, which you configure with your own `legend: Record<char, GridLegendEntry>` mapping each character to a `"block"`, `"floor"`, `"sprite"`, or `"custom"` tile definition. Map Generator doesn't know anything about your game's specific tile semantics — that mapping is entirely up to you when you call `GridLevelBuilder` yourself. See YAD's `YadLevelBuilder` for a worked example of layering game-specific meaning (AI-enabled enemies, animated doors, bobbing item pickups) on top of the base grid builder.

## Limitations

- **No procedural generation** — it's a manual painter, despite the class name.
- **"Bucket Fill" is a whole-grid replace, not a flood fill** from the clicked cell.
- **No undo/redo**, no keyboard shortcuts, no multi-cell selection or line/rectangle tools.
- **Import/export asymmetry**: importing trims whitespace from *both* ends of every line, while `GridLevelBuilder` only trims trailing whitespace — leading-space "indentation" tricks the builder supports won't survive a round-trip through Import String.
- **No size limits or validation** on the resize inputs — entering a very large width/height can hang the browser building the canvas.
- Map data isn't versioned in `localStorage` — once you've played a custom map in YAD, it stays the active level indefinitely (overriding the bundled level) until it's cleared manually.
