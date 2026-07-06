/// src/apps/yad/YadApp.ts

import {
  AbstractShowcase,
  AmbientLight,
  CameraStrategyType,
  Color,
  DirectionalLight,
  MathUtils,
  PerspectiveProjection,
  Texture,
  ZoomController,
  LavaMaterial,
  PointLight,
  AudioSystem,
} from "../../index.js";
import { YadLevelBuilder } from "./YadLevelBuilder.js";
import { TextLoader } from "../../loaders/TextLoader.js";
import { YadController } from "./YadController.js";
import { BoundingBox } from "../../physix/index.js";
import { Vector3D } from "../../math/index.js";

/**
 * YAD (Yet Another Doom)
 * Building a grid-based level from a text file.
 */
export class YadApp extends AbstractShowcase {
  private _time: number = 0;
  private _lavaMaterials: LavaMaterial[] = [];
  private _lavaLights: PointLight[] = [];

  /** @inheritdoc */
  protected override onCanvasRecreated(): void {
    // Mouse capture disabled for this example
  }

  /** @inheritdoc */
  protected override async setupScene(): Promise<void> {
    // 1. Camera Setup
    const aspect: number = window.innerWidth / window.innerHeight;
    this.camera.projection = new PerspectiveProjection({
      fov: MathUtils.degToRad(75),
      aspect,
      near: 0.1,
      far: 500,
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.phi = 0; // Look straight ahead

    // 1.5 Global Lights
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.5 }));
    const sun: DirectionalLight = new DirectionalLight({ color: Color.WHITE, intensity: 0.6 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 2. Load Textures
    const wallTex: Texture = await Texture.fromUrl("./assets/doom_pack/textures/brbrick.png", {
      flipY: true,
    });
    const floorTex: Texture = await Texture.fromUrl("./assets/doom_pack/textures/flat1_1.png", {
      flipY: true,
    });
    const ceilTex: Texture = await Texture.fromUrl("./assets/doom_pack/textures/ceil3_5.png", {
      flipY: true,
    });
    const slimeTex: Texture = await Texture.fromUrl("./assets/doom_pack/textures/slime01.png", {
      flipY: true,
    });
    const secretFloorTex: Texture = await Texture.fromUrl(
      "./assets/doom_pack/textures/flat5_4.png",
      {
        flipY: true,
      },
    );
    const secretCeilTex: Texture = await Texture.fromUrl(
      "./assets/doom_pack/textures/ceil1_1.png",
      {
        flipY: true,
      },
    );

    // We can keep lavaNoiseMap around if we still want LavaBalls, or remove them
    // For now, let's keep it to not break LavaBall
    const lavaNoise: Texture = await Texture.fromUrl("./assets/textures/lava.png", {
      flipY: true,
    });
    const lavaNorm: Texture = await Texture.fromUrl("./assets/textures/lava_normal.png", {
      flipY: true,
    });
    const lavaDisp: Texture = await Texture.fromUrl("./assets/textures/lava_displacement.png", {
      flipY: true,
    });
    const lavaSpec: Texture = await Texture.fromUrl("./assets/textures/lava_specular.png", {
      flipY: true,
    });
    const lavaAmb: Texture = await Texture.fromUrl("./assets/textures/lava_ambient.png", {
      flipY: true,
    });

    // Use proper DOOM sprites
    const barrelTex: Texture = await Texture.fromUrl("./assets/doom_pack/sprites/bar1a0.png", {
      flipY: true,
    });
    const torchTex: Texture = await Texture.fromUrl("./assets/doom_pack/sprites/firea0.png", {
      flipY: true,
    });
    const doorTex: Texture = await Texture.fromUrl("./assets/doom_pack/textures/door9_1.png", {
      flipY: true,
    });
    const secretDoorTex: Texture = await Texture.fromUrl(
      "./assets/doom_pack/textures/brbrick.png",
      {
        // Looks like wall
        flipY: true,
      },
    );
    const enemyTex: Texture = await Texture.fromUrl("./assets/doom_pack/sprites/possa1.png", {
      flipY: true,
    });
    const itemTex: Texture = await Texture.fromUrl("./assets/doom_pack/sprites/arm1a0.png", {
      flipY: true,
    });

    // 2.5 Load Audio
    const audio = AudioSystem.instance;
    await audio.load("./assets/sounds/door.wav", "door");
    await audio.load("./assets/sounds/secret.wav", "secret_door");
    await audio.load("./assets/sounds/enemy_grunt.wav", "enemy_grunt");
    await audio.load("./assets/sounds/enemy_death.wav", "enemy_death");
    await audio.load("./assets/sounds/shoot.wav", "shoot");
    await audio.load("./assets/sounds/footstep.wav", "footstep");
    await audio.load("./assets/sounds/hurt.wav", "hurt");
    await audio.load("./assets/sounds/pickup.wav", "pickup");

    // 3. Load Level Data
    const loader: TextLoader = new TextLoader();
    const mapData: string = await loader.load("./assets/levels/level1.txt");

    // 4. Build Level
    const builder: YadLevelBuilder = new YadLevelBuilder();
    const { playerStart, lavaMaterials, lavaLights } = await builder.build(this.scene, mapData, {
      floorTexture: floorTex,
      ceilingTexture: ceilTex,
      lavaNoiseMap: lavaNoise,
      lavaNormalMap: lavaNorm,
      lavaDisplacementMap: lavaDisp,
      lavaSpecularMap: lavaSpec,
      lavaAmbientMap: lavaAmb,
      playerCamera: this.camera,
      lavaFloorChars: ["T"], // Only T is lava now
      slimeFloorChars: ["~"],
      legend: {
        W: { type: "wall", texture: wallTex },
        G: { type: "wall", texture: wallTex },
        c: { type: "column", texture: wallTex },
        "+": { type: "door", texture: doorTex, doorSound: "door" },
        O: { type: "door", texture: secretDoorTex, doorSound: "secret_door" }, // Secret door looks like wall
        P: { type: "playerSpawn" },
        b: { type: "sprite", texture: barrelTex, spriteScale: 1.5, spriteY: 0.8 },
        E: { type: "sprite", texture: enemyTex, spriteScale: 2.0, spriteY: 1.0, isEnemy: true },
        I: {
          type: "sprite",
          texture: itemTex,
          spriteScale: 1.0,
          spriteY: 0.8,
          isItem: true,
          bobbing: true,
        },
        l: {
          type: "sprite",
          texture: torchTex,
          spriteScale: 1.0,
          spriteY: 1.5,
          lightColor: new Color(1.0, 0.6, 0.2),
          lightIntensity: 3.0,
        },
        S: { type: "lavaBall" },
        "~": { type: "floor", texture: slimeTex, ceilingTexture: ceilTex },
        X: { type: "floor", texture: secretFloorTex, ceilingTexture: secretCeilTex },
      },
    });

    this._lavaMaterials = lavaMaterials;
    this._lavaLights = lavaLights;
    this.camera.position.copyFrom(playerStart);

    // Start ambient creepy music
    document.addEventListener(
      "click",
      () => {
        audio.startDrone();
      },
      { once: true },
    );

    // 5. Controllers
    this.camera.addBehavior(new YadController({ moveSpeed: 10.0, scene: this.scene }));
    this.camera.addBehavior(new ZoomController());

    // 6. Final Scene Prep
    this.scene.update(); // Update all world matrices first
    this.scene.initOctrees(
      new BoundingBox(new Vector3D(-200, -50, -200), new Vector3D(200, 100, 200)),
    );
    console.log("[YadApp] Updating static octree...");
    this.scene.updateStaticOctree();
    this.debug = false; // Disable visual debugging for collisions by default

    console.log("YAD: Level 1 built.");
  }

  /** @inheritdoc */
  protected override update(deltaTime: number): void {
    this._time += deltaTime;
    for (const mat of this._lavaMaterials) {
      mat.time = this._time;
    }
    for (let l = 0; l < this._lavaLights.length; l++) {
      const light = this._lavaLights[l]!;
      const pulse = Math.sin(this._time * 2.1 + l) * 0.5 + 0.5;
      light.intensity = 3.0 + pulse * 2.0;
    }

    AudioSystem.instance.updateListener(this.camera);
  }
}

const app: YadApp = new YadApp();
app.start();
