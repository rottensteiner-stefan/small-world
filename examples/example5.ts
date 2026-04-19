/// examples/example5.ts

import {
  AmbientLight,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  Grid,
  Object3D,
  OrthographicProjection,
  Vector3D,
  WireframeMaterial,
  PhongMaterial,
  Input,
  Keys,
  IsometricStrategy,
} from "../src/index.js";
import { AbstractExample } from "../src/core/example/AbstractExample.js";

/**
 * Example 5: Grid-based Movement with Enemies.
 */
export class Example5 extends AbstractExample {
  private _player!: Object3D;
  private _enemies: Object3D[] = [];
  private _targetPos: Vector3D = new Vector3D(0, 0, 0);

  // Movement State
  private _isMoving: boolean = false;
  private _moveProgress: number = 0;
  private _moveStart: Vector3D = new Vector3D();
  private _moveEnd: Vector3D = new Vector3D();
  private _moveDuration: number = 0.2;

  protected override async setupScene(): Promise<void> {
    // 1. Setup Orthographic Projection (Perfect for 15x15 grid)
    const aspect: number = window.innerWidth / window.innerHeight;
    const frustumSize: number = 15;

    this.camera.projection = new OrthographicProjection({
      left: (-frustumSize * aspect) / 2,
      right: (frustumSize * aspect) / 2,
      top: frustumSize / 2,
      bottom: -frustumSize / 2,
      near: 0.1,
      far: 1000,
    });
    this.camera.updateProjectionMatrix();

    // 2. Isometric Strategy
    this.camera.setStrategy(CameraStrategyType.ISOMETRIC);

    // 3. Lighting
    const ambient: AmbientLight = new AmbientLight({ color: Color.WHITE, intensity: 0.4 });
    this.scene.add(ambient);

    const sun: DirectionalLight = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
    sun.direction.set(-1, -1, -1).normalize();
    this.scene.add(sun);

    // 4. Floor Grid (15x15 units)
    const gridSize = 15;
    const gridObj: Object3D = new Object3D("FloorGrid");
    gridObj.geometry = new Grid({ size: gridSize, divisions: gridSize }).getGeometryData();
    const gridMat: WireframeMaterial = new WireframeMaterial();
    gridMat.color = Color.DARKSLATEGRAY;
    gridObj.material = gridMat;
    this.scene.add(gridObj);

    // 5. Setup Materials
    const playerMat = new PhongMaterial({ color: Color.DODGERBLUE });
    const enemyMat = new PhongMaterial({ color: Color.RED });

    // 6. Create Player
    this._player = this._createActor("Player", playerMat);
    this._player.position.set(0.5, 0, 0.5); 
    this.scene.add(this._player);

    // 7. Create 3 Enemies at random positions
    for (let i = 0; i < 3; i++) {
      const enemy = this._createActor(`Enemy_${i}`, enemyMat);
      
      // Random grid center position within 15x15 (-7.5 to 7.5)
      const rx = Math.floor(Math.random() * 14 - 7) + 0.5;
      const rz = Math.floor(Math.random() * 14 - 7) + 0.5;
      enemy.position.set(rx, 0, rz);
      
      this._enemies.push(enemy);
      this.scene.add(enemy);
    }

    console.log("Example 5: Isometric Scene with Enemies ready.");
  }

  private _createActor(name: string, material: PhongMaterial): Object3D {
    const actor = new Object3D(name);
    
    const pBase = new Object3D(`${name}_Base`);
    pBase.geometry = new Cube({ size: 1.0 }).getGeometryData();
    pBase.material = material;
    pBase.position.y = 0.5;
    actor.add(pBase);

    const pMid = new Object3D(`${name}_Mid`);
    pMid.geometry = new Cube({ size: 0.5 }).getGeometryData();
    pMid.material = material;
    pMid.position.y = 1.25;
    actor.add(pMid);

    const pTop = new Object3D(`${name}_Top`);
    pTop.geometry = new Cube({ size: 0.25 }).getGeometryData();
    pTop.material = material;
    pTop.position.y = 1.625;
    actor.add(pTop);

    return actor;
  }

  protected override update(deltaTime: number): void {
    // A) Keyboard Input
    if (!this._isMoving) {
      let dx = 0; let dz = 0;
      if (Input.isPressed(Keys.W)) dz = -1;
      else if (Input.isPressed(Keys.S)) dz = 1;
      else if (Input.isPressed(Keys.A)) dx = -1;
      else if (Input.isPressed(Keys.D)) dx = 1;

      if (dx !== 0 || dz !== 0) {
        this._startMove(this._player.position.x + dx, this._player.position.z + dz);
      }
    }

    // B) Mouse Click
    const strategy = this.camera.strategy;
    if (strategy instanceof IsometricStrategy && Input.mouse.left && !this._isMoving) {
      const mx = (Input.mouse.x / window.innerWidth) * 2 - 1;
      const my = -(Input.mouse.y / window.innerHeight) * 2 + 1;
      const worldPos = strategy.screenToWorld(mx, my, this.camera);
      const nextX = Math.floor(worldPos.x) + 0.5;
      const nextZ = Math.floor(worldPos.z) + 0.5;
      this._startMove(nextX, nextZ);
    }

    // C) Movement Interpolation
    if (this._isMoving) {
      this._moveProgress += deltaTime / this._moveDuration;
      if (this._moveProgress >= 1.0) {
        this._moveProgress = 1.0;
        this._isMoving = false;
      }
      this._player.position.x = this._moveStart.x + (this._moveEnd.x - this._moveStart.x) * this._moveProgress;
      this._player.position.z = this._moveStart.z + (this._moveEnd.z - this._moveStart.z) * this._moveProgress;
    }

    // Camera follows player
    this._targetPos.copyFrom(this._player.position);
    this.camera.update(this._targetPos, 0, 0);
  }

  private _startMove(tx: number, tz: number): void {
    const halfGrid = 15 / 2;
    if (tx > -halfGrid && tx < halfGrid && tz > -halfGrid && tz < halfGrid) {
      this._isMoving = true;
      this._moveProgress = 0;
      this._moveStart.copyFrom(this._player.position);
      this._moveEnd.set(tx, 0, tz);
    }
  }

  protected override getDebugInfo(): Record<string, string | number> {
    const base = super.getDebugInfo();
    return {
      ...base,
      Example: "05 - Isometric World",
      "Gird Size": "15x15",
      "Player Pos": `(${this._player.position.x.toFixed(1)}, ${this._player.position.z.toFixed(1)})`,
      "Enemies": this._enemies.length
    };
  }
}

// === START THE ENGINE ===
const app: Example5 = new Example5();
app.start();
