/// showcases/22/showcase.ts
import {
  SmallWorld,
  OrbitController,
  PointLight,
  Color,
  Cube,
  Sphere,
  StandardMaterial,
  RigidBody,
  Texture,
  UniversalEventBus,
  AudioSystem,
  Object3D,
  PhysicsSystem,
  AmbientLight,
  Vector3D,
  MathUtils,
  Cylinder,
  BasicMaterial,
  DeviceCaps,
  DeviceFeature,
  Sprite,
  SpriteMaterial,
} from "../../src/index.js";
import { MarbleController } from "./MarbleController.js";
import { DroneController } from "./DroneController.js";
import floorTexUrl from "./assets/scifi_metal_floor.jpg";
import bumperTexUrl from "./assets/scifi_crate_magenta.jpg";

class Showcase22 extends SmallWorld {
  private _marble: Object3D | null = null;
  private _ambientAudioStarted: boolean = false;
  private _physics: PhysicsSystem = new PhysicsSystem();

  constructor() {
    super({
      enableInspector: false,
      canvasId: "SmallWorld",
    });
  }

  protected async setupScene(): Promise<void> {
    // We must use this.scene instead of a local discarded variable
    const scene = this.scene;

    // Camera setup
    this.camera.position.set(0, 35, 55);
    // OrbitController will be attached to the camera later, once the marble is created

    // Lighting (Cyberpunk Neon vibe)
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.2 }));

    // Orientation Cross (Removed)
    /*
    await this._addAxis("X", new Vector3D(1, 0, 0), Color.RED);
    await this._addAxis("Y", new Vector3D(0, 1, 0), Color.GREEN);
    await this._addAxis("Z", new Vector3D(0, 0, 1), Color.BLUE);
    */

    const purpleLight = new PointLight(new Color(0.69, 0.0, 1.0), 5.0, 50.0);
    purpleLight.position.set(-10, 10, 0);
    scene.add(purpleLight);

    const blueLight = new PointLight(new Color(0.0, 0.8, 1.0), 3.0, 50.0);
    blueLight.position.set(10, 10, 10);
    scene.add(blueLight);

    // Textures (Vite static import)
    const [floorTex, bumperTex] = await Promise.all([
      Texture.fromUrl(floorTexUrl),
      Texture.fromUrl(bumperTexUrl),
    ]);

    // Floor Material
    const floorMat = new StandardMaterial({
      diffuseMap: floorTex,
      metalness: 0.6,
      roughness: 0.4,
      color: new Color(0.8, 0.8, 0.8),
    });

    // Floor Platform
    const floor = new Object3D("Floor");
    floor.geometry = new Cube({ size: 1 }).getGeometryData();
    floor.setScale(40, 10, 40); // 10 units thick to prevent tunneling!
    floor.position.set(0, -5, 0); // Center is at -5, so top surface is at exactly 0.0
    floor.material = floorMat;
    floor.rigidBody = new RigidBody(0); // Static
    scene.add(floor);

    // Marble Material (Glowing Cyberpunk Cyan)
    const marbleMat = new StandardMaterial({
      roughness: 0.2,
      metalness: 0.5,
      color: new Color(0.1, 0.8, 1.0), // Cyan
      emissiveColor: new Color(0.0, 0.4, 0.8), // Inner glow
      emissiveIntensity: 0.4, // Reduced so it doesn't become a 100% flat 2D circle!
    });

    // The Player Marble
    this._marble = new Object3D("Marble");
    this._marble.geometry = new Sphere({ radius: 1 }).getGeometryData();
    this._marble.position.set(0, 5, 0);
    this._marble.material = marbleMat;
    this._marble.rigidBody = new RigidBody(1);
    this._marble.rigidBody.restitution = 0.5; // Bouncy
    this._marble.rigidBody.friction = 0.999; // Less air resistance
    this._marble.addBehavior(new MarbleController(this.camera));

    // Add a point light to the marble to create a true "glow" on the environment
    const marbleGlow = new PointLight({
      color: new Color(0.1, 0.8, 1.0),
      intensity: 100.0, // PBR needs high intensity to visibly illuminate the floor!
      distance: 30.0,
    });
    this._marble.add(marbleGlow);

    scene.add(this._marble);

    // Now that marble exists, attach camera controller
    this.camera.addBehavior(new OrbitController({ target: this._marble }));

    // Add some random bumpers
    const bumperMat = new StandardMaterial({
      diffuseMap: bumperTex,
      emissiveMap: bumperTex,
      emissiveColor: new Color(0.2, 0.2, 0.2), // Slight boost to the pink lines
      emissiveIntensity: 1.2,
      roughness: 0.3,
      metalness: 0.7,
      color: new Color(0.8, 0.8, 0.8),
    });

    for (let i = 0; i < 5; i++) {
      const bumper = new Object3D("Bumper" + i);
      bumper.geometry = new Cube({ size: 2 }).getGeometryData();
      bumper.position.set(Math.random() * 20 - 10, 1, Math.random() * 20 - 10);
      bumper.material = bumperMat;
      bumper.rigidBody = new RigidBody(0); // static
      bumper.rigidBody.restitution = 1.5; // Extra bouncy (pushes player away)
      scene.add(bumper);
    }

    // --- DRONES ---
    const droneColors = [
      new Color(1, 0, 1), // Magenta
      new Color(0, 1, 1), // Cyan
      new Color(0.5, 1, 0), // Lime Green
      new Color(1, 0.5, 0), // Neon Orange
      new Color(1, 1, 1), // Bright White
    ];
    const droneMaterials = droneColors.map(
      (c) =>
        new StandardMaterial({
          color: c,
          emissiveColor: c,
          emissiveIntensity: 1.5,
          roughness: 1.0,
          metalness: 0.0,
        }),
    );
    const droneGeo = new Sphere({ radius: 0.15 }).getGeometryData();

    for (let i = 0; i < 120; i++) {
      const drone = new Object3D("Drone" + i);
      drone.geometry = droneGeo;

      const randMat = droneMaterials[Math.floor(Math.random() * droneMaterials.length)]!;
      drone.material = randMat;

      // Set out of bounds to trigger the new corner-respawn logic on the first frame!
      drone.position.set(100, 1.0, 100);

      drone.addBehavior(new DroneController(this.scene, randMat));
      this.scene.add(drone);
    }

    // --- DRONE SPAWN MARKERS & VECTORS (Removed as requested) ---

    // Ensure all objects have their world matrices and bounds properly initialized for the first frame
    scene.update();
    for (const obj of scene.objects) {
      obj.computeBounds();
    }

    // Audio on collision
    UniversalEventBus.addEventListener("physics:collision", (e: Record<string, unknown>): void => {
      // Play a generative synth note based on impulse strength
      const impulse = e["impulse"] as number;
      if (impulse > 1.0 && this._ambientAudioStarted) {
        AudioSystem.instance.playTone(400 + Math.random() * 200, 0.5, 0.2, "sine");
      }
    });

    // Start Audio on first click
    window.addEventListener(
      "pointerdown",
      (): void => {
        if (!this._ambientAudioStarted) {
          this._ambientAudioStarted = true;
          AudioSystem.instance.resume();
        }
      },
      { once: true },
    );
  }

  public update(dt: number): void {
    // Step the physics engine first
    this._physics.step(this.scene, dt);
  }

  // --- Helper methods for Orientation Cross ---
  private async _addAxis(axis: string, direction: Vector3D, color: Color): Promise<void> {
    const length: number = 14;
    const halfLen: number = length / 2;
    const axisRadius: number = 0.1;
    const sphereRadius: number = 0.5;

    const axisLine: Object3D = new Object3D(`${axis}_Axis`);
    axisLine.geometry = new Cylinder({
      radiusTop: axisRadius,
      radiusBottom: axisRadius,
      height: length,
    }).getGeometryData();
    axisLine.material = new BasicMaterial({ color });

    if ("X" === axis) axisLine.rotation.z = -MathUtils.HALF_PI;
    if ("Z" === axis) axisLine.rotation.x = MathUtils.HALF_PI;

    // Move the entire cross up by 10 units so it's not buried in the floor
    axisLine.position.y = 10;

    this.scene.add(axisLine);

    const posPos: Vector3D = new Vector3D().copyFrom(direction).scale(halfLen);
    const negPos: Vector3D = new Vector3D().copyFrom(direction).scale(-halfLen);

    posPos.y += 10;
    negPos.y += 10;

    this._addSphere(posPos, sphereRadius, color);
    this._addSphere(negPos, sphereRadius, color);

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

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    if (DeviceCaps.hasFeature(DeviceFeature.CANVAS_ROUND_RECT)) {
      ctx.beginPath();
      ctx.roundRect(10, 10, 108, 108, 20);
      ctx.fill();
    } else {
      ctx.fillRect(10, 10, 108, 108);
    }

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
    } catch (e) {
      console.error(`Error creating label texture for ${text}:`, e);
    }
  }
}

new Showcase22().start();
