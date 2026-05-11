/// src/examples/example12.ts

import {
  AmbientLight,
  BasicMaterial,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  FPSController,
  Input,
  MathUtils,
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
 * Matches the visual style of Example 3 but focused on FPS controls.
 */
class Example12 extends AbstractExample {
  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    // 1. Camera Setup
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.projection = new PerspectiveProjection({
      fov: MathUtils.degToRad(75),
      aspect,
      near: 0.1,
      far: 1000,
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.FPS);
    
    // Position matching Example 3: (0, 5, 15)
    this.camera.position.set(0, 5, 15);
    this.camera.theta = 0;
    this.camera.phi = 0;

    // 2. Add FPS Controller
    this.controllers.push(
      new FPSController(this.camera, { moveSpeed: 10, inputMode: InputMode.STRAFE }),
    );

    // 3. Lighting
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.3 }));
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 4. Grid (Matching Example 3)
    const gridObj = new Object3D("FloorGrid");
    gridObj.geometry = new Grid({ size: 20, divisions: 20 }).getGeometryData();
    gridObj.material = new BasicMaterial({ color: Color.DARKSLATEGRAY });
    this.scene.add(gridObj);

    // 5. Axes Markings (Colored Lines)
    
    // X-Axis: RED
    const xAxis = new Object3D("Axis_X");
    xAxis.geometry = new Line(new Vector3D(0, 0, 0), new Vector3D(5, 0, 0)).getGeometryData();
    xAxis.material = new BasicMaterial({ color: Color.RED });
    this.scene.add(xAxis);

    // Y-Axis: GREEN
    const yAxis = new Object3D("Axis_Y");
    yAxis.geometry = new Line(new Vector3D(0, 0, 0), new Vector3D(0, 5, 0)).getGeometryData();
    yAxis.material = new BasicMaterial({ color: Color.GREEN });
    this.scene.add(yAxis);

    // Z-Axis: BLUE
    const zAxis = new Object3D("Axis_Z");
    zAxis.geometry = new Line(new Vector3D(0, 0, 0), new Vector3D(0, 0, 5)).getGeometryData();
    zAxis.material = new BasicMaterial({ color: Color.BLUE });
    this.scene.add(zAxis);

    // 6. Directional Markers (Cubes at ends of axes)
    // Front is -Z (Cyan)
    this.scene.add(this._createMarker(Color.CYAN, "Marker_Front_-Z", 0, 0, -5));
    // Back is +Z (Blue)
    this.scene.add(this._createMarker(Color.BLUE, "Marker_Back_+Z", 0, 0, 5));
    // Right is +X (Red)
    this.scene.add(this._createMarker(Color.RED, "Marker_Right_+X", 5, 0, 0));
    // Left is -X (Yellow)
    this.scene.add(this._createMarker(Color.YELLOW, "Marker_Left_-X", -5, 0, 0));
    // Origin (White)
    this.scene.add(this._createMarker(Color.WHITE, "Marker_Origin", 0, 0, 0));

    this.scene.update();
  }

  private _createMarker(color: Color, name: string, x: number, y: number, z: number): Object3D {
    const obj = new Object3D(name);
    obj.geometry = new Cube({ size: 0.5 }).getGeometryData();
    obj.material = new BasicMaterial({ color });
    obj.position.set(x, y, z);
    return obj;
  }

  protected override update(_deltaTime: number): void {}
}

const app = new Example12();
app.start().catch(console.error);
