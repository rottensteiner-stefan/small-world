import { YadLevelBuilder } from "./YadLevelBuilder.js";
import { YadController } from "./YadController.js";
import { YadHud } from "./YadHud.js";
import { AbstractShowcase } from "../../core/showcase/index.js";
import { AmbientLight, DirectionalLight, PointLight } from "../../core/lights/index.js";
import { CameraStrategyType } from "../../enums/index.js";
import { Color } from "../../core/colors/index.js";
import { MathUtils, Vector3D } from "../../math/index.js";
import { PerspectiveProjection } from "../../math/projections/index.js";
import { Texture } from "../../core/textures/index.js";
import { ZoomController } from "../../core/controllers/index.js";
import { FluidSurfaceMaterial } from "../../core/materials/index.js";
import { QuantizeElement } from "../../renderers/post/elements/index.js";
import { TextLoader } from "../../loaders/index.js";
import { BoundingBox } from "../../physix/index.js";

/**
 * YAD (Yet Another Dungeon)
 * Building a grid-based level from a text file.
 */
export class App extends AbstractShowcase {
  constructor() {
    super({ fullscreen: false });
  }

  private _time: number = 0;
  private _lavaMaterials: FluidSurfaceMaterial[] = [];
  private _lavaLights: PointLight[] = [];
  private _hud!: YadHud;
  private _playerController!: YadController;

  public get hud(): YadHud {
    return this._hud;
  }

  /** @inheritdoc */
  protected override onCanvasRecreated(): void {
    // Mouse capture disabled for this example
  }

  /** @inheritdoc */
  protected override async setupScene(): Promise<void> {
    // 0. Force Exact 320x200 Retro Resolution with Pillarboxing
    const resizeCanvas = (): void => {
      this.camera.aspect = 320 / 200;
      this.camera.updateProjectionMatrix();

      if (this.renderer) {
        const maxRatio = this.renderer.quality.maxPixelRatio ?? 2;
        const d = Math.min(window.devicePixelRatio || 1, maxRatio);
        this.renderer.setSize(320 / d, 200 / d);
      }

      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";
      this.canvas.style.objectFit = "fill";
      this.canvas.style.imageRendering = "pixelated";
      this.canvas.style.backgroundColor = "transparent";

      const retroScreen = document.getElementById("retro-screen");
      if (retroScreen) {
        const scale = Math.min(window.innerWidth / 320, window.innerHeight / 200);
        retroScreen.style.width = "320px";
        retroScreen.style.height = "200px";
        retroScreen.style.transform = `translate(-50%, -50%) scale(${scale})`;
        retroScreen.style.transformOrigin = "center center";
      }
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas(); // Trigger immediately to scale the view

    // 1. Camera Setup
    this.camera.projection = new PerspectiveProjection({
      fov: MathUtils.degToRad(75),
      aspect: this.camera.aspect,
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
    const wallTex: Texture = await Texture.fromUrl("./assets/dungeon_pack/textures/brbrick.png", {
      flipY: true,
    });
    const floorTex: Texture = await Texture.fromUrl("./assets/dungeon_pack/textures/flat1_1.png", {
      flipY: true,
    });
    const ceilTex: Texture = await Texture.fromUrl("./assets/dungeon_pack/textures/ceil3_5.png", {
      flipY: true,
    });
    const slimeTex: Texture = await Texture.fromUrl("./assets/dungeon_pack/textures/slime01.png", {
      flipY: true,
    });
    const secretFloorTex: Texture = await Texture.fromUrl(
      "./assets/dungeon_pack/textures/flat5_4.png",
      {
        flipY: true,
      },
    );
    const secretCeilTex: Texture = await Texture.fromUrl(
      "./assets/dungeon_pack/textures/ceil1_1.png",
      {
        flipY: true,
      },
    );

    const lavaNoise: Texture = await Texture.fromUrl("./assets/textures/lava.png", {
      flipY: true,
    });
    const lavaNorm: Texture = await Texture.fromUrl("./assets/textures/lava_normal.png", {
      generateMipmaps: true,
    });

    // Use proper Dungeon sprites
    const barrelTex: Texture = await Texture.fromUrl("./assets/dungeon_pack/sprites/bar1a0.png", {
      flipY: true,
    });
    const torchTex: Texture = await Texture.fromUrl("./assets/dungeon_pack/sprites/firea0.png", {
      flipY: true,
    });
    const doorTex: Texture = await Texture.fromUrl("./assets/dungeon_pack/textures/door9_1.png", {
      flipY: true,
    });
    const secretDoorTex: Texture = await Texture.fromUrl(
      "./assets/dungeon_pack/textures/brbrick.png",
      {
        // Looks like wall
        flipY: true,
      },
    );
    const enemyTex: Texture = await Texture.fromUrl("./assets/dungeon_pack/sprites/possa1.png", {
      flipY: true,
    });
    const itemTexArmor: Texture = await Texture.fromUrl(
      "./assets/dungeon_pack/sprites/bon2a0.png",
      {
        flipY: true,
      },
    );
    const itemTexHealth: Texture = await Texture.fromUrl(
      "./assets/dungeon_pack/sprites/bon1a0.png",
      {
        flipY: true,
      },
    );
    const itemTexWeapon: Texture = await Texture.fromUrl(
      "./assets/dungeon_pack/sprites/pista0.png",
      {
        flipY: true,
      },
    );

    // 2.5 Load Audio
    const audio = this.audio;
    await audio.load("./assets/sounds/door.wav", "door");
    await audio.load("./assets/sounds/secret.wav", "secret_door");
    await audio.load("./assets/sounds/enemy_grunt.wav", "enemy_grunt");
    await audio.load("./assets/sounds/enemy_death.wav", "enemy_death");
    await audio.load("./assets/sounds/shoot.wav", "shoot");
    await audio.load("./assets/sounds/footstep.wav", "footstep");
    await audio.load("./assets/sounds/hurt.wav", "hurt");
    await audio.load("./assets/sounds/pickup.wav", "pickup");

    // 3. Load Level Data
    let mapData = localStorage.getItem("yad_custom_map");
    if (!mapData) {
      const loader: TextLoader = new TextLoader();
      mapData = await loader.load("./assets/levels/level1.txt");
    } else {
      // Custom map loaded
    }

    // 4. Build Level
    const builder: YadLevelBuilder = new YadLevelBuilder();
    const { playerStart, lavaMaterials, lavaLights } = await builder.build(this.scene, mapData, {
      floorTexture: floorTex,
      ceilingTexture: ceilTex,
      lavaNoiseMap: lavaNoise,
      lavaNormalMap: lavaNorm,
      playerCamera: this.camera,
      audio: this.audio,
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
        E: { type: "sprite", texture: enemyTex, spriteScale: 2.0, spriteY: 0.85, isEnemy: true },
        // Items mapping
        1: {
          type: "sprite",
          texture: itemTexHealth,
          spriteScale: 0.8,
          spriteY: 0.6,
          isItem: true,
          itemType: "health",
          bobbing: true,
        },
        2: {
          type: "sprite",
          texture: itemTexArmor,
          spriteScale: 0.8,
          spriteY: 0.6,
          isItem: true,
          itemType: "armor",
          bobbing: true,
        },
        3: {
          type: "sprite",
          texture: itemTexWeapon,
          spriteScale: 1.0,
          spriteY: 0.6,
          isItem: true,
          itemType: "weapon",
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
      (): void => {
        audio.resume();
        audio.startDrone();
      },
      { once: true },
    );

    // 5. Controllers
    this._playerController = new YadController(this.events, {
      moveSpeed: 10.0,
      scene: this.scene,
      input: this.input,
      audio: this.audio,
    });
    this.camera.addBehavior(this._playerController);
    this.camera.addBehavior(new ZoomController({ input: this.input }));

    // 6. Final Scene Prep
    this.scene.update(); // Update all world matrices first
    this.scene.initOctrees(
      new BoundingBox(new Vector3D(-200, -50, -200), new Vector3D(200, 100, 200)),
    );
    this.scene.updateStaticOctree();
    this.debug = false; // Disable visual debugging for collisions by default

    // 7. Initialize HUD
    this._hud = new YadHud(this.events);

    // 8. Apply Retro Color Banding (Quantization)
    if (this.renderer) {
      this.renderer.postProcessing.enabled = true;
      const quant = new QuantizeElement();
      quant.enabled = true;
      quant.steps = 8.0; // 8 levels per RGB channel (3-bit color approximation)
      this.renderer.postProcessing.add(quant);
    }
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

    if (this._hud && this._playerController) {
      this._hud.update(deltaTime, this._playerController.bobPhase);
    }

    this.audio.updateListener(this.camera);
  }
}

if (typeof window !== "undefined") {
  const app: App = new App();
  app.start();
}
