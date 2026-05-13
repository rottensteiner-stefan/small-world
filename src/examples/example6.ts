/// src/examples/example6.ts

import {
  AmbientLight,
  BoundingBox,
  CameraStrategyType,
  Capsule,
  Color,
  Cone,
  Cylinder,
  DirectionalLight,
  FPSController,
  Geometry,
  Grid,
  Input,
  Object3D,
  PerspectiveProjection,
  Pyramid,
  Sphere,
  Torus,
  Tube,
  Vector3D,
  WireframeMaterial,
  ZoomController,
} from "../index.js";
import { AbstractExample } from "../core/index.js";

/**
 * Example 6: Geometry Showcase.
 */
export class Example6 extends AbstractExample {
  private _moveSpeed: number = 10.0;

  protected override onCanvasRecreated(): void {
    super.onCanvasRecreated();
    this.canvas.addEventListener("click", (): void => {
      if (!Input.isPointerLocked) Input.requestPointerLock(this.canvas);
    });
  }

  /** @inheritdoc */
  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    // 0. Initialize Octrees for Collision
    this.scene.initOctrees(
      new BoundingBox(new Vector3D(-100, -10, -100), new Vector3D(100, 50, 100)),
    );

    // 1. Camera Setup
    const aspect: number = window.innerWidth / window.innerHeight;
    this.camera.projection = new PerspectiveProjection({
      fov: (75 * Math.PI) / 180,
      aspect,
      near: 0.1,
      far: 1000,
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, 2, 10);

    this.controllers.push(
      new FPSController(this.camera, {
        moveSpeed: this._moveSpeed,
        collisionRadius: 0.6,
        scene: this.scene,
      }),
      new ZoomController(this.camera),
    );

    // 3. Lights
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.4 }));
    const sun: DirectionalLight = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 4. Floor Grid
    const gridObj: Object3D = new Object3D("FloorGrid");
    gridObj.geometry = new Grid({ size: 100, divisions: 50 }).getGeometryData();
    const gridMat: WireframeMaterial = new WireframeMaterial();
    gridMat.color = Color.DARKSLATEGRAY;
    gridObj.material = gridMat;
    gridObj.isStatic = true;
    this.scene.add(gridObj);

    // 5. Common Wireframe Material
    const wireMat: WireframeMaterial = new WireframeMaterial();
    wireMat.color = Color.CYAN;

    const addExample = (name: string, geometry: Geometry, x: number, z: number): void => {
      const obj: Object3D = new Object3D(name);
      obj.geometry = geometry.getGeometryData();
      obj.material = wireMat;
      obj.position.set(x, 2, z);
      obj.isStatic = true;
      this.scene.add(obj);
    };

    const spacing: number = 10;
    addExample(
      "Sphere",
      new Sphere({ radius: 2, widthSegments: 32, heightSegments: 24 }),
      -spacing * 1.5,
      spacing,
    );
    addExample(
      "Pyramid",
      new Pyramid({ base: 4, height: 4, radialSegments: 4 }),
      -spacing * 0.5,
      spacing,
    );
    addExample(
      "Torus",
      new Torus({
        radius: 2,
        tube: 0.6,
        radialSegments: 16,
        tubularSegments: 32,
      }),
      spacing * 0.5,
      spacing,
    );
    addExample(
      "Capsule",
      new Capsule({
        radius: 1,
        length: 3,
        radialSegments: 16,
        capSegments: 8,
      }),
      spacing * 1.5,
      spacing,
    );

    addExample("Cone", new Cone({ radius: 2, height: 4, radialSegments: 32 }), -spacing * 1.5, 0);
    addExample(
      "Frustum",
      new Cylinder({
        radiusTop: 1,
        radiusBottom: 2,
        height: 4,
        radialSegments: 32,
      }),
      -spacing * 0.5,
      0,
    );
    addExample(
      "Cylinder",
      new Cylinder({
        radiusTop: 2,
        radiusBottom: 2,
        height: 4,
        radialSegments: 32,
      }),
      spacing * 0.5,
      0,
    );
    addExample(
      "Tube",
      new Tube({ radius: 2, innerRadius: 1.5, height: 4, radialSegments: 32 }),
      spacing * 1.5,
      0,
    );

    // IMPORTANT: Update all world matrices BEFORE computing bounds
    // and building the octree, otherwise bounds will be at (0,0,0).
    this.scene.update();

    // Now compute bounds for all static objects
    for (const obj of this.scene.objects) {
      if (obj.isStatic) obj.computeBounds();
    }

    this.scene.updateStaticOctree();
    console.log("Example 6: Scene ready.");
  }

  protected override update(_deltaTime: number): void {}

  protected override getDebugInfo(): Record<string, string | number> {
    const base = super.getDebugInfo();
    return {
      ...base,
      Example: "06 - Geometry Showcase",
    };
  }
}

const app: Example6 = new Example6();
app.start();
