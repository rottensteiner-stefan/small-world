/// src/examples/example10.ts

import {
  AmbientLight,
  BasicMaterial,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  FPSController,
  ZoomController,
  MathUtils,
  Object3D,
  PerspectiveProjection,
  Plane,
  PointLight,
  Texture,
  WorldMaterial,
  Tube,
  Circle,
  Disk,
  LavaMaterial,
  CullMode,
  Input,
} from "../index.js";
import { AbstractExample } from "../core/index.js";

/**
 * Example 10: Textured Floor & Organic Fire Bowls.
 * Fixed: Lava plane corners hidden and bowl bottom added.
 */
export class Example10 extends AbstractExample {
  private readonly _moveSpeed: number = 15.0;
  private readonly _eyeHeight: number = 2.0;
  private readonly _lightPulseSpeed: number = 2.1;

  private _lavaTexture: Texture | undefined;
  private _lavaNormalMap: Texture | undefined;
  private _lavaDisplacementMap: Texture | undefined;
  private _lavaSpecularMap: Texture | undefined;
  private _lavaAmbientMap: Texture | undefined;

  private _lavaMaterials: LavaMaterial[] = [];
  private _lavaLights: PointLight[] = [];
  private _time: number = 0;

  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera.projection = new PerspectiveProjection({
      fov: MathUtils.degToRad(75),
      aspect,
      near: 0.1,
      far: 1000,
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, this._eyeHeight, 12);
    this.camera.theta = 0;
    this.camera.phi = 0;

    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.3 }));
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 1.0 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // Textures
    const sandTexture = await Texture.fromUrl("/resources/examples/10/sand.png", {
      anisotropy: 16,
      generateMipmaps: true,
      flipY: true,
    });
    sandTexture.repeat.x = 20;
    sandTexture.repeat.y = 20;

    const rockTexture = await Texture.fromUrl("/resources/examples/10/rock.png", {
      anisotropy: 16,
      generateMipmaps: true,
      flipY: true,
    });
    if (rockTexture) {
      rockTexture.repeat.x = 0.5;
      rockTexture.repeat.y = 0.5;
    }

    this._lavaTexture = await Texture.fromUrl("/resources/examples/10/lava.png", {
      generateMipmaps: true,
      flipY: true,
    });
    this._lavaNormalMap = await Texture.fromUrl("/resources/examples/10/lava_normal.png", {
      generateMipmaps: true,
      flipY: true,
    });
    this._lavaDisplacementMap = await Texture.fromUrl(
      "/resources/examples/10/lava_displacement.png",
      {
        generateMipmaps: true,
        flipY: true,
      },
    );
    this._lavaSpecularMap = await Texture.fromUrl("/resources/examples/10/lava_specular.png", {
      generateMipmaps: true,
      flipY: true,
    });
    this._lavaAmbientMap = await Texture.fromUrl("/resources/examples/10/lava_ambient.png", {
      generateMipmaps: true,
      flipY: true,
    });

    const floor = new Object3D("Floor");
    floor.geometry = new Plane({ width: 100, depth: 100 }).getGeometryData();
    floor.material = new BasicMaterial({ diffuseMap: sandTexture });
    this.scene.add(floor);

    const rockMaterial = new WorldMaterial({ diffuseMap: rockTexture });
    rockMaterial.color = Color.WHITE;
    rockMaterial.cullMode = CullMode.BACK;

    const pedestal = new Object3D("Pedestal");
    pedestal.geometry = new Cube({ size: 1 }).getGeometryData();
    pedestal.material = rockMaterial;
    pedestal.scale.set(15, 1, 7);
    pedestal.position.set(0, 0.5, 0);
    this.scene.add(pedestal);

    const createFireBowl = (name: string, x: number, y: number, z: number): Object3D => {
      const container = new Object3D(name);

      // 1. Bowl Structure
      const bowl = new Object3D("BowlStructure");
      bowl.geometry = new Tube({
        radius: 2.5,
        innerRadius: 1.8,
        height: 1.5,
        radialSegments: 32,
      }).getGeometryData();
      bowl.material = rockMaterial;
      bowl.position.y = 0.75;
      container.add(bowl);

      // 2. Bowl Bottom (Solid floor inside)
      const bottom = new Object3D("BowlBottom");
      bottom.geometry = new Circle({ radius: 2.5, segments: 32 }).getGeometryData();
      bottom.material = rockMaterial;
      bottom.position.y = 0.1;
      container.add(bottom);

      // 3. Lava Surface (Circular Disk to stay inside the bowl)
      const lava = new Object3D("Lava");
      // Use Disk instead of Plane or simple Circle for better tessellation and visual fit
      // Reduced radius from 1.75 to 1.6 to prevent clipping through the bowl rim (inner radius 1.8)
      const disk = new Disk({ radius: 1.6, segments: 64, rings: 16 });
      lava.geometry = disk.getGeometryData();

      const lavaMaterial = new LavaMaterial({
        color: new Color(1.5, 0.5, 0.0), // Bright magma glow
        crustColor: new Color(0.1, 0.05, 0.05), // Dark cooled rock
        noiseMap: this._lavaTexture,
        normalMap: this._lavaNormalMap,
        displacementMap: this._lavaDisplacementMap,
        specularMap: this._lavaSpecularMap,
        ambientMap: this._lavaAmbientMap,
        flowSpeed: 0.3,
        noiseScale: 2.0,
        waveAmplitude: 0.08, // Reduced from default 0.15 to prevent clipping
      });
      lavaMaterial.cullMode = CullMode.NONE;

      this._lavaMaterials.push(lavaMaterial);

      lava.material = lavaMaterial;
      lava.position.set(0, 1.25, 0); // Lowered from 1.3 to 1.25
      container.add(lava);

      const light = new PointLight({ color: new Color(1, 0.5, 0.2), intensity: 4.0, distance: 20 });
      light.position.set(0, 2.5, 0);
      container.add(light);
      this._lavaLights.push(light);

      container.position.set(x, y, z);
      return container;
    };

    this.scene.add(createFireBowl("FireBowlLeft", -4, 1, 0));
    this.scene.add(createFireBowl("FireBowlRight", 4, 1, 0));

    this.controllers.push(
      new FPSController(this.camera, { moveSpeed: this._moveSpeed }),
      new ZoomController(this.camera),
    );

    // Pointer Lock Request on click
    window.addEventListener("mousedown", () => {
      Input.requestPointerLock(this.canvas);
    });

    this.scene.update();

    await this.waitForAssets();
  }

  protected override update(deltaTime: number): void {
    this._time += deltaTime;
    this.camera.position.y = Math.max(this._eyeHeight, this.camera.position.y);

    for (const mat of this._lavaMaterials) {
      mat.time = this._time;
    }

    for (let l = 0; l < this._lavaLights.length; l++) {
      const light = this._lavaLights[l]!;
      const pulse = Math.sin(this._time * this._lightPulseSpeed + l) * 0.5 + 0.5;
      light.intensity = 3.0 + pulse * 4.0;
      light.color.g = 0.4 + pulse * 0.3;
    }
  }

  protected override getDebugInfo(): Record<string, string | number> {
    const base = super.getDebugInfo();
    return { ...base, Example: "10 - Lava Bowl Fix", "Lava Shape": "Disk (r=1.75)" };
  }
}

const app: Example10 = new Example10();
app.start();
