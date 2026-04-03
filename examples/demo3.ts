/// examples/demo3.ts
import {
  AmbientLight,
  CameraStrategyType,
  Color,
  DirectionalLight,
  Grid,
  Input,
  Object3D,
  ObjLoader,
  PerspectiveProjection,
  ProjectionType,
  Vector3D,
  WireframeMaterial,
} from "../src/index.js";
import { AbstractDemo } from "./AbstractDemo.js";

class Demo3 extends AbstractDemo {
  // The point around which the camera rotates (center of the model)
  private _targetPos: Vector3D = new Vector3D();

  protected override async setupScene(): Promise<void> {
    Input.init();
    Input.debug = true;
    this.canvas.addEventListener("click", (): void => {
      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });

    if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
      const aspect: number = window.innerWidth / window.innerHeight;
      this.camera.projection = new PerspectiveProjection({
        fov: (75 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 1000,
      });
      this.camera.updateProjectionMatrix();
    }

    this.camera.setStrategy(CameraStrategyType.SMOOTH);
    this.camera.position.set(0, 5, 15);

    // Light setup: Ambient for soft shadows, Directional for highlights
    const ambientLight: AmbientLight = new AmbientLight({ color: Color.WHITE, intensity: 0.3 });
    this.scene.add(ambientLight);

    const sun: DirectionalLight = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1);
    this.scene.add(sun);

    const gridObj: Object3D = new Object3D("Floor");
    gridObj.geometry = new Grid({ size: 20, divisions: 20 }).getGeometryData();
    const gridMat: WireframeMaterial = new WireframeMaterial();
    gridMat.color = Color.DARKSLATEGRAY;

    gridObj.material = gridMat;
    this.scene.add(gridObj);

    const loader: ObjLoader = new ObjLoader();
    loader.setBasePath("/resources/models/");

    try {
      const model: Object3D = await loader.load("vehicle-racer.obj");
      const carScale: number = 5;
      model.scale.set(carScale, carScale, carScale);
      model.position.set(0, 0.0, 0);

      this.scene.add(model);
    } catch (error: unknown) {
      console.error("[Demo 3] Error loading model:", error);
    }
  }

  protected override onCanvasRecreated(): void {
    // Since we recreated the canvas, we must reattach the click listener!
    this.canvas.addEventListener("click", (): void => {
      if (!Input.isPointerLocked) {
        Input.requestPointerLock(this.canvas);
      }
    });
  }

  protected override update(deltaTime: number): void {
    const dx: number = Input.isPointerLocked ? Input.mouse.dx : 0;
    const dy: number = Input.isPointerLocked ? Input.mouse.dy : 0;

    // Reset deltas immediately
    Input.mouse.dx = 0;
    Input.mouse.dy = 0;

    // Update camera orbit
    this.camera.update(this._targetPos, dx, dy, deltaTime);
  }
}

// === START THE ENGINE ===
const app: Demo3 = new Demo3();
app
  .start()
  .then((): void => {
    console.log("Engine running");
  })
  .catch((err: Error): void => {
    console.error("Error while starting the engine: ", err);
  });
