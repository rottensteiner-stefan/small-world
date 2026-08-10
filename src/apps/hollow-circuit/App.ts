import { SmallWorld, Object3D } from "../../core/index.js";
import { AmbientLight, PointLight } from "../../core/lights/index.js";
import { Color } from "../../core/colors/index.js";
import { StandardMaterial, FrostglassMaterial } from "../../core/materials/index.js";
import {
  RotatorBehavior,
  BobbingBehavior,
  ProximitySensorBehavior,
} from "../../core/behaviors/index.js";
import { Sphere, Cube } from "../../geometry/index.js";
import { Vector3D } from "../../math/index.js";
import {
  CameraStrategyType,
  PostProcessingEffectType,
  CameraEffectType,
} from "../../enums/index.js";
import { BloomElement } from "../../renderers/post/elements/index.js";
import { BoundingBox } from "../../physix/index.js";
import { Controller } from "./core/behaviors/Controller.js";
import { Hud } from "./core/Hud.js";
import { WispBehavior } from "./core/behaviors/WispBehavior.js";
import { ImpactFlashBehavior } from "./core/behaviors/ImpactFlashBehavior.js";
import { ObjectTags } from "./enums/ObjectTags.js";
import { Events } from "./Events.js";
import { MazeGenerator } from "./core/MazeGenerator.js";
import { LevelBuilder } from "./core/LevelBuilder.js";
import { CellType } from "./enums/CellType.js";

/** Palette pulled straight from the concept dossier, kept as one source of truth. */
const VOID = new Color(0.07, 0.07, 0.09);
const CIRCUIT_VIOLET = new Color(0.54, 0.42, 1.0);
const DANGER_AMBER = new Color(1.0, 0.51, 0.26);
const FROSTGLASS = new Color(0.66, 0.77, 0.85);
const SHORTCUT_CYAN = new Color(0.25, 0.85, 0.9);

/** How close the player needs to be (in world units) to collect a Disc or contact a Wisp. */
const CONTACT_RADIUS = 1.5;

/**
 * Hollow Circuit -- first vertical slice.
 *
 * Deliberately small: a procedurally generated multi-floor maze, a handful of
 * Frostglass panels per floor (each a dedicated FrostglassMaterial instance doing
 * real screen-space blur over the opaque capture texture, the same technique
 * GlassMaterial uses for refraction), patrolling Wisps, a spread of Flux Discs, and
 * VoidZones so the "you can just fall" edge from the concept sketches is real.
 * Additional space types from the concept dossier are intentionally deferred until
 * this core loop feels right to move through.
 *
 * Each panel's Clarity Pulse reveal is driven by the Controller, which eases
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
      roughness: 0.35,
      blurRadius: 0.05,
      transmission: 0.85,
    });
    // Brighter and glossier than the ordinary seamMat -- reads as a dedicated fixture
    // uplighting a Frostglass panel from below, not just more of the ambient wiring.
    const ledMat = new StandardMaterial({
      color: CIRCUIT_VIOLET,
      emissiveColor: CIRCUIT_VIOLET,
      emissiveIntensity: 6.0,
      roughness: 0.2,
    });
    // Maze Flow: the shortcut route reads as the riskier option because it's dim and
    // cyan instead of brightly violet-lit, not because it's mechanically more dangerous.
    const shortcutSeamMat = new StandardMaterial({
      color: SHORTCUT_CYAN,
      emissiveColor: SHORTCUT_CYAN,
      emissiveIntensity: 2.4,
      roughness: 0.4,
    });

    const maze = new MazeGenerator(21, 21, 3);
    maze.generate();

    const builder = new LevelBuilder();
    builder.build(this.scene, maze, structureMat, seamMat, frostglassMat, ledMat, shortcutSeamMat);

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

            // Shove the player away from the Wisp. Whether that's dangerous depends
            // entirely on what's underfoot in that direction -- no separate "near a void
            // edge" check needed: if the shove carries the player onto a void tile, the
            // existing fall system just takes over from there (see Controller.applyKnockback).
            const dx = this.camera.position.x - wisp.position.x;
            const dz = this.camera.position.z - wisp.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz) || 1;
            this._controller.applyKnockback(new Vector3D(dx / dist, 0, dz / dist));

            this._spawnImpactTrace(wisp.position, DANGER_AMBER);
            this.camera.applyEffect(CameraEffectType.SHAKE, 0.35, 0.25);
            this.audio.playTone(180, 0.15, 0.5, "sawtooth");
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
            this.audio.playTone(1000, 0.08, 0.25, "sine");
          },
        }),
      );
      scene.add(disc);
    }

    // --- Place the Exfil point: a real goal on the top floor ---
    const exfilPos = maze.getExfilPoint(builder.scale, builder.height);
    const exfil = new Object3D("Exfil");
    exfil.geometry = new Sphere({ radius: 0.5 }).getGeometryData();
    exfil.material = new StandardMaterial({
      color: Color.WHITE,
      emissiveColor: Color.WHITE,
      emissiveIntensity: 3.0,
      roughness: 0.2,
    });
    exfil.position.copyFrom(exfilPos);
    exfil.tag = ObjectTags.EXFIL;
    exfil.addBehavior(new RotatorBehavior(new Vector3D(0, 2.0, 0)));
    exfil.addBehavior(new BobbingBehavior(0.25, 1.5));
    let exfilReached = false;
    exfil.addBehavior(
      new ProximitySensorBehavior({
        targetObj: this.camera,
        radius: CONTACT_RADIUS,
        planar: true,
        onUpdate: (_factor, distance): void => {
          if (exfilReached || distance > CONTACT_RADIUS) return;
          exfilReached = true;
          this.events.dispatchEvent(Events.EXFIL_REACHED, {});
          this.camera.applyEffect(CameraEffectType.FLASH, 1.0, 0.4);
          this.audio.playTone(660, 0.18, 0.45, "sine");
          setTimeout(() => this.audio.playTone(880, 0.25, 0.45, "sine"), 150);
        },
      }),
    );
    scene.add(exfil);
    const exfilLight = new PointLight({ color: Color.WHITE, intensity: 3.0, distance: 6.0 });
    exfil.add(exfilLight);

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
      floorHeight: builder.height,
    });
    this.camera.addBehavior(this._controller);
    this.events.addEventListener(Events.FELL, (): void => {
      this._spawnImpactTrace(spawnPoint, DANGER_AMBER);
      this.camera.applyEffect(CameraEffectType.SHAKE, 0.6, 0.4);
      this.audio.playTone(90, 0.3, 0.6, "square");
    });
    this.events.addEventListener(Events.VOID_CAUGHT, (): void => {
      this.camera.applyEffect(CameraEffectType.FLASH, 0.6, 0.2);
      this.audio.playTone(720, 0.15, 0.45, "sine");
    });

    // Ambient drone: browsers require a user gesture before audio can start.
    document.addEventListener(
      "click",
      (): void => {
        this.audio.resume();
        this.audio.startDrone();
      },
      { once: true },
    );

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

  /**
   * Impact Trace: scatters a handful of small emissive shards near `position` that
   * flash and fade over ~0.4s (see ImpactFlashBehavior), reading as the seam network
   * cracking with feedback at the moment of a Wisp strike or a hard fall reset.
   */
  private _spawnImpactTrace(position: Vector3D, color: Color): void {
    const shardGeo = new Cube({ size: 1 }).getGeometryData();
    for (let i = 0; i < 4; i++) {
      const shard = new Object3D(`ImpactShard_${Math.random().toString(36).slice(2)}`);
      shard.geometry = shardGeo;
      shard.material = new StandardMaterial({
        color,
        emissiveColor: color,
        emissiveIntensity: 8.0,
        roughness: 0.3,
      });
      shard.setScale(0.5, 0.1, 0.1);
      shard.position.set(
        position.x + (Math.random() * 1.2 - 0.6),
        position.y + (Math.random() * 1.2 - 0.6),
        position.z + (Math.random() * 1.2 - 0.6),
      );
      shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      shard.isCollidable = false;
      shard.addBehavior(new ImpactFlashBehavior({ scene: this.scene }));
      this.scene.add(shard);
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
