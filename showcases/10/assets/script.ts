import {
  AmbientLight,
  BasicMaterial,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  FPSController,
  ZoomController,
  Object3D,
  PerspectiveProjection,
  Ground,
  PointLight,
  Texture,
  WorldMaterial,
  Tube,
  Circle,
  Disk,
  FluidSurfaceMaterial,
  CullMode,
  MathUtils,
} from "../../../src/index.js";
import { AbstractShowcase } from "../../../src/core/index.js";

/**
 * Showcase 10: Textured Floor & Organic Fire Bowls.
 * Fixed: Lava plane corners hidden and bowl bottom added.
 */
export class Showcase10 extends AbstractShowcase {
  private readonly _moveSpeed: number = 15.0;
  private readonly _eyeHeight: number = 2.0;
  private readonly _lightPulseSpeed: number = 2.1;

  private _lavaTexture: Texture | undefined;
  private _lavaNormalMap: Texture | undefined;

  private _lavaMaterials: FluidSurfaceMaterial[] = [];
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
    const sandTexture = await Texture.fromUrl("./assets/sand.png", {
      anisotropy: 16,
      generateMipmaps: true,
      flipY: true,
    });
    sandTexture.repeat.x = 20;
    sandTexture.repeat.y = 20;

    const rockTexture = await Texture.fromUrl("./assets/rock.png", {
      anisotropy: 16,
      generateMipmaps: true,
      flipY: true,
    });
    if (rockTexture) {
      rockTexture.repeat.x = 0.5;
      rockTexture.repeat.y = 0.5;
    }

    this._lavaTexture = await Texture.fromUrl("./assets/lava.png", {
      generateMipmaps: true,
      flipY: true,
    });
    this._lavaNormalMap = await Texture.fromUrl("./assets/lava_normal.png", {
      generateMipmaps: true,
      flipY: true,
    });

    const floor = new Object3D("Floor");
    floor.geometry = new Ground({ width: 100, depth: 100 }).getGeometryData();
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
      // Disk (no corners, unlike Plane) fits snugly against the bowl's round inner wall.
      // Radius stays just under the Tube inner wall's polygon apothem (1.8 * cos(PI/32) ≈ 1.791)
      // so it can never poke through the rim.
      const disk = new Disk({ radius: 1.78, segments: 64, rings: 16 });
      lava.geometry = disk.getGeometryData();

      const lavaMaterial = new FluidSurfaceMaterial({
        color: new Color(1.5, 0.5, 0.0), // Bright magma glow
        edgeColor: new Color(0.1, 0.05, 0.05), // Dark cooled rock
        noiseMap: this._lavaTexture,
        normalMap: this._lavaNormalMap,
        flowSpeed: 0.3,
        distortion: 2.0,
        viscosity: 5.0,
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

    this.camera.addBehavior(
      new FPSController({
        input: this.input,
        audio: this.audio,
        moveSpeed: this._moveSpeed,
      }),
    );
    this.camera.addBehavior(new ZoomController({ input: this.input, audio: this.audio }));

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
}

const app: Showcase10 = new Showcase10();
app.start();
