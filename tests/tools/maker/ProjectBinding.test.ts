import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ProjectBinding,
  FileSystemDirectoryHandleLike,
} from "../../../src/tools/maker/ProjectBinding.js";
import { Object3D } from "../../../src/core/Object3D.js";

/** A minimal in-memory fake of the File System Access API surface `ProjectBinding` actually
 * uses -- lets these tests run under Node/vitest without a real browser. */
function fakeDirectory(): { directory: FileSystemDirectoryHandleLike; writes: string[] } {
  const writes: string[] = [];
  const fileHandle = {
    createWritable: async (): Promise<{
      write: (data: string) => Promise<void>;
      close: () => Promise<void>;
    }> => ({
      write: async (data: string): Promise<void> => {
        writes.push(data);
      },
      close: async (): Promise<void> => undefined,
    }),
    getFile: async (): Promise<{ text: () => Promise<string> }> => ({
      text: async (): Promise<string> => writes[writes.length - 1] ?? "{}",
    }),
  };
  const directory: FileSystemDirectoryHandleLike = {
    getFileHandle: async () => fileHandle,
  };
  return { directory, writes };
}

describe("ProjectBinding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not bound until bindTo()/bind() succeeds", () => {
    const binding = new ProjectBinding();
    expect(binding.isBound).toBe(false);
    binding.bindTo(fakeDirectory().directory);
    expect(binding.isBound).toBe(true);
  });

  it("does nothing when scheduleAutosave() is called while unbound", () => {
    const binding = new ProjectBinding();
    const dirtyStates: boolean[] = [];
    binding.onDirtyChange((dirty) => dirtyStates.push(dirty));

    binding.scheduleAutosave(() => new Object3D("Root"));
    vi.advanceTimersByTime(10_000);

    expect(dirtyStates).toHaveLength(0);
  });

  it("debounces a burst of scheduleAutosave() calls into a single write", async () => {
    const { directory, writes } = fakeDirectory();
    const binding = new ProjectBinding();
    binding.bindTo(directory);
    const dirtyStates: boolean[] = [];
    binding.onDirtyChange((dirty) => dirtyStates.push(dirty));

    const root = new Object3D("Root");
    binding.scheduleAutosave(() => root);
    vi.advanceTimersByTime(100);
    binding.scheduleAutosave(() => root);
    vi.advanceTimersByTime(100);
    binding.scheduleAutosave(() => root);

    // Not yet past the debounce window since the last call.
    await vi.advanceTimersByTimeAsync(499);
    expect(writes).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(50);
    expect(writes).toHaveLength(1);
    expect(dirtyStates).toEqual([true, true, true, false]);
  });

  it("returns undefined from load() when the scene file doesn't exist yet", async () => {
    const directory: FileSystemDirectoryHandleLike = {
      getFileHandle: async () => {
        throw new Error("NotFoundError");
      },
    };
    const binding = new ProjectBinding();
    binding.bindTo(directory);

    await expect(binding.load()).resolves.toBeUndefined();
  });
});
