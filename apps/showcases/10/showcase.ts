import {
  AbstractShowcase,
  AmbientLight,
  BasicMaterial,
  Behavior,
  BobbingBehavior,
  BoundingBox,
  BoundingSphere,
  CameraStrategyType,
  Color,
  Cube,
  Cylinder,
  DirectionalLight,
  EngineOptions,
  FluidSurfaceMaterial,
  FluidVolume,
  Fog,
  FogMode,
  FPSController,
  GeometryDataInterface,
  Ground,
  LambertMaterial,
  LavaMaterial,
  LiquidWaveMaterial,
  MathUtils,
  Object3D,
  OpenWaterMaterial,
  OpenWaterSurfaceProbe,
  Octahedron,
  PerspectiveProjection,
  Plane,
  PointLight,
  RendererType,
  RigidBody,
  RotatorBehavior,
  Sphere,
  SlimeMaterial,
  StylizedWaterMaterial,
  Texture,
  Vector3D,
  WorldMaterial,
  RampLUT,
  RampStop,
  ZoomController,
} from "../../../packages/engine/src/index.js";
import { GltfLoader } from "../../../packages/engine/src/loaders/index.js";
import { NoirWaterMaterial, OilSlickMaterial } from "../../../packages/liquid-extras/src/index.js";
import { LiveTunePad } from "./LiveTunePad.js";

const GROUT_THICKNESS_PX = 5.5; // half-grout drawn per tile cell -> 11px full grout line
const TILE_CELL_PX = 128; // 8x8 tiles in 1024x1024 texture
const GROUT_RATIO = (GROUT_THICKNESS_PX * 2) / TILE_CELL_PX; // 11 / 128 ≈ 0.0859
const TILE_UNIT_SIZE = 0.142; // ~14.2cm per tile unit (tile + center grout)
const GROUT_METERS = TILE_UNIT_SIZE * GROUT_RATIO; // ~0.0122m full grout line in world units
const WALL_THICKNESS = 2 * TILE_UNIT_SIZE + GROUT_METERS; // exactly 2 tiles + 1 extra grout line = ~0.296m
const POOL_TILES_OUTER = 35; // 35 tiles along outer edge
const POOL_SIZE = POOL_TILES_OUTER * TILE_UNIT_SIZE + GROUT_METERS; // ~4.982m
const WALL_HEIGHT = 1.5;
const WALL_CENTER_Y = -0.65; // top curb face at +0.10 (subtle 5cm curb above ground)
const FLOOR_Y = -1.35;
const LIQUID_Y = 0.05; // flush just below the +0.10 curb top

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Golden-capture mode: a deterministic query-parameter baseline so external capture tooling
// (scripts/goldens/**) can snapshot exactly one pool from exactly one camera view and get an
// identical frame on every run. Shared query contract (do not change):
//   ?rendererType=WEB_GL2&__golden=<poolKey>&__goldenView=<view>&__goldenFrames=<N>
// Aquatic determinism is enforced by resetting the scene clock (this._time) and then advancing
// it through the engine's deterministic `step()` primitive at a fixed delta time.
// ─────────────────────────────────────────────────────────────────────────────────────────────

const GOLDEN_WIDTH = 1024;
const GOLDEN_HEIGHT = 576;
const GOLDEN_FRAMES_DEFAULT = 60;
const GOLDEN_FRAME_TIME = 1 / 60;
const GOLDEN_SOAK_MS = 700;
const GOLDEN_TOP_HEIGHT = 7.2;
const GOLDEN_TOP_TILT = 0.001; // keep the view a hair off vertical so lookAt never hits its pole
const GOLDEN_OBLIQUE_HEIGHT = 2.0;
const GOLDEN_OBLIQUE_OFFSET = 5.5;
const GOLDEN_OBLIQUE_TARGET_RAISE = 0.5;
const GOLDEN_TEXTURE_SEED = 0xc0ffee;

type GoldenPoolKey =
  | "clear-water"
  | "toon-water"
  | "bold-anime"
  | "soft-watercolor"
  | "painterly-sparkle"
  | "dredge"
  | "noir-graphic"
  | "molten-lava"
  | "toxic-slime"
  | "petroleum-oil"
  | "wave-rider"
  | "dead-sea";

type GoldenView = "top" | "oblique";

type GoldenPoolLayout = { x: number; z: number };

interface GoldenSpec {
  poolKeyRaw: string;
  view: GoldenView;
  frames: number;
}

/** Readiness signal for the external capture tool; see the golden mode query contract above. */
interface GoldenMeta {
  poolKey: string;
  view: GoldenView;
  frames: number;
  rendererType?: string;
  error?: string;
}

interface GoldenWindowFlags {
  __goldenReady?: boolean;
  __goldenMeta?: GoldenMeta;
  __rampVerify?: RampVerifyHook;
}

/** Colour stop as passed over the verification hook: RGB 0..255. */
interface RampVerifyStop {
  t: number;
  color: [number, number, number];
}

/**
 * Debug hook for scratch verification of `StylizedWaterMaterial.rampMap` (P2 item 8, `?__rampVerify=1`
 * only; never installed in normal runs).
 */
interface RampVerifyHook {
  poolKeys: string[];
  /** Assigns a freshly baked RampLUT to the pool's material, or `null` to clear `rampMap`. */
  setRamp(poolKey: string, stops: RampVerifyStop[] | null): void;
  /** Re-bakes the pool's existing RampLUT in place (exercises the `needsUpdate` re-upload path). */
  updateStops(poolKey: string, stops: RampVerifyStop[]): void;
}

/**
 * The pool gallery is a 3 x 4 grid, one pool per cell. This table is the single source of truth:
 * pool positions, meadow cutouts, signboards and the golden cameras are all derived from it.
 * Row 0 (north): realistic water and the buoyancy pools; row 1: stylized anime/painterly water;
 * row 2 (south): dark and exotic fluids.
 */
const POOL_GRID_COLUMNS = 4;
const POOL_GRID_ROWS = 3;
const POOL_PITCH_X = 9;
const POOL_PITCH_Z = 15;
const POOL_CELLS: Readonly<Record<GoldenPoolKey, { col: number; row: number }>> = {
  "clear-water": { col: 0, row: 0 },
  "wave-rider": { col: 1, row: 0 },
  "dead-sea": { col: 2, row: 0 },
  "toon-water": { col: 3, row: 0 },
  "bold-anime": { col: 0, row: 1 },
  "soft-watercolor": { col: 1, row: 1 },
  "painterly-sparkle": { col: 2, row: 1 },
  dredge: { col: 3, row: 1 },
  "noir-graphic": { col: 0, row: 2 },
  "molten-lava": { col: 1, row: 2 },
  "toxic-slime": { col: 2, row: 2 },
  "petroleum-oil": { col: 3, row: 2 },
};

/** World-space pool center of a grid cell (the grid is centered on the world origin). */
function poolWorldPosition(key: GoldenPoolKey): GoldenPoolLayout {
  const cell = POOL_CELLS[key];
  return {
    x: (cell.col - (POOL_GRID_COLUMNS - 1) / 2) * POOL_PITCH_X,
    z: (cell.row - (POOL_GRID_ROWS - 1) / 2) * POOL_PITCH_Z,
  };
}

/** World-space pool center for every golden pool key. */
const GOLDEN_POOL_LAYOUT = Object.fromEntries(
  (Object.keys(POOL_CELLS) as GoldenPoolKey[]).map((key) => [key, poolWorldPosition(key)]),
) as Readonly<Record<GoldenPoolKey, GoldenPoolLayout>>;

/**
 * Parses the golden-mode query parameters. Returns `undefined` when no `__golden` parameter is
 * present, i.e. the showcase runs in its regular interactive mode unchanged.
 */
function parseGoldenSpec(): GoldenSpec | undefined {
  if (typeof window === "undefined" || !window.location) return undefined;
  const params = new URLSearchParams(window.location.search);
  const poolKeyRaw = params.get("__golden");
  if (!poolKeyRaw) return undefined;
  const rawView = params.get("__goldenView");
  const view: GoldenView = rawView === "oblique" ? "oblique" : "top";
  const rawFrames = Number.parseInt(params.get("__goldenFrames") ?? "", 10);
  const frames = Number.isInteger(rawFrames) && rawFrames > 0 ? rawFrames : GOLDEN_FRAMES_DEFAULT;
  return { poolKeyRaw, view, frames };
}

/**
 * Replaces `Math.random` with a seeded LCG so the procedural grass / tile / sign textures that
 * scene setup generates are identical on every golden run. Normal interactive mode keeps the
 * browser RNG untouched.
 */
function seedMathRandom(seed: number): void {
  let state = seed >>> 0;
  Math.random = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

interface TilePalette {
  grout: string;
  groutSpeckle: string;
  /** Five subtle glaze gradient variants (4 stops each) scattered randomly across tiles. */
  variants: Array<[string, string, string, string]>;
  /** Alpha of the white glaze reflection and top/left bevel (dark tiles get less). */
  shine: number;
}

/** Pool frame palettes: 5 harmonious subtle shade variations per palette scattered organically across tiles. */
const TILE_PALETTES: Record<
  "pool" | "murk" | "noir" | "basalt" | "toxic" | "graphite" | "salt",
  TilePalette
> = {
  pool: {
    grout: "#ffffff",
    groutSpeckle: "#edf5fa",
    variants: [
      ["#6de6f8", "#50d6f0", "#36c3e6", "#20b0d8"], // Variant 1: Pale aqua-cyan highlight
      ["#4ecbec", "#36b7de", "#20a3ca", "#1290bb"], // Variant 2: Sky pool cyan
      ["#38bee8", "#24a7d4", "#1294c0", "#0880aa"], // Variant 3: Vibrant aqua-blue
      ["#2aaedc", "#1898c6", "#0c83b0", "#047098"], // Variant 4: Deep ocean cyan
      ["#5cecf0", "#3edee4", "#26c9d0", "#14b3ba"], // Variant 5: Cool minty cyan
    ],
    shine: 1.0,
  },
  murk: {
    grout: "#2a3432",
    groutSpeckle: "#222c2a",
    variants: [
      ["#4a726b", "#3f635c", "#34544d", "#2a4640"],
      ["#3d5e58", "#34524c", "#2b4540", "#233a36"],
      ["#324e49", "#29423d", "#213632", "#1a2c28"],
      ["#436961", "#385b54", "#2e4d46", "#253f39"],
      ["#395650", "#2f4843", "#253b37", "#1d2f2b"],
    ],
    shine: 0.35,
  },
  noir: {
    grout: "#0d0d0d",
    groutSpeckle: "#171717",
    variants: [
      ["#787878", "#666666", "#545454", "#424242"],
      ["#686868", "#585858", "#484848", "#383838"],
      ["#555555", "#474747", "#393939", "#2c2c2c"],
      ["#484848", "#3c3c3c", "#303030", "#242424"],
      ["#606060", "#505050", "#404040", "#323232"],
    ],
    shine: 0.35,
  },
  basalt: {
    grout: "#120e0c",
    groutSpeckle: "#1b1612",
    variants: [
      ["#584c45", "#483e37", "#39302a", "#2b231d"],
      ["#4a403a", "#3c332e", "#2e2723", "#231e1b"],
      ["#3d342e", "#312923", "#251e19", "#1c1511"],
      ["#52453e", "#433730", "#352a23", "#281e18"],
      ["#443a34", "#372e28", "#2a221c", "#1f1813"],
    ],
    shine: 0.2,
  },
  toxic: {
    grout: "#172012",
    groutSpeckle: "#202a18",
    variants: [
      ["#6e7f45", "#5e6e39", "#4f5d2d", "#404d22"],
      ["#5d6b3a", "#4f5c32", "#404b2a", "#333c22"],
      ["#4d5a2d", "#404c23", "#333e1b", "#273014"],
      ["#667640", "#576634", "#485628", "#3a461e"],
      ["#546233", "#465329", "#38441f", "#2b3517"],
    ],
    shine: 0.3,
  },
  graphite: {
    grout: "#0a0b0d",
    groutSpeckle: "#141618",
    variants: [
      ["#484e57", "#3d434c", "#32373f", "#262b32"],
      ["#3a3f46", "#31353b", "#272a30", "#1e2126"],
      ["#2f3339", "#262a2f", "#1e2125", "#16181c"],
      ["#424750", "#373c44", "#2c3137", "#21252b"],
      ["#353940", "#2c3036", "#23262b", "#1a1d21"],
    ],
    shine: 0.25,
  },
  salt: {
    grout: "#d9d2c3",
    groutSpeckle: "#e6e0d3",
    variants: [
      ["#f1ece0", "#e6dfd0", "#dbd3c1", "#cfc6b2"],
      ["#ece5d6", "#e1d9c7", "#d6cdb9", "#cac0aa"],
      ["#e6dfcf", "#dbd3c1", "#d0c7b3", "#c4baa4"],
      ["#f4efe5", "#e9e3d5", "#ded6c5", "#d2c9b6"],
      ["#e9e2d2", "#ded6c4", "#d3cab6", "#c7bda8"],
    ],
    shine: 0.5,
  },
};

const HOME_STIFFNESS = 3.0; // 1/s^2, soft spring back to the pool column
const HOME_DAMPING = 1.6; // 1/s, calms horizontal drift
const BODY_YAW_SPEED = 0.25; // rad/s
// FluidVolume drag is a per-step velocity factor. The default 0.95 leaves the bodies nearly in
// resonance with the swell and they overshoot the surface; 0.88 makes them ride it.
const BUOYANCY_POOL_DRAG = 0.88;

/** Volume of a physics body's bounds, the same measure the buoyancy solver displaces. */
function boundsVolume(bounds: BoundingBox | BoundingSphere | object): number {
  if (bounds instanceof BoundingBox) {
    return (
      (bounds.max.x - bounds.min.x) * (bounds.max.y - bounds.min.y) * (bounds.max.z - bounds.min.z)
    );
  }
  if (bounds instanceof BoundingSphere) {
    return (4 / 3) * Math.PI * bounds.radius ** 3;
  }
  return 0;
}

/**
 * Keeps a floating physics body inside its pool: a soft spring pulls it back towards its home
 * column and light damping calms the drift, while the vertical motion stays purely buoyancy.
 * The mass is derived from the body's volume once its bounds exist, so `submersion` is the
 * fraction of the volume that sits below the surface at rest in fluid of density 1.
 */
class PoolHomeBehavior extends Behavior {
  private _massAssigned = false;

  constructor(
    private readonly _homeX: number,
    private readonly _homeZ: number,
    private readonly _submersion: number,
  ) {
    super();
  }

  public override update(): void {
    const target = this.target;
    if (!(target instanceof Object3D) || !target.rigidBody || !target.bounds) return;
    const body = target.rigidBody;
    if (!this._massAssigned) {
      body.mass = this._submersion * boundsVolume(target.bounds);
      this._massAssigned = true;
    }
    body.angularVelocity.y = BODY_YAW_SPEED;
    const mass = body.mass;
    body.forces.x +=
      mass * (-HOME_STIFFNESS * (target.position.x - this._homeX) - HOME_DAMPING * body.velocity.x);
    body.forces.z +=
      mass * (-HOME_STIFFNESS * (target.position.z - this._homeZ) - HOME_DAMPING * body.velocity.z);
  }
}

/**
 * Periodically drops the attached object into the pool from above, lets it splash (impact +
 * tumble), then settles it into a damped bob at the liquid surface before resetting for the next
 * drop.
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
    private readonly _onImpact?: (x: number, z: number, speed: number) => void,
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
        if (this._onImpact) {
          this._onImpact(
            target.position.x,
            target.position.z,
            Math.min(Math.abs(this._velocityY) / 9.81, 1.0),
          );
        }
      }
      return;
    }

    // BOBBING: damped spring back to rest at the surface
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
 * Showcase 10: "Waterworld & Liquid Gallery" -- A grand open-air gallery of square half-sunk pools
 * on a lush meadow landscape, showcasing all engine-known liquid materials, shader presets, and
 * extension hooks side-by-side.
 */
export class Showcase10 extends AbstractShowcase {
  private readonly _moveSpeed: number = 12.0;
  private readonly _startEyeHeight: number = 18.0;
  private readonly _minEyeHeight: number = 0.1;
  private readonly _lightPulseSpeed: number = 2.1;

  private _liquids: (
    OpenWaterMaterial | StylizedWaterMaterial | FluidSurfaceMaterial | NoirWaterMaterial
  )[] = [];
  private _lavaLight: PointLight | undefined;
  private _slimeLight: PointLight | undefined;
  private _crateMaterial: WorldMaterial | undefined;
  private _buoyTextures: Map<string, Texture> = new Map();
  private _barrelHazard: Object3D | undefined;
  private _barrelOil: Object3D | undefined;
  private _barrelChemical: Object3D | undefined;
  private _liveTunePad: LiveTunePad | undefined;
  private _time: number = 0;
  private readonly _buoyancyBodies: Array<{
    body: Object3D;
    position: Vector3D;
    rotation: Vector3D;
  }> = [];
  private _golden: GoldenSpec | undefined;
  private readonly _goldenResizeHandler: () => void = (): void => this._applyGoldenSurface();

  constructor(options: EngineOptions = {}) {
    super({
      canvasId: "SmallWorld",
      rendererType: RendererType.BEST,
      fullscreen: true,
      enablePhysics: true, // the buoyancy pools (FluidVolume) need the physics step
      ...options,
    });
  }

  /**
   * Runs the regular showcase boot, then -- only when the golden query parameters are present --
   * the deterministic single-pool capture on top of the fully-ready scene.
   */
  public override async start(): Promise<void> {
    const golden = parseGoldenSpec();
    this._golden = golden;
    // Golden mode must be pixel-reproducible: lock the procedural texture RNG *before* the
    // engine boots the scene, or every run would generate a different meadow/tile pattern.
    if (golden) {
      seedMathRandom(GOLDEN_TEXTURE_SEED);
    }
    await super.start();
    if (golden) {
      await this._runGoldenCapture(golden);
    }
  }

  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    const aspect = window.innerWidth / window.innerHeight;
    // Start framing: as close as possible while the near pool row (outer pools + signs, +-21 m
    // wide, with margin) still fits the horizontal field of view at this aspect ratio.
    const startFov = MathUtils.degToRad(64);
    const startPitch = MathUtils.degToRad(-42);
    const nearRowZ = poolWorldPosition("petroleum-oil").z;
    const framedDepth = 21 / (Math.tan(startFov / 2) * aspect);
    const startZ = Math.min(
      60,
      Math.max(
        24,
        nearRowZ +
          (framedDepth - this._startEyeHeight * Math.sin(-startPitch)) / Math.cos(startPitch),
      ),
    );
    this.camera.projection = new PerspectiveProjection({
      fov: startFov,
      aspect,
      near: 0.1,
      far: 1000,
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, this._startEyeHeight, startZ);
    this.camera.theta = 0; // Look across all pool rows along -Z (the whole gallery in view)
    this.camera.phi = startPitch;
    this.renderer.setClearColor(new Color(0.26, 0.48, 0.8, 1.0)); // Daylight sky instead of a black void
    // Horizon haze: the far meadow fades into a pale sky tone, so the sky reads as a gradient
    this.scene.fog = new Fog({
      mode: FogMode.LINEAR,
      color: new Color(0.62, 0.78, 0.92),
      near: 70.0,
      far: 260.0,
    });
    this.camera.addBehavior(
      new FPSController({ input: this.input, audio: this.audio, moveSpeed: this._moveSpeed }),
    );
    this.camera.addBehavior(new ZoomController({ input: this.input, audio: this.audio }));

    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.35 }));
    const sun = new DirectionalLight({
      color: Color.WHITE,
      intensity: 1.15,
      castShadow: true,
      numCascades: 4,
      shadowResolution: 2048,
      shadowBias: 0.0005,
      shadowNormalBias: 0.002,
    });
    sun.direction.set(-0.65, -0.95, 0.55).normalize();
    this.scene.add(sun);

    // Swimming pool ceramic tile texture: classic cyan/water-blue tiles with clean white grout lines
    const tileMaterial = this._createTileMaterial(TILE_PALETTES.pool);
    // Dark frames for the dark / special liquids: the bright cyan frame clashes with lava, oil, noir...
    const murkTileMaterial = this._createTileMaterial(TILE_PALETTES.murk);
    const noirTileMaterial = this._createTileMaterial(TILE_PALETTES.noir);
    const basaltTileMaterial = this._createTileMaterial(TILE_PALETTES.basalt);
    const toxicTileMaterial = this._createTileMaterial(TILE_PALETTES.toxic);
    const oilTileMaterial = this._createTileMaterial(TILE_PALETTES.graphite);

    // Meadow grass texture for the surrounding terrain
    const grassTexture = await Texture.fromUrl("./assets/grass.webp", {
      generateMipmaps: true,
      flipY: true,
      anisotropy: 16,
    });
    const groundMaterial = new WorldMaterial({ diffuseMap: grassTexture });
    groundMaterial.color = Color.WHITE;

    // Build the lush meadow ground with seamless cutouts for the 2x5 pool grid
    this._buildGroundWithPoolHoles(groundMaterial);

    // Load fluid textures for Lava & Slime pools
    const lavaTexture = await Texture.fromUrl("./assets/lava_crust.webp", {
      generateMipmaps: true,
      flipY: true,
    });
    const lavaNormalMap = await Texture.fromUrl("./assets/lava_crust_normal.webp", {
      generateMipmaps: true,
      flipY: true,
    });
    const slimeTexture = await Texture.fromUrl("./assets/slime_bubbles.webp", {
      generateMipmaps: true,
      flipY: true,
    });
    const slimeNormalMap = await Texture.fromUrl("./assets/slime_bubbles_normal.webp", {
      generateMipmaps: true,
      flipY: true,
    });

    // Load wooden crate textures (Underwater Hideout asset)
    const crateDiffuse = await Texture.fromUrl("./assets/crate_diffuse.webp", {
      generateMipmaps: true,
      flipY: true,
      anisotropy: 16,
    });
    this._crateMaterial = new WorldMaterial({
      diffuseMap: crateDiffuse,
    });
    this._crateMaterial.color = Color.WHITE;

    // Load Industrial Kit Barrels (GLB models)
    const gltfLoader = new GltfLoader();
    const [barrelHazard, barrelOil, barrelChemical] = await Promise.all([
      gltfLoader.load("./assets/barrel_hazard_yellow.glb"),
      gltfLoader.load("./assets/barrel_oil_black.glb"),
      gltfLoader.load("./assets/barrel_chemical_blue.glb"),
    ]);
    this._barrelHazard = barrelHazard;
    this._barrelOil = barrelOil;
    this._barrelChemical = barrelChemical;

    // ─────────────────────────────────────────────────────────────────────────
    // ROW 1 (North, Z = -7.5): Water & Anime Styles
    // ─────────────────────────────────────────────────────────────────────────

    // 1. Clear Water (PBR Ocean)
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
      ...poolWorldPosition("clear-water"),
      liquid: clearWater,
      needsTangents: true,
      tileMaterial,
      spawnDelay: 3.0,
      sunkObjects: [
        [this._makeCrate(new Color(0.55, 0.38, 0.22)), -1.0, -0.6],
        [this._makeBall(new Color(0.85, 0.72, 0.15), 0.35), 0.9, 0.5],
      ],
      floaters: [
        [this._makeBall(new Color(0.9, 0.2, 0.15), 0.35), -1.3, 1.2, 0.12, 1.8],
        [this._makeBarrel("chemical"), 1.2, -1.1, 0.09, 2.2],
      ],
      dropper: this._makeCrate(new Color(0.55, 0.38, 0.22)),
    });

    // 2. Classic Toon Water (Stepped Cel Foam Bands)
    const toonWater = new StylizedWaterMaterial({
      style: "toon",
      shallowWaterColor: new Color(0.1, 0.65, 0.85),
      deepWaterColor: new Color(0.02, 0.16, 0.3),
      edgeColor: new Color(0.9, 1.0, 1.0),
      edgeSoftness: 0.2,
      foamDistance: 1.0,
      speed: 1.0,
      wave1: [1.0, 0.4, 0.08, 3.2],
      wave2: [0.3, 0.9, 0.06, 2.0],
      wave3: [-0.4, 0.6, 0.04, 1.3],
    });
    this._liveTunePad = new LiveTunePad(toonWater);
    this._liveTunePad.attach(window);
    this._buildPool({
      name: "ToonWaterPool",
      ...poolWorldPosition("toon-water"),
      liquid: toonWater,
      needsTangents: true,
      tileMaterial,
      spawnDelay: 4.5,
      sunkObjects: [
        [this._makeCrate(new Color(0.2, 0.55, 0.7)), -0.8, -0.7],
        [this._makeBall(new Color(0.95, 0.85, 0.1), 0.32), 1.0, 0.6],
      ],
      floaters: [
        [this._makeBall(new Color(0.95, 0.85, 0.05), 0.38), -1.2, 1.1, 0.14, 2.0], // Yellow duck proxy
        [this._makeDebris(new Color(0.9, 0.25, 0.2), 0.35), 1.1, -1.0, 0.1, 2.5],
      ],
      dropper: this._makeCrate(new Color(0.85, 0.35, 0.2)),
    });

    // 3. Bold Anime Water (Punchy Stylized Ocean)
    const boldWater = new StylizedWaterMaterial({
      style: "bold",
      shallowWaterColor: new Color(0.08, 0.55, 0.8),
      deepWaterColor: new Color(0.01, 0.12, 0.25),
      edgeColor: new Color(0.95, 1.0, 1.0),
      edgeSoftness: 0.35,
      foamDistance: 1.2,
      speed: 1.1,
      wave1: [1.0, 0.45, 0.09, 3.5],
      wave2: [0.4, 0.85, 0.065, 2.2],
      wave3: [-0.5, 0.55, 0.045, 1.4],
    });
    this._buildPool({
      name: "BoldAnimePool",
      ...poolWorldPosition("bold-anime"),
      liquid: boldWater,
      needsTangents: true,
      tileMaterial,
      spawnDelay: 5.0,
      sunkObjects: [
        [this._makeCrate(new Color(0.35, 0.35, 0.4)), -0.9, -0.6],
        [this._makeDebris(new Color(0.85, 0.2, 0.6), 0.35), 0.9, 0.5],
      ],
      floaters: [
        [this._makeBall(new Color(0.1, 0.75, 0.9), 0.35), -1.1, 1.2, 0.13, 2.1],
        [this._makeDebris(new Color(0.95, 0.65, 0.1), 0.4), 1.2, -0.9, 0.11, 2.6],
      ],
      dropper: this._makeCrate(new Color(0.2, 0.6, 0.8)),
    });

    // 4. Soft Anime Watercolor (Smooth Voronoi Caustics & Gentle Gradients)
    const softWatercolorWater = new StylizedWaterMaterial({
      style: "soft",
      shallowWaterColor: new Color(0.18, 0.76, 0.82),
      deepWaterColor: new Color(0.02, 0.22, 0.35),
      edgeColor: new Color(0.9, 0.98, 1.0),
      edgeSoftness: 0.9,
      causticStrength: 0.65,
      foamDistance: 0.85,
      speed: 0.85,
      wave1: [0.8, 0.3, 0.06, 2.5],
      wave2: [0.2, 0.8, 0.045, 1.6],
      wave3: [-0.3, 0.5, 0.03, 1.0],
    });
    this._buildPool({
      name: "SoftWatercolorPool",
      ...poolWorldPosition("soft-watercolor"),
      liquid: softWatercolorWater,
      needsTangents: true,
      tileMaterial,
      spawnDelay: 3.5,
      sunkObjects: [
        [this._makeCrate(new Color(0.6, 0.5, 0.38)), -1.0, -0.5],
        [this._makeBall(new Color(0.25, 0.65, 0.45), 0.32), 0.8, 0.6],
      ],
      floaters: [
        [this._makeBall(new Color(0.3, 0.75, 0.5), 0.36), -1.2, 1.0, 0.08, 1.5], // Mossy stone orb
        [this._makeDebris(new Color(0.85, 0.8, 0.65), 0.35), 1.0, -1.2, 0.07, 1.9],
      ],
      dropper: this._makeCrate(new Color(0.65, 0.55, 0.42)),
    });

    // 5. Painterly Sparkle (Twinkling 4-Point Astroid Star Glints & Vibrant Turquoise Caustics)
    const sparkleWater = new StylizedWaterMaterial({
      style: "sparkle",
      shallowWaterColor: new Color(0.0, 0.88, 0.94), // Vibrant electric turquoise / aqua-cyan
      deepWaterColor: new Color(0.01, 0.17, 0.26), // Deep oceanic petrol-teal / sapphire navy
      edgeColor: new Color(0.91, 1.0, 1.0), // Luminous aqua-white shimmer
      edgeSoftness: 0.45,
      glitterStrength: 1.35,
      causticStrength: 1.25,
      refractionStrength: 0.038,
      waterAbsorption: [0.38, 0.075, 0.018],
      rampSoftness: 0.6,
      washAmount: 0.22,
      foamColor: new Color(0.96, 1.0, 1.0),
      foamDistance: 0.75,
      foamNoiseScale: 4.2,
      foamNoiseSpeed: 0.65,
      speed: 0.85,
      wave1: [0.9, 0.35, 0.065, 3.0],
      wave2: [0.35, 0.85, 0.045, 1.9],
      wave3: [-0.4, 0.55, 0.025, 1.2],
    });
    this._buildPool({
      name: "PainterlySparklePool",
      ...poolWorldPosition("painterly-sparkle"),
      liquid: sparkleWater,
      needsTangents: true,
      tileMaterial,
      spawnDelay: 4.0,
      sunkObjects: [
        [this._makeBall(new Color(0.28, 0.52, 0.68), 0.42), -1.1, -0.7], // Smooth river stone (teal-slate)
        [this._makeBall(new Color(0.38, 0.65, 0.8), 0.36), -0.4, -0.9], // River pebble (azure-grey)
        [this._makeBall(new Color(0.2, 0.42, 0.58), 0.46), 0.4, -0.5], // River rock (deep cyan)
        [this._makeBall(new Color(0.45, 0.72, 0.88), 0.32), 1.1, -0.8], // River pebble (light aqua)
        [this._makeDebris(new Color(0.95, 0.88, 0.4), 0.38), -0.6, 0.6], // Sunlit crystal prism
        [this._makeBall(new Color(0.32, 0.58, 0.74), 0.38), 0.8, 0.7], // River stone
      ],
      floaters: [
        [this._makeDebris(new Color(1.0, 0.92, 0.3), 0.4), -1.1, 1.1, 0.1, 2.2], // Golden star
        [this._makeBall(new Color(0.95, 0.4, 0.7), 0.34), 1.2, -0.9, 0.09, 2.0],
      ],
      dropper: this._makeCrate(new Color(0.9, 0.8, 0.3)),
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ROW 2 (South, Z = +7.5): Exotic & Specialized Fluids
    // ─────────────────────────────────────────────────────────────────────────

    // 6. Dredge (Eerie Abyssal Murk)
    const dredgeWater = new StylizedWaterMaterial({
      style: "dredge",
      shallowWaterColor: new Color(0.08, 0.28, 0.24),
      deepWaterColor: new Color(0.01, 0.05, 0.05),
      edgeColor: new Color(0.4, 0.6, 0.55),
      edgeSoftness: 0.8,
      foamDistance: 0.7,
      speed: 0.6,
      wave1: [0.6, 0.2, 0.05, 2.0],
      wave2: [0.15, 0.7, 0.035, 1.3],
      wave3: [-0.2, 0.4, 0.025, 0.9],
    });
    this._buildPool({
      name: "DredgePool",
      ...poolWorldPosition("dredge"),
      liquid: dredgeWater,
      needsTangents: true,
      tileMaterial: murkTileMaterial,
      spawnDelay: 5.5,
      sunkObjects: [
        [this._makeCrate(new Color(0.15, 0.18, 0.17)), -0.9, -0.5],
        [this._makeDebris(new Color(0.12, 0.25, 0.2), 0.4), 0.8, 0.5],
      ],
      floaters: [
        [this._makeBarrel("oil"), -1.2, 1.0, 0.08, 1.4],
        [this._makeDebris(new Color(0.2, 0.35, 0.3), 0.35), 1.1, -1.0, 0.06, 1.7],
      ],
      dropper: this._makeCrate(new Color(0.2, 0.22, 0.2)),
    });

    this._installRampVerifyHook({
      "toon-water": toonWater,
      "bold-anime": boldWater,
      "soft-watercolor": softWatercolorWater,
      "painterly-sparkle": sparkleWater,
      dredge: dredgeWater,
    });

    // 7. Noir Graphic Novel (Black-and-White Comic Ink Posterization)
    const noirWater = new NoirWaterMaterial();
    this._buildPool({
      name: "NoirGraphicPool",
      ...poolWorldPosition("noir-graphic"),
      liquid: noirWater,
      needsTangents: true,
      tileMaterial: noirTileMaterial,
      spawnDelay: 4.2,
      sunkObjects: [
        [this._makeCrate(new Color(0.1, 0.1, 0.1)), -0.9, -0.6],
        [this._makeBall(new Color(0.9, 0.9, 0.9), 0.32), 0.9, 0.5],
      ],
      floaters: [
        [this._makeBall(new Color(0.95, 0.95, 0.95), 0.36), -1.1, 1.1, 0.1, 1.8],
        [this._makeCrate(new Color(0.05, 0.05, 0.05)), 1.1, -0.9, 0.09, 2.2],
      ],
      dropper: this._makeBall(new Color(0.85, 0.85, 0.85), 0.35),
    });

    // 8. Molten Lava (Viscous Magma with Crust & Pulse)
    const lava = new LavaMaterial({
      noiseMap: lavaTexture,
      normalMap: lavaNormalMap,
      color: new Color(1.0, 0.3, 0.02),
      edgeColor: new Color(0.2, 0.07, 0.04), // Lighter crust so the plates read against the glow
      emissiveStrength: 2.4,
      emissiveColor: new Color(1.0, 0.2, 0.03), // Orange-red hue, less yellow when overexposed
      emissivePulse: 0.85,
      transitionSoftness: 0.35,
      normalStrength: 2.0,
      waveAmplitude: 0.09,
      shade: 0.9,
      viscosity: 14.0,
    });
    this._buildPool({
      name: "MoltenLavaPool",
      ...poolWorldPosition("molten-lava"),
      liquid: lava,
      needsTangents: false,
      tileMaterial: basaltTileMaterial,
      spawnDelay: 4.0,
      sunkObjects: [
        [this._makeCrate(new Color(0.55, 0.16, 0.06)), -0.8, -0.5], // Heat-tinted (lit by the magma)
        [this._makeDebris(new Color(1.0, 0.45, 0.08), 0.38), 0.8, 0.6],
      ],
      floaters: [
        [this._makeDebris(new Color(0.3, 0.14, 0.09), 0.42), -1.2, 1.1, 0.07, 1.2], // Charred rock, rim-lit by the lava
        [this._makeBall(new Color(0.85, 0.35, 0.05), 0.32), 1.0, -1.0, 0.06, 1.5],
      ],
      dropper: this._makeDebris(new Color(0.15, 0.09, 0.08), 0.4),
    });
    this._lavaLight = new PointLight({
      color: new Color(1.0, 0.45, 0.1),
      intensity: 8.5,
      distance: 14,
    });
    const lavaCenter = poolWorldPosition("molten-lava");
    this._lavaLight.position.set(lavaCenter.x, 0.45, lavaCenter.z); // Low over the surface: the orange light bleeds onto the frame and floaters
    this.scene.add(this._lavaLight);

    // 9. Toxic Slime (Bioluminescent Green Acid with Bubbles)
    const slime = new SlimeMaterial({
      noiseMap: slimeTexture,
      normalMap: slimeNormalMap,
      color: new Color(0.15, 0.95, 0.25),
      edgeColor: new Color(0.1, 0.42, 0.07), // Dark contact colour: a bright edge colour summed with glow and shade clipped to white at the walls
      emissiveStrength: 0.35,
      rimStrength: 0.15,
      specularStrength: 0.3, // Soft bright bubble highlights instead of dark outlines
      specularPower: 160.0,
      shade: 0.6,
      absorption: 2.2,
      normalStrength: 1.5,
      viscosity: 10.0,
    });
    this._buildPool({
      name: "ToxicSlimePool",
      ...poolWorldPosition("toxic-slime"),
      liquid: slime,
      needsTangents: false,
      tileMaterial: toxicTileMaterial,
      spawnDelay: 5.0,
      sunkObjects: [
        [this._makeCrate(new Color(0.18, 0.35, 0.15)), -0.9, -0.6],
        [this._makeBall(new Color(0.8, 0.9, 0.1), 0.3), 0.9, 0.5],
      ],
      floaters: [
        [this._makeBarrel("hazard"), -1.1, 1.1, 0.08, 1.4], // Toxic yellow hazard barrel
        [this._makeBall(new Color(0.2, 0.9, 0.3), 0.35), 1.0, -1.1, 0.07, 1.7],
      ],
      dropper: this._makeBarrel("hazard"),
    });
    this._slimeLight = new PointLight({
      color: new Color(0.2, 1.0, 0.3),
      intensity: 6.5,
      distance: 14,
    });
    const slimeCenter = poolWorldPosition("toxic-slime");
    this._slimeLight.position.set(slimeCenter.x, 0.55, slimeCenter.z);
    this.scene.add(this._slimeLight);

    // 10. Petroleum Oil (Dark Viscous Hydrocarbon with a slick sheen). Colours, specular and
    // sheen come from the OilSlickMaterial defaults; nothing is overridden here.
    const darkOil = new OilSlickMaterial();
    this._buildPool({
      name: "PetroleumOilPool",
      ...poolWorldPosition("petroleum-oil"),
      liquid: darkOil,
      needsTangents: true,
      tileMaterial: oilTileMaterial,
      spawnDelay: 6.0,
      sunkObjects: [
        [this._makeIndustrialPipe(new Color(0.2, 0.22, 0.24)), -0.8, -0.6],
        [this._makeIndustrialGear(new Color(0.18, 0.19, 0.21)), 0.9, 0.6],
      ],
      floaters: [
        [this._makeBarrel("oil"), -1.1, 1.0, 0.04, 1.0], // Black steel industrial oil drum
        [
          this._makeMetallicBuoy(new Color(0.2, 0.15, 0.08), new Color(0.2, 0.08, 0.05)),
          1.1,
          -1.0,
          0.05,
          1.2,
        ], // Oil-stained, rusted buoy
      ],
      dropper: this._makeBarrel("oil"), // Black steel oil drum
    });

    // ─────────────────────────────────────────────────────────────────────────
    // BUOYANCY POOLS: rigid bodies ride the REAL wave surface (FluidVolume + OpenWaterSurfaceProbe)
    // ─────────────────────────────────────────────────────────────────────────

    // 11. Wave Rider: a swell large enough to see the bodies heave with it
    const waveRiderWater = new OpenWaterMaterial({
      waterColor: new Color(0.04, 0.42, 0.58),
      deepWaterColor: new Color(0.0, 0.1, 0.2),
      edgeColor: new Color(0.85, 0.98, 1.0),
      edgeSoftness: 0.8,
      foamDistance: 0.75,
      speed: 0.8,
      wave1: [1.0, 0.3, 0.22, 4.5],
      wave2: [0.3, 1.0, 0.16, 3.0],
      wave3: [-0.6, 0.5, 0.1, 2.2],
      refractionStrength: 0.03,
      waterAbsorption: [0.18, 0.045, 0.015],
      foamColor: new Color(1.0, 1.0, 1.0),
      foamCutoff: 0.45,
      foamNoiseScale: 4.5,
      foamNoiseSpeed: 0.7,
    });
    this._buildPool({
      name: "WaveRiderPool",
      ...poolWorldPosition("wave-rider"),
      liquid: waveRiderWater,
      needsTangents: true,
      tileMaterial,
      spawnDelay: 0,
      splashDropper: false,
    });
    this._installBuoyancyPool("wave-rider", waveRiderWater, 1.0);

    // 12. Dead Sea: the same bodies in brine of density 1.24 sit visibly higher
    const deadSeaWater = new OpenWaterMaterial({
      waterColor: new Color(0.3, 0.72, 0.7),
      deepWaterColor: new Color(0.05, 0.32, 0.36),
      edgeColor: new Color(0.95, 0.98, 0.92),
      edgeSoftness: 0.9,
      foamDistance: 0.5,
      speed: 0.5,
      wave1: [1.0, 0.25, 0.12, 5.0],
      wave2: [0.3, 1.0, 0.09, 3.2],
      wave3: [-0.5, 0.6, 0.06, 2.4],
      refractionStrength: 0.02,
      waterAbsorption: [0.35, 0.1, 0.06],
      foamColor: new Color(0.97, 0.97, 0.93),
      foamCutoff: 0.55,
      foamNoiseScale: 3.5,
      foamNoiseSpeed: 0.4,
    });
    this._buildPool({
      name: "DeadSeaPool",
      ...poolWorldPosition("dead-sea"),
      liquid: deadSeaWater,
      needsTangents: true,
      tileMaterial: this._createTileMaterial(TILE_PALETTES.salt),
      spawnDelay: 0,
      splashDropper: false,
    });
    this._installBuoyancyPool("dead-sea", deadSeaWater, 1.24);

    // Signboards stand BESIDE the pools (in the gap on the entrance side of each pool, not in front
    // of the edges), angled towards the avenue so they read from the start view.
    const signTexts: Readonly<Record<GoldenPoolKey, readonly [string, string]>> = {
      "clear-water": ["Clear Water", "PBR Ocean • Gerstner & Foam"],
      "wave-rider": ["Wave Rider", "Bodies ride the real wave surface"],
      "dead-sea": ["Dead Sea", "Denser brine • Floats higher"],
      "toon-water": ["Classic Toon Water", "Cel Shader • Stepped Foam Bands"],
      "bold-anime": ["Bold Anime Water", "High-Contrast • Saturated Waves"],
      "soft-watercolor": ["Soft Anime Watercolor", "Smooth-Min Voronoi Caustics"],
      "painterly-sparkle": ["Painterly Sparkle", "12 FPS Astroid Star Glints"],
      dredge: ["Dredge Abyssal Fog", "Eerie Murk • Jade Subsurface"],
      "noir-graphic": ["Noir Graphic Novel", "Monochrome Ink • Posterized Tones"],
      "molten-lava": ["Molten Lava", "Viscous Magma • Emissive Crust Glow"],
      "toxic-slime": ["Toxic Slime", "Bioluminescent Acid • Bubbles"],
      "petroleum-oil": ["Petroleum Dark Oil", "Dark Hydrocarbon • Oil Slick Sheen"],
    };
    for (const key of Object.keys(POOL_CELLS) as GoldenPoolKey[]) {
      const { x, z } = poolWorldPosition(key);
      const [title, subtitle] = signTexts[key];
      const yaw = MathUtils.degToRad(POOL_CELLS[key].row === POOL_GRID_ROWS - 1 ? -12 : 12);
      this._createSignboard(title, subtitle, x - 3.9, z + 1.4, yaw);
    }

    this.scene.update();

    await this.waitForAssets();
  }

  /**
   * Generates a high-legibility 3D signboard beside a pool with large, crisp text on both faces.
   */
  private _createSignboard(
    title: string,
    subtitle: string,
    x: number,
    z: number,
    rotationY: number,
  ): Object3D {
    const sign = new Object3D(`Sign_${title.replace(/\s+/g, "_")}`);
    sign.position.set(x, 0, z);
    sign.rotation.y = rotationY;
    sign.scale.set(0.82, 0.82, 0.82); // Compact enough to stand right beside its own pool

    // 1. Sleek dark metallic stand post
    const post = new Object3D("SignPost");
    post.geometry = new Cylinder({
      radiusTop: 0.035,
      radiusBottom: 0.045,
      height: 1.25,
      radialSegments: 12,
    }).getGeometryData();
    post.position.set(0, 0.625, 0);
    post.material = new BasicMaterial({ color: new Color(0.2, 0.22, 0.25) });
    post.castShadow = true;
    sign.add(post);

    // 2. Tilted backplate (the same text face is mounted on both sides, so there is no blank back)
    const board = new Object3D("SignBoard");
    board.geometry = new Cube({ size: 1 }).getGeometryData();
    board.scale.set(3.1, 1.45, 0.06);
    board.position.set(0, 1.25, 0);
    board.rotation.x = -0.32; // Ergonomic upward tilt (~18 deg) for player eye height
    board.material = new BasicMaterial({ color: new Color(0.08, 0.1, 0.14) });
    board.castShadow = true;
    sign.add(board);

    // 3. Crisp High-DPI Text Canvas (1024x480)
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Dark slate gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, 480);
      grad.addColorStop(0, "#0b1329");
      grad.addColorStop(1, "#182234");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 480);

      // Cyan accent border + header line
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 10;
      ctx.strokeRect(8, 8, 1008, 464);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(28, 28, 968, 6);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const font = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      // Main title (shrinks to fit long names)
      ctx.fillStyle = "#ffffff";
      let titleSize = 104;
      ctx.font = `bold ${titleSize}px ${font}`;
      while (ctx.measureText(title).width > 940 && titleSize > 40) {
        titleSize -= 4;
        ctx.font = `bold ${titleSize}px ${font}`;
      }
      ctx.fillText(title, 512, 185);

      // Subtitle / tech description
      ctx.fillStyle = "#7dd3fc";
      let subSize = 58;
      ctx.font = `600 ${subSize}px ${font}`;
      while (ctx.measureText(subtitle).width > 940 && subSize > 30) {
        subSize -= 2;
        ctx.font = `600 ${subSize}px ${font}`;
      }
      ctx.fillText(subtitle, 512, 330);

      ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
      ctx.fillRect(160, 405, 704, 3);
    }

    const textTexture = Texture.fromCanvas(canvas, {
      anisotropy: 16,
      generateMipmaps: true,
    });
    textTexture.flipY();

    const faceMaterial = new BasicMaterial({ diffuseMap: textTexture });
    const displayPlane = new Object3D("SignFace");
    displayPlane.geometry = new Plane({ width: 3.0, height: 1.4 }).getGeometryData();
    displayPlane.position.set(0, 1.25, 0.035);
    displayPlane.rotation.x = -0.32;
    displayPlane.material = faceMaterial;
    sign.add(displayPlane);

    // Back face: turned 180 degrees around the board's own Y axis
    const backFace = new Object3D("SignFaceBack");
    backFace.geometry = new Plane({ width: 3.0, height: 1.4 }).getGeometryData();
    backFace.position.set(0, 1.25, -0.035);
    backFace.rotation.set(0.32, Math.PI, 0);
    backFace.material = faceMaterial;
    sign.add(backFace);

    this.scene.add(sign);
    return sign;
  }

  /** Wraps a generated ceramic tile texture into a world material for the pool frame. */
  private _createTileMaterial(palette: TilePalette): WorldMaterial {
    const material = new WorldMaterial({ diffuseMap: this._createPoolTileTexture(palette) });
    material.color = Color.WHITE;
    return material;
  }

  /**
   * Generates a ceramic tile texture from a palette: glazed tiles with grout lines
   * (bright aqua for the water pools, dark ceramics for the dark liquids).
   */
  private _createPoolTileTexture(palette: TilePalette): Texture {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Texture.empty();

    const tilesPerAxis = 8;
    const tileSize = size / tilesPerAxis; // 128px
    const groutSize = 5.5; // Double-thickness grout (11px between tiles)

    ctx.fillStyle = palette.grout;
    ctx.fillRect(0, 0, size, size);

    // Subtle fine grout texture
    ctx.fillStyle = palette.groutSpeckle;
    for (let i = 0; i < 900; i++) {
      const gx = Math.random() * size;
      const gy = Math.random() * size;
      ctx.fillRect(gx, gy, 2.0, 2.0);
    }

    // Draw glossy ceramic tiles with randomized shade variants
    for (let y = 0; y < tilesPerAxis; y++) {
      for (let x = 0; x < tilesPerAxis; x++) {
        const tx = x * tileSize + groutSize;
        const ty = y * tileSize + groutSize;
        const tw = tileSize - groutSize * 2;
        const th = tileSize - groutSize * 2;

        const variant = palette.variants[Math.floor(Math.random() * palette.variants.length)]!;
        const grad = ctx.createLinearGradient(tx, ty, tx + tw, ty + th);
        grad.addColorStop(0.0, variant[0]);
        grad.addColorStop(0.35, variant[1]);
        grad.addColorStop(0.7, variant[2]);
        grad.addColorStop(1.0, variant[3]);

        ctx.fillStyle = grad;
        ctx.fillRect(tx, ty, tw, th);

        // Radial glaze reflection in upper-left quadrant
        const radialGrad = ctx.createRadialGradient(
          tx + tw * 0.25,
          ty + th * 0.25,
          2,
          tx + tw * 0.3,
          ty + th * 0.3,
          tw * 0.65,
        );
        radialGrad.addColorStop(0.0, `rgba(255, 255, 255, ${0.45 * palette.shine})`);
        radialGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.12 * palette.shine})`);
        radialGrad.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");
        ctx.fillStyle = radialGrad;
        ctx.fillRect(tx, ty, tw, th);

        // 3D Inner Bevel Highlight (Top & Left edges)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * palette.shine})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(tx, ty + th);
        ctx.lineTo(tx, ty);
        ctx.lineTo(tx + tw, ty);
        ctx.stroke();

        // 3D Inner Bevel Shadow (Bottom & Right edges)
        ctx.strokeStyle = "rgba(10, 48, 75, 0.4)";
        ctx.lineWidth = 2.2;
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
   * Creates a box geometry with UV coordinates scaled and offset so that the top rim face
   * maps to exactly 2 tiles and 3 full grout lines (outer, center, inner) with equal thickness.
   */
  private _createTiledBoxGeometry(
    width: number,
    height: number,
    depth: number,
    tileUnitSize: number = TILE_UNIT_SIZE,
  ): GeometryDataInterface {
    const geom = new Cube({ size: 1 }).getGeometryData();
    const uvs = geom.uvs;
    const vertices = geom.vertices;
    if (uvs && vertices) {
      for (let i = 0; i < vertices.length; i += 3) {
        vertices[i] = vertices[i]! * width;
        vertices[i + 1] = vertices[i + 1]! * height;
        vertices[i + 2] = vertices[i + 2]! * depth;
      }

      const gUV = GROUT_THICKNESS_PX / 1024;
      const faceDims: Array<[number, number]> = [
        [depth, height], // Face 0: Right (+X)
        [depth, height], // Face 1: Left (-X)
        [width, depth], // Face 2: Top (+Y)
        [width, depth], // Face 3: Bottom (-Y)
        [width, height], // Face 4: Front (+Z)
        [width, height], // Face 5: Back (-Z)
      ];

      for (let f = 0; f < 6; f++) {
        const [spanU, spanV] = faceDims[f]!;
        const numTilesU = Math.max(1, Math.round((spanU - GROUT_METERS) / tileUnitSize));
        const numTilesV = Math.max(1, Math.round((spanV - GROUT_METERS) / tileUnitSize));
        const u0 = -gUV;
        const u1 = (numTilesU * TILE_CELL_PX + GROUT_THICKNESS_PX) / 1024;
        const v0 = -gUV;
        const v1 = (numTilesV * TILE_CELL_PX + GROUT_THICKNESS_PX) / 1024;

        const offset = f * 8;
        // Vertices order from Cube.buildPlane:
        // Vertex 0: (u0, v1), Vertex 1: (u1, v1), Vertex 2: (u0, v0), Vertex 3: (u1, v0)
        uvs[offset + 0] = u0;
        uvs[offset + 1] = v1;
        uvs[offset + 2] = u1;
        uvs[offset + 3] = v1;
        uvs[offset + 4] = u0;
        uvs[offset + 5] = v0;
        uvs[offset + 6] = u1;
        uvs[offset + 7] = v0;
      }
    }
    return geom;
  }

  /**
   * Builds the world meadow ground with seamless cutouts for all pools of the grid,
   * mapping UVs in world space so the grass tiles continuously across all chunks.
   */
  private _buildGroundWithPoolHoles(groundMaterial: WorldMaterial): void {
    const addGroundChunk = (name: string, w: number, d: number, px: number, pz: number): void => {
      const chunk = new Object3D(name);
      const geom = new Ground({ width: w, depth: d }).getGeometryData();
      const uvs = geom.uvs;
      if (uvs) {
        const uvScale = 0.35; // Seamless ~2.8m grass tile repetition
        for (let i = 0; i < uvs.length; i += 2) {
          const localX = uvs[i]! * w - w / 2;
          const localZ = (1 - uvs[i + 1]!) * d - d / 2;
          const worldX = localX + px;
          const worldZ = localZ + pz;
          uvs[i] = worldX * uvScale;
          uvs[i + 1] = worldZ * uvScale;
        }
      }
      chunk.geometry = geom;
      chunk.position.set(px, 0, pz);
      chunk.material = groundMaterial;
      chunk.receiveShadow = true;
      this.scene.add(chunk);
    };

    // Total area: 600 x 600 (X/Z [-300, +300]) so the meadow edge never shows in the gallery views.
    // The plane is cut along every pool edge; the cells that fall inside a pool footprint are left
    // out, everything else (walkways, plaza, surrounding meadow) becomes one chunk per cell.
    const halfPool = POOL_SIZE / 2;
    const edgesAround = (centers: number[]): number[] => [
      -300,
      ...centers.flatMap((c) => [c - halfPool, c + halfPool]),
      300,
    ];
    const poolCenters = (Object.keys(POOL_CELLS) as GoldenPoolKey[]).map(poolWorldPosition);
    const xEdges = edgesAround([...new Set(poolCenters.map((c) => c.x))].sort((a, b) => a - b));
    const zEdges = edgesAround([...new Set(poolCenters.map((c) => c.z))].sort((a, b) => a - b));
    for (let i = 0; i < xEdges.length - 1; i++) {
      for (let j = 0; j < zEdges.length - 1; j++) {
        // Intervals alternate outside / pool: odd indices are pool footprints.
        if (i % 2 === 1 && j % 2 === 1) continue;
        const w = xEdges[i + 1]! - xEdges[i]!;
        const d = zEdges[j + 1]! - zEdges[j]!;
        addGroundChunk(
          `Ground_${i}_${j}`,
          w,
          d,
          (xEdges[i]! + xEdges[i + 1]!) / 2,
          (zEdges[j]! + zEdges[j + 1]!) / 2,
        );
      }
    }
  }

  /**
   * Builds one square, half-sunk pool basin: ceramic rim walls, floor plate, liquid surface,
   * sunk objects on the floor, floating bobbing objects, and one periodic splash dropper.
   */
  /** Installs `window.__rampVerify` when the URL carries `?__rampVerify=1` (see {@link RampVerifyHook}). */
  private _installRampVerifyHook(targets: Record<string, StylizedWaterMaterial>): void {
    if ("1" !== new URLSearchParams(window.location.search).get("__rampVerify")) return;

    const luts = new Map<string, RampLUT>();
    const toStops = (stops: RampVerifyStop[]): RampStop[] =>
      stops.map((s: RampVerifyStop) => ({
        t: s.t,
        color: new Color(s.color[0] / 255, s.color[1] / 255, s.color[2] / 255),
      }));
    const material = (poolKey: string): StylizedWaterMaterial => {
      const m = targets[poolKey];
      if (undefined === m) throw new Error(`[__rampVerify] Unknown pool '${poolKey}'`);
      return m;
    };

    (window as unknown as GoldenWindowFlags).__rampVerify = {
      poolKeys: Object.keys(targets),
      setRamp: (poolKey: string, stops: RampVerifyStop[] | null): void => {
        const m = material(poolKey);
        if (null === stops) {
          m.rampMap = undefined;
          luts.delete(poolKey);
          return;
        }
        const lut = new RampLUT(toStops(stops));
        luts.set(poolKey, lut);
        m.rampMap = lut.texture;
      },
      updateStops: (poolKey: string, stops: RampVerifyStop[]): void => {
        const lut = luts.get(poolKey);
        if (undefined === lut) throw new Error(`[__rampVerify] No ramp set for '${poolKey}'`);
        lut.setStops(toStops(stops));
      },
    };
  }

  private _buildPool(config: {
    name: string;
    x: number;
    z: number;
    liquid: OpenWaterMaterial | StylizedWaterMaterial | FluidSurfaceMaterial | NoirWaterMaterial;
    needsTangents: boolean;
    tileMaterial: WorldMaterial;
    spawnDelay: number;
    sunkObjects?: Array<[Object3D, number, number]>;
    floaters?: Array<[Object3D, number, number, number, number]>;
    dropper?: Object3D;
    /** Set to false for pools whose bodies come from the physics system instead. */
    splashDropper?: boolean;
  }): void {
    const {
      name,
      x,
      z,
      liquid,
      needsTangents,
      tileMaterial,
      spawnDelay,
      sunkObjects,
      floaters,
      dropper,
      splashDropper = true,
    } = config;
    const inner = POOL_SIZE - 2 * WALL_THICKNESS; // 4.4
    const wallOffset = (POOL_SIZE - WALL_THICKNESS) / 2; // 2.35

    const pool = new Object3D(name);
    pool.position.set(x, 0, z);
    this.scene.add(pool);

    // 4 non-overlapping rim walls forming a crisp, seamless rectangle with perfect 90-degree corners:
    // North wall spans full POOL_SIZE along X at +Z
    const wallN = new Object3D(`${name}_WallN`);
    wallN.geometry = this._createTiledBoxGeometry(POOL_SIZE, WALL_HEIGHT, WALL_THICKNESS);
    wallN.position.set(0, WALL_CENTER_Y, wallOffset);
    wallN.material = tileMaterial;
    wallN.castShadow = true;
    wallN.receiveShadow = true;
    pool.add(wallN);

    // South wall spans full POOL_SIZE along X at -Z
    const wallS = new Object3D(`${name}_WallS`);
    wallS.geometry = this._createTiledBoxGeometry(POOL_SIZE, WALL_HEIGHT, WALL_THICKNESS);
    wallS.position.set(0, WALL_CENTER_Y, -wallOffset);
    wallS.material = tileMaterial;
    wallS.castShadow = true;
    wallS.receiveShadow = true;
    pool.add(wallS);

    // East wall fits snugly between North and South walls along Z at +X
    const wallE = new Object3D(`${name}_WallE`);
    wallE.geometry = this._createTiledBoxGeometry(WALL_THICKNESS, WALL_HEIGHT, inner);
    wallE.position.set(wallOffset, WALL_CENTER_Y, 0);
    wallE.material = tileMaterial;
    wallE.castShadow = true;
    wallE.receiveShadow = true;
    pool.add(wallE);

    // West wall fits snugly between North and South walls along Z at -X
    const wallW = new Object3D(`${name}_WallW`);
    wallW.geometry = this._createTiledBoxGeometry(WALL_THICKNESS, WALL_HEIGHT, inner);
    wallW.position.set(-wallOffset, WALL_CENTER_Y, 0);
    wallW.material = tileMaterial;
    wallW.castShadow = true;
    wallW.receiveShadow = true;
    pool.add(wallW);

    const floorPlate = new Object3D(`${name}_Floor`);
    floorPlate.geometry = this._createTiledBoxGeometry(inner, 0.2, inner);
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

    // Objects resting on the pool floor
    if (sunkObjects) {
      for (const [obj, ox, oz] of sunkObjects) {
        obj.position.set(ox, FLOOR_Y + 0.35, oz);
        obj.castShadow = true;
        pool.add(obj);
      }
    }

    // Objects floating at the liquid surface
    if (floaters) {
      for (const [obj, ox, oz, amplitude, frequency] of floaters) {
        obj.position.set(ox, LIQUID_Y, oz);
        obj.castShadow = true;
        this._attachPoolBehavior(obj, new BobbingBehavior(amplitude, frequency));
        this._attachPoolBehavior(obj, new RotatorBehavior());
        pool.add(obj);
      }
    }

    if (!splashDropper) return;

    // The periodic "splash" dropper
    const dropObj = dropper ?? this._makeCrate();
    dropObj.position.set(0.3, LIQUID_Y, 0.2);
    dropObj.castShadow = true;
    this._attachPoolBehavior(
      dropObj,
      new SplashDropBehavior(LIQUID_Y, WALL_HEIGHT + 3.0, spawnDelay, (x, z, speed) => {
        if (liquid instanceof LiquidWaveMaterial) {
          liquid.emitSplat(x, z, this._time, speed);
        }
      }),
    );
    pool.add(dropObj);
  }

  /**
   * Turns a finished OpenWater pool into a buoyancy pool: a `FluidVolume` of the given density
   * whose surface height is the CPU mirror of the shader's wave field, plus three physics bodies
   * of different density (about 35 %, 50 % and 75 % submerged in plain water) that ride it.
   */
  private _installBuoyancyPool(
    key: GoldenPoolKey,
    liquid: OpenWaterMaterial,
    density: number,
  ): void {
    const { x, z } = poolWorldPosition(key);
    const half = (POOL_SIZE - 2 * WALL_THICKNESS) / 2;
    const probe = OpenWaterSurfaceProbe.fromMaterial(liquid, { restHeight: LIQUID_Y });
    const water = new FluidVolume(
      new BoundingBox(
        new Vector3D(x - half, FLOOR_Y, z - half),
        new Vector3D(x + half, LIQUID_Y + 1.5, z + half),
      ),
      density,
      BUOYANCY_POOL_DRAG,
    );
    water.surfaceHeightAt = (worldX: number, worldZ: number): number =>
      probe.surfaceHeightAt(worldX, worldZ, this._time);
    this.physics.addFluidVolume(water);

    const bodies: Array<[Object3D, number, number, number]> = [
      [this._makeBall(new Color(0.9, 0.2, 0.15), 0.35), 0.35, -1.2, 0.9],
      [this._makeCrate(new Color(0.55, 0.38, 0.22)), 0.5, 0.4, -0.5],
      [this._makeCrate(new Color(0.2, 0.2, 0.24)), 0.75, 1.2, 0.9],
    ];
    for (const [body, submersion, offsetX, offsetZ] of bodies) {
      const homeX = x + offsetX;
      const homeZ = z + offsetZ;
      body.position.set(homeX, LIQUID_Y + 0.8, homeZ);
      body.rigidBody = new RigidBody(1.0);
      body.castShadow = true;
      this._buoyancyBodies.push({
        body,
        position: body.position.clone(),
        rotation: body.rotation.clone(),
      });
      this._attachPoolBehavior(body, new PoolHomeBehavior(homeX, homeZ, submersion));
      this.scene.add(body);
    }
  }

  private _getBuoyTexture(
    topColor: string = "#d82222",
    bottomColor: string = "#ffffff",
    beltColor: string = "#141416",
  ): Texture {
    const key = `${topColor}_${bottomColor}_${beltColor}`;
    let tex = this._buoyTextures.get(key);
    if (tex) return tex;

    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Texture.empty();

    const beltThickness = size * 0.14;
    const beltTop = (size - beltThickness) / 2;
    const beltBottom = (size + beltThickness) / 2;

    // 1. Upper Hemisphere (Red / topColor)
    ctx.fillStyle = topColor;
    ctx.fillRect(0, 0, size, beltTop);

    // Subtle curvature highlight on upper hemisphere
    const topGrad = ctx.createLinearGradient(0, 0, 0, beltTop);
    topGrad.addColorStop(0.0, "rgba(255, 255, 255, 0.18)");
    topGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.0)");
    topGrad.addColorStop(1.0, "rgba(0, 0, 0, 0.12)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, size, beltTop);

    // 2. Lower Hemisphere (White / bottomColor)
    ctx.fillStyle = bottomColor;
    ctx.fillRect(0, beltBottom, size, size - beltBottom);

    // Subtle curvature shading on lower hemisphere
    const botGrad = ctx.createLinearGradient(0, beltBottom, 0, size);
    botGrad.addColorStop(0.0, "rgba(0, 0, 0, 0.08)");
    botGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.0)");
    botGrad.addColorStop(1.0, "rgba(200, 215, 230, 0.25)");
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, beltBottom, size, size - beltBottom);

    // 3. Equator Belt (Black / beltColor)
    ctx.fillStyle = beltColor;
    ctx.fillRect(0, beltTop, size, beltThickness);

    // Center button: the canvas maps 2:1 onto the sphere (360 x 180 degrees), so the ellipse is
    // squeezed horizontally to read as a circle on the surface.
    const buttonX = size * 0.5;
    const buttonY = size * 0.5;
    const buttonRadius = beltThickness * 0.95;
    const drawButton = (radius: number, color: string): void => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(buttonX, buttonY, radius * 0.5, radius, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    drawButton(buttonRadius, beltColor);
    drawButton(buttonRadius * 0.78, bottomColor);
    drawButton(buttonRadius * 0.5, beltColor);
    drawButton(buttonRadius * 0.38, bottomColor);

    tex = Texture.fromCanvas(canvas, {
      anisotropy: 16,
      generateMipmaps: true,
    });
    this._buoyTextures.set(key, tex);
    return tex;
  }

  private _makeCrate(color?: Color): Object3D {
    const crate = new Object3D("Crate");
    crate.geometry = new Cube({ size: 0.6 }).getGeometryData();
    crate.castShadow = true;
    crate.receiveShadow = true;
    if (this._crateMaterial) {
      if (color && (color.r !== 1 || color.g !== 1 || color.b !== 1)) {
        const mat = new WorldMaterial(
          this._crateMaterial.diffuseMap
            ? { diffuseMap: this._crateMaterial.diffuseMap, color }
            : { color },
        );
        crate.material = mat;
      } else {
        crate.material = this._crateMaterial;
      }
    } else {
      crate.material = new WorldMaterial({
        color: color ?? new Color(0.55, 0.4, 0.25),
      });
    }
    return crate;
  }

  private _makeBall(color: Color = new Color(0.88, 0.15, 0.15), radius: number = 0.35): Object3D {
    const ball = new Object3D("Ball");
    ball.geometry = new Sphere({
      radius,
      widthSegments: 24,
      heightSegments: 16,
    }).getGeometryData();
    ball.castShadow = true;
    ball.receiveShadow = true;
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const topHex = `rgb(${r},${g},${b})`;
    const buoyTex = this._getBuoyTexture(topHex, "#ffffff", "#141416");
    ball.material = new LambertMaterial({
      diffuseMap: buoyTex,
    });
    // Tilted so the equator belt stays visible from the top-down camera instead of hiding at the silhouette.
    ball.rotation.set(1.0, -Math.PI / 2, 0.5);
    return ball;
  }

  private _makeDebris(color: Color = new Color(0.4, 0.4, 0.42), radius: number = 0.4): Object3D {
    const debris = new Object3D("Debris");
    debris.geometry = new Octahedron({ radius }).getGeometryData();
    debris.castShadow = true;
    debris.receiveShadow = true;
    debris.material = new WorldMaterial({
      color,
    });
    return debris;
  }

  private _makeBarrel(
    type: "hazard" | "oil" | "chemical" = "hazard",
    scale: number = 0.82,
  ): Object3D {
    const template =
      type === "oil"
        ? this._barrelOil
        : type === "chemical"
          ? this._barrelChemical
          : this._barrelHazard;
    if (template) {
      const barrel = template.clone();
      barrel.scale.set(scale, scale, scale);
      barrel.castShadow = true;
      barrel.receiveShadow = true;
      return barrel;
    }
    const fallback = new Object3D("BarrelFallback");
    fallback.geometry = new Cylinder({
      radiusTop: 0.28,
      radiusBottom: 0.28,
      height: 0.7,
      radialSegments: 16,
    }).getGeometryData();
    fallback.castShadow = true;
    fallback.receiveShadow = true;
    fallback.material = new WorldMaterial({
      color: new Color(0.85, 0.75, 0.1),
    });
    return fallback;
  }

  private _makeMetallicBuoy(
    bodyColor: Color = new Color(0.85, 0.55, 0.1),
    mastColor: Color = new Color(0.9, 0.2, 0.1),
  ): Object3D {
    const root = new Object3D("MetallicBuoy");
    root.castShadow = true;
    root.receiveShadow = true;

    const sphere = new Object3D("BuoySphere");
    sphere.geometry = new Sphere({
      radius: 0.34,
      widthSegments: 16,
      heightSegments: 12,
    }).getGeometryData();
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.material = new WorldMaterial({
      color: bodyColor,
    });
    root.add(sphere);

    const ring = new Object3D("BuoyRing");
    ring.geometry = new Cylinder({
      radiusTop: 0.37,
      radiusBottom: 0.37,
      height: 0.08,
      radialSegments: 16,
    }).getGeometryData();
    ring.castShadow = true;
    ring.receiveShadow = true;
    ring.material = new WorldMaterial({
      color: new Color(0.12, 0.12, 0.15),
    });
    root.add(ring);

    const mast = new Object3D("BuoyMast");
    mast.geometry = new Cylinder({
      radiusTop: 0.02,
      radiusBottom: 0.03,
      height: 0.35,
      radialSegments: 8,
    }).getGeometryData();
    mast.position.set(0, 0.4, 0);
    mast.castShadow = true;
    mast.receiveShadow = true;
    mast.material = new WorldMaterial({
      color: mastColor,
    });
    root.add(mast);

    return root;
  }

  private _makeIndustrialGear(color: Color = new Color(0.2, 0.22, 0.25)): Object3D {
    const root = new Object3D("IndustrialGear");
    root.castShadow = true;
    root.receiveShadow = true;

    const gearMat = new WorldMaterial({
      color,
    });

    const hub = new Object3D("GearHub");
    hub.geometry = new Cylinder({
      radiusTop: 0.4,
      radiusBottom: 0.4,
      height: 0.12,
      radialSegments: 12,
    }).getGeometryData();
    hub.castShadow = true;
    hub.receiveShadow = true;
    hub.material = gearMat;
    root.add(hub);

    for (let i = 0; i < 6; i++) {
      const tooth = new Object3D(`Tooth_${i}`);
      tooth.geometry = new Cube({ size: 1 }).getGeometryData();
      tooth.scale.set(0.14, 0.12, 0.16);
      const angle = (i / 6) * Math.PI * 2;
      tooth.position.set(Math.cos(angle) * 0.42, 0, Math.sin(angle) * 0.42);
      tooth.rotation.y = -angle;
      tooth.castShadow = true;
      tooth.receiveShadow = true;
      tooth.material = gearMat;
      root.add(tooth);
    }
    return root;
  }

  private _makeIndustrialPipe(color: Color = new Color(0.28, 0.3, 0.33)): Object3D {
    const root = new Object3D("IndustrialPipe");
    root.castShadow = true;
    root.receiveShadow = true;

    const pipeMat = new WorldMaterial({
      color,
    });
    const flangeMat = new WorldMaterial({
      color: new Color(0.18, 0.2, 0.22),
    });

    const pipe = new Object3D("PipeMain");
    pipe.geometry = new Cylinder({
      radiusTop: 0.2,
      radiusBottom: 0.2,
      height: 1.1,
      radialSegments: 14,
    }).getGeometryData();
    pipe.rotation.z = Math.PI * 0.5;
    pipe.castShadow = true;
    pipe.receiveShadow = true;
    pipe.material = pipeMat;
    root.add(pipe);

    const flange1 = new Object3D("Flange1");
    flange1.geometry = new Cylinder({
      radiusTop: 0.28,
      radiusBottom: 0.28,
      height: 0.08,
      radialSegments: 14,
    }).getGeometryData();
    flange1.position.set(-0.5, 0, 0);
    flange1.rotation.z = Math.PI * 0.5;
    flange1.castShadow = true;
    flange1.receiveShadow = true;
    flange1.material = flangeMat;
    root.add(flange1);

    const flange2 = new Object3D("Flange2");
    flange2.geometry = new Cylinder({
      radiusTop: 0.28,
      radiusBottom: 0.28,
      height: 0.08,
      radialSegments: 14,
    }).getGeometryData();
    flange2.position.set(0.5, 0, 0);
    flange2.rotation.z = Math.PI * 0.5;
    flange2.castShadow = true;
    flange2.receiveShadow = true;
    flange2.material = flangeMat;
    root.add(flange2);

    return root;
  }

  protected override update(deltaTime: number): void {
    this._time += deltaTime;
    this.camera.position.y = Math.max(this._minEyeHeight, this.camera.position.y);

    for (const liquid of this._liquids) {
      liquid.time = this._time;
    }

    if (this._lavaLight) {
      const pulse = Math.sin(this._time * this._lightPulseSpeed) * 0.5 + 0.5;
      this._lavaLight.intensity = 4.5 + pulse * 5.0;
      this._lavaLight.color.g = 0.4 + pulse * 0.3;
    }

    if (this._slimeLight) {
      const pulse = Math.cos(this._time * 1.8) * 0.5 + 0.5;
      this._slimeLight.intensity = 2.5 + pulse * 2.5;
    }
  }

  /**
   * Runs one golden capture: freezes the realtime loop, pins a deterministic render surface, soaks
   * async GPU texture uploads, frames the camera deterministically, then advances a fixed number of
   * engine `step()` frames at a fixed delta time so identical URLs always yield identical state.
   * On success sets `window.__goldenReady`; on any failure writes `error` into `__goldenMeta`
   * while leaving `__goldenReady` unset, so the capture tool can never mistake a broken capture
   * for a valid baseline.
   */
  private async _runGoldenCapture(spec: GoldenSpec): Promise<void> {
    const layout = GOLDEN_POOL_LAYOUT[spec.poolKeyRaw as GoldenPoolKey];
    const meta: GoldenMeta = {
      poolKey: spec.poolKeyRaw,
      view: spec.view,
      frames: spec.frames,
      rendererType: this.renderer?.type,
    };
    if (!layout) {
      meta.error = `Unknown __golden pool '${spec.poolKeyRaw}'`;
      (window as unknown as GoldenWindowFlags).__goldenMeta = meta;
      return;
    }

    try {
      this.stop();
      window.addEventListener("resize", this._goldenResizeHandler);
      this._applyGoldenSurface();
      this._hideGoldenUi();
      await this._sleep(GOLDEN_SOAK_MS);
      this._applyGoldenCamera(layout, spec.view);
      this._time = 0;
      this._resetBuoyancyBodies();
      // Pool behaviors were attached frozen (see `_attachPoolBehavior`) so the pre-golden
      // realtime frames could not advance them by an unknown amount. Wake them now: they are
      // still in their pristine constructor state, so the fixed-timestep simulation below is
      // fully reproducible.
      this._setGoldenSceneBehaviors(true);
      for (let i = 0; i < spec.frames; i++) {
        this.step(GOLDEN_FRAME_TIME);
      }
      this._setGoldenSceneBehaviors(false);
      // The realtime loop is stopped, so nothing else would ever present the frame the steps above
      // rendered into the drawing buffer -- with preserveDrawingBuffer false the browser clears it
      // after one composite and the screener would see an empty canvas. Replay the frozen final
      // frame forever via `step(0)`: a delta of zero leaves every time-driven system (scene clock,
      // behaviors, liquids, lights, camera) untouched, so each presented frame is pixel-identical
      // to the last deterministic step, but the buffer always carries content.
      this._startGoldenRepaint();
      const flags = window as unknown as GoldenWindowFlags;
      flags.__goldenReady = true;
      flags.__goldenMeta = meta;
    } catch (err) {
      meta.error = err instanceof Error ? err.message : String(err);
      (window as unknown as GoldenWindowFlags).__goldenMeta = meta;
    }
  }

  /**
   * Pins the canvas and camera to the deterministic 1024x576 golden surface, independent of the
   * actual window/viewport size. Re-applied on every resize so the engine's own `_onResize`
   * handler can never break the baseline dimensions mid-capture.
   */
  private _applyGoldenSurface(): void {
    const canvas = this.canvas;
    canvas.width = GOLDEN_WIDTH;
    canvas.height = GOLDEN_HEIGHT;
    canvas.style.width = `${GOLDEN_WIDTH}px`;
    canvas.style.height = `${GOLDEN_HEIGHT}px`;
    this.renderer.setSize(GOLDEN_WIDTH, GOLDEN_HEIGHT);
    this.camera.aspect = GOLDEN_WIDTH / GOLDEN_HEIGHT;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Removes every showcase-overlay UI element from the captured baseline: the PREV/NEXT nav
   * buttons injected by AbstractShowcase, the page title header and the copyright footer.
   */
  private _hideGoldenUi(): void {
    for (const btn of document.querySelectorAll("button")) {
      btn.style.display = "none";
    }
    const header = document.querySelector("header#info");
    if (header instanceof HTMLElement) {
      header.style.display = "none";
    }
    const footer = document.querySelector(".app-footer");
    if (footer instanceof HTMLElement) {
      footer.style.display = "none";
    }
  }

  /**
   * Frames the camera deterministically for one (pool, view) pair. FPS/zoom controllers are
   * deactivated -- with no input they would keep re-deriving the pose from the same fixed angles
   * anyway, this just makes it airtight. Theta/phi are derived from the exact FPS look-direction
   * formula so the strategy re-computes the identical target every stepped frame.
   */
  private _applyGoldenCamera(layout: GoldenPoolLayout, view: GoldenView): void {
    const cam = this.camera;
    for (const behavior of cam.behaviors) {
      behavior.isActive = false;
    }
    if ("top" === view) {
      cam.position.set(layout.x, GOLDEN_TOP_HEIGHT, layout.z);
      cam.target.set(layout.x - GOLDEN_TOP_TILT, LIQUID_Y, layout.z);
      cam.projection = new PerspectiveProjection({
        fov: MathUtils.degToRad(42),
        aspect: GOLDEN_WIDTH / GOLDEN_HEIGHT,
        near: 0.1,
        far: 1000,
      });
      cam.updateProjectionMatrix();
    } else {
      const towardZ: 1 | -1 = 0 < layout.z ? 1 : -1;
      cam.position.set(layout.x, GOLDEN_OBLIQUE_HEIGHT, layout.z + towardZ * GOLDEN_OBLIQUE_OFFSET);
      cam.target.set(layout.x, LIQUID_Y + GOLDEN_OBLIQUE_TARGET_RAISE, layout.z);
    }
    const dir = cam.target.clone().sub(cam.position).normalize();
    cam.phi = Math.asin(Math.max(-0.9999, Math.min(0.9999, dir.y)));
    cam.theta = Math.atan2(dir.x, -dir.z);
    cam.updateViewMatrix();
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
  }

  /**
   * Attaches one pool behavior, created frozen when golden mode is active so no pre-golden
   * realtime frame can advance its internal timer by an unknown amount.
   */
  private _attachPoolBehavior(obj: Object3D, behavior: Behavior): void {
    obj.addBehavior(behavior);
    if (this._golden) {
      behavior.isActive = false;
    }
  }

  /**
   * Puts the physics side of the buoyancy pools back to the pristine state: the realtime frames
   * before golden mode took over dropped, bounced and half-settled the bodies by an unknown
   * amount and left an unknown remainder in the fixed-timestep accumulator (which drives the
   * render interpolation). Without this the golden frames of those pools would not reproduce.
   */
  private _resetBuoyancyBodies(): void {
    this.physics.clear();
    for (const { body, position, rotation } of this._buoyancyBodies) {
      const rigidBody = body.rigidBody;
      if (!rigidBody) continue;
      body.position.copyFrom(position);
      body.rotation.copyFrom(rotation);
      rigidBody.velocity.set(0, 0, 0);
      rigidBody.angularVelocity.set(0, 0, 0);
      rigidBody.clearForces();
      rigidBody.prevPosition.copyFrom(position);
      rigidBody.prevRotation.copyFrom(rotation);
      rigidBody.wakeUp();
    }
  }

  /** Flips `isActive` on every scene behavior (pool floaters/splash droppers); camera is excluded. */
  private _setGoldenSceneBehaviors(active: boolean): void {
    const walk = (obj: Object3D): void => {
      for (const behavior of obj.behaviors) {
        behavior.isActive = active;
      }
      for (const child of obj.children) {
        walk(child);
      }
    };
    walk(this.scene.root);
  }

  /** Keeps presenting the frozen golden frame by re-rendering it (delta 0) on every rAF. */
  private _startGoldenRepaint(): void {
    const replay = (): void => {
      this.step(0);
      window.requestAnimationFrame(replay);
    };
    window.requestAnimationFrame(replay);
  }
}

const app = new Showcase10();
app.start().catch((err: unknown) => console.error("[Showcase10] Failed to start:", err));
