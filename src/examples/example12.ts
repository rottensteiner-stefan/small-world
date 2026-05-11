/// src/examples/example12.ts

import {
  AmbientLight,
  BasicMaterial,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  FPSController,
  Object3D,
  PerspectiveProjection,
  Grid,
  InputMode,
  Line,
  Vector3D,
} from "../index.js";
import { AbstractExample } from "../core/example/AbstractExample.js";

/**
 * Example 12: Controls Verification & Coordinate System Test.
 * Completely rewritten to match Example 3 visual setup and clarify orientation.
 */
class Example12 extends AbstractExample {
  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    // 1. Camera Setup (Matching Example 3 FOV and aspect logic)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.projection = new PerspectiveProjection({
      fov: (75 * Math.PI) / 180,
      aspect,
      near: 0.1,
      far: 1000,
    });
    this.camera.updateProjectionMatrix();
    
    // Position matching Example 3: (0, 5, 15)
    this.camera.position.set(0, 5, 15);
    this.camera.target.set(0, 0, 0); // Look at origin
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.theta = 0;
    this.camera.phi = -0.3; // Slight tilt down to see the floor better

    // 2. Add FPS Controller
    this.controllers.push(
      new FPSController(this.camera, { moveSpeed: 10, inputMode: InputMode.STRAFE }),
    );

    // 3. Lighting (Matching Example 3)
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.3 }));
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 4. Grid (Matching Example 3)
    const gridObj = new Object3D("FloorGrid");
    gridObj.geometry = new Grid({ size: 20, divisions: 20 }).getGeometryData();
    gridObj.material = new BasicMaterial({ color: Color.DARKSLATEGRAY });
    this.scene.add(gridObj);

    // 5. Axes Markings (Colored Lines + Marker Cubes at ends)
    
    // X-Axis: RED (+X)
    this.scene.add(this._createAxis(new Vector3D(10, 0, 0), Color.RED, "Axis_X"));
    this.scene.add(this._createMarker(Color.RED, "Marker_X", 10, 0, 0));

    // Y-Axis: GREEN (+Y)
    this.scene.add(this._createAxis(new Vector3D(0, 10, 0), Color.GREEN, "Axis_Y"));
    this.scene.add(this._createMarker(Color.GREEN, "Marker_Y", 0, 10, 0));

    // Z-Axis: BLUE (+Z)
    this.scene.add(this._createAxis(new Vector3D(0, 0, 10), Color.BLUE, "Axis_Z"));
    this.scene.add(this._createMarker(Color.BLUE, "Marker_Z", 0, 0, 10));
    
    // Negative Z: CYAN (Front / Look Direction)
    this.scene.add(this._createAxis(new Vector3D(0, 0, -10), Color.CYAN, "Axis_-Z"));
    this.scene.add(this._createMarker(Color.CYAN, "Marker_-Z", 0, 0, -10));

    // Origin: WHITE
    this.scene.add(this._createMarker(Color.WHITE, "Marker_Origin", 0, 0, 0));

    this.scene.update();
  }

  private _createAxis(end: Vector3D, color: Color, name: string): Object3D {
    const obj = new Object3D(name);
    obj.geometry = new Line(new Vector3D(0, 0, 0), end).getGeometryData();
    obj.material = new BasicMaterial({ color });
    return obj;
  }

  private _createMarker(color: Color, name: string, x: number, y: number, z: number): Object3D {
    const obj = new Object3D(name);
    obj.geometry = new Cube({ size: 0.5 }).getGeometryData();
    obj.material = new BasicMaterial({ color });
    obj.position.set(x, y, z);
    return obj;
  }

  protected override update(_deltaTime: number): void {
    // We can add logic here if needed for verification
  }
}

const app = new Example12();
app.start().catch(console.error);
