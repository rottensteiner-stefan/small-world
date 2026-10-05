export interface CanvasUndoSnapshot {
  imageData: ImageData;
  width: number;
  height: number;
  label: string;
}

export class CanvasUndoHistory {
  private _undoStack: CanvasUndoSnapshot[] = [];
  private _redoStack: CanvasUndoSnapshot[] = [];
  private _maxEntries: number;

  constructor(maxEntries = 30) {
    this._maxEntries = maxEntries;
  }

  public get canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  public get canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  public get undoCount(): number {
    return this._undoStack.length;
  }

  public get redoCount(): number {
    return this._redoStack.length;
  }

  public clear(): void {
    this._undoStack = [];
    this._redoStack = [];
  }

  /** Captures the current canvas before a destructive modification. */
  public push(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, label: string): void {
    if (canvas.width === 0 || canvas.height === 0) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this._undoStack.push({
      imageData: imgData,
      width: canvas.width,
      height: canvas.height,
      label,
    });
    if (this._undoStack.length > this._maxEntries) {
      this._undoStack.shift();
    }
    this._redoStack = [];
  }

  /** Reverts to the previous snapshot, placing current canvas onto the redo stack. */
  public undo(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): CanvasUndoSnapshot | null {
    if (this._undoStack.length === 0) return null;

    if (canvas.width > 0 && canvas.height > 0) {
      const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this._redoStack.push({
        imageData: current,
        width: canvas.width,
        height: canvas.height,
        label: "Aktueller Zustand",
      });
      if (this._redoStack.length > this._maxEntries) {
        this._redoStack.shift();
      }
    }

    const snapshot = this._undoStack.pop()!;
    this._applySnapshot(canvas, ctx, snapshot);
    return snapshot;
  }

  /** Re-applies the next snapshot, placing current canvas onto the undo stack. */
  public redo(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): CanvasUndoSnapshot | null {
    if (this._redoStack.length === 0) return null;

    if (canvas.width > 0 && canvas.height > 0) {
      const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this._undoStack.push({
        imageData: current,
        width: canvas.width,
        height: canvas.height,
        label: "Vor Wiederholen",
      });
      if (this._undoStack.length > this._maxEntries) {
        this._undoStack.shift();
      }
    }

    const snapshot = this._redoStack.pop()!;
    this._applySnapshot(canvas, ctx, snapshot);
    return snapshot;
  }

  private _applySnapshot(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    snapshot: CanvasUndoSnapshot,
  ): void {
    canvas.width = snapshot.width;
    canvas.height = snapshot.height;
    ctx.putImageData(snapshot.imageData, 0, 0);
  }
}
