export interface ToolShortcuts {
  /** Cmd/Ctrl+O */
  open?: () => void;
  /** Cmd/Ctrl+S */
  save?: () => void;
  /** Cmd/Ctrl+Shift+E */
  exportAll?: () => void;
}

/** Binds the standard open/save/export chords on `target`; returns the unbind function. */
export function bindToolShortcuts(
  shortcuts: ToolShortcuts,
  target: Document = document,
): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const key: string = event.key.toLowerCase();
    const action = ((): (() => void) | undefined => {
      if (key === "o" && !event.shiftKey) return shortcuts.open;
      if (key === "s" && !event.shiftKey) return shortcuts.save;
      if (key === "e" && event.shiftKey) return shortcuts.exportAll;
      return undefined;
    })();
    if (!action) return;
    // Swallow the browser's own "open file / save page" before it opens a dialog.
    event.preventDefault();
    action();
  };
  target.addEventListener("keydown", onKeyDown);
  return (): void => target.removeEventListener("keydown", onKeyDown);
}
