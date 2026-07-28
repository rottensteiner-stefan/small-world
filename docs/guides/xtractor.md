# Xtractor (Image Cropping & Slicing)

Pulling sprites out of a reference sheet or screenshot usually means round-tripping through an external image editor. **Xtractor** is an in-browser workbench for loading an image, selecting a region of it, and handing that crop straight to [Pixler](/guides/pixler) for further pixel-editing — without leaving the page.

## Enabling it

Like the other built-in dev tools, Xtractor is wired up automatically when you set `enableInspector: true` on your `SmallWorld` config:

```typescript
import { SmallWorld } from "small-world";

class MyGame extends SmallWorld {
  constructor() {
    super({ enableInspector: true });
  }
}
```

Press **Ctrl+Alt+G** (or **Cmd+Alt+G**) to open the Forge overlay, where Xtractor appears as the "Asset Extractor" window.

::: tip Standalone page
Xtractor is also available at `/tools/xtractor.html` as a self-contained page. Note that it's a **separate, manually-duplicated copy** of the tool's HTML/CSS/JS, not a thin wrapper around the same class — feature parity between the two is maintained by hand. The standalone page has no shared event bus, so it can't hand crops off to Pixler (see [Limitations](#limitations) below).
:::

::: warning Not part of the published package yet
`Xtractor` lives in `src/tools/` and isn't re-exported from the engine's root entry point yet. `enableInspector: true` is the supported way to use it today.
:::

## Loading an image

Three ways to get an image onto the canvas, all landing at the same 1:1 pixel-scale canvas (on-screen zoom is CSS scaling, not resampling):

- **Upload** — the "Upload Image" button opens a file picker.
- **Drag & drop** — drop an image file anywhere on the canvas.
- **URL** — paste a URL into the text field and click "Load". Cross-origin images that don't send permissive CORS headers will fail to load; Xtractor surfaces an explanatory message rather than proxying the request, so downloading the image and uploading it locally is the reliable fallback.
- **Clipboard paste** — `Ctrl/Cmd+V` while Xtractor is the topmost visible Forge window pastes an image directly from your clipboard. This only works when Xtractor is docked in the Forge overlay; the standalone page has no paste handling.

## Selecting a region

Two selection tools, switchable from the toolbar:

- **Rect** (default) — click-drag to draw a rectangular selection (minimum 10×10px).
- **Circle** — same click-drag gesture, but crops to an elliptical/circular region instead of a rectangle.
- **Hand** — pans the canvas instead of drawing a selection.

Once a selection exists, you can:

- **Drag it** to reposition, or edit the **X/Y/W/H** number fields for pixel-precise adjustment.
- **Zoom** with the +/- buttons or `Ctrl` + mouse wheel (10%–1000%, zooms around the cursor).
- Clear it with **Clear Selection**.

## Sending a crop to Pixler

Once you have a selection, a preview pill appears above the chat panel with an **"An Pixler"** button. Clicking it sends the crop (as a PNG data URL) straight into the docked [Pixler](/guides/pixler) window via the engine's shared event bus — this is the one fully functional cross-tool integration in the tool. There's no equivalent hand-off to Map Generator or Material Studio.

## The chat panel

::: warning This is a mock, not a real AI assistant
The chat panel on the right looks like an AI assistant, but it isn't connected to any vision model or backend. It's a hardcoded, regex-based demo: if your message (and an active selection) contains a keyword like "10", "slice", or "schneide", it slices the selection into 10 fixed-width vertical strips and shows each as a downloadable PNG. Anything else gets a generic "tell me what to do" reply. The source code has an explicit `@DEVELOPER_NOTE` marking this as a stand-in for a real `fetch()` call to a vision-model backend.
:::

This is the only export path in the tool today — there's no "download crop" or "copy to clipboard" button on a selection by itself; you either send it to Pixler or ask the mock chat to slice it into ten pieces.

## Limitations

- **PDF upload doesn't work.** The file picker accepts PDFs, but selecting one just shows an alert saying PDF support is planned for "Phase 2" — no PDF.js integration exists yet.
- **The chat assistant is entirely mocked** (see above) — no real AI backend is connected.
- **Slicing is hardcoded to 10 equal vertical strips.** There's no configurable grid size, no rows, no atlas/metadata export — this falls well short of a general sprite-atlas generator.
- **No state persistence.** Reopening the Forge window loses your loaded image, selection, and chat history.
- **The standalone `xtractor.html` page is a separate copy** of the tool with no event bus — no Pixler hand-off, no clipboard paste. Any feature added to the real `Xtractor` class needs to be ported there by hand to stay in sync.
