import { Object3D } from "../../core/index.js";
import { WorldWriter } from "../../loaders/WorldWriter.js";
import { GltfLoader } from "../../loaders/GltfLoader.js";

const AUTOSAVE_DEBOUNCE_MS = 500;
const SCENE_FILE_NAME = "scene.gltf";

/** The narrow slice of the real (browser-only) `FileSystemDirectoryHandle`/`FileSystemFileHandle`/
 * `FileSystemWritableFileStream` this class actually calls -- kept as our own interfaces so
 * tests can inject a plain in-memory fake instead of needing a real browser environment. */
export interface FileSystemDirectoryHandleLike {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandleLike>;
}
export interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableFileStreamLike>;
  getFile(): Promise<{ text(): Promise<string> }>;
}
export interface FileSystemWritableFileStreamLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

type ParseFn = (
  gltf: { json: unknown; buffers: ArrayBuffer[] },
  baseUrl: string,
) => Promise<Object3D>;

/**
 * Binds Maker to a real project folder on disk via the File System Access API and keeps it
 * autosaved -- see docs/adr/0010-maker-editor-architecture.md's "no explicit Save button" UX
 * decision: every edit calls `scheduleAutosave()`, which debounces so a burst of edits (a
 * slider drag, several undo steps) becomes a single write, not one per change.
 */
export class ProjectBinding {
  private _directory: FileSystemDirectoryHandleLike | undefined;
  private _debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private _dirtyListener: ((dirty: boolean) => void) | undefined;

  public get isBound(): boolean {
    return undefined !== this._directory;
  }

  public onDirtyChange(cb: (dirty: boolean) => void): void {
    this._dirtyListener = cb;
  }

  /** Directly injects an already-obtained directory handle -- the real entry point for tests;
   * `bind()` is the real entry point for the browser's native picker. */
  public bindTo(directory: FileSystemDirectoryHandleLike): void {
    this._directory = directory;
  }

  /** Prompts the user to pick a project folder via the browser's native directory picker.
   * @returns false if the browser doesn't support the API, or the user cancelled the picker. */
  public async bind(): Promise<boolean> {
    const picker = (
      globalThis as unknown as {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandleLike>;
      }
    ).showDirectoryPicker;
    if (!picker) return false;
    try {
      this._directory = await picker();
      return true;
    } catch {
      return false; // User cancelled the picker -- not an error worth surfacing.
    }
  }

  /** Loads `scene.gltf` from the bound project folder, if present.
   * @returns undefined if unbound, or the file doesn't exist yet (a brand-new project). */
  public async load(): Promise<Object3D | undefined> {
    if (!this._directory) return undefined;
    let fileHandle: FileSystemFileHandleLike;
    try {
      fileHandle = await this._directory.getFileHandle(SCENE_FILE_NAME);
    } catch {
      return undefined;
    }
    const file = await fileHandle.getFile();
    const json = JSON.parse(await file.text()) as unknown;
    const loader = new GltfLoader();
    return (loader as unknown as { _parse: ParseFn })._parse({ json, buffers: [] }, "");
  }

  /** Marks the document dirty and (re-)schedules a debounced write; call after any edit.
   * A no-op while unbound (nothing to write to yet). */
  public scheduleAutosave(getRoot: () => Object3D): void {
    if (!this._directory) return;
    this._dirtyListener?.(true);
    if (undefined !== this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      void this._save(getRoot());
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  private async _save(root: Object3D): Promise<void> {
    if (!this._directory) return;
    const doc = new WorldWriter().write(root);
    const fileHandle = await this._directory.getFileHandle(SCENE_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(doc, null, 2));
    await writable.close();
    this._dirtyListener?.(false);
  }
}
