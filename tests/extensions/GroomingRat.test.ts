import { describe, it, expect } from "vitest";
import { GroomingRat } from "../../src/extensions/creatures/GroomingRat.js";
import {
  RatGroomingBehavior,
  RatGroomingState,
} from "../../src/extensions/creatures/RatGroomingBehavior.js";
import { Color } from "../../src/core/colors/Color.js";

describe("GroomingRat & RatGroomingBehavior", () => {
  it("should create a GroomingRat with full articulated node hierarchy", () => {
    const rat = new GroomingRat();

    expect(rat.name).toBe("GroomingRat");
    expect(rat.getObjectByName("Head")).toBeDefined();
    expect(rat.getObjectByName("LeftPaw")).toBeDefined();
    expect(rat.getObjectByName("RightPaw")).toBeDefined();
    expect(rat.getObjectByName("Haunches")).toBeDefined();
    expect(rat.getObjectByName("Torso")).toBeDefined();
    expect(rat.getObjectByName("Tail_0")).toBeDefined();
    expect(rat.getObjectByName("Tail_5")).toBeDefined();
    expect(rat.behavior).toBeInstanceOf(RatGroomingBehavior);
  });

  it("should support custom color options and scaling", () => {
    const customRat = new GroomingRat({
      furColor: "#554433",
      skinColor: new Color(0.9, 0.6, 0.6),
      eyeColor: "#ff00ff",
      scale: 1.5,
    });

    expect(customRat.scale.x).toBe(1.5);
    expect(customRat.scale.y).toBe(1.5);
    expect(customRat.scale.z).toBe(1.5);
  });

  it("should execute 3-phase grooming state machine during update", () => {
    const rat = new GroomingRat({
      behaviorOptions: { speed: 1.0, cycleDuration: 8.5 },
    });
    const behavior = rat.behavior!;

    // Initial state
    expect(behavior.currentState).toBe(RatGroomingState.FACE_WASHING);

    // Update into phase 1 (Face washing, e.g. at 2.0s)
    behavior.update(2.0);
    expect(behavior.currentState).toBe(RatGroomingState.FACE_WASHING);
    const leftPaw = rat.getObjectByName("LeftPaw")!;
    expect(leftPaw.position.y).toBeGreaterThan(0.08);

    // Update into phase 2 (Alert sniffing, e.g. at 4.5s)
    behavior.update(2.5); // total 4.5s (cycle ~ 4.95)
    expect(behavior.currentState).toBe(RatGroomingState.ALERT_SNIFFING);

    // Update into phase 3 (Ear cleaning, e.g. at 7.0s)
    behavior.update(2.5); // total 7.0s (cycle ~ 7.7)
    expect(behavior.currentState).toBe(RatGroomingState.EAR_CLEANING);
  });

  it("should animate tail segments with wave propagation", () => {
    const rat = new GroomingRat();
    const tail0 = rat.getObjectByName("Tail_0")!;
    const tail3 = rat.getObjectByName("Tail_3")!;

    const rot0Before = tail0.rotation.y;
    const rot3Before = tail3.rotation.y;

    rat.behavior!.update(1.2);

    expect(tail0.rotation.y).not.toBe(rot0Before);
    expect(tail3.rotation.y).not.toBe(rot3Before);
  });

  it("should respect isActive flag", () => {
    const rat = new GroomingRat();
    const behavior = rat.behavior!;
    behavior.isActive = false;

    behavior.update(3.0);
    expect(behavior.elapsedTime).toBe(0);
  });
});
