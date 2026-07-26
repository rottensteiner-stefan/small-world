import { ProximitySensorBehavior } from "../../../src/core/behaviors/ProximitySensorBehavior.js";
import { Object3D } from "../../../src/core/Object3D.js";

describe("ProximitySensorBehavior", () => {
  it("should calculate correct normalized factor based on distance", () => {
    let lastFactor = -1;
    const target = new Object3D("sensor");
    const player = new Object3D("player");

    target.position.set(0, 0, 0);
    target.updateMatrixWorld();

    const behavior = new ProximitySensorBehavior({
      targetObj: player,
      radius: 10.0,
      minDistance: 2.0,
      onUpdate: (factor): void => {
        lastFactor = factor;
      },
    });

    behavior.onAttach(target);

    // 1. Far away (outside radius)
    player.position.set(20, 0, 0);
    player.updateMatrixWorld();
    behavior.update(0.1);
    expect(lastFactor).toBe(0.0);

    // 2. Inside radius, but outside minDistance
    player.position.set(6, 0, 0); // distance = 6
    player.updateMatrixWorld();
    behavior.update(0.1);
    // radius = 10, min = 2, range = 8. distance = 6.
    // factor = 1.0 - (6 - 2) / 8 = 1.0 - 0.5 = 0.5
    expect(lastFactor).toBe(0.5);

    // 3. Exactly at minDistance
    player.position.set(0, 2, 0); // distance = 2
    player.updateMatrixWorld();
    behavior.update(0.1);
    expect(lastFactor).toBe(1.0);

    // 4. Inside minDistance (very close)
    player.position.set(0, 1, 0); // distance = 1
    player.updateMatrixWorld();
    behavior.update(0.1);
    expect(lastFactor).toBe(1.0);
  });
});
