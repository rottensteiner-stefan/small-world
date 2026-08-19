import { SmallWorld, Object3D } from "../../core/index.js";
import { AmbientLight, SpotLight } from "../../core/lights/index.js";
import { Color } from "../../core/colors/index.js";
import { StandardMaterial } from "../../core/materials/index.js";
import { EmissivePulseBehavior } from "../../core/behaviors/index.js";
import { Vector3D } from "../../math/index.js";
import { Torus } from "../../geometry/index.js";
import { CameraStrategyType, PostProcessingEffectType } from "../../enums/index.js";
import { BloomElement } from "../../renderers/post/elements/index.js";
import { BoundingBox } from "../../physix/index.js";
import { GridWallMaterial } from "./core/materials/GridWallMaterial.js";
import { MazeGenerator } from "./core/MazeGenerator.js";
import { LevelBuilder } from "./core/LevelBuilder.js";
import { Hud } from "./core/Hud.js";
import { GamePhase } from "./enums/GamePhase.js";

/** Neon-Virus palette — single source of truth for all materials. */
const GRID_GREEN = new Color(0.224, 1.0, 0.078); // #39FF14
const SEAM_MAGENTA = new Color(0.8, 0.0, 1.0); // #CC00FF
const IMPACT_CYAN = new Color(0.0, 1.0, 1.0); // #00FFFF
const STRUCTURE = new Color(0.102, 0.102, 0.18); // #1A1A2E

const MAZE_SIZE = 31;

/** DISC WARS — Phase 1 vertical slice.
 *
 *  Procedurally generated single-floor maze, FPS movement, Neon-Virus palette.
 *  Phase 1 scope: maze loads, player can walk, Disc placeholder rotates in hand.
 *  Disc physics, trajectory preview, enemies, and DerezzBehavior follow in Phases 2–5. */
export class App extends SmallWorld {
  private _hud!: Hud;
  private _playerLight!: SpotLight;
  private _wallMaterial!: GridWallMaterial;
  private _phase: GamePhase = GamePhase.IDLE;

  constructor() {
    super({ fullscreen: true, enableInspector: true });
  }

  protected override async setupScene(): Promise<void> {
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.phi = 0;

    this.scene.add(new AmbientLight({ color: STRUCTURE, intensity: 0.6 }));

    // Materials — flat emissive, no PBR textures in Phase 1.
    this._wallMaterial = new GridWallMaterial(
      [GRID_GREEN.r, GRID_GREEN.g, GRID_GREEN.b],
      [STRUCTURE.r, STRUCTURE.g, STRUCTURE.b],
      0.03,
    );

    const floorMat = new StandardMaterial({
      color: STRUCTURE,
      emissiveColor: STRUCTURE,
      emissiveIntensity: 0.15,
      roughness: 0.9,
    });

    const seamMat = new StandardMaterial({
      color: SEAM_MAGENTA,
      emissiveColor: SEAM_MAGENTA,
      emissiveIntensity: 3.5,
      roughness: 0.3,
    });

    // Generate and build maze.
    const maze = new MazeGenerator(MAZE_SIZE, MAZE_SIZE);
    maze.generate();

    const builder = new LevelBuilder();
    builder.build(this.scene, maze, this._wallMaterial, floorMat, seamMat);

    const spawnPoint = maze.getPlayerSpawn(builder.scale);
    this.camera.position.copyFrom(spawnPoint);

    // Player torch — short-range SpotLight that follows the camera every frame.
    this._playerLight = new SpotLight({
      color: GRID_GREEN,
      intensity: 2.0,
      distance: 8.0,
      angle: Math.PI / 5,
      penumbra: 0.5,
    });
    this._playerLight.position.copyFrom(spawnPoint);
    this.scene.add(this._playerLight);

    // Disc placeholder: a glowing Torus that rotates in front of the player.
    // Replaced in Phase 2 with the full DiscPhysics RigidBody.
    this._spawnDiscPlaceholder(spawnPoint);

    // Collision acceleration.
    const bounds = new BoundingBox(
      new Vector3D(-10, -2, -(MAZE_SIZE + 2) * builder.scale),
      new Vector3D((MAZE_SIZE + 2) * builder.scale, builder.height + 2, 10),
    );
    this.scene.update();
    for (const obj of this.scene.objects) obj.computeBounds();
    this.scene.initOctrees(bounds);
    this.scene.updateStaticOctree();

    // Bloom — seams and disc glow.
    if (this.renderer) {
      this.renderer.postProcessing.enabled = true;
      const bloom = this.renderer.postProcessing.get<BloomElement>(PostProcessingEffectType.BLOOM);
      if (bloom) {
        bloom.enabled = true;
        bloom.intensity = 0.9;
        bloom.threshold = 0.6;
      }
    }

    this._hud = new Hud(this.events);
    this._hud.setDiscReady();
    this._phase = GamePhase.PLAYING;

    await this.audio.load("./assets/sounds/spaceship_ambience.mp3", "ambience");

    document.addEventListener(
      "click",
      (): void => {
        this.audio.resume();
        this.audio.playMusic("ambience", true, 0.5);
      },
      { once: true },
    );
  }

  private _spawnDiscPlaceholder(near: Vector3D): void {
    const disc = new Object3D("DiscPlaceholder");
    disc.geometry = new Torus({ radius: 0.35, tube: 0.06 }).getGeometryData();
    disc.material = new StandardMaterial({
      color: IMPACT_CYAN,
      emissiveColor: IMPACT_CYAN,
      emissiveIntensity: 4.0,
      roughness: 0.2,
    });
    disc.position.set(near.x + 0.6, near.y - 0.2, near.z - 0.8);
    disc.isCollidable = false;
    disc.addBehavior(
      new EmissivePulseBehavior({ baseIntensity: 2.5, pulseAmplitude: 3.0, pulseSpeed: 2.0 }),
    );
    this.scene.add(disc);
  }

  protected override update(deltaTime: number): void {
    if (this._phase !== GamePhase.PLAYING) return;

    if (this._playerLight) {
      this._playerLight.position.copyFrom(this.camera.position);
      this._playerLight.direction
        .copyFrom(this.camera.target)
        .sub(this.camera.position)
        .normalize();
    }

    if (this._wallMaterial) {
      const t = (this._wallMaterial.properties["u_time"] as number) + deltaTime;
      this._wallMaterial.setTime(t);
    }

    this.audio.updateListener(this.camera);
  }
}

if (typeof window !== "undefined") {
  const app = new App();
  app.start().catch((err: unknown) => console.error("[DiscWars] Failed to start:", err));
}
