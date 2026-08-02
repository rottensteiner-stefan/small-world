import { SmallWorld, Object3D } from "../../core/index.js";
import { AmbientLight, PointLight } from "../../core/lights/index.js";
import { Color } from "../../core/colors/index.js";
import {
  AbstractMaterial,
  StandardMaterial,
  FrostglassMaterial,
} from "../../core/materials/index.js";
import {
  RotatorBehavior,
  BobbingBehavior,
  ProximitySensorBehavior,
} from "../../core/behaviors/index.js";
import { Cube, Sphere } from "../../geometry/index.js";
import { Vector3D } from "../../math/index.js";
import { CameraStrategyType, PostProcessingEffectType } from "../../enums/index.js";
import { BloomElement } from "../../renderers/post/elements/index.js";
import { BoundingBox } from "../../physix/index.js";
import { Controller } from "./core/behaviors/Controller.js";
import { Hud } from "./core/Hud.js";
import { WispBehavior } from "./core/behaviors/WispBehavior.js";

import { ObjectTags } from "./enums/ObjectTags.js";
import { Events } from "./Events.js";

/** Palette pulled straight from the concept dossier, kept as one source of truth. */
const VOID = new Color(0.07, 0.07, 0.09);
const CIRCUIT_VIOLET = new Color(0.54, 0.42, 1.0);
const DANGER_AMBER = new Color(1.0, 0.51, 0.26);
const FROSTGLASS = new Color(0.66, 0.77, 0.85);
/** How close the player needs to be (in world units) to collect a Disc or contact a Wisp. */
const CONTACT_RADIUS = 1.5;

/**
 * Hollow Circuit -- first vertical slice.
 *
 * Deliberately small: one Corridor, one Room, one Frostglass panel (a dedicated
 * FrostglassMaterial doing real screen-space blur over the opaque capture texture,
 * the same technique GlassMaterial uses for refraction), one patrolling Wisp, a
 * handful of Flux Discs, and a single VoidZone so the "you can just fall" edge from
 * the concept sketches is real. Everything else in the concept dossier (Impact Trace,
 * Maze Flow branching routes, additional space types) is intentionally deferred until
 * this core loop feels right to move through.
 *
 * The panel's Clarity Pulse reveal is driven by the Controller, which eases
 * clarityPulseRadius on the material out and back in over clarityPulseDuration
 * whenever a pulse lands within range (see Controller._updateClarityPulseEffect).
 */
export class App extends SmallWorld {
  private _controller!: Controller;
  private _hud!: Hud;

  constructor() {
    super({ fullscreen: true, enableInspector: true });
  }

  protected override async setupScene(): Promise<void> {
    const scene = this.scene;

    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.phi = 0;

    // "Black, lit only by its own wiring" is the intended look, but too little ambient
    // reads as an unlit void rather than a dark corridor -- this is a first pass at the
    // balance, not a final value.
    this.scene.add(new AmbientLight({ color: new Color(0.4, 0.42, 0.5), intensity: 0.28 }));

    const structureMat = new StandardMaterial({ color: VOID, roughness: 0.85, metallic: 0.1 });
    const seamMat = new StandardMaterial({
      color: CIRCUIT_VIOLET,
      emissiveColor: CIRCUIT_VIOLET,
      emissiveIntensity: 3.2,
      roughness: 0.4,
    });
    const discMat = new StandardMaterial({
      color: Color.WHITE,
      emissiveColor: new Color(1.0, 0.97, 0.9),
      emissiveIntensity: 0.7,
      roughness: 0.3,
      metallic: 0.2,
    });
    const wispMat = new StandardMaterial({
      color: DANGER_AMBER,
      emissiveColor: DANGER_AMBER,
      emissiveIntensity: 0.6,
      roughness: 0.5,
    });
    const frostglassMat = new FrostglassMaterial({
      color: FROSTGLASS,
      roughness: 0.25,
      blurRadius: 0.04,
      transmission: 0.85,
    });

    const cubeGeo = new Cube({ size: 1 }).getGeometryData();

    const addBox = (
      name: string,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      material: AbstractMaterial,
      isStatic: boolean = true,
    ): Object3D => {
      const box = new Object3D(name);
      box.geometry = cubeGeo;
      box.setScale(w, h, d);
      box.position.set(x, y, z);
      box.material = material;
      box.isStatic = isStatic;
      scene.add(box);
      return box;
    };

    const addSeam = (name: string, w: number, d: number, x: number, y: number, z: number): void => {
      // Thin glowing strip along a floor/wall/ceiling joint. Purely cosmetic, not part of
      // collision (isCollidable = false), but genuinely static (it never moves) -- marking
      // it non-static would sweep it into the dynamic octree every single frame for an
      // insertion that always fails anyway (computeBounds() returns no bounds at all for
      // non-collidable objects), spamming a console warning every frame for no reason.
      // Inset slightly from the wall face (rather than flush) to avoid z-fighting.
      const seam = addBox(name, w, 0.1, d, x, y, z, seamMat);
      seam.isCollidable = false;
    };

    // --- Corridor: x -2..2, z 2..-14, y 0..3 ---
    addBox("Corridor_Floor", 4, 0.2, 16, 0, -0.1, -6, structureMat);
    addBox("Corridor_Ceiling", 4, 0.2, 16, 0, 3.1, -6, structureMat);
    addBox("Corridor_WallL", 0.2, 3, 16, -2, 1.5, -6, structureMat);
    addBox("Corridor_WallR", 0.2, 3, 16, 2, 1.5, -6, structureMat);
    addSeam("Corridor_SeamL", 0.1, 16, -1.9, 0.05, -6);
    addSeam("Corridor_SeamR", 0.1, 16, 1.9, 0.05, -6);

    // --- Room: x -6..6, z -14..-30, y 0..4 -- floor only to z=-26, the rest is VoidZone ---
    addBox("Room_Floor", 12, 0.2, 12, 0, -0.1, -20, structureMat);
    addBox("Room_Ceiling", 12, 0.2, 16, 0, 4.1, -22, structureMat);
    addBox("Room_WallL", 0.2, 4, 16, -6, 2, -22, structureMat);
    addBox("Room_WallBack", 12, 4, 0.2, 0, 2, -30, structureMat);

    // --- Frostglass panel, right side of the room, with a glowing blob behind it ---
    const panel = addBox("Frostglass_Panel", 0.3, 3, 4, 5.9, 1.7, -20, frostglassMat);
    panel.tag = ObjectTags.FROSTGLASS;

    const blob = new Object3D("Frostglass_Blob");
    blob.geometry = new Sphere({ radius: 0.4 }).getGeometryData();
    blob.material = wispMat;
    blob.position.set(7.5, 1.7, -20);
    scene.add(blob);
    const blobLight = new PointLight({ color: DANGER_AMBER, intensity: 3.0, distance: 5.0 });
    blob.add(blobLight);

    // --- One patrolling, contact-able Wisp, out in the open ---
    const wisp = new Object3D("Wisp_01");
    wisp.geometry = new Sphere({ radius: 0.3 }).getGeometryData();
    wisp.material = wispMat.clone();
    wisp.tag = ObjectTags.WISP;
    const wispBehavior = new WispBehavior({
      pointA: new Vector3D(-3, 1, -16),
      pointB: new Vector3D(3, 1, -16),
    });
    wisp.addBehavior(wispBehavior);
    // Contact is a repeatable proximity trigger, not a one-shot pickup -- gated by
    // WispBehavior's own cooldown, so this sensor just keeps reporting distance.
    wisp.addBehavior(
      new ProximitySensorBehavior({
        targetObj: this.camera,
        radius: CONTACT_RADIUS,
        planar: true,
        onUpdate: (_factor, distance): void => {
          if (distance > CONTACT_RADIUS || !wispBehavior.canBeStruck) return;
          wispBehavior.strike();
          this.events.dispatchEvent(Events.WISP_CONTACT, {});
        },
      }),
    );
    scene.add(wisp);
    const wispLight = new PointLight({ color: DANGER_AMBER, intensity: 2.0, distance: 4.0 });
    wisp.add(wispLight);

    // --- Flux Discs ---
    const discGeo = new Sphere({ radius: 0.3 }).getGeometryData();
    const discPositions: Array<[number, number, number]> = [
      [0, 1.4, -4],
      [1.3, 1.4, -20],
      [-1.3, 1.4, -24],
      [4.0, 1.4, -22],
    ];
    for (let i = 0; i < discPositions.length; i++) {
      const [x, y, z] = discPositions[i]!;
      const disc = new Object3D(`Disc_${i}`);
      disc.geometry = discGeo;
      disc.material = discMat;
      disc.position.set(x, y, z);
      disc.tag = ObjectTags.DISC;
      disc.addBehavior(new RotatorBehavior(new Vector3D(0, 1.5, 0)));
      disc.addBehavior(new BobbingBehavior(0.15, 2.0));
      disc.addBehavior(
        new ProximitySensorBehavior({
          targetObj: this.camera,
          radius: CONTACT_RADIUS,
          planar: true,
          onUpdate: (_factor, distance): void => {
            if (distance > CONTACT_RADIUS || !disc.isVisible) return;
            disc.isVisible = false;
            disc.isCollidable = false;
            this.events.dispatchEvent(Events.DISC_COLLECTED, {});
          },
        }),
      );
      scene.add(disc);
    }

    // --- Finalize scene, build collision octrees ---
    this.scene.update();
    for (const obj of this.scene.objects) obj.computeBounds();
    this.scene.initOctrees(new BoundingBox(new Vector3D(-40, -30, -40), new Vector3D(40, 30, 20)));
    this.scene.updateStaticOctree();
    // Discs/Wisp/the Frostglass blob are non-static and land in the dynamic octree every
    // frame (Scene.update() does this unconditionally) -- and FrustumCuller.cull() ALSO
    // reads that same octree to decide what's "in frustum" for anything without a static
    // parent. Disabling the dynamic octree (an earlier version of this code did) silently
    // makes every non-static object un-cullable-into-visibility -- their lights still
    // affect the scene, but their own mesh never draws. Left enabled on purpose: CONTACT_RADIUS
    // (1.5) is larger than the FirstPersonController's collision radius plus a Disc's/Wisp's
    // own (~1.0), so the pickup/contact event (fired by each object's own ProximitySensorBehavior)
    // always fires before physical collision blocking ever could -- there's nothing here for
    // the player to actually get stuck on.

    // --- Player controller ---
    const spawnPoint = new Vector3D(0, 1.6, 1);
    this.camera.position.copyFrom(spawnPoint);
    this._controller = new Controller(this.events, {
      scene,
      spawnPoint,
      input: this.input,
      audio: this.audio,
      moveSpeed: 6.0,
      voidZones: [{ minX: -6, maxX: 6, minZ: -30, maxZ: -26 }],
    });
    this.camera.addBehavior(this._controller);

    // --- HUD ---
    this._hud = new Hud(this.events);

    // --- Bloom: the whole "glow through the seams/Frostglass" look leans on this ---
    if (this.renderer) {
      this.renderer.postProcessing.enabled = true;
      const bloom = this.renderer.postProcessing.get<BloomElement>(PostProcessingEffectType.BLOOM);
      if (bloom) {
        bloom.enabled = true;
        bloom.intensity = 0.6;
        bloom.threshold = 0.7;
      }
    }
  }

  protected override update(_deltaTime: number): void {
    if (this._hud && this._controller) {
      this._hud.update(this._controller.clarityCharges, 3);
    }
    this.audio.updateListener(this.camera);
  }
}

if (typeof window !== "undefined") {
  const app = new App();
  app.start().catch((err: unknown) => console.error("[HollowCircuit] Failed to start:", err));
}
