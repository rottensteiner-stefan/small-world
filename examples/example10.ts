/// examples/example10.ts

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
  PhongMaterial,
  CullMode,
} from "../src/index.js";
import { AbstractExample } from "../src/core/example/AbstractExample.js";
import { createNoise2D, NoiseFunction2D } from "simplex-noise";

/**
 * Example 10: Textured Floor & Organic Fire Bowls.
 * Fixed: Lava plane corners hidden and bowl bottom added.
 */
export class Example10 extends AbstractExample {
  private readonly _moveSpeed: number = 15.0;
  private readonly _eyeHeight: number = 2.0;

  private _lavaTexture: Texture | undefined;
  private _lavaNormalMap: Texture | undefined;
  private _lavaSpecularMap: Texture | undefined;

  private _lavaPlanes: Plane[] = [];
  private _lavaOriginalVertices: Float32Array[] = [];
  private _lavaLights: PointLight[] = [];
  private _noise: NoiseFunction2D = createNoise2D();
  private _time: number = 0;

  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera.projection = new PerspectiveProjection({ fov: MathUtils.degToRad(75), aspect, near: 0.1, far: 1000 });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, this._eyeHeight + 4, 12);

    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.3 }));
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 1.0 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // Textures
    const sandTexture = await Texture.fromUrl("/resources/examples/10/sand.png", { anisotropy: 16, generateMipmaps: true, flipY: true });
    sandTexture.repeat.x = 20; sandTexture.repeat.y = 20;

    const rockTexture = await Texture.fromUrl("/resources/examples/10/rock.png", { anisotropy: 16, generateMipmaps: true, flipY: true });
    if (rockTexture) { rockTexture.repeat.x = 0.5; rockTexture.repeat.y = 0.5; }

    this._lavaTexture = await Texture.fromUrl("/resources/examples/10/lava.png", { generateMipmaps: true, flipY: true });
    this._lavaNormalMap = await Texture.fromUrl("/resources/examples/10/lava_normal.png", { generateMipmaps: true, flipY: true });
    this._lavaSpecularMap = await Texture.fromUrl("/resources/examples/10/lava_specular.png", { generateMipmaps: true, flipY: true });

    const floor = new Object3D("Floor");
    floor.geometry = new Plane({ width: 100, depth: 100 }).getGeometryData();
    floor.material = new BasicMaterial({ diffuseMap: sandTexture });
    this.scene.add(floor);

    const rockMaterial = new WorldMaterial({ diffuseMap: rockTexture });
    rockMaterial.color = Color.WHITE;
    rockMaterial.cullMode = CullMode.NONE;

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
      bowl.geometry = new Tube({ radius: 2.5, innerRadius: 1.8, height: 1.5, radialSegments: 32 }).getGeometryData();
      bowl.material = rockMaterial;
      bowl.position.y = 0.75; 
      container.add(bowl);

      // 2. Bowl Bottom (Solid floor inside)
      const bottom = new Object3D("BowlBottom");
      bottom.geometry = new Circle({ radius: 2.5, segments: 32 }).getGeometryData();
      bottom.material = rockMaterial;
      bottom.position.y = 0.1;
      container.add(bottom);

      // 3. Lava Surface (Smaller Plane 3.5 to stay inside)
      const lava = new Object3D("Lava");
      const plane = new Plane({ width: 3.5, depth: 3.5, widthSegments: 32, depthSegments: 32 }); 
      const geomData = plane.getGeometryData();
      lava.geometry = geomData;

      this._lavaOriginalVertices.push(new Float32Array(geomData.vertices));
      this._lavaPlanes.push(plane);

      const lavaMaterial = new PhongMaterial({
        color: new Color(1.5, 1.3, 1.0),
        diffuseMap: this._lavaTexture,
        normalMap: this._lavaNormalMap,
        specularMap: this._lavaSpecularMap,
        shininess: 256,
        specularColor: new Color(1, 0.8, 0.5),
      });
      lavaMaterial.cullMode = CullMode.NONE;
      
      lava.material = lavaMaterial;
      lava.position.set(0, 1.3, 0); 
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

    await this.waitForAssets();
  }

  protected override update(deltaTime: number): void {
    this._time += deltaTime;
    this.camera.position.y = Math.max(this._eyeHeight, this.camera.position.y);

    for (let m = 0; m < this._lavaPlanes.length; m++) {
      const plane = this._lavaPlanes[m]!;
      const original = this._lavaOriginalVertices[m]!;
      const geom = plane.getGeometryData();
      const vertices = geom.vertices;
      
      for (let i: number = 0; i < vertices.length; i += 3) {
        const vx = original[i]!; const vz = original[i + 2]!; 
        const dist = Math.sqrt(vx * vx + vz * vz);
        
        // Hide vertices that overlap with the tube walls
        if (dist > 1.85) {
            vertices[i + 1] = -0.5; 
            continue;
        }

        const n1 = this._noise(vx * 0.8 + this._time * 1.5, vz * 0.8 + m) * 0.6;
        const n2 = this._noise(vx * 3.0 - this._time * 2.5, vz * 3.0 + m) * 0.25;
        const damping = Math.max(0, 1.0 - Math.pow(dist / 1.8, 4));
        vertices[i + 1] = (n1 + n2) * damping;
      }
      plane.computeNormals();
      geom.needsUpdate = true;
    }

    if (this._lavaTexture) {
      this._lavaTexture.offset.x += 0.03 * deltaTime;
      this._lavaTexture.offset.y += 0.02 * deltaTime;
    }

    for (let l = 0; l < this._lavaLights.length; l++) {
      const light = this._lavaLights[l]!;
      const pulse = (Math.sin(this._time * 3.0 + l) * 0.5 + 0.5);
      light.intensity = 3.0 + pulse * 4.0;
      light.color.g = 0.4 + pulse * 0.3;
    }
  }

  protected override getDebugInfo(): Record<string, string | number> {
    const base = super.getDebugInfo();
    return { ...base, Example: "10 - Lava Bowl Fix", "Plane Size": "3.5x3.5" };
  }
}

const app: Example10 = new Example10();
app.start();
