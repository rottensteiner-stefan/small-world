# Pixler (Pixel-Art Editor)

**Pixler** is a retro-style pixel-art editor you can pop open without leaving your game — draw a sprite, copy it to the clipboard, and paste it straight into your asset pipeline.

## Enabling it

Set `enableInspector: true` on your `SmallWorld` config and Pixler opens as one of the docked Forge windows:

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
Pixler is also available at `/tools/pixler.html` as a self-contained page — same class, mounted directly into the page instead of a Forge window. The one functional difference: the standalone page has no engine event bus, so it can't receive images pushed in via [Xtractor](/guides/xtractor)'s "send to Pixler" handoff, and it exposes `window.pixlerInstance` for console access.
:::

## Tools

Four tools, switchable via the toolbar or a keyboard shortcut:

| Tool | Key | Notes |
|---|---|---|
| Pencil | `P` | Default tool; single-pixel draw. Right-click erases. |
| Bucket Fill | `F` | Flood fill matching the exact color under the click. |
| Color Picker | `I` | Samples the color under the cursor. `Alt`+click works as a one-off pick regardless of the active tool. |
| Line | `L` | Bresenham line between successive clicks, so you can chain segments. `Shift`+click also draws a line regardless of active tool. |

## Canvas, palette, and grid

- **Size** — starts at 32×32px at 16x zoom; the `W`/`H` inputs resize it while preserving existing pixel data.
- **Zoom** — a numeric input, not scroll-wheel; there's no zoom shortcut.
- **Palette** — a dropdown of six built-in palettes (Default, EGA, VGA, PICO-8, Game Boy, Grayscale). Number keys `1`–`9` jump straight to a palette slot.
- **GridX/GridY** — a secondary magenta overlay grid purely for visual reference (e.g. marking tile boundaries) — it doesn't affect export in any way, there's no tiled/multi-frame export.

## Symmetry mode

Two independent toggles (X-axis 🪞X and Y-axis 🪞Y) mirror every pencil and line stroke as you draw — turn both on for 4-way symmetry. Worth knowing: **Bucket Fill does not respect symmetry mode** — only direct pencil/line strokes are mirrored.

## Editing

- **Undo/Redo** — `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`, up to 50 steps.
- **Pan** — `Shift` + arrow keys/WASD shifts the sprite content, wrapping around the edges (this moves pixel data, not the viewport).
- **Flip** — keyboard-only: `Ctrl/Cmd+Shift` + Up/Down (or W/S) flips vertically, `Ctrl/Cmd+Shift` + Left/Right (or A/D) flips horizontally. There's no toolbar button and **no rotate** — only the two flip axes exist.
- **Trim** — the ✂️ button auto-crops to the bounding box of non-background content. "Background" means fully-transparent pixels, or pixels matching the currently-selected color if that color isn't transparent (so you can trim a solid-color border, not just transparency).
- **Clear** — wipes the canvas (with an undo step saved first).
- **A-Z template** — loads a built-in bitmap font as a starting point.

Full shortcut reference: arrow keys/WASD move a cursor cell-by-cell (painting while a stroke is active), `Space` paints at the cursor, `X`/`Delete`/`Backspace` erase at the cursor. Shortcuts are suspended while any text input has focus.

## Getting sprites in and out

- **Copy as Base64** — the 📋 button copies a PNG data URL to the clipboard.
- **Copy as Image** — the 💾 button writes an actual PNG blob to the clipboard, so you can paste it into other apps (or paste it right back into Pixler, or another tool).
- **Paste in** — `Ctrl/Cmd+V` while Pixler is the topmost visible Forge window loads whatever image is on your clipboard.
- **From Xtractor** — see [Xtractor](/guides/xtractor)'s "send to Pixler" button, which pushes a crop straight into whichever Pixler instance is listening on the shared event bus.

There's no file-system save/load — export is clipboard-only — and no sprite-sheet/animation-frame support; this is a single static image editor.

## Limitations

- **Single image only** — no frames, no animation, no tiled sprite-sheet export (the GridX/GridY overlay is visual guidance only).
- **No rotate**, only horizontal/vertical flip.
- **Bucket Fill ignores Symmetry Mode.**
- **Sprite content isn't persisted across reloads** in the docked Forge window — `getState()`/`setState()` exist on the class, but the Forge window manager never calls them, so only the window's open/closed state survives a reload, not what you drew.
- The standalone page can't receive pushes from Xtractor (no shared event bus) and has no paste-routing of its own beyond what the class itself provides.
