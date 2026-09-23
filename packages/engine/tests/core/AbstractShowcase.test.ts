// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  AbstractShowcase,
  SHOWCASE_READY_EVENT,
} from "../../src/core/showcase/AbstractShowcase.js";
import { SmallWorld } from "../../src/core/index.js";
import { makeMockAudioContext } from "../audio/mockAudioContext.js";

class TestShowcase extends AbstractShowcase {
  public debugToggled = false;

  protected override async setupScene(): Promise<void> {
    // Test implementation
  }

  protected override onKeyDown(event: KeyboardEvent): void {
    super.onKeyDown(event);
    if (event.code === "KeyB") {
      this.debugToggled = true;
    }
  }
}

describe("AbstractShowcase Lifecycle & Event Listener Cleanup", () => {
  let origAudioContext: unknown;

  beforeEach(() => {
    origAudioContext = (window as unknown as { AudioContext: unknown }).AudioContext;
    (window as unknown as { AudioContext: unknown }).AudioContext = class {
      constructor() {
        return makeMockAudioContext();
      }
    };
  });

  afterEach(() => {
    (window as unknown as { AudioContext: unknown }).AudioContext = origAudioContext;
  });

  it("removes keydown listener and navigation buttons upon destroy()", () => {
    const showcase = new TestShowcase();

    // Trigger keydown while alive
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyB" }));
    expect(showcase.debugToggled).toBe(true);

    showcase.debugToggled = false;

    // Destroy showcase
    showcase.destroy();

    // Trigger keydown after destroy
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyB" }));
    expect(showcase.debugToggled).toBe(false);
  });
});

describe("AbstractShowcase Scene-Ready Signal", () => {
  let origAudioContext: unknown;
  let origRaf: unknown;
  let startSpy: ReturnType<typeof vi.spyOn>;

  const setRaf = (impl: ((cb: FrameRequestCallback) => number) | undefined): void => {
    const w = window as unknown as { requestAnimationFrame?: (cb: FrameRequestCallback) => number };
    if (impl === undefined) {
      delete w.requestAnimationFrame;
    } else {
      w.requestAnimationFrame = impl;
    }
  };

  beforeEach(() => {
    origAudioContext = (window as unknown as { AudioContext: unknown }).AudioContext;
    (window as unknown as { AudioContext: unknown }).AudioContext = class {
      constructor() {
        return makeMockAudioContext();
      }
    };

    // jsdom does not implement requestAnimationFrame; emulate it by invoking the callback
    // synchronously (twice, matching the two-frame wait in `_waitForStableFrame`).
    origRaf = (
      window as unknown as { requestAnimationFrame?: (cb: FrameRequestCallback) => number }
    ).requestAnimationFrame;
    setRaf((cb: FrameRequestCallback): number => {
      cb(Date.now());
      return 1;
    });

    // Avoid spinning up a real renderer (needs a WebGL context): the base `start()` only needs
    // to resolve so the showcase-level readiness logic runs.
    startSpy = vi.spyOn(SmallWorld.prototype, "start").mockResolvedValue(undefined);
  });

  afterEach(() => {
    (window as unknown as { AudioContext: unknown }).AudioContext = origAudioContext;
    setRaf(origRaf as ((cb: FrameRequestCallback) => number) | undefined);
    startSpy.mockRestore();
  });

  it("dispatches a scene-ready event after start() completes", async () => {
    const showcase = new TestShowcase();
    const listener = vi.fn();
    window.addEventListener(SHOWCASE_READY_EVENT, listener);

    await showcase.start();
    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(SHOWCASE_READY_EVENT, listener);
    showcase.destroy();
  });

  it("resolves even when requestAnimationFrame is unavailable", async () => {
    setRaf(undefined);
    const showcase = new TestShowcase();
    const listener = vi.fn();
    window.addEventListener(SHOWCASE_READY_EVENT, listener);

    await showcase.start();
    await new Promise((r) => setTimeout(r, 1700));

    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(SHOWCASE_READY_EVENT, listener);
    showcase.destroy();
  });
});
