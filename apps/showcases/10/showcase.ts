import {
  AbstractShowcase,
  AmbientLight,
  BasicMaterial,
  Behavior,
  BobbingBehavior,
  CameraStrategyType,
  Color,
  Cube,
  Cylinder,
  DirectionalLight,
  EngineOptions,
  FluidSurfaceMaterial,
  Fog,
  FogMode,
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
} from "../../../packages/engine/src/index.js";
import { NoirWaterMaterial, OilSlickMaterial } from "../../../packages/liquid-extras/src/index.js";

const WALL_THICKNESS = 0.3;
const POOL_SIZE = 5;
const WALL_HEIGHT = 1.5;
const WALL_CENTER_Y = -0.6; // top face at +0.15 (a small curb above the ground), bottom at -1.35
const FLOOR_Y = -1.35;
const LIQUID_Y = 0.0; // flush with the ground, just below the curb top

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
const GOLDEN_FRAMES_DEFAULT = 600;
const GOLDEN_FRAME_TIME = 1 / 60;
const GOLDEN_SOAK_MS = 700;
const GOLDEN_TOP_HEIGHT = 5.0;
const GOLDEN_TOP_TILT = 0.12; // keep the view a hair off vertical so lookAt never hits its pole
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
  | "petroleum-oil";

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
}

/** World-space pool center for every golden pool key, mirroring the `_buildPool` calls below. */
const GOLDEN_POOL_LAYOUT: Readonly<Record<GoldenPoolKey, GoldenPoolLayout>> = {
  "clear-water": { x: -18, z: -7.5 },
  "toon-water": { x: -9, z: -7.5 },
  "bold-anime": { x: 0, z: -7.5 },
  "soft-watercolor": { x: 9, z: -7.5 },
  "painterly-sparkle": { x: 18, z: -7.5 },
  dredge: { x: -18, z: 7.5 },
  "noir-graphic": { x: -9, z: 7.5 },
  "molten-lava": { x: 0, z: 7.5 },
  "toxic-slime": { x: 9, z: 7.5 },
  "petroleum-oil": { x: 18, z: 7.5 },
};

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
  /** Four glaze gradient stops, top-left to bottom-right. */
  glaze: [string, string, string, string];
  /** Alpha of the white glaze reflection and top/left bevel (dark tiles get less). */
  shine: number;
}

/** Pool frame palettes: bright cyan for the water family, dark ceramics for the dark / special liquids. */
const TILE_PALETTES: Record<
  "pool" | "murk" | "noir" | "basalt" | "toxic" | "graphite",
  TilePalette
> = {
  pool: {
    grout: "#ffffff",
    groutSpeckle: "#f0f6fa",
    glaze: ["#48c8ec", "#34b4dc", "#209ec8", "#1486b0"],
    shine: 1.0,
  },
  murk: {
    grout: "#2e3a38",
    groutSpeckle: "#26302e",
    glaze: ["#3d5e58", "#34524c", "#2b4540", "#233a36"],
    shine: 0.35,
  },
  noir: {
    grout: "#101010",
    groutSpeckle: "#1a1a1a",
    glaze: ["#6a6a6a", "#5a5a5a", "#484848", "#383838"],
    shine: 0.35,
  },
  basalt: {
    grout: "#14100e",
    groutSpeckle: "#1d1814",
    glaze: ["#4a403a", "#3c332e", "#2e2723", "#231e1b"],
    shine: 0.2,
  },
  toxic: {
    grout: "#1a2214",
    groutSpeckle: "#222c1a",
    glaze: ["#5d6b3a", "#4f5c32", "#404b2a", "#333c22"],
    shine: 0.3,
  },
  graphite: {
    grout: "#0c0d0f",
    groutSpeckle: "#16181b",
    glaze: ["#3a3f46", "#31353b", "#272a30", "#1e2126"],
    shine: 0.25,
  },
};

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
  private readonly _startEyeHeight: number = 8.0;
  private readonly _minEyeHeight: number = 0.1;
  private readonly _lightPulseSpeed: number = 2.1;

  private _liquids: (
    OpenWaterMaterial | StylizedWaterMaterial | FluidSurfaceMaterial | NoirWaterMaterial
  )[] = [];
  private _lavaLight: PointLight | undefined;
  private _slimeLight: PointLight | undefined;
  private _time: number = 0;
  private _golden: GoldenSpec | undefined;
  private readonly _goldenResizeHandler: () => void = (): void => this._applyGoldenSurface();

  constructor(options: EngineOptions = {}) {
    super({
      canvasId: "SmallWorld",
      rendererType: RendererType.BEST,
      fullscreen: true,
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
    // Start framing: as close as possible while the near pool row (outer pools + signs,     // +-23.5 m wide, with margin) still fits the horizontal field of view at this aspect ratio.
    const startFov = MathUtils.degToRad(64);
    const startPitch = MathUtils.degToRad(-28);
    const framedDepth = 26 / (Math.tan(startFov / 2) * aspect);
    const startZ = Math.min(
      46,
      Math.max(
        17,
        7.5 + (framedDepth - this._startEyeHeight * Math.sin(-startPitch)) / Math.cos(startPitch),
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
    this.camera.theta = 0; // Look across both pool rows along -Z (all 10 pools in view)
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

    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.4 }));
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 1.1 });
    sun.direction.set(-0.5, -1, -0.4).normalize();
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
    const grassTexture = this._createGrassTexture();
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
      x: -18,
      z: -7.5,
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
        [this._makeBarrel(new Color(0.65, 0.45, 0.25)), 1.2, -1.1, 0.09, 2.2],
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
    this._buildPool({
      name: "ToonWaterPool",
      x: -9,
      z: -7.5,
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
      x: 0,
      z: -7.5,
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
      x: 9,
      z: -7.5,
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
      x: 18,
      z: -7.5,
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
      x: -18,
      z: 7.5,
      liquid: dredgeWater,
      needsTangents: true,
      tileMaterial: murkTileMaterial,
      spawnDelay: 5.5,
      sunkObjects: [
        [this._makeCrate(new Color(0.15, 0.18, 0.17)), -0.9, -0.5],
        [this._makeDebris(new Color(0.12, 0.25, 0.2), 0.4), 0.8, 0.5],
      ],
      floaters: [
        [this._makeBarrel(new Color(0.28, 0.25, 0.2)), -1.2, 1.0, 0.08, 1.4],
        [this._makeDebris(new Color(0.2, 0.35, 0.3), 0.35), 1.1, -1.0, 0.06, 1.7],
      ],
      dropper: this._makeCrate(new Color(0.2, 0.22, 0.2)),
    });

    // 7. Noir Graphic Novel (Black-and-White Comic Ink Posterization)
    const noirWater = new NoirWaterMaterial();
    this._buildPool({
      name: "NoirGraphicPool",
      x: -9,
      z: 7.5,
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
      x: 0,
      z: 7.5,
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
      color: new Color(1.0, 0.5, 0.15),
      intensity: 6.0,
      distance: 12,
    });
    this._lavaLight.position.set(0, 0.9, 7.5); // Low over the surface: the orange light bleeds onto the frame and floaters
    this.scene.add(this._lavaLight);

    // 9. Toxic Slime (Bioluminescent Green Acid with Bubbles)
    const slime = new SlimeMaterial({
      noiseMap: slimeTexture,
      normalMap: slimeNormalMap,
      color: new Color(0.15, 0.95, 0.25),
      edgeColor: new Color(0.1, 0.42, 0.07), // Dark contact colour: a bright edge colour summed with glow and shade clipped to white at the walls
      emissiveStrength: 0.3,
      rimStrength: 0.12,
      specularStrength: 0.25, // Soft bright bubble highlights instead of dark outlines
      specularPower: 160.0,
      shade: 0.6,
      absorption: 2.2,
      normalStrength: 1.5,
      viscosity: 10.0,
    });
    this._buildPool({
      name: "ToxicSlimePool",
      x: 9,
      z: 7.5,
      liquid: slime,
      needsTangents: false,
      tileMaterial: toxicTileMaterial,
      spawnDelay: 5.0,
      sunkObjects: [
        [this._makeCrate(new Color(0.18, 0.35, 0.15)), -0.9, -0.6],
        [this._makeBall(new Color(0.8, 0.9, 0.1), 0.3), 0.9, 0.5],
      ],
      floaters: [
        [this._makeBarrel(new Color(0.85, 0.75, 0.1)), -1.1, 1.1, 0.08, 1.4], // Toxic yellow barrel
        [this._makeBall(new Color(0.2, 0.9, 0.3), 0.35), 1.0, -1.1, 0.07, 1.7],
      ],
      dropper: this._makeBarrel(new Color(0.85, 0.75, 0.1)),
    });
    this._slimeLight = new PointLight({
      color: new Color(0.25, 1.0, 0.35),
      intensity: 3.5,
      distance: 14,
    });
    this._slimeLight.position.set(9, 1.6, 7.5);
    this.scene.add(this._slimeLight);

    // 10. Petroleum Oil (Dark Viscous Hydrocarbon with a slick sheen). Colours, specular and
    // sheen come from the OilSlickMaterial defaults; nothing is overridden here.
    const darkOil = new OilSlickMaterial();
    this._buildPool({
      name: "PetroleumOilPool",
      x: 18,
      z: 7.5,
      liquid: darkOil,
      needsTangents: true,
      tileMaterial: oilTileMaterial,
      spawnDelay: 6.0,
      sunkObjects: [
        [this._makeIndustrialPipe(new Color(0.2, 0.22, 0.24)), -0.8, -0.6],
        [this._makeIndustrialGear(new Color(0.18, 0.19, 0.21)), 0.9, 0.6],
      ],
      floaters: [
        [this._makeIndustrialBarrel(new Color(0.09, 0.08, 0.08)), -1.1, 1.0, 0.04, 1.0], // Black rubber-coated drum, dull in thick oil
        [
          this._makeMetallicBuoy(new Color(0.2, 0.15, 0.08), new Color(0.2, 0.08, 0.05)),
          1.1,
          -1.0,
          0.05,
          1.2,
        ], // Oil-stained, rusted buoy
      ],
      dropper: this._makeIndustrialBarrel(new Color(0.07, 0.075, 0.08)), // Black steel oil drum
    });

    // Signboards stand BESIDE the pools (in the gap on the entrance side of each pool, not in front
    // of the edges), angled towards the avenue so they read from the start view.
    const rowASigns: Array<[string, string, number]> = [
      ["Clear Water", "PBR Ocean • Gerstner & Foam", -18],
      ["Classic Toon Water", "Cel Shader • Stepped Foam Bands", -9],
      ["Bold Anime Water", "High-Contrast • Saturated Waves", 0],
      ["Soft Anime Watercolor", "Smooth-Min Voronoi Caustics", 9],
      ["Painterly Sparkle", "12 FPS Astroid Star Glints", 18],
    ];
    const rowBSigns: Array<[string, string, number]> = [
      ["Dredge Abyssal Fog", "Eerie Murk • Jade Subsurface", -18],
      ["Noir Graphic Novel", "Monochrome Ink • Posterized Tones", -9],
      ["Molten Lava", "Viscous Magma • Emissive Crust Glow", 0],
      ["Toxic Slime", "Bioluminescent Acid • Bubbles", 9],
      ["Petroleum Dark Oil", "Dark Hydrocarbon • Oil Slick Sheen", 18],
    ];
    const signYawA = MathUtils.degToRad(12);
    const signYawB = MathUtils.degToRad(-12);
    for (const [title, subtitle, px] of rowASigns) {
      this._createSignboard(title, subtitle, px - 3.9, -6.2, signYawA);
    }
    for (const [title, subtitle, px] of rowBSigns) {
      this._createSignboard(title, subtitle, px - 3.9, 9.0, signYawB);
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

    const tilesPerAxis = 4;
    const tileSize = size / tilesPerAxis;
    const groutSize = 6;

    ctx.fillStyle = palette.grout;
    ctx.fillRect(0, 0, size, size);

    // Subtle fine grout texture
    ctx.fillStyle = palette.groutSpeckle;
    for (let i = 0; i < 400; i++) {
      const gx = Math.random() * size;
      const gy = Math.random() * size;
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Draw glossy ceramic tiles
    for (let y = 0; y < tilesPerAxis; y++) {
      for (let x = 0; x < tilesPerAxis; x++) {
        const tx = x * tileSize + groutSize;
        const ty = y * tileSize + groutSize;
        const tw = tileSize - groutSize * 2;
        const th = tileSize - groutSize * 2;

        const grad = ctx.createLinearGradient(tx, ty, tx + tw, ty + th);
        grad.addColorStop(0.0, palette.glaze[0]);
        grad.addColorStop(0.35, palette.glaze[1]);
        grad.addColorStop(0.7, palette.glaze[2]);
        grad.addColorStop(1.0, palette.glaze[3]);

        ctx.fillStyle = grad;
        ctx.fillRect(tx, ty, tw, th);

        // Radial glaze reflection in upper-left quadrant
        const radialGrad = ctx.createRadialGradient(
          tx + tw * 0.25,
          ty + th * 0.25,
          2,
          tx + tw * 0.3,
          ty + th * 0.3,
          tw * 0.7,
        );
        radialGrad.addColorStop(0.0, `rgba(255, 255, 255, ${0.45 * palette.shine})`);
        radialGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.12 * palette.shine})`);
        radialGrad.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");
        ctx.fillStyle = radialGrad;
        ctx.fillRect(tx, ty, tw, th);

        // 3D Inner Bevel Highlight (Top & Left edges)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * palette.shine})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty + th);
        ctx.lineTo(tx, ty);
        ctx.lineTo(tx + tw, ty);
        ctx.stroke();

        // 3D Inner Bevel Shadow (Bottom & Right edges)
        ctx.strokeStyle = "rgba(10, 48, 75, 0.45)";
        ctx.lineWidth = 2.5;
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
   * Generates a lush, organic meadow grass texture: rich greens with fine grass blade flecks,
   * subtle clover clusters, and delicate wild blossoms.
   */
  private _createGrassTexture(): Texture {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Texture.empty();

    // Base lush meadow green
    ctx.fillStyle = "#488a24";
    ctx.fillRect(0, 0, size, size);

    // Organic color modulation patches
    const patches = [
      { x: 200, y: 300, r: 280, color: "#3d7a1e" },
      { x: 800, y: 250, r: 320, color: "#549c2a" },
      { x: 450, y: 750, r: 350, color: "#5ea830" },
      { x: 850, y: 800, r: 260, color: "#428220" },
      { x: 150, y: 850, r: 240, color: "#569e2c" },
    ];
    for (const p of patches) {
      const rg = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, p.r);
      rg.addColorStop(0, p.color);
      rg.addColorStop(1, "rgba(72, 138, 36, 0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, size, size);
    }

    // Thousands of multi-toned grass blades
    const bladeColors = [
      "#386e1a",
      "#438222",
      "#4f9228",
      "#5ca430",
      "#6db838",
      "#7cc842",
      "#8cd84c",
    ];
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 4 + Math.random() * 8;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const col = bladeColors[Math.floor(Math.random() * bladeColors.length)]!;

      ctx.strokeStyle = col;
      ctx.lineWidth = 1.0 + Math.random() * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    // Scattered wild clover patches
    for (let c = 0; c < 120; c++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      ctx.fillStyle = Math.random() > 0.5 ? "#326616" : "#62ad33";
      for (let leaf = 0; leaf < 3; leaf++) {
        const a = (leaf * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Delicate white daisy & golden dandelion blossoms
    for (let f = 0; f < 90; f++) {
      const fx = Math.random() * size;
      const fy = Math.random() * size;
      if (Math.random() > 0.4) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(fx, fy, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffcc00";
        ctx.beginPath();
        ctx.arc(fx, fy, 1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#f8dc38";
        ctx.beginPath();
        ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return Texture.fromCanvas(canvas, {
      anisotropy: 16,
      generateMipmaps: true,
    });
  }

  /**
   * Builds the world meadow ground with seamless cutouts for all 10 pools,
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
    // 1. Large surrounding perimeter slabs:
    addGroundChunk("Ground_North", 600, 290, 0, -155); // Z: [-300, -10]
    addGroundChunk("Ground_South", 600, 290, 0, 155); // Z: [+10, +300]
    addGroundChunk("Ground_West", 279.5, 20, -160.25, 0); // X: [-300, -20.5], Z: [-10, +10]
    addGroundChunk("Ground_East", 279.5, 20, 160.25, 0); // X: [+20.5, +300], Z: [-10, +10]

    // 2. Central Plaza walkway between Row 1 and Row 2:
    addGroundChunk("Ground_Center_Plaza", 41, 10, 0, 0); // X: [-20.5, +20.5], Z: [-5, +5]

    // 3. Walkway strips between Row 1 pools (Z: [-10, -5], depth 5, center Z = -7.5):
    addGroundChunk("Ground_R1_Gap1", 4, 5, -13.5, -7.5);
    addGroundChunk("Ground_R1_Gap2", 4, 5, -4.5, -7.5);
    addGroundChunk("Ground_R1_Gap3", 4, 5, 4.5, -7.5);
    addGroundChunk("Ground_R1_Gap4", 4, 5, 13.5, -7.5);

    // 4. Walkway strips between Row 2 pools (Z: [+5, +10], depth 5, center Z = +7.5):
    addGroundChunk("Ground_R2_Gap1", 4, 5, -13.5, 7.5);
    addGroundChunk("Ground_R2_Gap2", 4, 5, -4.5, 7.5);
    addGroundChunk("Ground_R2_Gap3", 4, 5, 4.5, 7.5);
    addGroundChunk("Ground_R2_Gap4", 4, 5, 13.5, 7.5);
  }

  /**
   * Builds one square, half-sunk pool basin: ceramic rim walls, floor plate, liquid surface,
   * sunk objects on the floor, floating bobbing objects, and one periodic splash dropper.
   */
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
    } = config;
    const inner = POOL_SIZE - 2 * WALL_THICKNESS; // 4.4
    const wallOffset = (POOL_SIZE - WALL_THICKNESS) / 2; // 2.35

    const pool = new Object3D(name);
    pool.position.set(x, 0, z);
    this.scene.add(pool);

    // 4 non-overlapping rim walls forming a crisp, seamless rectangle with perfect 90-degree corners:
    // North wall spans full POOL_SIZE along X at +Z
    const wallN = new Object3D(`${name}_WallN`);
    wallN.geometry = new Cube({ size: 1 }).getGeometryData();
    wallN.scale.set(POOL_SIZE, WALL_HEIGHT, WALL_THICKNESS);
    wallN.position.set(0, WALL_CENTER_Y, wallOffset);
    wallN.material = tileMaterial;
    wallN.castShadow = true;
    wallN.receiveShadow = true;
    pool.add(wallN);

    // South wall spans full POOL_SIZE along X at -Z
    const wallS = new Object3D(`${name}_WallS`);
    wallS.geometry = new Cube({ size: 1 }).getGeometryData();
    wallS.scale.set(POOL_SIZE, WALL_HEIGHT, WALL_THICKNESS);
    wallS.position.set(0, WALL_CENTER_Y, -wallOffset);
    wallS.material = tileMaterial;
    wallS.castShadow = true;
    wallS.receiveShadow = true;
    pool.add(wallS);

    // East wall fits snugly between North and South walls along Z at +X
    const wallE = new Object3D(`${name}_WallE`);
    wallE.geometry = new Cube({ size: 1 }).getGeometryData();
    wallE.scale.set(WALL_THICKNESS, WALL_HEIGHT, inner);
    wallE.position.set(wallOffset, WALL_CENTER_Y, 0);
    wallE.material = tileMaterial;
    wallE.castShadow = true;
    wallE.receiveShadow = true;
    pool.add(wallE);

    // West wall fits snugly between North and South walls along Z at -X
    const wallW = new Object3D(`${name}_WallW`);
    wallW.geometry = new Cube({ size: 1 }).getGeometryData();
    wallW.scale.set(WALL_THICKNESS, WALL_HEIGHT, inner);
    wallW.position.set(-wallOffset, WALL_CENTER_Y, 0);
    wallW.material = tileMaterial;
    wallW.castShadow = true;
    wallW.receiveShadow = true;
    pool.add(wallW);

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

    // The periodic "splash" dropper
    const dropObj = dropper ?? this._makeCrate();
    dropObj.position.set(0.3, LIQUID_Y, 0.2);
    dropObj.castShadow = true;
    this._attachPoolBehavior(
      dropObj,
      new SplashDropBehavior(LIQUID_Y, WALL_HEIGHT + 3.0, spawnDelay),
    );
    pool.add(dropObj);
  }

  private _makeCrate(color: Color = new Color(0.55, 0.4, 0.25)): Object3D {
    const crate = new Object3D("Crate");
    crate.geometry = new Cube({ size: 0.6 }).getGeometryData();
    crate.material = new BasicMaterial({ color });
    return crate;
  }

  private _makeBall(color: Color = new Color(0.8, 0.15, 0.15), radius: number = 0.35): Object3D {
    const ball = new Object3D("Ball");
    ball.geometry = new Sphere({
      radius,
      widthSegments: 16,
      heightSegments: 12,
    }).getGeometryData();
    ball.material = new BasicMaterial({ color });
    return ball;
  }

  private _makeDebris(color: Color = new Color(0.4, 0.4, 0.42), radius: number = 0.4): Object3D {
    const debris = new Object3D("Debris");
    debris.geometry = new Octahedron({ radius }).getGeometryData();
    debris.material = new BasicMaterial({ color });
    return debris;
  }

  private _makeBarrel(color: Color = new Color(0.6, 0.4, 0.25)): Object3D {
    const barrel = new Object3D("Barrel");
    barrel.geometry = new Cylinder({
      radiusTop: 0.28,
      radiusBottom: 0.28,
      height: 0.7,
      radialSegments: 16,
    }).getGeometryData();
    barrel.material = new BasicMaterial({ color });
    return barrel;
  }

  private _makeIndustrialBarrel(
    color: Color = new Color(0.18, 0.2, 0.22),
    stripeColor?: Color,
  ): Object3D {
    const root = new Object3D("IndustrialBarrel");
    const body = new Object3D("BarrelBody");
    body.geometry = new Cylinder({
      radiusTop: 0.28,
      radiusBottom: 0.28,
      height: 0.72,
      radialSegments: 16,
    }).getGeometryData();
    body.material = new BasicMaterial({ color });
    root.add(body);

    const ringMat = new BasicMaterial({ color: stripeColor ?? new Color(0.1, 0.1, 0.12) });
    const topRing = new Object3D("TopRing");
    topRing.geometry = new Cylinder({
      radiusTop: 0.295,
      radiusBottom: 0.295,
      height: 0.06,
      radialSegments: 16,
    }).getGeometryData();
    topRing.position.set(0, 0.2, 0);
    topRing.material = ringMat;
    root.add(topRing);

    const bottomRing = new Object3D("BottomRing");
    bottomRing.geometry = new Cylinder({
      radiusTop: 0.295,
      radiusBottom: 0.295,
      height: 0.06,
      radialSegments: 16,
    }).getGeometryData();
    bottomRing.position.set(0, -0.2, 0);
    bottomRing.material = ringMat;
    root.add(bottomRing);

    return root;
  }

  private _makeMetallicBuoy(
    bodyColor: Color = new Color(0.85, 0.55, 0.1),
    mastColor: Color = new Color(0.9, 0.2, 0.1),
  ): Object3D {
    const root = new Object3D("MetallicBuoy");
    const sphere = new Object3D("BuoySphere");
    sphere.geometry = new Sphere({
      radius: 0.34,
      widthSegments: 16,
      heightSegments: 12,
    }).getGeometryData();
    sphere.material = new BasicMaterial({ color: bodyColor });
    root.add(sphere);

    const ring = new Object3D("BuoyRing");
    ring.geometry = new Cylinder({
      radiusTop: 0.37,
      radiusBottom: 0.37,
      height: 0.08,
      radialSegments: 16,
    }).getGeometryData();
    ring.material = new BasicMaterial({ color: new Color(0.12, 0.12, 0.15) });
    root.add(ring);

    const mast = new Object3D("BuoyMast");
    mast.geometry = new Cylinder({
      radiusTop: 0.02,
      radiusBottom: 0.03,
      height: 0.35,
      radialSegments: 8,
    }).getGeometryData();
    mast.position.set(0, 0.4, 0);
    mast.material = new BasicMaterial({ color: mastColor });
    root.add(mast);

    return root;
  }

  private _makeIndustrialGear(color: Color = new Color(0.2, 0.22, 0.25)): Object3D {
    const root = new Object3D("IndustrialGear");
    const hub = new Object3D("GearHub");
    hub.geometry = new Cylinder({
      radiusTop: 0.4,
      radiusBottom: 0.4,
      height: 0.12,
      radialSegments: 12,
    }).getGeometryData();
    hub.material = new BasicMaterial({ color });
    root.add(hub);

    for (let i = 0; i < 6; i++) {
      const tooth = new Object3D(`Tooth_${i}`);
      tooth.geometry = new Cube({ size: 1 }).getGeometryData();
      tooth.scale.set(0.14, 0.12, 0.16);
      const angle = (i / 6) * Math.PI * 2;
      tooth.position.set(Math.cos(angle) * 0.42, 0, Math.sin(angle) * 0.42);
      tooth.rotation.y = -angle;
      tooth.material = new BasicMaterial({ color });
      root.add(tooth);
    }
    return root;
  }

  private _makeIndustrialPipe(color: Color = new Color(0.28, 0.3, 0.33)): Object3D {
    const root = new Object3D("IndustrialPipe");
    const pipe = new Object3D("PipeMain");
    pipe.geometry = new Cylinder({
      radiusTop: 0.2,
      radiusBottom: 0.2,
      height: 1.1,
      radialSegments: 14,
    }).getGeometryData();
    pipe.rotation.z = Math.PI * 0.5;
    pipe.material = new BasicMaterial({ color });
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
    flange1.material = new BasicMaterial({ color: new Color(0.18, 0.2, 0.22) });
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
    flange2.material = new BasicMaterial({ color: new Color(0.18, 0.2, 0.22) });
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
