/** A single undoable action: `redo()` (re)applies it, `undo()` reverts it. `label` is shown to
 * the user (e.g. in a future "Undo <label>" menu item) -- not required for Phase 1's plain
 * keyboard-only undo/redo, but cheap to carry along now. */
export interface UndoCommand {
  label: string;
  redo(): void;
  undo(): void;
}

/**
 * Plain command-pattern undo/redo stack, the same shape as Pixler's own undo history. Executes
 * a command immediately, then makes it revertible/reappliable via `undo()`/`redo()`. Pushing a
 * new command after an undo discards the redo branch -- there is no redo tree, matching how
 * every mainstream editor (and Pixler) behaves.
 */
export class UndoStack {
  private _undone: UndoCommand[] = [];
  private _done: UndoCommand[] = [];

  /** Runs `command.redo()` immediately and pushes it onto the undo history. */
  public execute(command: UndoCommand): void {
    command.redo();
    this._done.push(command);
    this._undone.length = 0;
  }

  public get canUndo(): boolean {
    return 0 < this._done.length;
  }

  public get canRedo(): boolean {
    return 0 < this._undone.length;
  }

  public undo(): void {
    const command = this._done.pop();
    if (!command) return;
    command.undo();
    this._undone.push(command);
  }

  public redo(): void {
    const command = this._undone.pop();
    if (!command) return;
    command.redo();
    this._done.push(command);
  }

  /** Drops all history without undoing anything -- for a freshly loaded/reset document. */
  public clear(): void {
    this._done.length = 0;
    this._undone.length = 0;
  }
}
