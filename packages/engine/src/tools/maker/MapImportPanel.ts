/**
 * Small UI for Maker's "Import ASCII Map" bridge to `GridLevelBuilder` (see
 * docs/adr/0010-maker-editor-architecture.md Phase 2C) -- a plain textarea + button, matching
 * `PrefabPalette`'s minimal-DOM style rather than pulling in a modal/dialog library for a single
 * multi-line paste.
 */
export class MapImportPanel {
  constructor(container: HTMLElement, onImport: (mapData: string) => void) {
    const heading = document.createElement("h4");
    heading.className = "maker-palette-section";
    heading.textContent = "Import ASCII Map";
    container.appendChild(heading);

    const textarea = document.createElement("textarea");
    textarea.className = "maker-map-textarea";
    textarea.placeholder = "Paste a MapGenerator ASCII map here…";
    container.appendChild(textarea);

    const button = document.createElement("button");
    button.className = "maker-palette-btn";
    button.textContent = "⌗ Import";
    button.addEventListener("click", (): void => {
      const text = textarea.value;
      if (!text.trim()) return;
      onImport(text);
    });
    container.appendChild(button);
  }
}
