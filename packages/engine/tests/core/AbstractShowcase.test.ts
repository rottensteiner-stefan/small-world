// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AbstractShowcase } from "../../src/core/showcase/AbstractShowcase.js";
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
