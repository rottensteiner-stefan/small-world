/// src/apps/yad/YadApp.ts

import {
  AbstractExample,
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
export class YadApp extends AbstractExample {
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
    const wallTex: Texture = await Texture.fromUrl("/resources/examples/10/rock.png", {
      flipY: true,
    });
    const floorTex: Texture = await Texture.fromUrl("/resources/examples/10/sand.png", {
      flipY: true,
    });
    const lavaNoise: Texture = await Texture.fromUrl("/resources/examples/10/lava.png", {
      flipY: true,
    });
    const lavaNorm: Texture = await Texture.fromUrl("/resources/examples/10/lava_normal.png", {
      flipY: true,
    });
    const lavaDisp: Texture = await Texture.fromUrl(
      "/resources/examples/10/lava_displacement.png",
      {
        flipY: true,
      },
    );
    const lavaSpec: Texture = await Texture.fromUrl("/resources/examples/10/lava_specular.png", {
      flipY: true,
    });
    const lavaAmb: Texture = await Texture.fromUrl("/resources/examples/10/lava_ambient.png", {
      flipY: true,
    });
    // Reuse some generic textures or placeholders
    const barrelTex: Texture = await Texture.fromUrl("/resources/examples/10/rock.png", {
      flipY: true,
    });
    const torchTex: Texture = await Texture.fromUrl("/resources/examples/10/lava.png", {
      flipY: true,
    });

    // 3. Load Level Data
    const loader: TextLoader = new TextLoader();
    const mapData: string = await loader.load("/resources/levels/level1.txt");

    // 4. Build Level
    const builder: YadLevelBuilder = new YadLevelBuilder();
    const { playerStart, lavaMaterials, lavaLights } = await builder.build(this.scene, mapData, {
      wallTexture: wallTex,
      floorTexture: floorTex,
      lavaNoiseMap: lavaNoise,
      lavaNormalMap: lavaNorm,
      lavaDisplacementMap: lavaDisp,
      lavaSpecularMap: lavaSpec,
      lavaAmbientMap: lavaAmb,
      barrelTexture: barrelTex,
      torchTexture: torchTex,
    });

    this._lavaMaterials = lavaMaterials;
    this._lavaLights = lavaLights;
    this.camera.position.copyFrom(playerStart);

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
  }
}

const app: YadApp = new YadApp();
app.start();
