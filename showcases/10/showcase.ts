import {
  AbstractShowcase,
  AmbientLight,
  BasicMaterial,
  Behavior,
  BobbingBehavior,
  CameraStrategyType,
  Color,
  Cube,
  DirectionalLight,
  EngineOptions,
  FluidSurfaceMaterial,
  FPSController,
  Ground,
  LavaMaterial,
  MathUtils,
  Object3D,
  OpenWaterMaterial,
  Octahedron,
  PerspectiveProjection,
  Plane,
  PointLight,
  RendererType,
  RotatorBehavior,
  Sphere,
  SlimeMaterial,
  StylizedWaterMaterial,
  Texture,
  WorldMaterial,
  ZoomController,
} from "../../src/index.js";

const WALL_THICKNESS = 0.3;
const POOL_SIZE = 5;
const WALL_HEIGHT = 1.5;
const WALL_CENTER_Y = -0.6; // top face at +0.15 (a small curb above the ground), bottom at -1.35
const FLOOR_Y = -1.35;
const LIQUID_Y = 0.0; // flush with the ground, just below the curb top

/**
 * Periodically drops the attached object into the pool from above, lets it splash (impact +
 * tumble), then settles it into a damped bob at the liquid surface before resetting for the next
 * drop -- the "Spritzer" (splash) moment each pool needs, without any material-specific coupling
 * (unlike Showcase 12's `SinkingBehavior`, which calls `OilPuddleMaterial.addRipple()` directly).
 * The impact/tumble motion itself reads as the splash; there's no reusable particle-VFX system in
 * the engine yet to layer on top.
 */
class SplashDropBehavior extends Behavior {
  private _state: "WAITING" | "FALLING" | "BOBBING" = "WAITING";
  private _velocityY = 0;
  private _waitTimer: number;
  private _bobTimer = 0;

  constructor(
    private readonly _surfaceY: number,
    private readonly _spawnY: number,
    private readonly _spawnDelay: number,
  ) {
    super();
    this._waitTimer = _spawnDelay;
  }

  public override update(deltaTime: number): void {
    const target = this.target;
    if (!(target instanceof Object3D)) return;

    if ("WAITING" === this._state) {
      this._waitTimer -= deltaTime;
      if (this._waitTimer <= 0) {
        target.position.y = this._spawnY;
        this._velocityY = 0;
        this._state = "FALLING";
      }
      return;
    }

    if ("FALLING" === this._state) {
      this._velocityY -= 9.81 * deltaTime;
      target.position.y += this._velocityY * deltaTime;
      target.rotation.x += deltaTime * 2.2;
      target.rotation.z += deltaTime * 1.5;
      if (target.position.y <= this._surfaceY) {
        target.position.y = this._surfaceY;
        this._state = "BOBBING";
        this._bobTimer = 0;
      }
      return;
    }

    // BOBBING: damped spring back to rest at the surface -- same technique as Showcase 12's
    // SinkingBehavior, minus the material-specific ripple call.
    const displacement = target.position.y - this._surfaceY;
    const springForce = -40.0 * displacement;
    const dampingForce = -4.0 * this._velocityY;
    this._velocityY += (springForce + dampingForce) * deltaTime;
    target.position.y += this._velocityY * deltaTime;
    this._bobTimer += deltaTime;
    if (this._bobTimer > 4.0) {
      this._state = "WAITING";
      this._waitTimer = this._spawnDelay;
      target.rotation.set(0, target.rotation.y, 0);
    }
  }
}

/**
 * Showcase 10: "Waterworld" -- a gallery of square, half-sunk pools side by side, each filled
 * with a different liquid material, to compare surface behavior, foam, splashes and transparency
 * side by side. Replaces the previous "Textured Floor & Fire Bowl" scene and, together with it,
 * Showcase 25 (Open Water ocean) and Showcase 35 (Stylized Water) -- both fully absorbed here as
 * two of the four pools instead of living as separate showcases.
 */
export class Showcase10 extends AbstractShowcase {
  private readonly _moveSpeed: number = 12.0;
  private readonly _eyeHeight: number = 2.0;
  private readonly _lightPulseSpeed: number = 2.1;

  private _liquids: (OpenWaterMaterial | StylizedWaterMaterial | FluidSurfaceMaterial)[] = [];
  private _lavaLight: PointLight | undefined;
  private _time: number = 0;

  constructor(options: EngineOptions = {}) {
    super({
      canvasId: "SmallWorld",
      rendererType: RendererType.BEST,
      fullscreen: true,
      ...options,
    });
  }

  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera.projection = new PerspectiveProjection({
      fov: MathUtils.degToRad(75),
      aspect,
      near: 0.1,
      far: 1000,
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, this._eyeHeight, 14);
    this.camera.theta = 0;
    this.camera.phi = 0;
    this.camera.addBehavior(
      new FPSController({ input: this.input, audio: this.audio, moveSpeed: this._moveSpeed }),
    );
    this.camera.addBehavior(new ZoomController({ input: this.input, audio: this.audio }));

    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.35 }));
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 1.0 });
    sun.direction.set(-0.5, -1, -0.4).normalize();
    this.scene.add(sun);

    // Swimming pool tile texture (cyan/light-blue ceramic grid with white grout)
    const tileTexture = this._createPoolTileTexture();
    tileTexture.repeat.x = 1;
    tileTexture.repeat.y = 1;

    const lavaTexture = await Texture.fromUrl("./assets/lava.webp", {
      generateMipmaps: true,
      flipY: true,
    });
    const lavaNormalMap = await Texture.fromUrl("./assets/lava_normal.webp", {
      generateMipmaps: true,
      flipY: true,
    });
    const slimeTexture = await Texture.fromUrl("./assets/slime.webp", {
      generateMipmaps: true,
      flipY: true,
    });
    const slimeNormalMap = await Texture.fromUrl("./assets/slime_normal.webp", {
      generateMipmaps: true,
      flipY: true,
    });

    const tileMaterial = new WorldMaterial({ diffuseMap: tileTexture });
    tileMaterial.color = Color.WHITE;

    // Plain light sand-colored world floor, built with cutouts for the 2x2 pools so
    // the floor does not cut through the underwater volume.
    const groundMaterial = new BasicMaterial({ color: new Color(0.92, 0.86, 0.74) });
    this._buildGroundWithPoolHoles(groundMaterial);

    // 2x2 Pool layout:
    // [-6, -6]: Clear Water      [+6, -6]: Stylized Water
    // [-6, +4]: Lava             [+6, +4]: Toxic Slime
    // Pool 1: realistic open water -- more lively chop with visible crests & distinct foam at objects/edges
    const clearWater = new OpenWaterMaterial({
      waterColor: new Color(0.05, 0.45, 0.6),
      deepWaterColor: new Color(0.0, 0.12, 0.22),
      edgeColor: new Color(0.85, 0.98, 1.0),
      edgeSoftness: 0.8,
      foamDistance: 0.75,
      speed: 0.9,
      wave1: [1.0, 0.35, 0.07, 2.8],
      wave2: [0.3, 0.95, 0.05, 1.8],
      wave3: [-0.5, 0.6, 0.035, 1.1],
      refractionStrength: 0.035,
      waterAbsorption: [0.18, 0.045, 0.015],
      foamColor: new Color(1.0, 1.0, 1.0),
      foamCutoff: 0.45,
      foamNoiseScale: 4.5,
      foamNoiseSpeed: 0.7,
    });
    this._buildPool({
      name: "ClearWaterPool",
      x: -6,
      z: -6,
      liquid: clearWater,
      needsTangents: true,
      tileMaterial,
      spawnDelay: 3.0,
    });

    const stylizedWater = new StylizedWaterMaterial({
      shallowWaterColor: new Color(0.05, 0.48, 0.58),
      deepWaterColor: new Color(0.01, 0.12, 0.2),
      edgeColor: new Color(0.85, 1.0, 0.95),
      edgeSoftness: 0.4,
      foamDistance: 1.0,
      speed: 1.0,
      wave1: [1.0, 0.4, 0.08, 3.2],
      wave2: [0.3, 0.9, 0.06, 2.0],
      wave3: [-0.4, 0.6, 0.04, 1.3],
      refractionStrength: 0.03,
      waterAbsorption: [0.22, 0.07, 0.025],
      foamColor: new Color(1.0, 1.0, 1.0),
      foamCutoff: 0.38,
      foamNoiseScale: 3.5,
      foamNoiseSpeed: 0.6,
    });
    this._buildPool({
      name: "StylizedWaterPool",
      x: 6,
      z: -6,
      liquid: stylizedWater,
      needsTangents: true,
      tileMaterial,
      spawnDelay: 5.0,
    });

    const lava = new LavaMaterial({
      color: new Color(1.5, 0.5, 0.0),
      edgeColor: new Color(0.1, 0.05, 0.05),
      noiseMap: lavaTexture,
      normalMap: lavaNormalMap,
      flowSpeed: 0.3,
      distortion: 2.0,
      viscosity: 5.0,
    });
    this._buildPool({
      name: "LavaPool",
      x: -6,
      z: 4,
      liquid: lava,
      needsTangents: false,
      tileMaterial,
      spawnDelay: 4.0,
    });
    this._lavaLight = new PointLight({
      color: new Color(1, 0.5, 0.2),
      intensity: 4.0,
      distance: 15,
    });
    this._lavaLight.position.set(-6, 1.5, 4);
    this.scene.add(this._lavaLight);

    const slime = new SlimeMaterial({
      color: new Color(0.3, 1.2, 0.2),
      edgeColor: new Color(0.05, 0.15, 0.05),
      noiseMap: slimeTexture,
      normalMap: slimeNormalMap,
      flowSpeed: 0.6,
      distortion: 1.2,
      viscosity: 1.5,
    });
    this._buildPool({
      name: "SlimePool",
      x: 6,
      z: 4,
      liquid: slime,
      needsTangents: false,
      tileMaterial,
      spawnDelay: 6.0,
    });

    this.scene.update();

    await this.waitForAssets();
  }

  /**
   * Generates a swimming pool ceramic tile texture: light cyan/blue tiles with clean white grout lines.
   */
  private _createPoolTileTexture(): Texture {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Texture.empty();

    const tilesPerAxis = 3;
    const tileSize = size / tilesPerAxis;
    const groutSize = 5;

    // Grout color (light off-white)
    ctx.fillStyle = "#e0e8eb";
    ctx.fillRect(0, 0, size, size);

    // Draw ceramic tiles
    for (let y = 0; y < tilesPerAxis; y++) {
      for (let x = 0; x < tilesPerAxis; x++) {
        const tx = x * tileSize + groutSize;
        const ty = y * tileSize + groutSize;
        const tw = tileSize - groutSize * 2;
        const th = tileSize - groutSize * 2;

        // Subtle gradient on each tile to simulate ceramic glaze and depth
        const grad = ctx.createLinearGradient(tx, ty, tx + tw, ty + th);
        grad.addColorStop(0, "#4ab8d8");
        grad.addColorStop(0.5, "#3aa6c8");
        grad.addColorStop(1, "#2e92b2");

        ctx.fillStyle = grad;
        ctx.fillRect(tx, ty, tw, th);

        // Highlight top/left inner edge
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty + th);
        ctx.lineTo(tx, ty);
        ctx.lineTo(tx + tw, ty);
        ctx.stroke();

        // Shadow bottom/right inner edge
        ctx.strokeStyle = "rgba(0, 40, 70, 0.35)";
        ctx.beginPath();
        ctx.moveTo(tx + tw, ty);
        ctx.lineTo(tx + tw, ty + th);
        ctx.lineTo(tx, ty + th);
        ctx.stroke();
      }
    }

    return Texture.fromCanvas(canvas, {
      anisotropy: 16,
      generateMipmaps: true,
    });
  }

  /**
   * Builds the world ground as a seamless plane surrounding the 2x2 pool cutouts,
   * so the ground never spans across the interior of the pool basins.
   */
  private _buildGroundWithPoolHoles(groundMaterial: BasicMaterial): void {
    const addGroundChunk = (name: string, w: number, d: number, px: number, pz: number): void => {
      const chunk = new Object3D(name);
      chunk.geometry = new Ground({ width: w, depth: d }).getGeometryData();
      chunk.position.set(px, 0, pz);
      chunk.material = groundMaterial;
      chunk.receiveShadow = true;
      this.scene.add(chunk);
    };

    // World size: 60 x 60 (-30 to +30 along X and Z)
    // Pools occupy X [-8.5, -3.5] and [+3.5, +8.5], Z [-8.5, -3.5] and [+1.5, +6.5]
    // 1. Surrounding outer slabs:
    addGroundChunk("Ground_North", 60, 21.5, 0, -19.25); // Z: [-30, -8.5]
    addGroundChunk("Ground_South", 60, 23.5, 0, 18.25); // Z: [+6.5, +30]
    addGroundChunk("Ground_West", 21.5, 15, -19.25, -1); // X: [-30, -8.5], Z: [-8.5, +6.5]
    addGroundChunk("Ground_East", 21.5, 15, 19.25, -1); // X: [+8.5, +30], Z: [-8.5, +6.5]

    // 2. Center strips dividing the 2x2 grid:
    addGroundChunk("Ground_Center_X", 7.0, 15, 0, -1); // X: [-3.5, +3.5], Z: [-8.5, +6.5]
    addGroundChunk("Ground_Center_Z_Left", 5.0, 5.0, -6, -1); // between pool 1 and 3
    addGroundChunk("Ground_Center_Z_Right", 5.0, 5.0, 6, -1); // between pool 2 and 4
  }

  /** Builds one square, half-sunk pool: rim walls, floor plate, liquid surface, plus a couple of
   * floating objects, a couple resting on the bottom, and one periodic splash-dropper. */
  private _buildPool(config: {
    name: string;
    x: number;
    z: number;
    liquid: OpenWaterMaterial | StylizedWaterMaterial | FluidSurfaceMaterial;
    needsTangents: boolean;
    tileMaterial: WorldMaterial;
    spawnDelay: number;
  }): void {
    const { name, x, z, liquid, needsTangents, tileMaterial, spawnDelay } = config;
    const inner = POOL_SIZE - 2 * WALL_THICKNESS;

    const pool = new Object3D(name);
    pool.position.set(x, 0, z);
    this.scene.add(pool);

    // 4 thin rim walls straddling ground level -- half the wall height pokes above the ground,
    // half is buried, which is what reads as "half sunk into the ground".
    const wallSpecs: Array<[number, number, number, number]> = [
      [0, WALL_CENTER_Y, POOL_SIZE / 2, POOL_SIZE], // north
      [0, WALL_CENTER_Y, -POOL_SIZE / 2, POOL_SIZE], // south
      [POOL_SIZE / 2, WALL_CENTER_Y, 0, POOL_SIZE], // east
      [-POOL_SIZE / 2, WALL_CENTER_Y, 0, POOL_SIZE], // west
    ];
    for (let i = 0; i < wallSpecs.length; i++) {
      const [wx, wy, wz, wlen] = wallSpecs[i]!;
      const wall = new Object3D(`${name}_Wall${i}`);
      wall.geometry = new Cube({ size: 1 }).getGeometryData();
      const alongX = 0 === wz;
      wall.scale.set(alongX ? WALL_THICKNESS : wlen, WALL_HEIGHT, alongX ? wlen : WALL_THICKNESS);
      wall.position.set(wx, wy, wz);
      wall.material = tileMaterial;
      wall.castShadow = true;
      wall.receiveShadow = true;
      pool.add(wall);
    }

    const floorPlate = new Object3D(`${name}_Floor`);
    floorPlate.geometry = new Cube({ size: 1 }).getGeometryData();
    floorPlate.scale.set(inner, 0.2, inner);
    floorPlate.position.set(0, FLOOR_Y, 0);
    floorPlate.material = tileMaterial;
    floorPlate.receiveShadow = true;
    pool.add(floorPlate);

    const liquidObj = new Object3D(`${name}_Liquid`);
    const plane = new Plane({
      width: inner,
      height: inner,
      widthSegments: 32,
      heightSegments: 32,
    });
    if (needsTangents) plane.computeTangents();
    liquidObj.geometry = plane.getGeometryData();
    liquidObj.material = liquid;
    liquidObj.rotation.x = -MathUtils.HALF_PI;
    liquidObj.position.set(0, LIQUID_Y, 0);
    pool.add(liquidObj);
    this._liquids.push(liquid);

    // A couple of objects resting on the pool floor -- how well they read through the liquid is
    // exactly what the transparency/absorption differences between pools are meant to show off.
    const sunkObjects: Array<[Object3D, number, number]> = [
      [this._makeCrate(), -1.0, -0.6],
      [this._makeBall(), 0.9, 0.5],
    ];
    for (const [obj, ox, oz] of sunkObjects) {
      obj.position.set(ox, FLOOR_Y + 0.35, oz);
      obj.castShadow = true;
      pool.add(obj);
    }

    // A couple of objects floating persistently at the surface.
    const floaters: Array<[Object3D, number, number, number, number]> = [
      [this._makeBall(), -1.3, 1.2, 0.12, 1.8],
      [this._makeDebris(), 1.2, -1.1, 0.09, 2.4],
    ];
    for (const [obj, ox, oz, amplitude, frequency] of floaters) {
      obj.position.set(ox, LIQUID_Y, oz);
      obj.castShadow = true;
      obj.addBehavior(new BobbingBehavior(amplitude, frequency));
      obj.addBehavior(new RotatorBehavior());
      pool.add(obj);
    }

    // The periodic "splash" -- drops in from above, settles into a bob, resets.
    const dropper = this._makeCrate();
    dropper.position.set(0.3, LIQUID_Y, 0.2);
    dropper.castShadow = true;
    dropper.addBehavior(new SplashDropBehavior(LIQUID_Y, WALL_HEIGHT + 3.0, spawnDelay));
    pool.add(dropper);
  }

  private _makeCrate(): Object3D {
    const crate = new Object3D("Crate");
    crate.geometry = new Cube({ size: 0.6 }).getGeometryData();
    crate.material = new BasicMaterial({ color: new Color(0.55, 0.4, 0.25) });
    return crate;
  }

  private _makeBall(): Object3D {
    const ball = new Object3D("Ball");
    ball.geometry = new Sphere({
      radius: 0.35,
      widthSegments: 16,
      heightSegments: 12,
    }).getGeometryData();
    ball.material = new BasicMaterial({ color: new Color(0.8, 0.15, 0.15) });
    return ball;
  }

  private _makeDebris(): Object3D {
    const debris = new Object3D("Debris");
    debris.geometry = new Octahedron({ radius: 0.4 }).getGeometryData();
    debris.material = new BasicMaterial({ color: new Color(0.4, 0.4, 0.42) });
    return debris;
  }

  protected override update(deltaTime: number): void {
    this._time += deltaTime;
    this.camera.position.y = Math.max(this._eyeHeight, this.camera.position.y);

    for (const liquid of this._liquids) {
      liquid.time = this._time;
    }

    if (this._lavaLight) {
      const pulse = Math.sin(this._time * this._lightPulseSpeed) * 0.5 + 0.5;
      this._lavaLight.intensity = 3.0 + pulse * 4.0;
      this._lavaLight.color.g = 0.4 + pulse * 0.3;
    }
  }
}

const app = new Showcase10();
app.start().catch((err: unknown) => console.error("[Showcase10] Failed to start:", err));
