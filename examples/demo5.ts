/// examples/demo5.ts
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
} from "../src/index.js";
import { AbstractDemo } from "./AbstractDemo.js";
import { IsometricStrategy } from "../src/core/cameras/strategies/IsometricStrategy.js";

/**
 * Demo 5: Introduction to 2D elements and Isometric Camera.
 */
export class Demo5 extends AbstractDemo {
  private _player!: Object3D;
  private _grid!: Grid;
  private _targetPos = new Vector3D(0, 0, 0);

  protected async setupScene(): Promise<void> {
    Input.init();

    // 1. Setup Orthographic Camera for 2D/Isometric feel
    const aspect = window.innerWidth / window.innerHeight;
    const size = 10;
    this.camera.projection = new OrthographicProjection(
      -size * aspect, size * aspect, // left, right
      -size, size,                   // bottom, top
      0.1, 1000                      // near, far
    );
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.ISOMETRIC);

    // 2. Lights
    const ambient = new AmbientLight(Color.WHITE, 0.4);
    this.scene.add(ambient);

    const sun = new DirectionalLight(Color.WHITE, 0.8);
    sun.direction.set(-1, -1, -0.5).normalize();
    this.scene.add(sun);

    // 3. Grid for orientation
    this._grid = new Grid(20, 1);
    const gridObj = new Object3D("IsometricGrid");
    gridObj.geometry = this._grid.getGeometryData();
    const gridMat = new PhongMaterial();
    gridMat.color = new Color(0.3, 0.3, 0.3, 1);
    gridObj.material = gridMat;
    this.scene.add(gridObj);

    // 4. "Player" Cube
    this._player = new Object3D("PlayerCube");
    this._player.geometry = new Cube(1).getGeometryData();
    const playerMat = new PhongMaterial();
    playerMat.color = Color.DODGERBLUE;
    this._player.material = playerMat;
    this._player.position.set(0, 0.5, 0);
    this.scene.add(this._player);

    // 5. Some static "World" objects
    for (let i = 0; i < 5; i++) {
      const tree = new Object3D(`Tree_${i}`);
      tree.geometry = new Cube(0.8).getGeometryData();
      const treeMat = new PhongMaterial();
      treeMat.color = Color.GREEN;
      tree.material = treeMat;
      tree.position.set(
        Math.random() * 16 - 8,
        0.4,
        Math.random() * 16 - 8
      );
      this.scene.add(tree);
    }

    console.log("Demo 5: Isometric Camera & 2D Intro initialized.");
  }

  protected update(deltaTime: number): void {
    const speed = 5.0;
    
    // Simple WASD movement on the isometric grid
    if (Input.isPressed(Keys.W)) this._player.position.z -= speed * deltaTime;
    if (Input.isPressed(Keys.S)) this._player.position.z += speed * deltaTime;
    if (Input.isPressed(Keys.A)) this._player.position.x -= speed * deltaTime;
    if (Input.isPressed(Keys.D)) this._player.position.x += speed * deltaTime;

    // Toggle Pixel-Perfect Snapping with 'P'
    const strategy = (this.camera as any)._strategy;
    if (strategy instanceof IsometricStrategy) {
        if (Input.isPressed(Keys.P)) {
            strategy.pixelPerfect = !strategy.pixelPerfect;
            console.log(`Pixel-Perfect Snapping: ${strategy.pixelPerfect}`);
        }
        
        // Example of Screen-to-World (later usage)
        if (Input.mouse.left) {
            // Normalized mouse coords (-1 to 1)
            const mx = (Input.mouse.x / window.innerWidth) * 2 - 1;
            const my = -(Input.mouse.y / window.innerHeight) * 2 + 1;
            const worldPos = strategy.screenToWorld(mx, my, this.camera);
            this._player.position.set(worldPos.x, 0.5, worldPos.z);
        }
    }

    this._targetPos.copyFrom(this._player.position);
    this.camera.update(this._targetPos, 0, 0);
  }

  protected override getDebugInfo(): Record<string, string | number> {
    const base = super.getDebugInfo();
    const strategy = (this.camera as any)._strategy as IsometricStrategy;
    return {
      ...base,
      "Demo": "05 - Isometric 2D/3D",
      "Pixel Snapping (P)": strategy ? (strategy.pixelPerfect ? "ON" : "OFF") : "N/A",
      "Player Pos": `(${this._player.position.x.toFixed(2)}, ${this._player.position.z.toFixed(2)})`
    };
  }
}

const app = new Demo5();
app.start().catch(console.error);
