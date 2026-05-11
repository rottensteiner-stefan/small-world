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
  Plane,
  Grid,
  InputMode,
} from "../index.js";
import { AbstractExample } from "../core/example/AbstractExample.js";

/**
 * Example 12: Rigorous Orientation Test.
 * Used to define and verify the engine's coordinate system.
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
    
    // Position standing 15 units back, at eye level (2)
    // Looking directly at origin (-Z direction)
    this.camera.position.set(0, 2, 15);
    this.camera.theta = 0;
    this.camera.phi = 0;

    // 2. Add FPS Controller (Strafe Mode)
    this.controllers.push(
      new FPSController(this.camera, { moveSpeed: 10, inputMode: InputMode.STRAFE }),
    );

    // Pointer Lock Request on click
    window.addEventListener("mousedown", () => {
      Input.requestPointerLock(this.canvas);
    });

    // 3. Lighting
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.5 }));
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 1.0 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 4. Reference Floor (Dark Plane)
    const floor = new Object3D("Ground");
    floor.geometry = new Plane({ width: 100, depth: 100 }).getGeometryData();
    floor.material = new BasicMaterial({ color: new Color(0.1, 0.1, 0.1) });
    this.scene.add(floor);

    // 5. Reference Grid (Visualizing the XZ plane)
    const grid = new Object3D("OrientationGrid");
    grid.geometry = new Grid({ size: 40, divisions: 20 }).getGeometryData();
    grid.material = new BasicMaterial({ color: new Color(0.3, 0.3, 0.3) });
    grid.position.y = 0.05; // Slightly above plane
    this.scene.add(grid);

    // 6. Coordinate System Markers (Large Cubes)
    
    // ORIGIN: White
    this.scene.add(this._createMarker(Color.WHITE, "Origin", 0, 0.5, 0));

    // FRONT (-Z): Cyan (Standard Look Direction)
    this.scene.add(this._createMarker(new Color(0, 1, 1), "FRONT (-Z)", 0, 0.5, -5));

    // BACK (+Z): Blue
    this.scene.add(this._createMarker(new Color(0, 0, 1), "BACK (+Z)", 0, 0.5, 5));

    // RIGHT (+X): Red
    this.scene.add(this._createMarker(new Color(1, 0, 0), "RIGHT (+X)", 5, 0.5, 0));

    // LEFT (-X): Yellow
    this.scene.add(this._createMarker(new Color(1, 1, 0), "LEFT (-X)", -5, 0.5, 0));
    
    // UP (+Y): Green
    this.scene.add(this._createMarker(new Color(0, 1, 0), "UP (+Y)", 0, 5, 0));

    this.scene.update();
  }

  private _createMarker(color: Color, name: string, x: number, y: number, z: number): Object3D {
    const obj = new Object3D(name);
    obj.geometry = new Cube({ size: 1 }).getGeometryData();
    obj.material = new BasicMaterial({ color });
    obj.position.set(x, y, z);
    return obj;
  }

  protected override update(_deltaTime: number): void {}
}

const app = new Example12();
app.start().catch(console.error);
