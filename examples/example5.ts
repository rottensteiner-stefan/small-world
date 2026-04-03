/// examples/example5.ts
import {
  AmbientLight,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  Grid,
  Input,
  Keys,
  Object3D,
  OrthographicProjection,
  PhongMaterial,
  Vector3D,
  WireframeMaterial,
} from "../src/index.js";
import { AbstractExample } from "../src/core/example/AbstractExample.js";
import { IsometricStrategy } from "../src/index.js";

/**
 * Example 5: Introduction to 2D elements and Isometric Camera.
 */
export class Example5 extends AbstractExample {
  private _player!: Object3D;
  private _targetPos: Vector3D = new Vector3D(0, 0, 0);

  protected override async setupScene(): Promise<void> {
    // 1. Setup Orthographic Camera for 2D/Isometric feel
    const aspect: number = window.innerWidth / window.innerHeight;
    const size: number = 10;
    this.camera.projection = new OrthographicProjection({
      left: -size * aspect,
      right: size * aspect, // left, right
      bottom: -size,
      top: size, // bottom, top
      near: 0.1,
      far: 1000, // near, far
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.ISOMETRIC);

    // 2. Lights
    const ambient: AmbientLight = new AmbientLight({ color: Color.WHITE, intensity: 0.4 });
    this.scene.add(ambient);

    const sun: DirectionalLight = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -0.5).normalize();
    this.scene.add(sun);

    // 3. Grid for orientation
    const gridObj: Object3D = new Object3D("IsometricGrid");
    gridObj.geometry = new Grid({ size: 100, divisions: 100 }).getGeometryData();
    const gridMat: WireframeMaterial = new WireframeMaterial();
    gridMat.color = Color.DARKSLATEGRAY;
    gridObj.material = gridMat;
    this.scene.add(gridObj);

    // 4. "Player" Cube
    this._player = new Object3D("PlayerCube");
    this._player.geometry = new Cube({ size: 1 }).getGeometryData();
    const playerMat: PhongMaterial = new PhongMaterial();
    playerMat.color = Color.DODGERBLUE;
    this._player.material = playerMat;
    this._player.position.set(0, 0.5, 0);
    this.scene.add(this._player);

    // 5. Some static "World" objects
    for (let i: number = 0; 5 > i; i++) {
      const tree: Object3D = new Object3D(`Tree_${i}`);
      tree.geometry = new Cube({ size: 0.8 }).getGeometryData();
      const treeMat: PhongMaterial = new PhongMaterial();
      treeMat.color = Color.GREEN;
      tree.material = treeMat;
      tree.position.set(Math.random() * 16 - 8, 0.4, Math.random() * 16 - 8);
      this.scene.add(tree);
    }
  }

  protected override update(deltaTime: number): void {
    const speed: number = 5.0;

    // Simple WASD movement on the isometric grid
    if (Input.isPressed(Keys.W)) {
      this._player.position.z -= speed * deltaTime;
    }
    if (Input.isPressed(Keys.S)) {
      this._player.position.z += speed * deltaTime;
    }
    if (Input.isPressed(Keys.A)) {
      this._player.position.x -= speed * deltaTime;
    }
    if (Input.isPressed(Keys.D)) {
      this._player.position.x += speed * deltaTime;
    }

    // Toggle Pixel-Perfect Snapping with 'P'
    const strategy: unknown = this.camera.strategy;
    if (strategy instanceof IsometricStrategy) {
      if (Input.isPressed(Keys.P)) {
        strategy.pixelPerfect = !strategy.pixelPerfect;
      }

      // Example of Screen-to-World (later usage)
      if (Input.mouse.left) {
        // Normalized mouse coords (-1 to 1)
        const mx: number = (Input.mouse.x / window.innerWidth) * 2 - 1;
        const my: number = -(Input.mouse.y / window.innerHeight) * 2 + 1;
        const worldPos: Vector3D = strategy.screenToWorld(mx, my, this.camera);
        this._player.position.set(worldPos.x, 0.5, worldPos.z);
      }
    }

    this._targetPos.copyFrom(this._player.position);
    this.camera.update(this._targetPos, 0, 0);
  }

  protected override getDebugInfo(): Record<string, string | number> {
    const base: Record<string, string | number> = super.getDebugInfo();
    const strategy: IsometricStrategy | undefined = this.camera.strategy as IsometricStrategy;
    return {
      ...base,
      Example: "05 - Isometric 2D/3D",
      "Pixel Snapping (P)": strategy ? (strategy.pixelPerfect ? "ON" : "OFF") : "N/A",
      "Player Pos": `(${this._player.position.x.toFixed(2)}, ${this._player.position.z.toFixed(2)})`,
    };
  }
}

// === START THE ENGINE ===
const app: Example5 = new Example5();
app
  .start()
  .then((): void => {
    console.log("Engine running");
  })
  .catch((err: Error): void => {
    console.error("Error while starting the engine: ", err);
  });
