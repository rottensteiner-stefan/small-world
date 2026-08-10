import { Controller } from "../../../../../src/apps/hollow-circuit/core/behaviors/Controller.js";
import { ObjectTags } from "../../../../../src/apps/hollow-circuit/enums/ObjectTags.js";
import { Events } from "../../../../../src/apps/hollow-circuit/Events.js";
import { Object3D } from "../../../../../src/core/Object3D.js";
import { Scene } from "../../../../../src/core/Scene.js";
import { EventDispatcherImpl } from "../../../../../src/core/events/EventDispatcherImpl.js";
import { FrostglassMaterial } from "../../../../../src/core/materials/FrostglassMaterial.js";
import { Color } from "../../../../../src/core/colors/Color.js";
import { Vector3D } from "../../../../../src/math/index.js";
import { InputInterface, MouseState } from "../../../../../src/core/Input.js";
import { Keys } from "../../../../../src/enums/index.js";
import { Cube } from "../../../../../src/geometry/index.js";
import { BoundingBox } from "../../../../../src/physix/index.js";

class MockInput implements InputInterface {
  public mouse: MouseState = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    wheelX: 0,
    wheelY: 0,
    zoom: 0,
    left: false,
    right: false,
  };
  public isPointerLocked = false;
  private _keys = new Map<string, boolean>();

  public isPressed(code: string): boolean {
    return !!this._keys.get(code);
  }

  public getAxis(neg: string, pos: string): number {
    let v = 0;
    if (this.isPressed(neg)) v -= 1;
    if (this.isPressed(pos)) v += 1;
    return v;
  }

  public setKey(code: string, pressed: boolean): void {
    this._keys.set(code, pressed);
  }
}

describe("Hollow Circuit Controller", () => {
  it("falls inside a VoidZone and respawns once it drops past FALL_RESET_DEPTH", () => {
    const scene = new Scene();
    const events = new EventDispatcherImpl();
    const spawnPoint = new Vector3D(0, 1.6, 1); // Outside the VoidZone below.
    const player = new Object3D("player");
    player.position.set(0, 1.6, -10); // Inside the VoidZone.

    const controller = new Controller(events, {
      scene,
      spawnPoint,
      input: new MockInput(),
      enableCollision: false,
      voidZones: [{ minX: -1, maxX: 1, minZ: -11, maxZ: -9 }],
    });
    controller.onAttach(player);

    let fellCount = 0;
    events.addEventListener(Events.FELL, () => fellCount++);

    // Small step: falling has started but hasn't dropped far enough to respawn yet.
    controller.update(0.5);
    expect(fellCount).toBe(0);
    expect(player.position.y).toBeLessThan(1.6);

    // Large step: gravity has now carried it past the 15-unit reset depth.
    controller.update(1.0);
    expect(fellCount).toBe(1);
    expect(player.position.x).toBeCloseTo(spawnPoint.x);
    expect(player.position.y).toBeCloseTo(spawnPoint.y);
    expect(player.position.z).toBeCloseTo(spawnPoint.z);
  });

  it("consumes a Clarity Pulse charge to reveal nearby Frostglass panels, then recharges over time", () => {
    const scene = new Scene();
    const events = new EventDispatcherImpl();
    const input = new MockInput();
    const spawnPoint = new Vector3D(0, 1.6, 0);
    const player = new Object3D("player");
    player.position.copyFrom(spawnPoint);

    const panel = new Object3D("panel");
    panel.tag = ObjectTags.FROSTGLASS;
    panel.position.set(2, 1.6, 0); // Within the default 6.0 clarityPulseRadius.
    panel.material = new FrostglassMaterial({ color: new Color(1, 1, 1, 0.55), blurRadius: 0.04 });
    scene.add(panel);

    const controller = new Controller(events, {
      scene,
      spawnPoint,
      input,
      enableCollision: false,
      clarityPulseRechargeSeconds: 4.0,
    });
    controller.onAttach(player);

    let pulseCount = 0;
    events.addEventListener(Events.CLARITY_PULSE, () => pulseCount++);

    expect(controller.clarityCharges).toBe(3);

    input.setKey(Keys.E, true);
    controller.update(0.1);

    expect(pulseCount).toBe(1);
    expect(controller.clarityCharges).toBe(2);

    // Confirm the pulse animated the material radius
    expect((panel.material as FrostglassMaterial).clarityPulseRadius).toBeGreaterThan(0.0);

    input.setKey(Keys.E, false);

    // Recharge one full charge back after clarityPulseRechargeSeconds.
    controller.update(4.0);
    expect(controller.clarityCharges).toBe(3);
  });

  it("drives every Frostglass panel in the scene, not just the first one found", () => {
    const scene = new Scene();
    const events = new EventDispatcherImpl();
    const input = new MockInput();
    const spawnPoint = new Vector3D(0, 1.6, 0);
    const player = new Object3D("player");
    player.position.copyFrom(spawnPoint);

    const panelA = new Object3D("panelA");
    panelA.tag = ObjectTags.FROSTGLASS;
    panelA.position.set(2, 1.6, 0);
    panelA.material = new FrostglassMaterial({ color: new Color(1, 1, 1, 0.55) });
    scene.add(panelA);

    const panelB = new Object3D("panelB");
    panelB.tag = ObjectTags.FROSTGLASS;
    panelB.position.set(-2, 1.6, 0);
    panelB.material = new FrostglassMaterial({ color: new Color(1, 1, 1, 0.55) });
    scene.add(panelB);

    const controller = new Controller(events, {
      scene,
      spawnPoint,
      input,
      enableCollision: false,
    });
    controller.onAttach(player);

    input.setKey(Keys.E, true);
    controller.update(0.1);

    expect((panelA.material as FrostglassMaterial).clarityPulseRadius).toBeGreaterThan(0.0);
    expect((panelB.material as FrostglassMaterial).clarityPulseRadius).toBeGreaterThan(0.0);
  });

  it("does not consume a charge or fire the event when no Frostglass panel is in range", () => {
    const scene = new Scene();
    const events = new EventDispatcherImpl();
    const input = new MockInput();
    const spawnPoint = new Vector3D(0, 1.6, 0);
    const player = new Object3D("player");
    player.position.copyFrom(spawnPoint);

    const controller = new Controller(events, {
      scene,
      spawnPoint,
      input,
      enableCollision: false,
    });
    controller.onAttach(player);

    let pulseCount = 0;
    events.addEventListener(Events.CLARITY_PULSE, () => pulseCount++);

    input.setKey(Keys.E, true);
    controller.update(0.1);

    expect(pulseCount).toBe(0);
    expect(controller.clarityCharges).toBe(3);
  });

  it("does not consume a charge when a Frostglass panel exists but is outside clarityPulseRadius", () => {
    const scene = new Scene();
    const events = new EventDispatcherImpl();
    const input = new MockInput();
    const spawnPoint = new Vector3D(0, 1.6, 0);
    const player = new Object3D("player");
    player.position.copyFrom(spawnPoint);

    const panel = new Object3D("panel");
    panel.tag = ObjectTags.FROSTGLASS;
    panel.position.set(50, 1.6, 0); // Well outside the default 6.0 clarityPulseRadius.
    panel.material = new FrostglassMaterial({ color: new Color(1, 1, 1, 0.55) });
    scene.add(panel);

    const controller = new Controller(events, {
      scene,
      spawnPoint,
      input,
      enableCollision: false,
    });
    controller.onAttach(player);

    let pulseCount = 0;
    events.addEventListener(Events.CLARITY_PULSE, () => pulseCount++);

    input.setKey(Keys.E, true);
    controller.update(0.1);

    expect(pulseCount).toBe(0);
    expect(controller.clarityCharges).toBe(3);
  });

  it("does not accumulate unbounded fall velocity while resting on solid ground (tunneling regression)", () => {
    const scene = new Scene();

    // A thick floor slab, full size 20x2x20 -- top surface at world y=1.
    const floor = new Object3D("floor");
    floor.geometry = new Cube({ size: 1 }).getGeometryData();
    floor.setScale(20, 2, 20);
    floor.position.set(0, 0, 0);
    floor.isStatic = true;
    floor.updateMatrixWorld();
    floor.computeBounds();
    scene.add(floor);
    scene.initOctrees(new BoundingBox(new Vector3D(-50, -50, -50), new Vector3D(50, 50, 50)));
    scene.updateStaticOctree();

    const events = new EventDispatcherImpl();
    const spawnPoint = new Vector3D(0, 3, 0);
    const player = new Object3D("player");
    player.position.copyFrom(spawnPoint);

    const controller = new Controller(events, {
      scene,
      spawnPoint,
      input: new MockInput(),
      enableCollision: true,
      // Mirrors the real app's "big fallback void zone" covering the whole map.
      voidZones: [{ minX: -10, maxX: 10, minZ: -10, maxZ: 10 }],
    });
    controller.onAttach(player);

    let fellCount = 0;
    events.addEventListener(Events.FELL, () => fellCount++);

    // Without the grounding fix, _fallVelocityY grows every frame even while resting on
    // the floor and eventually tunnels through it within a few seconds of simulated time.
    for (let i = 0; i < 600; i++) {
      controller.update(1 / 60);
    }

    expect(fellCount).toBe(0);
    expect(player.position.y).toBeGreaterThan(0.5);
    expect(player.position.y).toBeLessThan(2.0);
  });

  it("catches a partial fall with a well-timed Void Catch, landing exactly one floor down", () => {
    const scene = new Scene();
    const events = new EventDispatcherImpl();
    const input = new MockInput();
    const spawnPoint = new Vector3D(0, 0, 0); // Plenty of headroom below the landing spot.
    const player = new Object3D("player");
    player.position.set(0, 10, 0);

    const controller = new Controller(events, {
      scene,
      spawnPoint,
      input,
      enableCollision: false,
      floorHeight: 4.0,
      voidZones: [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }],
    });
    controller.onAttach(player);

    let caughtCount = 0;
    events.addEventListener(Events.VOID_CAUGHT, () => caughtCount++);

    // Fall begins (fallStartY = 10).
    controller.update(0.05);
    // Well within the reaction window -- trigger the catch.
    input.setKey(Keys.E, true);
    controller.update(0.05);

    expect(caughtCount).toBe(1);
    expect(controller.clarityCharges).toBe(2);
    expect(player.position.y).toBeCloseTo(6.0);
  });

  it("does not catch a fall that's already gone past the reaction window", () => {
    const scene = new Scene();
    const events = new EventDispatcherImpl();
    const input = new MockInput();
    const spawnPoint = new Vector3D(0, 0, 0);
    const player = new Object3D("player");
    player.position.set(0, 10, 0);

    const controller = new Controller(events, {
      scene,
      spawnPoint,
      input,
      enableCollision: false,
      floorHeight: 4.0,
      voidZones: [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }],
    });
    controller.onAttach(player);

    let caughtCount = 0;
    events.addEventListener(Events.VOID_CAUGHT, () => caughtCount++);

    controller.update(0.05); // Fall begins.
    controller.update(1.0); // Falls well past the 0.7-floor-height reaction window.

    input.setKey(Keys.E, true);
    controller.update(0.05);

    expect(caughtCount).toBe(0);
    expect(controller.clarityCharges).toBe(3);
  });

  it("cannot Void Catch a fall with nothing below it (ground-floor voids stay a pure hazard)", () => {
    const scene = new Scene();
    const events = new EventDispatcherImpl();
    const input = new MockInput();
    const spawnPoint = new Vector3D(0, 1.6, 0); // Falling starts at spawn's own floor height.
    const player = new Object3D("player");
    player.position.copyFrom(spawnPoint);

    const controller = new Controller(events, {
      scene,
      spawnPoint,
      input,
      enableCollision: false,
      floorHeight: 4.0,
      voidZones: [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }],
    });
    controller.onAttach(player);

    let caughtCount = 0;
    events.addEventListener(Events.VOID_CAUGHT, () => caughtCount++);

    controller.update(0.05); // Fall begins, well within the reaction window.
    input.setKey(Keys.E, true);
    controller.update(0.05);

    expect(caughtCount).toBe(0);
    expect(controller.clarityCharges).toBe(3);
  });

  it("shoves the player on knockback and decays it smoothly instead of teleporting", () => {
    const scene = new Scene();
    const events = new EventDispatcherImpl();
    const spawnPoint = new Vector3D(0, 1.6, 0);
    const player = new Object3D("player");
    player.position.copyFrom(spawnPoint);

    const controller = new Controller(events, {
      scene,
      spawnPoint,
      input: new MockInput(),
      enableCollision: false,
    });
    controller.onAttach(player);

    controller.applyKnockback(new Vector3D(1, 0, 0), 10);
    controller.update(0.05);
    const afterStep1 = player.position.x;
    controller.update(0.05);
    const afterStep2 = player.position.x - afterStep1;

    expect(afterStep1).toBeGreaterThan(0);
    expect(afterStep2).toBeGreaterThan(0);
    expect(afterStep2).toBeLessThan(afterStep1); // Decaying each frame -- momentum, not a constant push.

    for (let i = 0; i < 200; i++) controller.update(0.05);
    const settled = player.position.x;

    controller.update(0.05);
    expect(Math.abs(player.position.x - settled)).toBeLessThan(0.001);
  });

  it("ignores knockback while in God Mode", () => {
    const scene = new Scene();
    const events = new EventDispatcherImpl();
    const input = new MockInput();
    const spawnPoint = new Vector3D(0, 1.6, 0);
    const player = new Object3D("player");
    player.position.copyFrom(spawnPoint);

    const controller = new Controller(events, {
      scene,
      spawnPoint,
      input,
      enableCollision: false,
    });
    controller.onAttach(player);

    input.setKey(Keys.G, true);
    controller.update(0.05); // Toggles God Mode on.
    input.setKey(Keys.G, false);

    controller.applyKnockback(new Vector3D(1, 0, 0), 10);
    controller.update(0.05);

    expect(player.position.x).toBeCloseTo(0);
  });
});
