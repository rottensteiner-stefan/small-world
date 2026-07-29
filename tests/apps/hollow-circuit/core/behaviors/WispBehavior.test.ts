import { WispBehavior } from "../../../../../src/apps/hollow-circuit/core/behaviors/WispBehavior.js";
import { Object3D } from "../../../../../src/core/Object3D.js";
import { StandardMaterial } from "../../../../../src/core/materials/StandardMaterial.js";
import { Color } from "../../../../../src/core/colors/Color.js";
import { Vector3D } from "../../../../../src/math/index.js";

describe("WispBehavior", () => {
  it("patrols back and forth between pointA and pointB along a triangle wave", () => {
    const obj = new Object3D("wisp");
    const wisp = new WispBehavior({
      pointA: new Vector3D(-3, 1, 0),
      pointB: new Vector3D(3, 1, 0),
      cycleSeconds: 4.0,
    });
    wisp.onAttach(obj);

    // Quarter cycle -> triangle wave at 0.5 -> halfway between A and B.
    wisp.update(1.0);
    expect(obj.position.x).toBeCloseTo(0, 5);

    // Half cycle -> triangle wave peaks at 1.0 -> at pointB.
    wisp.update(1.0);
    expect(obj.position.x).toBeCloseTo(3, 5);

    // Three-quarters -> triangle wave back down to 0.5 -> halfway again, heading back to A.
    wisp.update(1.0);
    expect(obj.position.x).toBeCloseTo(0, 5);

    // Full cycle -> back at pointA.
    wisp.update(1.0);
    expect(obj.position.x).toBeCloseTo(-3, 5);
  });

  it("can be struck once, then ignores strikes until its cooldown elapses", () => {
    const obj = new Object3D("wisp");
    obj.material = new StandardMaterial({ color: new Color(1, 1, 1) });
    const wisp = new WispBehavior({ pointA: new Vector3D(0, 1, 0), pointB: new Vector3D(1, 1, 0) });
    wisp.onAttach(obj);

    expect(wisp.canBeStruck).toBe(true);
    wisp.strike();
    expect(wisp.canBeStruck).toBe(false);

    // A second strike while already on cooldown must be a no-op (not extend the cooldown further).
    wisp.strike();

    // Still well within the 1.2s cooldown.
    wisp.update(1.0);
    expect(wisp.canBeStruck).toBe(false);

    // Cooldown (1.2s total) elapses.
    wisp.update(0.3);
    expect(wisp.canBeStruck).toBe(true);
  });

  it("flashes white while struck, then reverts to the amber patrol color", () => {
    const obj = new Object3D("wisp");
    obj.material = new StandardMaterial({ color: new Color(1, 1, 1) });
    const wisp = new WispBehavior({ pointA: new Vector3D(0, 1, 0), pointB: new Vector3D(1, 1, 0) });
    wisp.onAttach(obj);

    wisp.update(0.1); // Establish the amber patrol emissive first.
    const mat = obj.material as StandardMaterial;
    expect(mat.emissiveColor.r).toBeCloseTo(1.0);
    expect(mat.emissiveColor.b).toBeCloseTo(0.15);

    wisp.strike();
    wisp.update(0.1); // Still within the 0.6s struck flash.
    expect(mat.emissiveColor.r).toBeCloseTo(1.0);
    expect(mat.emissiveColor.g).toBeCloseTo(1.0);
    expect(mat.emissiveColor.b).toBeCloseTo(1.0);

    // The struck/patrol choice for a given update() checks the timer BEFORE decrementing
    // it, so the update that carries struckTimer below zero still renders the struck flash.
    wisp.update(0.6);
    expect(mat.emissiveColor.b).toBeCloseTo(1.0);

    // Only the following update -- now seeing a negative struckTimer -- reverts to patrol.
    wisp.update(0.1);
    expect(mat.emissiveColor.b).toBeCloseTo(0.15);
  });
});
