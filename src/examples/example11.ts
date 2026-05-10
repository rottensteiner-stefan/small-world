/// src/examples/example11.ts

import {
  BasicMaterial,
  CameraStrategyType,
  Color,
  Cylinder,
  DirectionalLight,
  FPSController,
  Input,
  Object3D,
  PerspectiveProjection,
  ProjectionType,
  Torus,
  Vector3D,
  CullMode,
} from "../index.js";
import { AbstractExample } from "../core/example/AbstractExample.js";

/**
 * Example 11: Baptismal Font Geometry Test.
 * Focuses on correctly assembling the font and investigating visibility issues.
 */
class Example11 extends AbstractExample {
  protected override async setupScene(): Promise<void> {
    // 1. Camera Setup
    if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
      this.camera.projection = new PerspectiveProjection({
        fov: (45 * Math.PI) / 180,
        aspect: window.innerWidth / window.innerHeight,
        near: 0.1,
        far: 1000,
      });
      this.camera.updateProjectionMatrix();
    }

    // Switch to FPS Strategy
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, 5, 15);
    // Align camera to look directly at the center (0, 5, 0)
    this.camera.theta = 0;
    this.camera.phi = 0;
    this.camera.target.set(0, 5, 0);

    // 2. Add FPS Controller
    const fps = new FPSController(this.camera, {
      moveSpeed: 10,
      lookSensitivity: 0.005,
    });
    this.controllers.push(fps);

    // Pointer Lock Request on click
    window.addEventListener("mousedown", () => {
      Input.requestPointerLock(this.canvas);
    });

    // 3. Lighting (Just for reference, using BasicMaterial)
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 1.0 });
    sun.direction.set(-1, -1, -1);
    this.scene.add(sun);

    // 4. Floor
    const floorMat = new BasicMaterial({ color: new Color(0.15, 0.15, 0.15) });
    floorMat.cullMode = CullMode.NONE;
    const floor = new Object3D("Floor");
    floor.geometry = new Cylinder({
      radiusTop: 20,
      radiusBottom: 20,
      height: 0.1,
    }).getGeometryData();
    floor.material = floorMat;
    floor.frustumCulled = false;
    // Position floor so its surface is at y=0
    floor.setPosition(0, -0.05, 0);
    this.scene.add(floor);

    // 5. The Baptismal Font (Properly assembled)
    this._createStoneFont(new Vector3D(0, 0, 0), "TestFont");
  }

  private _createStoneFont(pos: Vector3D, name: string): void {
    const fontRoot = new Object3D(name);
    fontRoot.setPosition(pos.x, pos.y, pos.z);

    const stoneMat = new BasicMaterial({ color: new Color(0.8, 0.8, 0.8) });
    stoneMat.cullMode = CullMode.NONE;

    // Component 1: Pedestal (Pyramid) - The base
    const pedestal = new Object3D(name + "_Pedestal");
    // Use a truncated pyramid (Cylinder with 4 segments) for a more stable look
    pedestal.geometry = new Cylinder({
      radiusTop: 1.0,
      radiusBottom: 2.0,
      height: 4,
      radialSegments: 4,
    }).getGeometryData();
    pedestal.material = stoneMat;
    pedestal.frustumCulled = false;
    pedestal.rotation.y = Math.PI / 4; // Align to axes
    pedestal.setPosition(0, 2, 0); // Bottom at 0, Top at 4
    fontRoot.add(pedestal);

    // Component 2: Bowl Base (Cylinder) - The transition
    const bowlBase = new Object3D(name + "_BowlBase");
    bowlBase.geometry = new Cylinder({
      radiusTop: 4.5,
      radiusBottom: 1.0,
      height: 2,
      radialSegments: 32,
    }).getGeometryData();
    bowlBase.material = stoneMat;
    bowlBase.frustumCulled = false;
    bowlBase.setPosition(0, 5, 0); // Sits on top of pedestal (4 + 1)
    fontRoot.add(bowlBase);

    // Component 3: Rim (Torus) - The top edge
    const rim = new Object3D(name + "_Rim");
    rim.geometry = new Torus({
      radius: 4.5,
      tube: 0.4,
      radialSegments: 16,
      tubularSegments: 32,
    }).getGeometryData();
    rim.material = stoneMat;
    rim.frustumCulled = false;
    // Torus is already flat in XZ plane by default
    rim.setPosition(0, 6.0, 0); // Sits at the top of the bowl
    fontRoot.add(rim);

    this.scene.add(fontRoot);
  }

  protected override update(_deltaTime: number): void {
    const font = this.scene.getObjectByName("TestFont");
    if (font) {
      font.rotation.y += _deltaTime * 0.15;
    }
  }
}

const app = new Example11();
app.start().catch(console.error);
