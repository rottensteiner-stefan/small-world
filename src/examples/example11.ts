/// src/examples/example11.ts

import {
  AmbientLight,
  BasicMaterial,
  CameraStrategyType,
  Color,
  Cylinder,
  DeviceCaps,
  DeviceFeature,
  Grid,
  Input,
  Keys,
  MathUtils,
  Object3D,
  OrbitController,
  PerspectiveProjection,
  PointLight,
  ProjectionType,
  Sphere,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector3D,
  WireframeMaterial,
} from "../index.js";
import { AbstractExample } from "../core/index.js";

/**
 * Example 11: Orientation
 * Displays a ground grid centered at (0,0,0) to demonstrate the coordinate system.
 */
class Example11 extends AbstractExample {
  protected override async setupScene(): Promise<void> {
    // Setup input listeners (e.g. pointer lock)
    this.onCanvasRecreated();

    // Configure camera projection
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

    // Use HYBRID_SYNC strategy: Syncs manual position changes (WSAD) with orbital rotation (Maus).
    this.camera.setStrategy(CameraStrategyType.HYBRID_SYNC);
    this.camera.position.set(20, 20, 40);

    // Re-add OrbitController to handle rotation via mouse
    this.camera.addBehavior(new OrbitController());

    // Create the ground grid (size 20x20)
    // Absolute (0,0,0) is in the middle of this grid.
    const gridObj: Object3D = new Object3D("FloorGrid");
    gridObj.geometry = new Grid({ size: 20, divisions: 20 }).getGeometryData();
    const gridMat: WireframeMaterial = new WireframeMaterial();
    gridMat.color = Color.DARKSLATEGRAY;
    gridObj.material = gridMat;
    this.scene.add(gridObj);

    // Create a centered "Sun" (diameter 1)
    const sunObj: Object3D = new Object3D("Sun");
    sunObj.geometry = new Sphere({ radius: 0.5 }).getGeometryData();
    // BasicMaterial makes it appear "unlit" and always bright (glowing)
    sunObj.material = new BasicMaterial({ color: new Color(1, 0.8, 0.1) });
    this.scene.add(sunObj);

    // Add a PointLight at the sun's position to illuminate the scene
    const sunLight: PointLight = new PointLight({
      color: new Color(1, 0.9, 0.5),
      intensity: 1.5,
      distance: 50,
    });
    sunObj.add(sunLight);

    // Add AmbientLight so the rest of the coordinate system is visible
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.2 }));

    // --- Add Axes ---
    // await is functionally necessary because setupScene is called and awaited by the Application start.
    // Removing await would create a race condition where rendering starts before objects are added.
    await this._addAxis("X", new Vector3D(1, 0, 0), Color.RED);
    await this._addAxis("Y", new Vector3D(0, 1, 0), Color.GREEN);
    await this._addAxis("Z", new Vector3D(0, 0, 1), Color.BLUE);
  }

  /**
   * Update logic for camera movement.
   */
  protected override update(deltaTime: number): void {
    const moveSpeed: number = 10 * deltaTime;

    // Movement along world axes
    if (Input.isPressed(Keys.W)) this.camera.position.z -= moveSpeed; // Forward (-Z)
    if (Input.isPressed(Keys.S)) this.camera.position.z += moveSpeed; // Backward (+Z)
    if (Input.isPressed(Keys.A)) this.camera.position.x -= moveSpeed; // Left (-X)
    if (Input.isPressed(Keys.D)) this.camera.position.x += moveSpeed; // Right (+X)
    if (Input.isPressed(Keys.Q)) this.camera.position.y += moveSpeed; // Up (+Y)
    if (Input.isPressed(Keys.E)) this.camera.position.y -= moveSpeed; // Down (-Y)

    // OrbitController will handle theta/phi rotation via mouse,
    // we keep the camera focused on the origin.
    this.camera.target.set(0, 0, 0);
  }

  /**
   * Helper to add a fat axis line with spheres and labels.
   */
  private async _addAxis(axis: string, direction: Vector3D, color: Color): Promise<void> {
    const length: number = 14;
    const halfLen: number = length / 2;
    const axisRadius: number = 0.1;
    const sphereRadius: number = 0.5;

    // Cylinder (Fat Line)
    const axisLine: Object3D = new Object3D(`${axis}_Axis`);
    axisLine.geometry = new Cylinder({
      radiusTop: axisRadius,
      radiusBottom: axisRadius,
      height: length,
    }).getGeometryData();
    axisLine.material = new BasicMaterial({ color });

    // Rotate cylinder to match axis (default is Y)
    if ("X" === axis) axisLine.rotation.z = -MathUtils.HALF_PI;
    if ("Z" === axis) axisLine.rotation.x = MathUtils.HALF_PI;

    this.scene.add(axisLine);

    // End Spheres
    const posPos: Vector3D = new Vector3D().copyFrom(direction).scale(halfLen);
    const negPos: Vector3D = new Vector3D().copyFrom(direction).scale(-halfLen);

    this._addSphere(posPos, sphereRadius, color);
    this._addSphere(negPos, sphereRadius, color);

    // Labels
    const posLabel: string = "+";
    const negLabel: string = "-";

    await Promise.all([
      this._addLabel(`${axis}${posLabel}`, posPos.clone().add(direction), color),
      this._addLabel(`${axis}${negLabel}`, negPos.clone().sub(direction), color),
    ]);
  }

  private _addSphere(position: Vector3D, radius: number, color: Color): void {
    const sphere: Object3D = new Object3D();
    sphere.geometry = new Sphere({ radius }).getGeometryData();
    sphere.material = new BasicMaterial({ color });
    sphere.position.copyFrom(position);
    this.scene.add(sphere);
  }

  private async _addLabel(text: string, position: Vector3D, color: Color): Promise<void> {
    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;

    // Draw background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    if (DeviceCaps.hasFeature(DeviceFeature.CANVAS_ROUND_RECT)) {
      ctx.beginPath();
      ctx.roundRect(10, 10, 108, 108, 20);
      ctx.fill();
    } else {
      ctx.fillRect(10, 10, 108, 108);
    }

    // Draw text
    ctx.fillStyle = color.toHex();
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 64, 64);

    try {
      const bitmap: ImageBitmap = await createImageBitmap(canvas);
      const texture: Texture = Texture.fromImage(bitmap);
      const material: SpriteMaterial = new SpriteMaterial({ texture });
      const sprite: Sprite = new Sprite(material, `Label_${text}`);

      sprite.position.copyFrom(position);
      sprite.scale.set(3, 3, 3);
      this.scene.add(sprite);
      console.log(`[Example 11] Label added: ${text} at`, position);
    } catch (e) {
      console.error(`[Example 11] Error creating label texture for ${text}:`, e);
    }
  }
}

const app: Example11 = new Example11();
app.start().catch((error: unknown) => {
  console.error("[Example 11] Error starting application:", error);
});
