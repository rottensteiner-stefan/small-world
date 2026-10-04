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
import { NoirWaterMaterial } from "../../../packages/liquid-extras/src/index.js";

const WALL_THICKNESS = 0.3;
const POOL_SIZE = 5;
const WALL_HEIGHT = 1.5;
const WALL_CENTER_Y = -0.6; // top face at +0.15 (a small curb above the ground), bottom at -1.35
const FLOOR_Y = -1.35;
const LIQUID_Y = 0.0; // flush with the ground, just below the curb top

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
  private readonly _eyeHeight: number = 4.0;
  private readonly _lightPulseSpeed: number = 2.1;

  private _liquids: (
    OpenWaterMaterial | StylizedWaterMaterial | FluidSurfaceMaterial | NoirWaterMaterial
  )[] = [];
  private _lavaLight: PointLight | undefined;
  private _slimeLight: PointLight | undefined;
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
    this.camera.position.set(-25, this._eyeHeight, 0);
    this.camera.theta = MathUtils.HALF_PI; // Look straight down the central avenue along +X
    this.camera.phi = MathUtils.degToRad(-6);
    this.camera.addBehavior(
      new FPSController({ input: this.input, audio: this.audio, moveSpeed: this._moveSpeed }),
    );
    this.camera.addBehavior(new ZoomController({ input: this.input, audio: this.audio }));

    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.4 }));
    const sun = new DirectionalLight({ color: Color.WHITE, intensity: 1.1 });
    sun.direction.set(-0.5, -1, -0.4).normalize();
    this.scene.add(sun);

    // Swimming pool ceramic tile texture: classic cyan/water-blue tiles with clean white grout lines
    const tileTexture = this._createPoolTileTexture();
    const tileMaterial = new WorldMaterial({ diffuseMap: tileTexture });
    tileMaterial.color = Color.WHITE;

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

    // 4. Ghibli Soft Watercolor (Smooth Voronoi Caustics & Gentle Gradients)
    const softGhibliWater = new StylizedWaterMaterial({
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
      name: "GhibliSoftPool",
      x: 9,
      z: -7.5,
      liquid: softGhibliWater,
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

    // 5. Painterly Sparkle (Twinkling 4-Point Astroid Star Glints)
    const sparkleWater = new StylizedWaterMaterial({
      style: "sparkle",
      shallowWaterColor: new Color(0.14, 0.72, 0.88),
      deepWaterColor: new Color(0.01, 0.18, 0.32),
      edgeColor: new Color(1.0, 1.0, 0.95),
      edgeSoftness: 0.6,
      glitterStrength: 1.0,
      causticStrength: 0.45,
      foamDistance: 0.9,
      speed: 0.9,
      wave1: [1.0, 0.35, 0.075, 3.0],
      wave2: [0.3, 0.9, 0.05, 1.9],
      wave3: [-0.4, 0.6, 0.035, 1.2],
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
        [this._makeDebris(new Color(0.95, 0.85, 0.3), 0.4), -0.8, -0.6], // Crystal prism
        [this._makeBall(new Color(0.4, 0.8, 0.95), 0.32), 0.9, 0.6],
      ],
      floaters: [
        [this._makeDebris(new Color(1.0, 0.9, 0.2), 0.4), -1.1, 1.1, 0.1, 2.2], // Golden star
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
      tileMaterial,
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
    const noirWater = new NoirWaterMaterial({
      shallowWaterColor: new Color(0.9, 0.9, 0.9),
      deepWaterColor: new Color(0.08, 0.08, 0.08),
      edgeColor: new Color(1.0, 1.0, 1.0),
      speed: 0.85,
      wave1: [0.9, 0.35, 0.07, 2.8],
      wave2: [0.25, 0.85, 0.05, 1.8],
      wave3: [-0.35, 0.55, 0.035, 1.2],
    });
    this._buildPool({
      name: "NoirGraphicPool",
      x: -9,
      z: 7.5,
      liquid: noirWater,
      needsTangents: true,
      tileMaterial,
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
      emissivePulse: 0.85,
      viscosity: 14.0,
    });
    this._buildPool({
      name: "MoltenLavaPool",
      x: 0,
      z: 7.5,
      liquid: lava,
      needsTangents: false,
      tileMaterial,
      spawnDelay: 4.0,
      sunkObjects: [
        [this._makeCrate(new Color(0.2, 0.08, 0.05)), -0.8, -0.5],
        [this._makeDebris(new Color(0.9, 0.25, 0.05), 0.38), 0.8, 0.6],
      ],
      floaters: [
        [this._makeDebris(new Color(0.12, 0.08, 0.08), 0.42), -1.2, 1.1, 0.07, 1.2], // Charred rock
        [this._makeBall(new Color(0.85, 0.35, 0.05), 0.32), 1.0, -1.0, 0.06, 1.5],
      ],
      dropper: this._makeDebris(new Color(0.15, 0.09, 0.08), 0.4),
    });
    this._lavaLight = new PointLight({
      color: new Color(1.0, 0.5, 0.15),
      intensity: 4.0,
      distance: 14,
    });
    this._lavaLight.position.set(0, 1.6, 7.5);
    this.scene.add(this._lavaLight);

    // 9. Toxic Slime (Bioluminescent Green Acid with Bubbles)
    const slime = new SlimeMaterial({
      noiseMap: slimeTexture,
      normalMap: slimeNormalMap,
      color: new Color(0.15, 0.95, 0.25),
      shade: 0.6,
      absorption: 3.5,
      viscosity: 10.0,
    });
    this._buildPool({
      name: "ToxicSlimePool",
      x: 9,
      z: 7.5,
      liquid: slime,
      needsTangents: false,
      tileMaterial,
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

    // 10. Petroleum Oil (Dark Viscous Industrial Fluid)
    const darkOil = new FluidSurfaceMaterial({
      color: new Color(0.012, 0.012, 0.016),
      edgeColor: new Color(0.045, 0.038, 0.028),
      noiseMap: lavaTexture,
      normalMap: lavaNormalMap,
      normalStrength: 0.35,
      waveAmplitude: 0.03,
      viscosity: 16.0,
      flowSpeed: 0.5,
      specularStrength: 2.2,
      specularPower: 80.0,
      rimStrength: 0.2,
      absorption: 12.0,
      shade: 0.85,
    });
    this._buildPool({
      name: "PetroleumOilPool",
      x: 18,
      z: 7.5,
      liquid: darkOil,
      needsTangents: false,
      tileMaterial,
      spawnDelay: 6.0,
      sunkObjects: [
        [this._makeCrate(new Color(0.12, 0.12, 0.14)), -0.8, -0.6],
        [this._makeDebris(new Color(0.2, 0.18, 0.16), 0.38), 0.8, 0.5],
      ],
      floaters: [
        [this._makeBarrel(new Color(0.5, 0.25, 0.15)), -1.1, 1.0, 0.05, 1.1], // Rust oil drum
        [this._makeCrate(new Color(0.25, 0.28, 0.3)), 1.1, -1.0, 0.06, 1.3],
      ],
      dropper: this._makeBarrel(new Color(0.5, 0.25, 0.15)),
    });

    // Signboards for Row 1 (Left / North side): angled slightly towards the entrance for perspective readability
    this._createSignboard(
      "Clear Water",
      "PBR Ocean • Gerstner & Foam",
      -18,
      -3.7,
      MathUtils.degToRad(-25),
    );
    this._createSignboard(
      "Classic Toon Water",
      "Cel Shader • Stepped Foam Bands",
      -9,
      -3.7,
      MathUtils.degToRad(-25),
    );
    this._createSignboard(
      "Bold Anime Water",
      "High-Contrast • Saturated Waves",
      0,
      -3.7,
      MathUtils.degToRad(-25),
    );
    this._createSignboard(
      "Ghibli Watercolor",
      "Smooth-Min Voronoi Caustics",
      9,
      -3.7,
      MathUtils.degToRad(-25),
    );
    this._createSignboard(
      "Painterly Sparkle",
      "12 FPS Astroid Star Glints",
      18,
      -3.7,
      MathUtils.degToRad(-25),
    );

    // Signboards for Row 2 (Right / South side): angled slightly towards the entrance for perspective readability
    this._createSignboard(
      "Dredge Abyssal Fog",
      "Eerie Murk • Jade Subsurface",
      -18,
      3.7,
      Math.PI + MathUtils.degToRad(25),
    );
    this._createSignboard(
      "Noir Graphic Novel",
      "Monochrome Comic Ink Hatching",
      -9,
      3.7,
      Math.PI + MathUtils.degToRad(25),
    );
    this._createSignboard(
      "Molten Lava",
      "Viscous Magma • Heat Pulse Glow",
      0,
      3.7,
      Math.PI + MathUtils.degToRad(25),
    );
    this._createSignboard(
      "Toxic Slime",
      "Bioluminescent Acid • Bubbles",
      9,
      3.7,
      Math.PI + MathUtils.degToRad(25),
    );
    this._createSignboard(
      "Petroleum Dark Oil",
      "Heavy Viscosity • Glassy Specular",
      18,
      3.7,
      Math.PI + MathUtils.degToRad(25),
    );

    this.scene.update();

    await this.waitForAssets();
  }

  /**
   * Generates an elegant, high-legibility 3D signboard in front of the pool with crisp high-DPI text.
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

    // 1. Sleek dark metallic stand post
    const post = new Object3D("SignPost");
    post.geometry = new Cylinder({
      radiusTop: 0.035,
      radiusBottom: 0.045,
      height: 1.05,
      radialSegments: 12,
    }).getGeometryData();
    post.position.set(0, 0.525, 0);
    post.material = new BasicMaterial({ color: new Color(0.2, 0.22, 0.25) });
    post.castShadow = true;
    sign.add(post);

    // 2. Tilted dark backplate
    const board = new Object3D("SignBoard");
    board.geometry = new Cube({ size: 1 }).getGeometryData();
    board.scale.set(2.4, 1.1, 0.06);
    board.position.set(0, 1.05, 0);
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

      // Cyan accent border
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 8;
      ctx.strokeRect(6, 6, 1012, 468);

      // Top glowing header line
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(20, 20, 984, 4);

      // Category badge
      ctx.fillStyle = "#64748b";
      ctx.font =
        "bold 26px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SMALL WORLD • LIQUID GALLERY", 512, 65);

      // Main Title
      ctx.fillStyle = "#ffffff";
      ctx.font =
        "bold 64px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(title, 512, 190);

      // Subtitle / Tech description
      ctx.fillStyle = "#38bdf8";
      ctx.font =
        "500 36px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(subtitle, 512, 290);

      // Bottom separator accent
      ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
      ctx.fillRect(200, 360, 624, 2);

      // Bottom metadata
      ctx.fillStyle = "#94a3b8";
      ctx.font =
        "bold 22px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("Interactive Real-Time Shader Pipeline", 512, 410);
    }

    const textTexture = Texture.fromCanvas(canvas, {
      anisotropy: 16,
      generateMipmaps: true,
    });
    textTexture.flipY();

    const displayPlane = new Object3D("SignFace");
    displayPlane.geometry = new Plane({ width: 2.34, height: 1.04 }).getGeometryData();
    displayPlane.position.set(0, 1.05, 0.035);
    displayPlane.rotation.x = -0.32;
    displayPlane.material = new BasicMaterial({
      diffuseMap: textTexture,
    });
    sign.add(displayPlane);

    this.scene.add(sign);
    return sign;
  }

  /**
   * Generates a high-quality classic swimming pool ceramic tile texture:
   * radiant aqua/cyan ceramic tiles with clean, crisp white grout lines.
   */
  private _createPoolTileTexture(): Texture {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Texture.empty();

    const tilesPerAxis = 4;
    const tileSize = size / tilesPerAxis;
    const groutSize = 6;

    // Crisp white grout base
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // Subtle fine grout texture
    ctx.fillStyle = "#f0f6fa";
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

        // Radiant cyan/aqua ceramic glaze gradient
        const grad = ctx.createLinearGradient(tx, ty, tx + tw, ty + th);
        grad.addColorStop(0.0, "#48c8ec");
        grad.addColorStop(0.35, "#34b4dc");
        grad.addColorStop(0.7, "#209ec8");
        grad.addColorStop(1.0, "#1486b0");

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
        radialGrad.addColorStop(0.0, "rgba(255, 255, 255, 0.45)");
        radialGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.12)");
        radialGrad.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");
        ctx.fillStyle = radialGrad;
        ctx.fillRect(tx, ty, tw, th);

        // 3D Inner Bevel Highlight (Top & Left edges)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
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

    // Total area: 90 x 70 (X [-45, +45], Z [-35, +35])
    // 1. Large surrounding perimeter slabs:
    addGroundChunk("Ground_North", 90, 25, 0, -22.5); // Z: [-35, -10]
    addGroundChunk("Ground_South", 90, 25, 0, 22.5); // Z: [+10, +35]
    addGroundChunk("Ground_West", 24.5, 20, -32.75, 0); // X: [-45, -20.5], Z: [-10, +10]
    addGroundChunk("Ground_East", 24.5, 20, 32.75, 0); // X: [+20.5, +45], Z: [-10, +10]

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
        obj.addBehavior(new BobbingBehavior(amplitude, frequency));
        obj.addBehavior(new RotatorBehavior());
        pool.add(obj);
      }
    }

    // The periodic "splash" dropper
    const dropObj = dropper ?? this._makeCrate();
    dropObj.position.set(0.3, LIQUID_Y, 0.2);
    dropObj.castShadow = true;
    dropObj.addBehavior(new SplashDropBehavior(LIQUID_Y, WALL_HEIGHT + 3.0, spawnDelay));
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

    if (this._slimeLight) {
      const pulse = Math.cos(this._time * 1.8) * 0.5 + 0.5;
      this._slimeLight.intensity = 2.5 + pulse * 2.5;
    }
  }
}

const app = new Showcase10();
app.start().catch((err: unknown) => console.error("[Showcase10] Failed to start:", err));
