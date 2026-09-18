import {
  AbstractShowcase,
  AmbientLight,
  BloomElement,
  BoundingBox,
  BoundingType,
  Color,
  Cube,
  Cylinder,
  DirectionalLight,
  EngineOptions,
  MathUtils,
  Object3D,
  OutlineElement,
  PointLight,
  PostProcessingEffectType,
  SpotLight,
  StandardMaterial,
  ToneMappingElement,
  ToneMappingMode,
  Vector3D,
  VignetteElement,
  RendererType,
  Texture,
  KitRegistry,
  LevelHotspotDef,
} from "@small-world/engine";
import { BunkerKit } from "../../builder/BunkerKit.js";
import { FlakturmKit } from "../../builder/FlakturmKit.js";
import { TerminalModal } from "../../ui/TerminalModal.js";
import { ViennaMapModal } from "../../ui/ViennaMapModal.js";
import { HotspotManager, HotspotAction } from "../../ui/HotspotManager.js";

type StageArea = "koje_42" | "vent_crawl" | "kaeltekammer";

export class PrologueScene extends AbstractShowcase {
  private _kitRegistry = new KitRegistry();

  // 3D Objects & Lights (Koje 42)
  private _bunkerDoor: Object3D | null = null;
  private _doorSpot: SpotLight | null = null;
  private _screenMaterial: StandardMaterial | null = null;
  private _dustParticles: Object3D[] = [];
  private _ventGrate: Object3D | null = null;
  private _coffeeGrinderMesh: Object3D | null = null;
  private _terminalMesh: Object3D | null = null;
  private _bunkBedMesh: Object3D | null = null;
  private _morgueTrayMesh: Object3D | null = null;
  private _metalDeskMesh: Object3D | null = null;
  private _wallShelfMesh: Object3D | null = null;
  private _lanternFlameLight: PointLight | null = null;

  // 3D Objects & Lights (Kältekammer K-42)
  private _morgueGroup: Object3D | null = null;
  private _cyanideSpotLight: SpotLight | null = null;
  private _cyanideDecal: Object3D | null = null;
  private _frostParticles: Object3D[] = [];

  public get morgueGroup(): Object3D | null {
    return this._morgueGroup;
  }

  // Player Mannequin
  private _playerObject: Object3D | null = null;
  private _playerPos: Vector3D = new Vector3D(0, 0, 0.2);
  private _playerFacingAngle: number = 0;
  private _isMoving: boolean = false;
  private _playerLanternLight: PointLight | null = null;

  // Modals & Systems
  private _terminalModal: TerminalModal | null = null;
  private _mapModal: ViennaMapModal | null = null;
  private _hotspotManager: HotspotManager | null = null;
  private _levelHotspots: LevelHotspotDef[] = [];

  // Timeline & State
  private _currentArea: StageArea = "koje_42";
  private _currentTime: number = 0;
  private _isPlaying: boolean = false;
  private _isPausedForChoice: boolean = false;
  private _isExplorationMode: boolean = false;
  private _currentPhase: number = 0;
  private _targetCameraPos: Vector3D = new Vector3D(0, 1.6, 4.2);
  private _targetCameraLook: Vector3D = new Vector3D(0, 1.2, 0);

  // Door angle
  private _doorOpenAngle: number = 0;
  private _targetDoorAngle: number = 0;

  // Key tracking
  private _keysDown: Set<string> = new Set();

  constructor(options: EngineOptions = {}) {
    super(options);
  }

  protected override async setupScene(): Promise<void> {
    // 1. Camera setup
    this.camera.position.set(0, 1.6, 4.2);
    this.camera.target.set(0, 1.2, 0);
    this.camera.updateViewMatrix();

    // 2. Setup Post Processing (Graphic Noir Chiaroscuro)
    if (this.renderer?.postProcessing) {
      this.renderer.postProcessing.enabled = true;

      const outline = this.renderer.postProcessing.get<OutlineElement>(
        PostProcessingEffectType.OUTLINE,
      );
      if (outline) {
        outline.enabled = true;
        outline.thickness = 1.0;
        outline.sensitivity = 0.5;
        outline.color = new Color(0.04, 0.05, 0.08);
      }

      const bloom = this.renderer.postProcessing.get<BloomElement>(PostProcessingEffectType.BLOOM);
      if (bloom) {
        bloom.enabled = true;
        bloom.intensity = 1.2;
        bloom.threshold = 0.6;
      }

      const vignette = this.renderer.postProcessing.get<VignetteElement>(
        PostProcessingEffectType.VIGNETTE,
      );
      if (vignette) {
        vignette.enabled = true;
        vignette.darkness = 0.75;
        vignette.offset = 0.9;
      }

      const tone = this.renderer.postProcessing.get<ToneMappingElement>(
        PostProcessingEffectType.TONE_MAPPING,
      );
      if (tone) {
        tone.enabled = true;
        tone.mode = ToneMappingMode.ACES_FILMIC;
        tone.exposure = 1.2;
      }
    }

    // 3. Lighting (Atmospheric Noir)
    const ambient = new AmbientLight({
      color: new Color(0.12, 0.15, 0.22),
      intensity: 0.35,
    });
    this.scene.add(ambient);

    const dirLight = new DirectionalLight({
      direction: new Vector3D(0.3, -0.9, -0.4),
      color: new Color(0.8, 0.85, 0.95),
      intensity: 0.4,
    });
    this.scene.add(dirLight);

    // Flur-Lichtstrahl durch die Tür
    this._doorSpot = new SpotLight({
      name: "HallwayDoorBeam",
      color: new Color(1.0, 0.82, 0.45),
      intensity: 18.0,
      distance: 14.0,
      angle: Math.PI / 4.5,
      penumbra: 0.6,
      decay: 1.1,
    });
    this._doorSpot.position.set(-2.6, 2.2, -0.6);
    this._doorSpot.lookAt(new Vector3D(0.5, 0.8, 0.5));
    this.scene.add(this._doorSpot);

    // Deckenleuchte Koje 42 — caged industrial fluorescent fixture (FlakturmKit)
    const ceilingLamp = FlakturmKit.createFluorescentLamp({
      name: "BunkerCeilingLamp",
      length: 1.5,
      caged: true,
      intensity: 1.5,
      lightDistance: 8.0,
      color: new Color(0.85, 0.9, 1.0),
    });
    ceilingLamp.position.set(0, 3.05, 0);
    ceilingLamp.rotation.y = Math.PI / 2;
    this.scene.add(ceilingLamp);

    // 4. Build 3D Geometries
    this._buildBunkerRoom();
    this._buildKaeltekammer();
    this._buildPlayerCharacter();
    this._buildDustParticles();

    // 5. Initialize Modals & Systems
    this._terminalModal = new TerminalModal();
    this._mapModal = new ViennaMapModal("flakturm_arenberg");
    this._hotspotManager = new HotspotManager();

    // 6. Load High-Fidelity glTF Prop Kits via Level Descriptor, then apply PBR textures
    void (async (): Promise<void> => {
      await this._loadLevelProps();
      await this._applyKitTextures();
    })();

    // 7. UI & Keyboard Handlers
    this._initUiListeners();
    this._initKeyboardListeners();
  }

  /**
   * Measures a loaded glTF's actual mesh half-extents in the space of `root`'s direct
   * children (i.e. the space a sibling attached via `root.add(...)` lives in) — by walking
   * down to the first geometry-bearing node and multiplying every ancestor's own scale along
   * that path onto its local bounding box. Needed because a Tripo3D single-mesh import often
   * nests an large corrective scale (e.g. FBX-unit-to-meter conversion) inside the hierarchy,
   * so the documented `meta.json` dimensions can't be trusted for placing attached geometry.
   */
  private _measureLocalHalfExtents(root: Object3D): [number, number, number] {
    let found: Object3D | null = null;
    root.traverse((child) => {
      if (!found && child.geometry) found = child;
    });
    if (!found) return [0.5, 0.5, 0.5];
    const meshNode: Object3D = found;

    let sx = 1;
    let sy = 1;
    let sz = 1;
    const accumulate = (node: Object3D, target: Object3D): boolean => {
      if (node === target) {
        sx *= node.scale.x;
        sy *= node.scale.y;
        sz *= node.scale.z;
        return true;
      }
      for (const child of node.children) {
        if (accumulate(child, target)) {
          sx *= node.scale.x;
          sy *= node.scale.y;
          sz *= node.scale.z;
          return true;
        }
      }
      return false;
    };
    for (const child of root.children) {
      if (accumulate(child, meshNode)) break;
    }

    const bv = meshNode.geometry?.getBoundingVolume();
    if (!bv || bv.type !== BoundingType.BOX) return [0.5, 0.5, 0.5];
    const box = bv as BoundingBox;
    return [
      (box.max.x - box.min.x) * 0.5 * sx,
      (box.max.y - box.min.y) * 0.5 * sy,
      (box.max.z - box.min.z) * 0.5 * sz,
    ];
  }

  private async _loadLevelProps(): Promise<void> {
    try {
      const level = await this._kitRegistry.loadLevel(
        "/scenes/prologue/koje42.level.json",
        this.scene,
      );

      const deskInst = level.props.get("MetalDesk");
      if (deskInst) {
        if (this._metalDeskMesh) this.scene.remove(this._metalDeskMesh);
        this._metalDeskMesh = deskInst.root;
      }

      const lanternInst = level.props.get("KeroseneLantern");
      if (lanternInst) {
        this._lanternFlameLight = lanternInst.lights.get("FlameGlow") as PointLight;
      }

      const grinderInst = level.props.get("CoffeeGrinder");
      if (grinderInst) {
        if (this._coffeeGrinderMesh) this.scene.remove(this._coffeeGrinderMesh);
        this._coffeeGrinderMesh = grinderInst.root;
      }

      const shelfInst = level.props.get("WallShelfSupplies");
      if (shelfInst) {
        if (this._wallShelfMesh) this.scene.remove(this._wallShelfMesh);
      }

      const bunkInst = level.props.get("BunkBed");
      if (bunkInst) {
        if (this._bunkBedMesh) this.scene.remove(this._bunkBedMesh);
        this._bunkBedMesh = bunkInst.root;
      }

      const ventInst = level.props.get("VentWallBreach");
      if (ventInst) {
        if (this._ventGrate) this.scene.remove(this._ventGrate);
        this._ventGrate = ventInst.root;
      }

      const doorBeam = level.lights.get("DoorHallwayBeam") as SpotLight;
      if (doorBeam) {
        this._doorSpot = doorBeam;
      }

      // Amts-Terminal 2100 with procedural bolt set
      const termInst = await this._kitRegistry.loadProp("bunker/terminal_2100", {
        position: [0, 0.95, 0.8],
        rotation: [-Math.PI / 6, 0, 0],
        scale: 0.42,
        materialOverrides: { roughness: 0.78, metallic: 0.3 },
      });
      const [halfWidth, halfHeight, halfDepth] = this._measureLocalHalfExtents(termInst.root);
      termInst.root.add(BunkerKit.createTerminalBoltSet({ halfWidth, halfHeight, halfDepth }));
      if (this._terminalMesh) this.scene.remove(this._terminalMesh);
      this._terminalMesh = termInst.root;
      this.scene.add(termInst.root);

      // Register Hotspots directly from declarative level descriptor
      this._levelHotspots = level.hotspots;
      this._setupLevelHotspots(this._levelHotspots);
    } catch (e) {
      console.warn("[Prologue] Level load error:", e);
    }

    // Kältekammer Leichenschublade K-42 ID plate decal
    try {
      const idPlateTexture = await Texture.fromUrl("/assets/kits/flakturm/decals/sign_koje42.png");
      const idPlate = this._morgueTrayMesh?.getObjectByName("IdPlate");
      if (idPlate && idPlate.material instanceof StandardMaterial) {
        idPlate.material.diffuseMap = idPlateTexture;
        idPlate.material.alphaMap = idPlateTexture;
        idPlate.material.transparent = true;
      }
    } catch (e) {
      console.warn("[Prologue] Morgue tray ID plate decal failed to load:", e);
    }
  }

  /**
   * Loads the Flakturm Kit PBR texture sets and applies them to the procedural whitebox
   * architecture built in `_buildBunkerRoom`/`_buildKaeltekammer`. Those methods share one
   * `StandardMaterial` instance across every mesh using the same surface (e.g. all four
   * poured-concrete walls + the ceiling), so mutating the material found on any one of them
   * re-textures every mesh that shares it.
   */
  private async _applyKitTextures(): Promise<void> {
    const base = "/assets/kits/flakturm/textures";
    interface PbrTextureSet {
      albedo: Texture;
      normal: Texture;
      roughness: Texture;
      ao: Texture;
      metalness: Texture | undefined;
    }

    const loadSet = async (name: string, withMetalness: boolean): Promise<PbrTextureSet> => {
      const [albedo, normal, roughness, ao, metalness] = await Promise.all([
        Texture.fromUrl(`${base}/${name}/albedo.png`),
        Texture.fromUrl(`${base}/${name}/normal.png`),
        Texture.fromUrl(`${base}/${name}/roughness.png`),
        Texture.fromUrl(`${base}/${name}/ao.png`),
        withMetalness
          ? Texture.fromUrl(`${base}/${name}/metalness.png`)
          : Promise.resolve(undefined),
      ]);
      return { albedo, normal, roughness, ao, metalness };
    };

    try {
      const [concreteBoard, brickAged, concreteWeathered, steelCorroded, steelPainted] =
        await Promise.all([
          loadSet("concrete_board", false),
          loadSet("brick_aged", false),
          loadSet("concrete_weathered", false),
          loadSet("steel_corroded", true),
          loadSet("steel_painted", true),
        ]);

      // Each surface gets its own cloned Texture instances (same decoded image, independent
      // `repeat`) so a small wall and a large wall using the same kit material can each tile
      // at a sensible density instead of sharing one fixed UV scale.
      const withRepeat = (tex: Texture, x: number, y: number): Texture => {
        // These textures are always loaded via `Texture.fromUrl`, never canvas-backed.
        const image = tex.image as HTMLImageElement | ImageBitmap;
        const clone = Texture.fromImage(image);
        clone.repeat.x = x;
        clone.repeat.y = y;
        return clone;
      };

      const applyPbr = (
        material: unknown,
        set: PbrTextureSet,
        repeatX: number,
        repeatY: number,
      ): void => {
        if (!(material instanceof StandardMaterial)) return;
        material.diffuseMap = withRepeat(set.albedo, repeatX, repeatY);
        material.normalMap = withRepeat(set.normal, repeatX, repeatY);
        material.roughnessMap = withRepeat(set.roughness, repeatX, repeatY);
        material.aoMap = withRepeat(set.ao, repeatX, repeatY);
        material.roughness = 1.0;
        if (set.metalness) {
          material.metallicMap = withRepeat(set.metalness, repeatX, repeatY);
          material.metallic = 1.0;
        }
      };

      const matOf = (name: string, root?: Object3D | null): unknown =>
        (root ?? this.scene).getObjectByName(name)?.material;

      // Koje 42: poured-concrete walls/ceiling + floor.
      applyPbr(matOf("BackWall"), concreteBoard, 5, 3);
      applyPbr(matOf("Floor"), concreteBoard, 5, 3.5);
      // Brick infill around the blast-door frame.
      applyPbr(matOf("LeftWallBack"), brickAged, 1.5, 2.2);
      applyPbr(matOf("LeftWallFront"), brickAged, 1.5, 0.8);
      // Blast door + ventilation hatch — shared `rustSteelMat` instance.
      applyPbr(matOf("DoorLeaf", this._bunkerDoor), steelCorroded, 1, 2);
      // Painted bed frame.
      applyPbr(matOf("BedPost_0", this._bunkBedMesh), steelPainted, 1, 1.7);

      // Kältekammer: weathered concrete floor/back wall (shared `frostTileMat` instance).
      applyPbr(matOf("MorgueFloor", this._morgueGroup), concreteWeathered, 7, 4);
      // Closed drawer rack — painted steel cabinetry (shared `coldSteelMat` instance).
      applyPbr(matOf("Drawer_K40", this._morgueGroup), steelPainted, 1, 1);
      // Pulled-out tray — light and dark steel parts (both internal to BunkerKit, not shared
      // with anything else), plus the head-end cap gets a corroded look matching the tray's
      // long service life.
      applyPbr(matOf("TrayFloor", this._morgueTrayMesh), steelPainted, 0.5, 1);
      applyPbr(matOf("HeadEndCap", this._morgueTrayMesh), steelCorroded, 0.5, 0.3);
    } catch (e) {
      console.warn("[Prologue] Kit PBR texture application failed:", e);
    }
  }

  private _buildBunkerRoom(): void {
    const cubeGeo = new Cube({ size: 1.0 }).getGeometryData();
    const cylGeo = new Cylinder({
      radiusTop: 0.5,
      radiusBottom: 0.5,
      height: 1.0,
      radialSegments: 16,
    }).getGeometryData();

    // Materials
    const concreteWallMat = new StandardMaterial({
      color: new Color(0.18, 0.2, 0.24),
      roughness: 0.92,
      metallic: 0.1,
    });

    // Door-surround partition wall — brick infill around the reinforced concrete frame
    // (matches the real Flakturm reference photos), kept as its own material instance so it
    // can take the `brick_aged` kit texture independently of the poured-concrete walls.
    const brickWallMat = new StandardMaterial({
      color: new Color(0.35, 0.22, 0.16),
      roughness: 0.88,
      metallic: 0.05,
    });

    const floorMat = new StandardMaterial({
      color: new Color(0.12, 0.13, 0.16),
      roughness: 0.85,
      metallic: 0.2,
    });

    const rustSteelMat = new StandardMaterial({
      color: new Color(0.25, 0.15, 0.1),
      roughness: 0.75,
      metallic: 0.6,
    });

    // Bed frame — painted institutional steel, distinct material instance from the rusted
    // blast door/vent so each can take a different kit texture (`steel_painted` vs. `steel_corroded`).
    const paintedSteelMat = new StandardMaterial({
      color: new Color(0.22, 0.24, 0.22),
      roughness: 0.6,
      metallic: 0.4,
    });

    const woodMat = new StandardMaterial({
      color: new Color(0.2, 0.15, 0.12),
      roughness: 0.88,
      metallic: 0.05,
    });

    const brassMat = new StandardMaterial({
      color: new Color(0.5, 0.4, 0.2),
      roughness: 0.35,
      metallic: 0.85,
    });

    // Back Wall
    const backWall = new Object3D("BackWall");
    backWall.geometry = cubeGeo;
    backWall.material = concreteWallMat;
    backWall.scale.set(5.0, 3.2, 0.3);
    backWall.position.set(0, 1.6, -1.5);
    this.scene.add(backWall);

    // Floor
    const floor = new Object3D("Floor");
    floor.geometry = cubeGeo;
    floor.material = floorMat;
    floor.scale.set(5.0, 0.3, 3.5);
    floor.position.set(0, -0.15, 0.2);
    this.scene.add(floor);

    // Ceiling
    const ceiling = new Object3D("Ceiling");
    ceiling.geometry = cubeGeo;
    ceiling.material = concreteWallMat;
    ceiling.scale.set(5.0, 0.3, 3.5);
    ceiling.position.set(0, 3.2, 0.2);
    this.scene.add(ceiling);

    // Right Wall
    const rightWall = new Object3D("RightWall");
    rightWall.geometry = cubeGeo;
    rightWall.material = concreteWallMat;
    rightWall.scale.set(0.3, 3.2, 3.5);
    rightWall.position.set(2.5, 1.6, 0.2);
    this.scene.add(rightWall);

    // Left Wall with Doorframe
    const leftWallTop = new Object3D("LeftWallTop");
    leftWallTop.geometry = cubeGeo;
    leftWallTop.material = concreteWallMat;
    leftWallTop.scale.set(0.3, 1.0, 3.5);
    leftWallTop.position.set(-2.5, 2.7, 0.2);
    this.scene.add(leftWallTop);

    const leftWallBack = new Object3D("LeftWallBack");
    leftWallBack.geometry = cubeGeo;
    leftWallBack.material = brickWallMat;
    leftWallBack.scale.set(0.3, 2.2, 1.5);
    leftWallBack.position.set(-2.5, 1.1, -0.8);
    this.scene.add(leftWallBack);

    const leftWallFront = new Object3D("LeftWallFront");
    leftWallFront.geometry = cubeGeo;
    leftWallFront.material = brickWallMat;
    leftWallFront.scale.set(0.3, 2.2, 0.8);
    leftWallFront.position.set(-2.5, 1.1, 1.5);
    this.scene.add(leftWallFront);

    // 🚪 Heavy Blast Door
    const doorHinge = new Object3D("DoorHinge");
    doorHinge.position.set(-2.4, 0, -0.05);

    const doorMesh = new Object3D("DoorLeaf");
    doorMesh.geometry = cubeGeo;
    doorMesh.material = rustSteelMat;
    doorMesh.scale.set(0.12, 2.1, 1.15);
    doorMesh.position.set(0, 1.05, 0.575);
    doorHinge.add(doorMesh);

    for (let r = 0; r < 4; r++) {
      const rib = new Object3D(`DoorRib_${r}`);
      rib.geometry = cubeGeo;
      rib.material = rustSteelMat;
      rib.scale.set(0.16, 0.08, 1.0);
      rib.position.set(0, 0.35 + r * 0.5, 0.575);
      doorHinge.add(rib);
    }
    this.scene.add(doorHinge);
    this._bunkerDoor = doorHinge;

    // 🛏️ Bunk Bed
    const bedGroup = new Object3D("BunkBed");
    bedGroup.position.set(1.5, 0, -0.6);

    const postOffsets: [number, number, number][] = [
      [-0.5, 0.85, -0.6],
      [0.5, 0.85, -0.6],
      [-0.5, 0.85, 0.6],
      [0.5, 0.85, 0.6],
    ];
    postOffsets.forEach(([px, py, pz], idx) => {
      const post = new Object3D(`BedPost_${idx}`);
      post.geometry = cubeGeo;
      post.material = paintedSteelMat;
      post.scale.set(0.06, 1.7, 0.06);
      post.position.set(px, py, pz);
      bedGroup.add(post);
    });

    const bottomBed = new Object3D("BottomMattress");
    bottomBed.geometry = cubeGeo;
    bottomBed.material = new StandardMaterial({
      color: new Color(0.22, 0.24, 0.28),
      roughness: 0.95,
    });
    bottomBed.scale.set(1.0, 0.15, 1.25);
    bottomBed.position.set(0, 0.35, 0);
    bedGroup.add(bottomBed);

    const topBed = new Object3D("TopMattress");
    topBed.geometry = cubeGeo;
    topBed.material = new StandardMaterial({ color: new Color(0.18, 0.2, 0.22), roughness: 0.95 });
    topBed.scale.set(1.0, 0.15, 1.25);
    topBed.position.set(0, 1.25, 0);
    bedGroup.add(topBed);
    this.scene.add(bedGroup);
    this._bunkBedMesh = bedGroup;

    // 🪑 Procedural Metal Desk Fallback
    const desk = new Object3D("MetalDesk");
    desk.position.set(-0.6, 0, -1.0);

    const deskTop = new Object3D("DeskTop");
    deskTop.geometry = cubeGeo;
    deskTop.material = rustSteelMat;
    deskTop.scale.set(1.2, 0.05, 0.7);
    deskTop.position.set(0, 0.75, 0);
    desk.add(deskTop);

    const legOffsets: [number, number][] = [
      [-0.55, -0.3],
      [0.55, -0.3],
      [-0.55, 0.3],
      [0.55, 0.3],
    ];
    legOffsets.forEach(([lx, lz], idx) => {
      const leg = new Object3D(`DeskLeg_${idx}`);
      leg.geometry = cubeGeo;
      leg.material = rustSteelMat;
      leg.scale.set(0.05, 0.75, 0.05);
      leg.position.set(lx, 0.375, lz);
      desk.add(leg);
    });
    this.scene.add(desk);
    this._metalDeskMesh = desk;

    // ☕ Wooden Shelf & Coffee Grinder
    const shelf = new Object3D("Shelf");
    shelf.geometry = cubeGeo;
    shelf.material = woodMat;
    shelf.scale.set(1.2, 0.06, 0.4);
    shelf.position.set(-0.6, 1.45, -1.35);
    this.scene.add(shelf);
    this._wallShelfMesh = shelf;

    const grinder = new Object3D("CoffeeGrinder");
    grinder.position.set(-0.35, 0.78, -1.0);

    const grinderBox = new Object3D("GrinderBox");
    grinderBox.geometry = cubeGeo;
    grinderBox.material = woodMat;
    grinderBox.scale.set(0.22, 0.18, 0.22);
    grinder.add(grinderBox);

    const grinderHopper = new Object3D("GrinderHopper");
    grinderHopper.geometry = cylGeo;
    grinderHopper.material = brassMat;
    grinderHopper.scale.set(0.18, 0.1, 0.18);
    grinderHopper.position.set(0, 0.13, 0);
    grinder.add(grinderHopper);

    const grinderCrank = new Object3D("GrinderCrank");
    grinderCrank.geometry = cubeGeo;
    grinderCrank.material = brassMat;
    grinderCrank.scale.set(0.16, 0.02, 0.03);
    grinderCrank.position.set(0.06, 0.2, 0);
    grinder.add(grinderCrank);
    this.scene.add(grinder);
    this._coffeeGrinderMesh = grinder;

    // 📟 The AZS Handheld Terminal
    const terminal = new Object3D("HandheldTerminal");
    terminal.position.set(0, 1.0, 0.8);
    terminal.rotation.x = -Math.PI / 6;

    const terminalBody = new Object3D("TerminalBody");
    terminalBody.geometry = cubeGeo;
    terminalBody.material = new StandardMaterial({
      color: new Color(0.2, 0.2, 0.22),
      roughness: 0.6,
      metallic: 0.3,
    });
    terminalBody.scale.set(0.38, 0.52, 0.1);
    terminal.add(terminalBody);

    this._screenMaterial = new StandardMaterial({
      color: new Color(0.9, 0.55, 0.1),
      roughness: 0.3,
      metallic: 0.1,
    });
    const terminalScreen = new Object3D("TerminalScreen");
    terminalScreen.geometry = cubeGeo;
    terminalScreen.material = this._screenMaterial;
    terminalScreen.scale.set(0.3, 0.26, 0.02);
    terminalScreen.position.set(0, 0.08, 0.05);
    terminal.add(terminalScreen);

    const screenGlow = new PointLight({
      name: "ScreenGlow",
      color: new Color(1.0, 0.65, 0.15),
      intensity: 1.5,
      distance: 3.0,
    });
    screenGlow.position.set(0, 0.08, 0.15);
    terminal.add(screenGlow);
    this.scene.add(terminal);
    this._terminalMesh = terminal;

    // 🕳️ Ventilation Grate on East Wall opposite door (leads to Sektor 0 / Kältekammer)
    const ventGroup = new Object3D("VentilationGrate");
    ventGroup.position.set(2.38, 0.35, 0.8);
    ventGroup.rotation.y = -Math.PI / 2;

    const ventFrame = new Object3D("VentFrame");
    ventFrame.geometry = cubeGeo;
    ventFrame.material = rustSteelMat;
    ventFrame.scale.set(0.7, 0.7, 0.05);
    ventGroup.add(ventFrame);

    for (let s = 0; s < 5; s++) {
      const slat = new Object3D(`VentSlat_${s}`);
      slat.geometry = cubeGeo;
      slat.material = rustSteelMat;
      slat.scale.set(0.58, 0.04, 0.02);
      slat.position.set(0, -0.2 + s * 0.1, 0.03);
      ventGroup.add(slat);
    }
    this.scene.add(ventGroup);
    this._ventGrate = ventGroup;

    // Surface-mounted electrical conduit along the back wall (FlakturmKit)
    const conduitRun = FlakturmKit.createConduitRun([
      {
        start: new Vector3D(-2.0, 2.5, -1.4),
        end: new Vector3D(1.6, 2.5, -1.4),
        junctionAtStart: true,
        junctionAtEnd: true,
      },
      {
        start: new Vector3D(1.6, 2.5, -1.4),
        end: new Vector3D(1.6, 1.3, -1.4),
        junctionAtEnd: true,
      },
    ]);
    this.scene.add(conduitRun);
  }

  private _buildKaeltekammer(): void {
    const cubeGeo = new Cube({ size: 1.0 }).getGeometryData();
    const cylGeo = new Cylinder({
      radiusTop: 0.5,
      radiusBottom: 0.5,
      height: 1.0,
      radialSegments: 16,
    }).getGeometryData();

    const morgueGroup = new Object3D("Kaeltekammer_Sektor0");
    morgueGroup.position.set(0, 0, -9.0);

    const coldSteelMat = new StandardMaterial({
      color: new Color(0.12, 0.16, 0.2),
      roughness: 0.4,
      metallic: 0.7,
    });

    const frostTileMat = new StandardMaterial({
      color: new Color(0.25, 0.32, 0.38),
      roughness: 0.65,
      metallic: 0.2,
    });

    const pipeCopperMat = new StandardMaterial({
      color: new Color(0.2, 0.4, 0.38),
      roughness: 0.45,
      metallic: 0.8,
    });

    // Floor & Walls
    const mFloor = new Object3D("MorgueFloor");
    mFloor.geometry = cubeGeo;
    mFloor.material = frostTileMat;
    mFloor.scale.set(7.0, 0.3, 5.0);
    mFloor.position.set(0, -0.15, 0);
    morgueGroup.add(mFloor);

    const mBackWall = new Object3D("MorgueBackWall");
    mBackWall.geometry = cubeGeo;
    mBackWall.material = frostTileMat;
    mBackWall.scale.set(7.0, 3.5, 0.3);
    mBackWall.position.set(0, 1.75, -2.5);
    morgueGroup.add(mBackWall);

    // Freezing Ammonia Pipes
    const ammoniaPipe = new Object3D("AmmoniaPipe");
    ammoniaPipe.geometry = cylGeo;
    ammoniaPipe.material = pipeCopperMat;
    ammoniaPipe.scale.set(0.16, 6.8, 0.16);
    ammoniaPipe.rotation.z = Math.PI / 2;
    ammoniaPipe.position.set(0, 3.1, -2.3);
    morgueGroup.add(ammoniaPipe);

    // Morgue Drawer Wall (Fächer K-40 bis K-44)
    const rackWall = new Object3D("MorgueDrawerRack");
    rackWall.position.set(-1.8, 0, -2.1);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const slotIdx = 40 + row * 3 + col;
        const drawer = new Object3D(`Drawer_K${slotIdx}`);
        drawer.geometry = cubeGeo;
        drawer.material = coldSteelMat;
        drawer.scale.set(0.85, 0.6, 0.2);
        drawer.position.set(col * 0.95 - 0.95, 0.5 + row * 0.8, 0);

        // Handle
        const handle = new Object3D(`Handle_K${slotIdx}`);
        handle.geometry = cubeGeo;
        handle.material = coldSteelMat;
        handle.scale.set(0.3, 0.06, 0.08);
        handle.position.set(col * 0.95 - 0.95, 0.5 + row * 0.8, 0.12);

        rackWall.add(drawer);
        rackWall.add(handle);
      }
    }
    morgueGroup.add(rackWall);

    // Pulled-out Drawer K-42 (František) — +Z is the head end, protruding toward the room;
    // -Z is the foot end, still recessed toward the wall/rackWall behind it.
    const trayK42 = BunkerKit.createMorgueTray({ name: "DrawerTray_K42" });
    trayK42.position.set(-1.8, 0.9, -1.3);

    // František's Sheet-covered Body Representation
    const corpseMesh = new Object3D("CorpseCover");
    corpseMesh.geometry = cubeGeo;
    corpseMesh.material = new StandardMaterial({
      color: new Color(0.4, 0.45, 0.5),
      roughness: 0.95,
      metallic: 0.05,
    });
    corpseMesh.scale.set(0.65, 0.28, 1.6);
    corpseMesh.position.set(0, 0.17, 0);
    trayK42.add(corpseMesh);

    // 🟢 Colorkey Cyanide Injection Decal (Emerald Glow) — mounted on the head-end socket
    const cyanideGlow = new Object3D("CyanideNeckMark");
    cyanideGlow.geometry = cylGeo;
    cyanideGlow.material = new StandardMaterial({
      color: new Color(0.05, 1.0, 0.35),
      roughness: 0.1,
      metallic: 0.9,
    });
    cyanideGlow.scale.set(0.12, 0.02, 0.12);
    cyanideGlow.position.set(-0.15, 0.03, 0);
    const neckSocket = trayK42.getObjectByName("NeckSpotlightTarget");
    (neckSocket ?? trayK42).add(cyanideGlow);
    this._cyanideDecal = cyanideGlow;

    morgueGroup.add(trayK42);
    this._morgueTrayMesh = trayK42;

    // Cold Blue Morgue Ceiling Lamp — caged industrial fluorescent fixture (FlakturmKit)
    const coldLamp = FlakturmKit.createFluorescentLamp({
      name: "MorgueColdLamp",
      length: 1.8,
      caged: true,
      intensity: 3.0,
      lightDistance: 12.0,
      color: new Color(0.4, 0.75, 1.0),
      emissiveColor: new Color(0.55, 0.85, 1.0),
    });
    coldLamp.position.set(0, 2.95, 0);
    morgueGroup.add(coldLamp);

    // 🟢 Colorkey Emerald Spotlight (Focused on Neck Mark)
    this._cyanideSpotLight = new SpotLight({
      name: "CyanideColorkeySpot",
      color: new Color(0.1, 1.0, 0.4),
      intensity: 0.0, // Activated upon inspection
      distance: 6.0,
      angle: Math.PI / 6.0,
      penumbra: 0.4,
    });
    this._cyanideSpotLight.position.set(-1.8, 2.5, -1.3);
    this._cyanideSpotLight.lookAt(new Vector3D(-1.8, 0.9, -1.3));
    morgueGroup.add(this._cyanideSpotLight);

    for (let i = 0; i < 25; i++) {
      const p = new Object3D(`FrostParticle_${i}`);
      p.geometry = cubeGeo;
      p.material = new StandardMaterial({
        color: new Color(0.7, 0.9, 1.0),
        roughness: 0.1,
        metallic: 0.1,
      });
      p.position.set(
        (Math.random() - 0.5) * 5.0,
        0.3 + Math.random() * 2.5,
        (Math.random() - 0.5) * 4.0,
      );
      morgueGroup.add(p);
      this._frostParticles.push(p);
    }

    // Collapsed rubble in the far corner — ruined-bunker set dressing (FlakturmKit)
    const debris = FlakturmKit.createDebrisCluster(7, 0.6);
    debris.position.set(2.7, 0, -2.0);
    morgueGroup.add(debris);

    this.scene.add(morgueGroup);
    this._morgueGroup = morgueGroup;
  }

  private _buildPlayerCharacter(): void {
    const cubeGeo = new Cube({ size: 1.0 }).getGeometryData();
    const cylGeo = new Cylinder({
      radiusTop: 0.5,
      radiusBottom: 0.5,
      height: 1.0,
      radialSegments: 16,
    }).getGeometryData();

    // Stylized Graphic Noir Mannequin Avatar
    const playerGroup = new Object3D("PlayerNovotny");
    playerGroup.position.set(this._playerPos.x, this._playerPos.y, this._playerPos.z);

    const coatMat = new StandardMaterial({
      color: new Color(0.15, 0.16, 0.18),
      roughness: 0.9,
      metallic: 0.05,
    });
    const scarfMat = new StandardMaterial({
      color: new Color(0.7, 0.5, 0.25),
      roughness: 0.85,
    });

    // Body
    const body = new Object3D("CoatTorso");
    body.geometry = cubeGeo;
    body.material = coatMat;
    body.scale.set(0.45, 0.7, 0.3);
    body.position.set(0, 0.85, 0);
    playerGroup.add(body);

    // Head / Hood
    const head = new Object3D("HoodHead");
    head.geometry = cubeGeo;
    head.material = coatMat;
    head.scale.set(0.32, 0.35, 0.32);
    head.position.set(0, 1.35, 0);
    playerGroup.add(head);

    // Scarf
    const scarf = new Object3D("Scarf");
    scarf.geometry = cubeGeo;
    scarf.material = scarfMat;
    scarf.scale.set(0.36, 0.12, 0.36);
    scarf.position.set(0, 1.15, 0);
    playerGroup.add(scarf);

    // Legs
    const legL = new Object3D("LegL");
    legL.geometry = cubeGeo;
    legL.material = coatMat;
    legL.scale.set(0.16, 0.6, 0.18);
    legL.position.set(-0.12, 0.3, 0);
    playerGroup.add(legL);

    const legR = new Object3D("LegR");
    legR.geometry = cubeGeo;
    legR.material = coatMat;
    legR.scale.set(0.16, 0.6, 0.18);
    legR.position.set(0.12, 0.3, 0);
    playerGroup.add(legR);

    // 🏮 Lantern in Left Hand
    const lantern = new Object3D("PlayerLantern");
    lantern.position.set(-0.32, 0.65, 0.2);

    const lanternCage = new Object3D("LanternCage");
    lanternCage.geometry = cylGeo;
    lanternCage.material = new StandardMaterial({
      color: new Color(0.95, 0.65, 0.2),
      roughness: 0.2,
      metallic: 0.8,
    });
    lanternCage.scale.set(0.12, 0.2, 0.12);
    lantern.add(lanternCage);

    this._playerLanternLight = new PointLight({
      name: "NovotnyLanternLight",
      color: new Color(1.0, 0.72, 0.35),
      intensity: 3.5,
      distance: 6.0,
    });
    lantern.add(this._playerLanternLight);
    playerGroup.add(lantern);

    this.scene.add(playerGroup);
    this._playerObject = playerGroup;
  }

  private _buildDustParticles(): void {
    const cubeGeo = new Cube({ size: 0.02 }).getGeometryData();
    const dustMat = new StandardMaterial({
      color: new Color(1.0, 0.9, 0.7),
      roughness: 0.1,
      metallic: 0.0,
    });

    for (let i = 0; i < 35; i++) {
      const p = new Object3D(`DustParticle_${i}`);
      p.geometry = cubeGeo;
      p.material = dustMat;
      p.position.set(
        (Math.random() - 0.5) * 3.5,
        0.5 + Math.random() * 2.2,
        (Math.random() - 0.5) * 2.5,
      );
      this.scene.add(p);
      this._dustParticles.push(p);
    }
  }

  private _setupLevelHotspots(hotspotDefs: LevelHotspotDef[]): void {
    if (!this._hotspotManager) return;
    this._hotspotManager.clearHotspots();

    for (const def of hotspotDefs) {
      let onInteract: (() => void) | undefined;
      if (def.action === "open_terminal") {
        onInteract = (): void => {
          setTimeout(() => this._terminalModal?.open("case"), 200);
        };
      } else if (def.action === "transition_kaeltekammer") {
        onInteract = (): void => {
          this.transitionToKaeltekammer();
        };
      }

      const hotspot: HotspotAction = {
        id: def.id,
        name: def.name,
        position: new Vector3D(def.position[0], def.position[1], def.position[2]),
        interactionRadius: def.interactionRadius ?? 1.3,
        promptText: def.promptText,
        monologueTitle: def.monologueTitle,
        monologueText: def.monologueText,
        onInteract,
      };

      this._hotspotManager.registerHotspot(hotspot);
    }
  }

  private _setupKaeltekammerHotspots(): void {
    if (!this._hotspotManager) return;
    this._hotspotManager.clearHotspots();

    const spots: HotspotAction[] = [
      {
        id: "drawer_k42",
        name: "Fach K-42 (František)",
        position: new Vector3D(-1.8, 0, -9.8),
        interactionRadius: 1.6,
        promptText: "Fach K-42 untersuchen",
        monologueTitle: "Kältekammer Fach K-42",
        monologueText: [
          "Mit klammen Fingern ziehe ich die schwere Edelstahlwanne aus der Wand... Eisdampf schlägt mir entgegen.",
          "František. Sein Gesicht ist friedlich, fast blass wie Kalkstein. Doch als ich den Kragen seines Mantels beiseite schiebe...",
          "🟢 [COLORKEY SMARAGDGRÜN] Am linken Halsansatz: Ein kreisrunder, grün verfärbter Einstichpunkt. Keine Altersschwäche. Hochkonzentrierte Blausäure.",
          "Ober-Inspektor Pollak hat ihn ermordet! Aber warum?! Františeks Dienstausweis und das Medaillon fehlen... Sie müssen in der Asservatenkammer der Kanzlei liegen!",
        ],
        onInteract: (): void => {
          if (this._cyanideSpotLight) {
            this._cyanideSpotLight.intensity = 8.0;
          }
          const objText = document.getElementById("objectiveText");
          if (objText) {
            objText.innerText =
              "Asservatenkammer infiltrieren & Františeks Medaillon vor der Kompostierung bergen!";
          }
        },
      },
      {
        id: "ammonia_pipes",
        name: "Kühlrohre",
        position: new Vector3D(0, 0, -10.5),
        interactionRadius: 1.8,
        promptText: "Ammoniak-Kühlsystem prüfen",
        monologueTitle: "Nußdorf-Kühlstrang",
        monologueText: [
          "Das laute Zischen der Kühlmittelrohre übertönt meine Schritte.",
          "Wenn hier ein Rohr bricht, füllt sich der Raum in dreißig Sekunden mit tödlichem Ammoniakgas.",
        ],
      },
      {
        id: "morgue_exit",
        name: "Aufgang zur Kanzlei",
        position: new Vector3D(2.2, 0, -8.5),
        interactionRadius: 1.6,
        promptText: "Wartungsleiter zur Asservatenkammer hinaufsteigen",
        monologueTitle: "Aufgang zur Kanzlei",
        monologueText: [
          "Eine rostige Steigleiter führt durch die Decke direkt in den Vorraum der Asservatenkammer.",
          "Dort werden alle Besitztümer der Toten registriert, bevor die Kompostierung beginnt.",
        ],
      },
    ];

    spots.forEach((s) => this._hotspotManager?.registerHotspot(s));
  }

  public transitionToKaeltekammer(): void {
    this._currentArea = "kaeltekammer";
    this._playerPos.set(0, 0, -8.2);
    if (this._playerObject) {
      this._playerObject.position.set(this._playerPos.x, this._playerPos.y, this._playerPos.z);
    }
    this._targetCameraPos.set(0, 1.8, -5.2);
    this._targetCameraLook.set(0, 1.0, -9.0);

    const objText = document.getElementById("objectiveText");
    if (objText) {
      objText.innerText = "Sektor 0 / Kältekammer Fach K-42 untersuchen";
    }

    this._setupKaeltekammerHotspots();
  }

  public startExplorationMode(): void {
    this._isExplorationMode = true;
    this._isPlaying = false;
    this._isPausedForChoice = false;

    const dialBox = document.getElementById("dialogueContainer");
    if (dialBox) dialBox.style.display = "none";
    const choiceBox = document.getElementById("dialogChoice");
    if (choiceBox) choiceBox.style.display = "none";
    const timelineBar = document.getElementById("timelineBar");
    if (timelineBar) timelineBar.style.display = "none";

    if (this._currentArea === "koje_42") {
      this._targetCameraPos.set(0, 1.6, 3.8);
      this._targetCameraLook.set(0, 1.1, 0);
    }
  }

  private _initUiListeners(): void {
    const btnPlay = document.getElementById("btnPlay");
    if (btnPlay) {
      btnPlay.addEventListener("click", () => this.togglePlayback());
    }

    const btnTerminal = document.getElementById("btnTerminal");
    if (btnTerminal) {
      btnTerminal.addEventListener("click", () => this._terminalModal?.toggle());
    }

    const btnMap = document.getElementById("btnMap");
    if (btnMap) {
      btnMap.addEventListener("click", () => this._mapModal?.toggle());
    }

    const btnExplore = document.getElementById("btnExplore");
    if (btnExplore) {
      btnExplore.addEventListener("click", () => this.startExplorationMode());
    }

    const btnQ1 = document.getElementById("btnQuestion1");
    const btnQ2 = document.getElementById("btnQuestion2");
    if (btnQ1) btnQ1.addEventListener("click", () => this.selectQuestion(1));
    if (btnQ2) btnQ2.addEventListener("click", () => this.selectQuestion(2));

    const promptEl = document.getElementById("interactionPrompt");
    if (promptEl) {
      promptEl.addEventListener("click", () => this._hotspotManager?.interact());
    }

    const monologueFooter = document.getElementById("monologueFooter");
    if (monologueFooter) {
      monologueFooter.addEventListener("click", () => this._hotspotManager?.advanceMonologue());
    }
  }

  private _initKeyboardListeners(): void {
    window.addEventListener("keydown", (e) => {
      this._keysDown.add(e.key.toLowerCase());
      if (e.key === "m" || e.key === "M") {
        this._mapModal?.toggle();
      } else if (
        e.key === " " &&
        !this._isExplorationMode &&
        !this._hotspotManager?.isMonologueOpen
      ) {
        this.startExplorationMode();
      }
    });

    window.addEventListener("keyup", (e) => {
      this._keysDown.delete(e.key.toLowerCase());
    });
  }

  public togglePlayback(): void {
    this._isPlaying = !this._isPlaying;
    const btn = document.getElementById("btnPlay");
    if (btn) {
      btn.innerText = this._isPlaying ? "⏸ Szene Pausieren" : "▶ Szene Fortsetzen";
    }
  }

  public selectQuestion(q: number): void {
    const choiceBox = document.getElementById("dialogChoice");
    if (choiceBox) choiceBox.style.display = "none";

    this._isPausedForChoice = false;
    this._isPlaying = true;

    const sub = document.getElementById("subText");
    const speaker = document.getElementById("subSpeaker");
    if (q === 1) {
      if (speaker) speaker.innerText = "Herr Hawelka";
      if (sub)
        sub.innerText =
          "„Unten bei den Kühlleitungen... aber er sah nicht gut aus. Da waren dunkle Flecken am Hals, Novotny!“";
    } else {
      if (speaker) speaker.innerText = "Herr Hawelka";
      if (sub)
        sub.innerText =
          "„Weil die AZS-Schergen jeden Speicherchip sofort löschen! František wollte, dass du es hast!“";
    }

    this._currentTime = 28.0;
  }

  protected override update(deltaTime: number): void {
    super.update(deltaTime);

    // 1. Cinematic Timeline
    if (this._isPlaying && !this._isPausedForChoice && !this._isExplorationMode) {
      this._currentTime += deltaTime;
      this._updateTimeline(this._currentTime);
    }

    // 2. Interactive Exploration Movement (WASD / Arrows)
    if (this._isExplorationMode && !this._hotspotManager?.isMonologueOpen) {
      this._handlePlayerMovement(deltaTime);
    }

    // 3. Hotspot Proximity Detection
    if (this._hotspotManager) {
      this._hotspotManager.update(this._playerPos);
    }

    // 4. Smooth Camera Lerp
    this.camera.position.lerp(this._targetCameraPos, Math.min(1.0, deltaTime * 2.5));
    this.camera.target.lerp(this._targetCameraLook, Math.min(1.0, deltaTime * 2.5));
    this.camera.updateViewMatrix();

    // 5. Door Animation
    this._doorOpenAngle = MathUtils.lerp(
      this._doorOpenAngle,
      this._targetDoorAngle,
      Math.min(1.0, deltaTime * 3.0),
    );
    if (this._bunkerDoor) {
      this._bunkerDoor.rotation.y = this._doorOpenAngle;
    }

    // 6. Dust & Frost Particles
    for (let i = 0; i < this._dustParticles.length; i++) {
      const p = this._dustParticles[i];
      if (p) {
        p.position.y += Math.sin(this._currentTime * 1.5 + i) * 0.002;
        p.position.x += Math.cos(this._currentTime * 0.8 + i) * 0.001;
      }
    }
    for (let i = 0; i < this._frostParticles.length; i++) {
      const fp = this._frostParticles[i];
      if (fp) {
        fp.position.y += Math.sin(this._currentTime * 2.0 + i) * 0.0015;
        fp.position.x += Math.cos(this._currentTime * 1.2 + i) * 0.001;
      }
    }

    // 7. Dynamic Lantern & Colorkey Effects
    if (this._playerLanternLight) {
      const bob = this._isMoving ? Math.sin(this._currentTime * 12.0) * 0.4 : 0;
      this._playerLanternLight.intensity = 3.5 + bob + (Math.random() - 0.5) * 0.15;
    }
    if (this._lanternFlameLight) {
      const flicker =
        0.95 + Math.sin(this._currentTime * 18.0) * 0.05 + (Math.random() - 0.5) * 0.08;
      this._lanternFlameLight.intensity = 2.5 * flicker;
    }
    if (this._cyanideDecal && this._cyanideSpotLight && this._cyanideSpotLight.intensity > 0) {
      const pulse = 1.0 + Math.sin(this._currentTime * 6.0) * 0.15;
      this._cyanideDecal.scale.set(0.12 * pulse, 0.02, 0.12 * pulse);
    }
    if (this._ventGrate) {
      this._ventGrate.position.y = 0.35 + Math.sin(this._currentTime * 20.0) * 0.001;
    }

    // 8. Subtle Screen Flicker
    if (this._screenMaterial) {
      const flicker =
        0.95 + Math.sin(this._currentTime * 45.0) * 0.05 + (Math.random() - 0.5) * 0.04;
      this._screenMaterial.color.set(0.9 * flicker, 0.55 * flicker, 0.1 * flicker);
    }

    // 9. Timeline Progress Bar
    const progressEl = document.getElementById("timelineProgress");
    if (progressEl) {
      const pct = Math.min(100, (this._currentTime / 60.0) * 100);
      progressEl.style.width = pct + "%";
    }

    const timerEl = document.getElementById("timerText");
    if (timerEl) {
      const s = Math.floor(this._currentTime);
      const str = (s < 10 ? "0" : "") + s;
      timerEl.innerText = `00:${str} / 01:00`;
    }

    this.scene.update(deltaTime);
  }

  private _handlePlayerMovement(deltaTime: number): void {
    let moveX = 0;
    let moveZ = 0;

    if (this._keysDown.has("a") || this._keysDown.has("arrowleft")) moveX -= 1;
    if (this._keysDown.has("d") || this._keysDown.has("arrowright")) moveX += 1;
    if (this._keysDown.has("w") || this._keysDown.has("arrowup")) moveZ -= 1;
    if (this._keysDown.has("s") || this._keysDown.has("arrowdown")) moveZ += 1;

    this._isMoving = moveX !== 0 || moveZ !== 0;

    if (this._isMoving) {
      const speed = 2.4 * deltaTime;
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      const nx = (moveX / len) * speed;
      const nz = (moveZ / len) * speed;

      this._playerPos.x += nx;
      this._playerPos.z += nz;

      // Area Boundaries
      if (this._currentArea === "koje_42") {
        this._playerPos.x = MathUtils.clamp(this._playerPos.x, -2.1, 2.1);
        this._playerPos.z = MathUtils.clamp(this._playerPos.z, -1.1, 1.2);
      } else if (this._currentArea === "kaeltekammer") {
        this._playerPos.x = MathUtils.clamp(this._playerPos.x, -2.8, 2.8);
        this._playerPos.z = MathUtils.clamp(this._playerPos.z, -10.5, -7.5);
      }

      this._playerFacingAngle = Math.atan2(moveX, moveZ);
    }

    if (this._playerObject) {
      this._playerObject.position.set(this._playerPos.x, this._playerPos.y, this._playerPos.z);
      this._playerObject.rotation.y = MathUtils.lerp(
        this._playerObject.rotation.y,
        this._playerFacingAngle,
        Math.min(1.0, deltaTime * 12.0),
      );
    }
  }

  private _updateTimeline(time: number): void {
    const speaker = document.getElementById("subSpeaker");
    const sub = document.getElementById("subText");

    if (time >= 0 && time < 4.0 && this._currentPhase === 0) {
      this._currentPhase = 1;
      if (speaker) speaker.innerText = "Geräuschkulisse";
      if (sub)
        sub.innerText =
          "*Dumpfes, panisches Pochen gegen die rostige Panzertür hallt durch die Koje.*";
      this._targetDoorAngle = 0;
    } else if (time >= 4.0 && time < 10.0 && this._currentPhase === 1) {
      this._currentPhase = 2;
      this._targetDoorAngle = -Math.PI / 4.5;
      if (speaker) speaker.innerText = "Herr Hawelka (AZS-Blockwart)";
      if (sub) sub.innerText = "„Novotny... psst! Mach keinen Lärm. Nimm das. Schnell!“";
      this._targetCameraPos.set(-0.8, 1.4, 3.0);
      this._targetCameraLook.set(-1.2, 1.2, 0);
    } else if (time >= 10.0 && time < 20.0 && this._currentPhase === 2) {
      this._currentPhase = 3;
      if (speaker) speaker.innerText = "Herr Hawelka";
      if (sub)
        sub.innerText =
          "„Sie haben František im Maschinenstrang aufgelesen. Er ist hinüber... Das ist meine Schuld von damals. Pack seine Sachen.“";
    } else if (time >= 20.0 && this._currentPhase === 3) {
      this._currentPhase = 4;
      this._isPausedForChoice = true;
      this._isPlaying = false;
      const choiceBox = document.getElementById("dialogChoice");
      if (choiceBox) choiceBox.style.display = "block";
    } else if (time >= 35.0 && time < 38.0 && this._currentPhase === 4) {
      this._currentPhase = 5;
      if (speaker) speaker.innerText = "Geräuschkulisse";
      if (sub) sub.innerText = "*Schweres Stiefeldröhnen der AZS-Wachen nähert sich im Flur!*";
    } else if (time >= 38.0 && time < 44.0 && this._currentPhase === 5) {
      this._currentPhase = 6;
      this._targetDoorAngle = 0;
      if (speaker) speaker.innerText = "Herr Hawelka";
      if (sub)
        sub.innerText =
          "„Verdammt, die Patrouille! Ich war nie hier, hörst du?!“ *[Tür fällt ins Schloss]*";
      this._targetCameraPos.set(0, 1.2, 1.8);
      this._targetCameraLook.set(0, 1.0, 0.8);
    } else if (time >= 44.0 && time < 52.0 && this._currentPhase === 6) {
      this._currentPhase = 7;
      this._targetCameraPos.set(0, 1.15, 1.35);
      this._targetCameraLook.set(0, 1.08, 0.85);
      if (speaker) speaker.innerText = "Amts-Terminal 2100 (KI Amtsrat 4.1)";
      if (sub)
        sub.innerText =
          "„GZ 2100-AZS/STERBEFALL-0815 // BÜRGER FRANTIŠEK NOVOTNY: GELÖSCHT // FACH K-42 // KOMPOSTIERUNG IN 48:00.“";
    } else if (time >= 52.0 && time < 60.0 && this._currentPhase === 7) {
      this._currentPhase = 8;
      if (speaker) speaker.innerText = "Amts-Logbuch (Auto-Journal)";
      if (sub)
        sub.innerText =
          "[Eintrag archiviert: Sektor 0 / Kältekammer Fach K-42] — Der Entschluss steht fest: Hinabsteigen.";
    } else if (time >= 60.0 && this._currentPhase === 8) {
      this._currentPhase = 9;
      this.startExplorationMode();
    }
  }
}

const app = new PrologueScene({
  rendererType: RendererType.BEST,
});

app.start().catch((err: unknown) => {
  console.error("[Prologue] Failed to start 3D scene:", err);
});
