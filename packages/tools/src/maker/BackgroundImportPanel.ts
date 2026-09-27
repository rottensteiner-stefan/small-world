/**
 * Small UI for importing a reference image to trace 2.5D stage zones on top of (ADR 0016 Phase
 * 2) -- a file-picker button plus drag & drop directly onto the viewport canvas, matching
 * `MapImportPanel`'s minimal-DOM style. Hands the raw `File` up rather than doing any image
 * decoding/scene-graph work itself -- `MakerApp._importBackgroundImage()` owns turning it into a
 * `BackgroundPlane` with the correct aspect ratio, and the undo/autosave integration around that.
 */
export class BackgroundImportPanel {
  constructor(container: HTMLElement, viewportCanvas: HTMLElement, onImport: (file: File) => void) {
    const heading = document.createElement("h4");
    heading.className = "maker-palette-section";
    heading.textContent = "Background Reference";
    container.appendChild(heading);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", (): void => {
      const file = fileInput.files?.[0];
      if (file) onImport(file);
      fileInput.value = "";
    });
    container.appendChild(fileInput);

    const button = document.createElement("button");
    button.className = "maker-palette-btn";
    button.textContent = "🖼 Import Background Image…";
    button.addEventListener("click", (): void => fileInput.click());
    container.appendChild(button);

    viewportCanvas.addEventListener("dragover", (e: DragEvent): void => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    });
    viewportCanvas.addEventListener("drop", (e: DragEvent): void => {
      const file = e.dataTransfer?.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      e.preventDefault();
      onImport(file);
    });
  }
}
