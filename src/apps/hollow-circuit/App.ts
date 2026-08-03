import { SmallWorld, Object3D } from "../../core/index.js";
import { AmbientLight, PointLight } from "../../core/lights/index.js";
import { Color } from "../../core/colors/index.js";
import { StandardMaterial } from "../../core/materials/index.js";
import {
  RotatorBehavior,
  BobbingBehavior,
  ProximitySensorBehavior,
} from "../../core/behaviors/index.js";
import { Sphere } from "../../geometry/index.js";
import { Vector3D } from "../../math/index.js";
import { CameraStrategyType, PostProcessingEffectType } from "../../enums/index.js";
import { BloomElement } from "../../renderers/post/elements/index.js";
import { BoundingBox } from "../../physix/index.js";
import { Controller } from "./core/behaviors/Controller.js";
import { Hud } from "./core/Hud.js";
import { WispBehavior } from "./core/behaviors/WispBehavior.js";
import { ObjectTags } from "./enums/ObjectTags.js";
import { Events } from "./Events.js";
import { MazeGenerator } from "./core/MazeGenerator.js";
import { LevelBuilder } from "./core/LevelBuilder.js";
import { CellType } from "./enums/CellType.js";

/** Palette pulled straight from the concept dossier, kept as one source of truth. */
const VOID = new Color(0.07, 0.07, 0.09);
const CIRCUIT_VIOLET = new Color(0.54, 0.42, 1.0);
const DANGER_AMBER = new Color(1.0, 0.51, 0.26);

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

    const maze = new MazeGenerator(21, 21, 3);
    maze.generate();

    const builder = new LevelBuilder();
    builder.build(this.scene, maze, structureMat, seamMat);

    const getRandomFloorPosition = (floorIndex: number): Vector3D => {
      let tries = 0;
      while (tries < 100) {
        tries++;
        const x = 1 + Math.floor(Math.random() * (maze.width - 2));
        const z = 1 + Math.floor(Math.random() * (maze.depth - 2));
        if (maze.grid[floorIndex]![z]![x] === CellType.FLOOR) {
          return new Vector3D(x * builder.scale, floorIndex * 4 + 1.4, -z * builder.scale);
        }
      }
      return maze.getSpawnPoint(builder.scale);
    };

    // --- Randomly place Wisps ---
    const wispGeo = new Sphere({ radius: 0.3 }).getGeometryData();
    for (let i = 0; i < 6; i++) {
      const wisp = new Object3D(`Wisp_${i}`);
      wisp.geometry = wispGeo;
      wisp.material = wispMat.clone();
      wisp.tag = ObjectTags.WISP;

      const posA = getRandomFloorPosition(Math.floor(Math.random() * 3));
      const posB = new Vector3D(
        posA.x + (Math.random() * 8 - 4),
        posA.y,
        posA.z + (Math.random() * 8 - 4),
      );

      const wispBehavior = new WispBehavior({ pointA: posA, pointB: posB });
      wisp.addBehavior(wispBehavior);
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
    }

    // --- Randomly place Flux Discs ---
    const discGeo = new Sphere({ radius: 0.3 }).getGeometryData();
    for (let i = 0; i < 15; i++) {
      const pos = getRandomFloorPosition(Math.floor(Math.random() * 3));
      const disc = new Object3D(`Disc_${i}`);
      disc.geometry = discGeo;
      disc.material = discMat;
      disc.position.copyFrom(pos);
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
    this.scene.initOctrees(
      new BoundingBox(new Vector3D(-20, -10, -120), new Vector3D(120, 30, 20)),
    );
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

    const spawnPoint = maze.getSpawnPoint(builder.scale);
    this.camera.position.copyFrom(spawnPoint);
    this._controller = new Controller(this.events, {
      scene,
      spawnPoint,
      input: this.input,
      audio: this.audio,
      moveSpeed: 6.0,
      voidZones: [{ minX: -100, maxX: 200, minZ: -200, maxZ: 100 }], // Big fallback void zone
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
