/// examples/example10.ts

import {
  AmbientLight,
  BasicMaterial,
  WorldMaterial,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  PointLight,
  PhongMaterial,
  Input,
  Keys,
  MathUtils,
  Object3D,
  PerspectiveProjection,
  Plane,
  Texture,
  FPSController,
} from "../src/index.js";
import { AbstractExample } from "../src/core/example/AbstractExample.js";
import { createNoise2D, NoiseFunction2D } from "simplex-noise";

/**
 * Example 10: Textured Floor & Fire Bowl with Bubbling Lava.
 * Shows how to compose objects from primitives and apply vertex-displacement using SimplexNoise.
 */
export class Example10 extends AbstractExample {
  private readonly _moveSpeed: number = 15.0;
  private readonly _eyeHeight: number = 2.0;

  private _rockTexture: Texture | undefined;
  private _lavaTexture: Texture | undefined;
  private _lavaNormalMap: Texture | undefined;
  private _lavaSpecularMap: Texture | undefined;

  private _lavaPlanes: Plane[] = [];
  private _lavaOriginalVertices: Float32Array[] = [];
  private _lavaLights: PointLight[] = [];
  private _noise: NoiseFunction2D = createNoise2D();
  private _time: number = 0;

  /** @inheritdoc */
  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    // 1. Camera Setup
    const aspect: number = window.innerWidth / window.innerHeight;
    this.camera.projection = new PerspectiveProjection({
      fov: MathUtils.degToRad(75),
      aspect,
      near: 0.1,
      far: 1000,
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, this._eyeHeight, 15);

    // 2. Lighting
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.4 }));
    const sun: DirectionalLight = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 3. Textures
    const sandTexture: Texture = await Texture.fromUrl("/resources/examples/10/sand.png", {
      anisotropy: 16,
      generateMipmaps: true,
    });
    sandTexture.repeat.x = 20;
    sandTexture.repeat.y = 20;

    this._rockTexture = await Texture.fromUrl("/resources/examples/10/rock.png", {
      anisotropy: 16,
      generateMipmaps: true,
    });
    this._lavaTexture = await Texture.fromUrl("/resources/examples/10/lava.png", {
      generateMipmaps: true,
    });
    this._lavaNormalMap = await Texture.fromUrl("/resources/examples/10/lava_normal.png", {
      generateMipmaps: true,
    });
    this._lavaSpecularMap = await Texture.fromUrl("/resources/examples/10/lava_specular.png", {
      generateMipmaps: true,
    });

    // 4. Textured Floor
    const floor: Object3D = new Object3D("Floor");
    floor.geometry = new Plane({ width: 100, depth: 100 }).getGeometryData();
    floor.material = new BasicMaterial({ diffuseMap: sandTexture });
    this.scene.add(floor);

    // 5. Fire Bowls & Pedestal
    if (this._rockTexture) {
      this._rockTexture.repeat.x = 0.5;
      this._rockTexture.repeat.y = 0.5;
    }
    const rockMaterial = new WorldMaterial({ diffuseMap: this._rockTexture });

    const createBox = (
      boxName: string,
      w: number,
      h: number,
      d: number,
      bx: number,
      by: number,
      bz: number,
    ): Object3D => {
      const obj: Object3D = new Object3D(boxName);
      obj.geometry = new Cube({ size: 1 }).getGeometryData();
      obj.material = rockMaterial;
      obj.scale.set(w, h, d);
      obj.position.set(bx, by, bz);
      return obj;
    };

    /** Helper to create a fire bowl at a specific position */
    const createFireBowl = (
      name: string,
      x: number,
      y: number,
      z: number,
      seed: number,
    ): Object3D => {
      const container: Object3D = new Object3D(name);

      // Base (5 x 1 x 5)
      container.add(createBox("Base", 5, 1, 5, 0, 0.5, 0));

      // Walls
      container.add(createBox("WallFront", 5, 1, 1, 0, 1.5, 2));
      container.add(createBox("WallBack", 5, 1, 1, 0, 1.5, -2));
      container.add(createBox("WallLeft", 1, 1, 3, -2, 1.5, 0));
      container.add(createBox("WallRight", 1, 1, 3, 2, 1.5, 0));

      // 5c. Add Subdivided Lava (16x16 segments for vertex displacement)
      const lava: Object3D = new Object3D("Lava");
      const plane = new Plane({ width: 3, depth: 3, widthSegments: 16, depthSegments: 16 });
      const geomData = plane.getGeometryData();
      lava.geometry = geomData;

      // Store original vertices and offset for animation
      this._lavaOriginalVertices.push(new Float32Array(geomData.vertices));
      this._lavaPlanes.push(plane);

      // Store the seed in the object name to retrieve it in the loop
      lava.name = `Lava_${seed}`;

      // Each bowl gets its own material clone to animate textures independently
      const lavaMaterial = new PhongMaterial({
        diffuseMap: this._lavaTexture,
        normalMap: this._lavaNormalMap,
        specularMap: this._lavaSpecularMap,
        shininess: 64,
        specularColor: new Color(1, 0.5, 0.2),
      });
      lava.material = lavaMaterial;
      lava.position.set(0, 1.8, 0);
      container.add(lava);

      // 5d. Add PointLight inside
      const light = new PointLight({
        color: new Color(1, 0.4, 0.1),
        intensity: 2.0,
        distance: 10,
      });
      light.position.set(0, 2.5, 0);
      container.add(light);
      this._lavaLights.push(light);

      container.position.set(x, y, z);
      return container;
    };

    // 5a. Add Pedestal
    this.scene.add(createBox("Pedestal", 15, 1, 7, 0, 0.5, 0));

    // 5b. Add two bowls with different seeds
    this.scene.add(createFireBowl("FireBowl1", -4, 1, 0, 0));
    this.scene.add(createFireBowl("FireBowl2", 4, 1, 0, 1000));

    // 6. Setup FPS Controller
    this.controllers.push(
      new FPSController(this.camera, {
        moveSpeed: this._moveSpeed,
        enableZoom: true,
      }),
    );

    await this.waitForAssets();
  }

  /** @inheritdoc */
  protected override update(deltaTime: number): void {
    this._time += deltaTime;

    // The FPSController added in setupScene handles Mouse Look, WASD, and Q/E Fly.

    // Collision / Floor Clamp
    this.camera.position.y = Math.max(this._eyeHeight, this.camera.position.y);

    // 4. Animate Lava Vertices (Bubbling & Flowing Waves)
    for (let m: number = 0; m < this._lavaPlanes.length; m++) {
      const plane = this._lavaPlanes[m];
      const original = this._lavaOriginalVertices[m];
      if (!plane || !original) continue;

      const geom = plane.getGeometryData();
      const vertices = geom.vertices;
      const seed = m * 100; // Offset per bowl

      for (let i: number = 0; i < vertices.length; i += 3) {
        const vx = original[i]!;
        const vz = original[i + 2]!;

        // 1. Layer: Slow, large waves moving diagonal (Speed and Amplitude +15%)
        const n1 = this._noise(vx * 0.4 + this._time * 0.1725, vz * 0.4 + this._time * 0.115 + seed) * 0.2875;
        // 2. Layer: Faster, smaller bubbles/ripples (Speed and Amplitude +15%)
        const n2 = this._noise(vx * 1.5 - this._time * 0.345, vz * 1.5 + this._time * 0.23 + seed) * 0.092;

        // Combine layers
        let height = n1 + n2;

        // Damping towards the edges so lava stays inside the bowl
        const distFromCenter = Math.sqrt(vx * vx + vz * vz);
        const damping = Math.max(0, 1.0 - Math.pow(distFromCenter / 1.6, 4));
        height *= damping;

        vertices[i + 1] = height;
      }

      // Recompute normals on the plane instance
      plane.computeNormals();
      // Signal the renderer to re-upload the buffers
      geom.needsUpdate = true;
    }

    // 5. Animate Texture Offset (synchronous slow flow, Speed +15%)
    if (this._lavaTexture) {
      this._lavaTexture.offset.x += 0.01725 * deltaTime;
      this._lavaTexture.offset.y += 0.0115 * deltaTime;
    }

    // 6. Animate Lava Glow (Pulsing Intensity and Color)
    for (let l: number = 0; l < this._lavaLights.length; l++) {
      const light = this._lavaLights[l]!;
      const seed = l * 500;

      // Organic pulsing using sine and noise
      const pulse = (Math.sin(this._time * 1.5 + seed) * 0.5 + 0.5) * 0.4 +
                    (this._noise(this._time * 0.8, seed) * 0.5 + 0.5) * 0.6;

      // Intensity varies between 1.5 and 3.0
      light.intensity = 1.5 + pulse * 1.5;

      // Color varies between deep red-orange and bright lava-orange
      light.color.r = 1.0;
      light.color.g = 0.3 + pulse * 0.3; // More yellow/orange when brighter
      light.color.b = 0.1 + pulse * 0.1;
    }
  }

  /** @inheritdoc */
  protected override getDebugInfo(): Record<string, string | number> {
    const base: Record<string, string | number> = super.getDebugInfo();
    return {
      ...base,
      Example: "10 - Bubbling Lava & Vertex Displacement",
      "Lava Segments": "16x16",
      "Cam Pos": `(${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)})`,
    };
  }
}

// Start application
const app: Example10 = new Example10({
  fullscreen: true,
  quality: {
    maxAnisotropy: 16,
    msaa: 4,
    mipmapping: true,
  },
});
app.start().catch((err) => {
  console.error("Example 10 failed to start:", err);
});
