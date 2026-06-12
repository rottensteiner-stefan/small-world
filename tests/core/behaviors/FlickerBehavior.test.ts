import { FlickerBehavior } from "../../../src/core/behaviors/FlickerBehavior.js";
import { Object3D } from "../../../src/core/Object3D.js";

describe("FlickerBehavior", () => {
  it("should toggle between stable and flickering phases and trigger callback", () => {
    let lastMultiplier = -1;
    const target = new Object3D("testTarget");
    const behavior = new FlickerBehavior({
      minStableTime: 0.1,
      maxStableTime: 0.1,
      minFlickerTime: 0.2,
      maxFlickerTime: 0.2,
      minMultiplier: 0.0,
      smoothness: 0.0,
      onUpdate: (multiplier) => {
        lastMultiplier = multiplier;
      },
    });

    behavior.onAttach(target);

    // Initially should start flickering (timer is 0)
    behavior.update(0.01);

    let hadZero = false;
    let hadOne = false;

    // Simulate 3 seconds at 60 FPS
    for (let i = 0; i < 180; i++) {
      behavior.update(1 / 60);
      if (lastMultiplier === 0.0) hadZero = true;
      if (lastMultiplier === 1.0) hadOne = true;
    }

    expect(hadOne).toBe(true);
    expect(hadZero).toBe(true);
  });
});
