import {
  AbstractShowcase,
  Color,
  Cube,
  Cylinder,
  DirectionalLight,
  GltfLoader,
  Object3D,
  Plane,
  PointLight,
  Sphere,
  StandardMaterial,
  Torus,
} from "../../../../index.js";
import { OrbitController } from "../../../../core/controllers/OrbitController.js";
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
} from "../../../../core/animation/index.js";

type CharacterType = "male" | "female" | "yoshi";

const ANIMATION_CLIPS: Record<string, string> = {
  idle_1: "/assets/and-now/mannequin/shared/anim/idle_1.glb",
  idle_2: "/assets/and-now/mannequin/shared/anim/idle_2.glb",
  idle_torch: "/assets/and-now/mannequin/shared/anim/idle_torch.glb",
  walk: "/assets/and-now/mannequin/shared/anim/walking.glb",
  walk_torch: "/assets/and-now/mannequin/shared/anim/walk_torch.glb",
  run_1: "/assets/and-now/mannequin/shared/anim/running_1.glb",
  run_2: "/assets/and-now/mannequin/shared/anim/running_2.glb",
  run_torch: "/assets/and-now/mannequin/shared/anim/running_torch.glb",
  stairs_up: "/assets/and-now/mannequin/shared/anim/ascending_stairs.glb",
  stairs_down: "/assets/and-now/mannequin/shared/anim/descending_stairs.glb",
};

function findNodeByName(root: Object3D, name: string): Object3D | undefined {
  if (root.name === name || root.name.includes(name)) return root;
  for (const child of root.children) {
    const found = findNodeByName(child, name);
    if (found) return found;
  }
  return undefined;
}

export class CharacterDioramaShowcase extends AbstractShowcase {
  private _dioramaRoot: Object3D | undefined;
  private _characterType: CharacterType = "male";
  private _player: Object3D | undefined;
  private _playerRig: Object3D | undefined;
  private _lanternGroup: Object3D | undefined;
  private _lanternHandBone: Object3D | undefined;
  private _lanternPointLight: PointLight | undefined;
  private _lanternOn: boolean = true;
  private _turntableActive: boolean = false;

  private _mixer: AnimationMixer | undefined;
  private _clips: Map<string, AnimationClip> = new Map();
  private _activeAnimation: string | undefined;
  private _fade:
    | { from?: AnimationAction | undefined; to: AnimationAction; elapsed: number; duration: number }
    | undefined;

  // HUD Elements
  private _lblChar!: HTMLElement;
  private _lblTorch!: HTMLElement;
  private _lblTurntable!: HTMLElement;
  private _animButtons: HTMLButtonElement[] = [];

  // Corner Rat Animation
  private _ratHead: Object3D | undefined;
  private _ratTailSegments: Object3D[] = [];

  // Lamp Flicker
  private _lampLight1: PointLight | undefined;
  private _lampLight2: PointLight | undefined;

  public override async setupScene(): Promise<void> {
    this.camera.position.set(3.8, 2.7, 4.2);

    this.camera.addBehavior(
      new OrbitController({
        input: this.input,
        lookSensitivity: 0.004,
        rotationSpeed: 1.5,
      }),
    );

    // 1. Studio & Environmental Lighting
    const ambientLight = new DirectionalLight({ color: new Color(0.26, 0.28, 0.35) });
    ambientLight.intensity = 0.7;
    ambientLight.position.set(1.0, 6.0, 2.0);
    this.scene.add(ambientLight);

    const keySpot = new PointLight({ color: new Color(1.0, 0.92, 0.78) });
    keySpot.intensity = 2.8;
    keySpot.distance = 12.0;
    keySpot.position.set(2.2, 3.8, 2.6);
    this.scene.add(keySpot);

    const cyberRimLight = new PointLight({ color: new Color(0.15, 0.65, 0.85) });
    cyberRimLight.intensity = 1.6;
    cyberRimLight.distance = 8.0;
    cyberRimLight.position.set(-2.5, 2.0, -2.5);
    this.scene.add(cyberRimLight);

    // 2. Build 3D Diorama Stage Geometry
    this._dioramaRoot = new Object3D("DioramaRoot");
    this.scene.add(this._dioramaRoot);

    this._buildFoundationPlatform();
    this._buildVaultedWalls();
    this._buildCutawayStubs();
    this._buildIndustrialPipes();
    this._buildConstructionLamps();
    this._buildStreetProps();
    this._buildCornerRats();

    // 3. Load Initial Character
    this._initHUD();
    await this._loadCharacter("male");
  }

  /**
   * 1. 3D Foundation Podest (Bodenplatte mit echter Dicke, Schichten & gebrochenen Stufen)
   */
  private _buildFoundationPlatform(): void {
    const root = this._dioramaRoot!;
    const floorPavementMat = new StandardMaterial({
      color: new Color(0.28, 0.26, 0.24),
      roughness: 0.85,
      metallic: 0.1,
    });
    const wetPuddleMat = new StandardMaterial({
      color: new Color(0.15, 0.16, 0.18),
      roughness: 0.15,
      metallic: 0.3,
    });
    const concreteMat = new StandardMaterial({
      color: new Color(0.25, 0.26, 0.28),
      roughness: 0.9,
    });
    const brickSubMat = new StandardMaterial({
      color: new Color(0.42, 0.18, 0.12),
      roughness: 0.85,
    });

    // Oberste Pflaster-Fläche
    const topFloor = new Object3D("TopFloorPavement");
    topFloor.geometry = new Cube({ size: 1.0 }).getGeometryData();
    topFloor.scale.set(4.2, 0.04, 4.2);
    topFloor.material = floorPavementMat;
    topFloor.position.set(0, -0.02, 0);
    root.add(topFloor);

    // Feuchte Glanz-Stellen / Pfützen-Reflexionen
    const puddle = new Object3D("WetPuddle");
    puddle.geometry = new Plane({ width: 2.2, height: 1.8 }).getGeometryData();
    puddle.material = wetPuddleMat;
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(-0.2, 0.002, 0.2);
    root.add(puddle);

    // Massiver Unterbau-Kern (0.35m dicke Fundamentschicht)
    const slabCore = new Object3D("FoundationSlabCore");
    slabCore.geometry = new Cube({ size: 1.0 }).getGeometryData();
    slabCore.scale.set(4.2, 0.35, 4.2);
    slabCore.material = concreteMat;
    slabCore.position.set(0, -0.215, 0);
    root.add(slabCore);

    // Gebrochene gestufte Ziegel- und Steinblöcke an den Schnittkanten (+X und +Z)
    for (let i = 0; i < 7; i++) {
      const stepBlockX = new Object3D("FoundationBrickStepX_" + i);
      stepBlockX.geometry = new Cube({ size: 1.0 }).getGeometryData();
      const w = 0.45 + (i % 3) * 0.15;
      const h = 0.14;
      const d = 0.28;
      stepBlockX.scale.set(w, h, d);
      stepBlockX.material = i % 2 === 0 ? brickSubMat : concreteMat;
      stepBlockX.position.set(-1.8 + i * 0.6, -0.18 - (i % 3) * 0.05, 2.16);
      stepBlockX.rotation.y = i % 2 === 0 ? 0.06 : -0.06;
      root.add(stepBlockX);

      const stepBlockZ = new Object3D("FoundationBrickStepZ_" + i);
      stepBlockZ.geometry = new Cube({ size: 1.0 }).getGeometryData();
      stepBlockZ.scale.set(d, h, w);
      stepBlockZ.material = i % 2 === 0 ? brickSubMat : concreteMat;
      stepBlockZ.position.set(2.16, -0.18 - (i % 3) * 0.05, -1.8 + i * 0.6);
      stepBlockZ.rotation.y = i % 2 === 0 ? -0.06 : 0.06;
      root.add(stepBlockZ);
    }
  }

  /**
   * 2. Gewölbte Backstein-Mauern (mit echter Ziegeldicke, Bogenverlauf & Fliesenverkleidung)
   */
  private _buildVaultedWalls(): void {
    const root = this._dioramaRoot!;
    const tileOffWhiteMat = new StandardMaterial({
      color: new Color(0.82, 0.8, 0.74),
      roughness: 0.35,
      metallic: 0.05,
    });
    const tileArtDecoBorderMat = new StandardMaterial({
      color: new Color(0.72, 0.65, 0.52),
      roughness: 0.45,
      metallic: 0.1,
    });
    const exposedBrickMat = new StandardMaterial({
      color: new Color(0.45, 0.18, 0.12),
      roughness: 0.85,
      metallic: 0.05,
    });
    const darkMortarMat = new StandardMaterial({
      color: new Color(0.28, 0.26, 0.25),
      roughness: 0.9,
    });

    // Beide Wände (LeftWall entlang X = -2.1, BackWall entlang Z = -2.1)
    // aus vertikalen Mauerwerkssäulen aufbauen, deren Höhe exakt dem Bogenverlauf folgt!
    const numColumns = 10;
    const colWidth = 4.2 / numColumns;
    const wallThickness = 0.24;

    for (let i = 0; i < numColumns; i++) {
      const t = i / (numColumns - 1); // 0 am Eck (-2.1), 1 am Außenrand (+2.1)
      // Bogenhöhe: von 3.6m am Eck harmonisch auf 1.85m am Außenrand
      const colHeight = 3.6 - Math.pow(t, 1.7) * 1.75;
      const posY = colHeight / 2;

      // --- Linke Wand Säule ---
      const posZ = -2.1 + (i + 0.5) * colWidth;
      const leftCol = new Object3D("LeftWallCol_" + i);
      leftCol.geometry = new Cube({ size: 1.0 }).getGeometryData();
      leftCol.scale.set(wallThickness, colHeight, colWidth);
      // Abwechselnd Fliesen vs. abgeplatzter Ziegel
      leftCol.material =
        i === 2 || i === 5 || i === 8
          ? exposedBrickMat
          : i === 1 || i === 6
            ? tileArtDecoBorderMat
            : tileOffWhiteMat;
      leftCol.position.set(-2.1 - wallThickness / 2, posY, posZ);
      root.add(leftCol);

      // Kopfbogen-Ziegel auf der Säule (Stirnseite / Ziegeldicke oben)
      const topCapLeft = new Object3D("TopCapLeft_" + i);
      topCapLeft.geometry = new Cube({ size: 1.0 }).getGeometryData();
      topCapLeft.scale.set(wallThickness + 0.04, 0.12, colWidth);
      topCapLeft.material = exposedBrickMat;
      topCapLeft.position.set(-2.1 - wallThickness / 2, colHeight + 0.06, posZ);
      topCapLeft.rotation.x = t * 0.35;
      root.add(topCapLeft);

      // --- Rückwand Säule ---
      const posX = -2.1 + (i + 0.5) * colWidth;
      const backCol = new Object3D("BackWallCol_" + i);
      backCol.geometry = new Cube({ size: 1.0 }).getGeometryData();
      backCol.scale.set(colWidth, colHeight, wallThickness);
      backCol.material =
        i === 3 || i === 6
          ? exposedBrickMat
          : i === 2 || i === 7
            ? tileArtDecoBorderMat
            : tileOffWhiteMat;
      backCol.position.set(posX, posY, -2.1 - wallThickness / 2);
      root.add(backCol);

      // Kopfbogen-Ziegel auf der Rückwand
      const topCapBack = new Object3D("TopCapBack_" + i);
      topCapBack.geometry = new Cube({ size: 1.0 }).getGeometryData();
      topCapBack.scale.set(colWidth, 0.12, wallThickness + 0.04);
      topCapBack.material = exposedBrickMat;
      topCapBack.position.set(posX, colHeight + 0.06, -2.1 - wallThickness / 2);
      topCapBack.rotation.z = -t * 0.35;
      root.add(topCapBack);
    }

    // Gestufte Ziegel-Zähne an den beiden äußeren Stirnseiten-Schnitten
    for (let b = 0; b < 8; b++) {
      const toothY = 0.2 + b * 0.22;

      const toothLeft = new Object3D("ToothLeft_" + b);
      toothLeft.geometry = new Cube({ size: 1.0 }).getGeometryData();
      toothLeft.scale.set(wallThickness + 0.02, 0.1, 0.22);
      toothLeft.material = b % 2 === 0 ? exposedBrickMat : darkMortarMat;
      toothLeft.position.set(-2.1 - wallThickness / 2, toothY, 2.12 + (b % 2) * 0.08);
      root.add(toothLeft);

      const toothRight = new Object3D("ToothRight_" + b);
      toothRight.geometry = new Cube({ size: 1.0 }).getGeometryData();
      toothRight.scale.set(0.22, 0.1, wallThickness + 0.02);
      toothRight.material = b % 2 === 0 ? exposedBrickMat : darkMortarMat;
      toothRight.position.set(2.12 + (b % 2) * 0.08, toothY, -2.1 - wallThickness / 2);
      root.add(toothRight);
    }
  }

  /**
   * 3. Herausgerissene Rohrstümpfe & lose herabhängende Kabelstränge
   */
  private _buildCutawayStubs(): void {
    const root = this._dioramaRoot!;
    const rustyPipeMat = new StandardMaterial({
      color: new Color(0.42, 0.28, 0.22),
      metallic: 0.75,
      roughness: 0.45,
    });
    const darkCableMat = new StandardMaterial({
      color: new Color(0.12, 0.14, 0.16),
      roughness: 0.7,
    });

    // 1. Rohrstümpfe am Fundament (vorne links unter dem Boden)
    const floorPipe1 = new Object3D("FloorPipeStub1");
    floorPipe1.geometry = new Cylinder({
      radiusTop: 0.075,
      radiusBottom: 0.075,
      height: 0.6,
      radialSegments: 12,
    }).getGeometryData();
    floorPipe1.material = rustyPipeMat;
    floorPipe1.rotation.x = Math.PI / 2 + 0.12;
    floorPipe1.rotation.y = 0.18;
    floorPipe1.position.set(-0.65, -0.18, 2.28);
    root.add(floorPipe1);

    const floorPipe2 = new Object3D("FloorPipeStub2");
    floorPipe2.geometry = new Cylinder({
      radiusTop: 0.055,
      radiusBottom: 0.055,
      height: 0.5,
      radialSegments: 10,
    }).getGeometryData();
    floorPipe2.material = rustyPipeMat;
    floorPipe2.rotation.x = Math.PI / 2 + 0.16;
    floorPipe2.position.set(-0.35, -0.24, 2.24);
    root.add(floorPipe2);

    // 2. Rohrstumpf an der rechten Wand-Schnittfläche
    const wallPipeRight = new Object3D("WallPipeStubRight");
    wallPipeRight.geometry = new Cylinder({
      radiusTop: 0.065,
      radiusBottom: 0.065,
      height: 0.55,
      radialSegments: 12,
    }).getGeometryData();
    wallPipeRight.material = rustyPipeMat;
    wallPipeRight.rotation.z = Math.PI / 2 - 0.22;
    wallPipeRight.position.set(2.32, 2.2, -2.05);
    root.add(wallPipeRight);

    // 3. Rohrstumpf an der linken Wand-Schnittfläche
    const wallPipeLeft = new Object3D("WallPipeStubLeft");
    wallPipeLeft.geometry = new Cylinder({
      radiusTop: 0.065,
      radiusBottom: 0.065,
      height: 0.55,
      radialSegments: 12,
    }).getGeometryData();
    wallPipeLeft.material = rustyPipeMat;
    wallPipeLeft.rotation.x = Math.PI / 2 + 0.22;
    wallPipeLeft.position.set(-2.05, 2.2, 2.32);
    root.add(wallPipeLeft);

    // 4. Lose Kabelbündel / Drahtstränge an der rechten Schnittseite
    for (let c = 0; c < 3; c++) {
      const cable = new Object3D("DanglingCableRight_" + c);
      cable.geometry = new Cylinder({
        radiusTop: 0.007,
        radiusBottom: 0.005,
        height: 0.75 + c * 0.18,
        radialSegments: 6,
      }).getGeometryData();
      cable.material = darkCableMat;
      cable.rotation.z = -0.18 + c * 0.14;
      cable.rotation.x = 0.12 * c;
      cable.position.set(2.28 + c * 0.04, 1.55 - c * 0.12, -2.1);
      root.add(cable);
    }

    // 5. Lose Kabelbündel an der linken Schnittseite
    for (let c = 0; c < 3; c++) {
      const cable = new Object3D("DanglingCableLeft_" + c);
      cable.geometry = new Cylinder({
        radiusTop: 0.007,
        radiusBottom: 0.005,
        height: 0.75 + c * 0.18,
        radialSegments: 6,
      }).getGeometryData();
      cable.material = darkCableMat;
      cable.rotation.x = 0.18 - c * 0.14;
      cable.rotation.z = -0.12 * c;
      cable.position.set(-2.1, 1.55 - c * 0.12, 2.28 + c * 0.04);
      root.add(cable);
    }
  }

  private _buildIndustrialPipes(): void {
    const root = this._dioramaRoot!;
    const copperMat = new StandardMaterial({
      color: new Color(0.72, 0.45, 0.28),
      metallic: 0.88,
      roughness: 0.22,
    });
    const steelMat = new StandardMaterial({
      color: new Color(0.35, 0.38, 0.42),
      metallic: 0.92,
      roughness: 0.28,
    });
    const valveRedMat = new StandardMaterial({
      color: new Color(0.85, 0.15, 0.12),
      metallic: 0.35,
      roughness: 0.4,
    });

    // Horizontales Rohr um die 90°-Ecke
    const hPipeBack = new Object3D("HorizontalPipeBack");
    hPipeBack.geometry = new Cylinder({
      radiusTop: 0.075,
      radiusBottom: 0.075,
      height: 4.1,
      radialSegments: 16,
    }).getGeometryData();
    hPipeBack.material = copperMat;
    hPipeBack.rotation.z = Math.PI / 2;
    hPipeBack.position.set(0.0, 2.2, -1.95);
    root.add(hPipeBack);

    const hPipeLeft = new Object3D("HorizontalPipeLeft");
    hPipeLeft.geometry = new Cylinder({
      radiusTop: 0.075,
      radiusBottom: 0.075,
      height: 4.1,
      radialSegments: 16,
    }).getGeometryData();
    hPipeLeft.material = copperMat;
    hPipeLeft.rotation.x = Math.PI / 2;
    hPipeLeft.position.set(-1.95, 2.2, 0.0);
    root.add(hPipeLeft);

    // Eck-Winkel (Elbow)
    const cornerElbow = new Object3D("CornerPipeElbow");
    cornerElbow.geometry = new Torus({
      radius: 0.12,
      tube: 0.075,
      radialSegments: 12,
      tubularSegments: 16,
    }).getGeometryData();
    cornerElbow.material = copperMat;
    cornerElbow.position.set(-1.95, 2.2, -1.95);
    root.add(cornerElbow);

    // Wandhalterungen & Flansche
    for (const pos of [
      [-1.1, 2.2, -1.95],
      [0.6, 2.2, -1.95],
      [-1.95, 2.2, -1.1],
      [-1.95, 2.2, 0.6],
    ]) {
      const flange = new Object3D("Flange");
      flange.geometry = new Cylinder({
        radiusTop: 0.1,
        radiusBottom: 0.1,
        height: 0.04,
        radialSegments: 14,
      }).getGeometryData();
      flange.material = steelMat;
      if (pos[0] === -1.95) {
        flange.rotation.x = Math.PI / 2;
      } else {
        flange.rotation.z = Math.PI / 2;
      }
      flange.position.set(pos[0]!, pos[1]!, pos[2]!);
      root.add(flange);
    }

    // Rotes Handrad-Ventil
    const valve = new Object3D("ValveWheel");
    valve.geometry = new Torus({
      radius: 0.11,
      tube: 0.018,
      radialSegments: 12,
      tubularSegments: 16,
    }).getGeometryData();
    valve.material = valveRedMat;
    valve.position.set(-0.2, 2.2, -1.82);
    root.add(valve);

    // Vertikales Fallrohr
    const vPipe = new Object3D("VerticalDrainPipe");
    vPipe.geometry = new Cylinder({
      radiusTop: 0.07,
      radiusBottom: 0.07,
      height: 3.2,
      radialSegments: 16,
    }).getGeometryData();
    vPipe.material = steelMat;
    vPipe.position.set(0.35, 1.6, -1.95);
    root.add(vPipe);
  }

  private _buildConstructionLamps(): void {
    const root = this._dioramaRoot!;

    // 1. Baulampe an der linken Wand
    const lamp1 = this._createConstructionLamp(
      "Baulampe_LeftWall",
      new Color(1.0, 0.86, 0.62),
      3.6,
    );
    lamp1.position.set(-1.94, 2.4, -0.3);
    lamp1.rotation.y = Math.PI / 4;
    lamp1.rotation.x = 0.22;
    root.add(lamp1);

    // 2. Baulampe an der Rückwand
    const lamp2 = this._createConstructionLamp("Baulampe_BackWall", new Color(1.0, 0.9, 0.68), 3.6);
    lamp2.position.set(0.85, 2.45, -1.94);
    lamp2.rotation.y = -Math.PI / 4;
    lamp2.rotation.x = 0.22;
    root.add(lamp2);
  }

  private _createConstructionLamp(
    name: string,
    lightColor: Color,
    lightIntensity: number,
  ): Object3D {
    const lamp = new Object3D(name);
    const yellowHousingMat = new StandardMaterial({
      color: new Color(0.95, 0.62, 0.04),
      roughness: 0.45,
      metallic: 0.1,
    });
    const darkMetalMat = new StandardMaterial({
      color: new Color(0.18, 0.2, 0.22),
      roughness: 0.35,
      metallic: 0.85,
    });
    const bulbGlowMat = new StandardMaterial({
      color: new Color(1.0, 0.96, 0.82),
      roughness: 0.1,
    });

    const bracket = new Object3D("WallBracket");
    bracket.geometry = new Cube({ size: 1.0 }).getGeometryData();
    bracket.scale.set(0.08, 0.16, 0.08);
    bracket.material = darkMetalMat;
    bracket.position.set(0, 0, -0.1);
    lamp.add(bracket);

    const arm = new Object3D("SupportArm");
    arm.geometry = new Cylinder({
      radiusTop: 0.016,
      radiusBottom: 0.016,
      height: 0.18,
      radialSegments: 8,
    }).getGeometryData();
    arm.material = darkMetalMat;
    arm.rotation.x = Math.PI / 2;
    arm.position.set(0, 0, -0.04);
    lamp.add(arm);

    const housing = new Object3D("LampHousing");
    housing.geometry = new Cube({ size: 1.0 }).getGeometryData();
    housing.scale.set(0.26, 0.22, 0.15);
    housing.material = yellowHousingMat;
    housing.position.set(0, 0, 0.05);
    lamp.add(housing);

    const handle = new Object3D("CageHandle");
    handle.geometry = new Torus({
      radius: 0.09,
      tube: 0.01,
      radialSegments: 8,
      tubularSegments: 16,
    }).getGeometryData();
    handle.material = darkMetalMat;
    handle.position.set(0, 0.12, 0.05);
    lamp.add(handle);

    const bulb = new Object3D("HalogenBulb");
    bulb.geometry = new Sphere({
      radius: 0.065,
      widthSegments: 12,
      heightSegments: 10,
    }).getGeometryData();
    bulb.scale.set(1.4, 1.1, 0.4);
    bulb.material = bulbGlowMat;
    bulb.position.set(0, 0, 0.13);
    lamp.add(bulb);

    const light = new PointLight({ color: lightColor });
    light.intensity = lightIntensity;
    light.distance = 10.0;
    light.position.set(0, 0, 0.22);
    lamp.add(light);

    if (name.includes("Left")) {
      this._lampLight1 = light;
    } else {
      this._lampLight2 = light;
    }

    const cable = new Object3D("PowerCable");
    cable.geometry = new Cylinder({
      radiusTop: 0.009,
      radiusBottom: 0.009,
      height: 2.0,
      radialSegments: 6,
    }).getGeometryData();
    cable.material = darkMetalMat;
    cable.position.set(0, -1.0, -0.08);
    lamp.add(cable);

    return lamp;
  }

  private _buildStreetProps(): void {
    const root = this._dioramaRoot!;
    const woodMat = new StandardMaterial({
      color: new Color(0.42, 0.28, 0.16),
      roughness: 0.8,
    });
    const metalMat = new StandardMaterial({
      color: new Color(0.22, 0.25, 0.28),
      metallic: 0.7,
      roughness: 0.4,
    });
    const sodaMat = new StandardMaterial({
      color: new Color(0.9, 0.1, 0.2),
      metallic: 0.85,
      roughness: 0.2,
    });

    const crate1 = new Object3D("Crate1");
    crate1.geometry = new Cube({ size: 1.0 }).getGeometryData();
    crate1.scale.set(0.55, 0.55, 0.55);
    crate1.material = woodMat;
    crate1.position.set(-1.45, 0.275, -1.45);
    crate1.rotation.y = 0.25;
    root.add(crate1);

    const crate2 = new Object3D("Crate2");
    crate2.geometry = new Cube({ size: 1.0 }).getGeometryData();
    crate2.scale.set(0.48, 0.48, 0.48);
    crate2.material = woodMat;
    crate2.position.set(-1.42, 0.79, -1.42);
    crate2.rotation.y = -0.15;
    root.add(crate2);

    const metalBarrel = new Object3D("MetalBarrel");
    metalBarrel.geometry = new Cylinder({
      radiusTop: 0.25,
      radiusBottom: 0.25,
      height: 0.75,
      radialSegments: 16,
    }).getGeometryData();
    metalBarrel.material = metalMat;
    metalBarrel.position.set(-1.45, 0.375, 0.6);
    root.add(metalBarrel);

    const can1 = new Object3D("SodaCan1");
    can1.geometry = new Cylinder({
      radiusTop: 0.035,
      radiusBottom: 0.035,
      height: 0.11,
      radialSegments: 12,
    }).getGeometryData();
    can1.material = sodaMat;
    can1.position.set(-0.8, 0.055, -0.9);
    can1.rotation.z = Math.PI / 2;
    can1.rotation.y = 0.4;
    root.add(can1);

    const can2 = new Object3D("SodaCan2");
    can2.geometry = new Cylinder({
      radiusTop: 0.035,
      radiusBottom: 0.035,
      height: 0.11,
      radialSegments: 12,
    }).getGeometryData();
    can2.material = metalMat;
    can2.position.set(-0.6, 0.055, -1.1);
    root.add(can2);

    const grate = new Object3D("DrainGrate");
    grate.geometry = new Cube({ size: 1.0 }).getGeometryData();
    grate.scale.set(0.4, 0.02, 0.4);
    grate.material = metalMat;
    grate.position.set(-1.0, 0.01, 1.2);
    root.add(grate);
  }

  private _buildCornerRats(): void {
    const root = this._dioramaRoot!;
    const ratMat = new StandardMaterial({
      color: new Color(0.25, 0.22, 0.2),
      roughness: 0.9,
    });
    const pinkMat = new StandardMaterial({
      color: new Color(0.85, 0.55, 0.55),
      roughness: 0.5,
    });
    const eyeMat = new StandardMaterial({ color: new Color(1.0, 0.1, 0.1) });

    // Ratte 1: In der Ecke
    const ratRoot1 = new Object3D("RatRoot1");
    ratRoot1.position.set(-1.6, 0.06, -0.85);
    ratRoot1.rotation.y = 1.1;
    root.add(ratRoot1);

    const body1 = new Object3D("RatBody1");
    body1.geometry = new Sphere({
      radius: 0.07,
      widthSegments: 12,
      heightSegments: 8,
    }).getGeometryData();
    body1.material = ratMat;
    body1.scale.set(1.0, 0.8, 1.6);
    ratRoot1.add(body1);

    const head1 = new Object3D("RatHead1");
    head1.geometry = new Sphere({
      radius: 0.045,
      widthSegments: 10,
      heightSegments: 8,
    }).getGeometryData();
    head1.material = ratMat;
    head1.scale.set(0.9, 0.9, 1.3);
    head1.position.set(0, 0.02, 0.1);
    ratRoot1.add(head1);
    this._ratHead = head1;

    const leftEye1 = new Object3D("RatEyeL1");
    leftEye1.geometry = new Sphere({
      radius: 0.008,
      widthSegments: 6,
      heightSegments: 6,
    }).getGeometryData();
    leftEye1.material = eyeMat;
    leftEye1.position.set(-0.025, 0.025, 0.12);
    ratRoot1.add(leftEye1);

    const rightEye1 = new Object3D("RatEyeR1");
    rightEye1.geometry = new Sphere({
      radius: 0.008,
      widthSegments: 6,
      heightSegments: 6,
    }).getGeometryData();
    rightEye1.material = eyeMat;
    rightEye1.position.set(0.025, 0.025, 0.12);
    ratRoot1.add(rightEye1);

    this._ratTailSegments = [];
    let segZ = -0.1;
    for (let s = 0; s < 4; s++) {
      const seg = new Object3D("RatTail_" + s);
      seg.geometry = new Cylinder({
        radiusTop: 0.012 - s * 0.002,
        radiusBottom: 0.01 - s * 0.002,
        height: 0.06,
        radialSegments: 8,
      }).getGeometryData();
      seg.material = pinkMat;
      seg.rotation.x = Math.PI / 2;
      seg.position.set(0, -0.01, segZ);
      ratRoot1.add(seg);
      this._ratTailSegments.push(seg);
      segZ -= 0.055;
    }

    // Ratte 2: Huscht an der rechten Wandkante
    const ratRoot2 = new Object3D("RatRoot2");
    ratRoot2.position.set(1.4, 0.06, -1.95);
    ratRoot2.rotation.y = Math.PI / 2;
    root.add(ratRoot2);

    const body2 = new Object3D("RatBody2");
    body2.geometry = new Sphere({
      radius: 0.065,
      widthSegments: 12,
      heightSegments: 8,
    }).getGeometryData();
    body2.material = ratMat;
    body2.scale.set(1.0, 0.8, 1.5);
    ratRoot2.add(body2);

    const head2 = new Object3D("RatHead2");
    head2.geometry = new Sphere({
      radius: 0.04,
      widthSegments: 10,
      heightSegments: 8,
    }).getGeometryData();
    head2.material = ratMat;
    head2.scale.set(0.9, 0.9, 1.3);
    head2.position.set(0, 0.02, 0.09);
    ratRoot2.add(head2);
  }

  private async _loadCharacter(charType: CharacterType): Promise<void> {
    this._characterType = charType;

    if (this._player && this._playerRig) {
      this._playerRig.remove(this._player);
    }
    if (!this._playerRig) {
      this._playerRig = new Object3D("CharacterRig");
      this._dioramaRoot!.add(this._playerRig);
    }

    try {
      const gltfLoader = new GltfLoader();
      let charUrl = "/assets/and-now/mannequin/player-male/character.glb";
      let charScale = 1.7;

      if (charType === "female") {
        charUrl = "/assets/and-now/mannequin/player-female/character.glb";
        charScale = 1.7;
      } else if (charType === "yoshi") {
        charUrl = "/assets/and-now/mannequin/yoshi/character.glb";
        charScale = 1.35;
      }

      this._player = await gltfLoader.load(charUrl);
      this._player.scale.set(charScale, charScale, charScale);
      this._playerRig.add(this._player);

      this._playerRig.position.set(0.1, 0, 0.1);
      this._playerRig.rotation.y = -0.5;

      this._clips.clear();
      for (const [name, url] of Object.entries(ANIMATION_CLIPS)) {
        try {
          const animRoot = await gltfLoader.load(url);
          if (animRoot.animations && animRoot.animations.length > 0) {
            const clip = animRoot.animations[0]!;
            clip.tracks = clip.tracks.filter((track) => {
              const isHipsTranslation =
                track.targetName.includes("Hips") && track.property === "translation";
              return !isHipsTranslation;
            });
            this._clips.set(name, clip);
          }
        } catch {
          // Ignore missing clip gracefully
        }
      }

      const handBone = findNodeByName(this._player, "LeftHand");
      this._lanternHandBone = handBone;
      if (handBone) {
        if (!this._lanternGroup) {
          this._lanternGroup = this._buildLanternMesh();
          this._lanternPointLight = new PointLight({
            color: new Color(1.0, 0.8, 0.4),
          });
          this._lanternPointLight.intensity = 1.8;
          this._lanternPointLight.distance = 4.5;
          this._lanternPointLight.position.set(0, -0.16, 0);
          this._lanternGroup.add(this._lanternPointLight);
          this._dioramaRoot!.add(this._lanternGroup);
        }
        this._lanternGroup.isVisible = this._lanternOn;
        if (this._lanternPointLight) {
          this._lanternPointLight.isVisible = this._lanternOn;
        }
      }

      if (this._clips.size > 0) {
        this._mixer = new AnimationMixer(this._player);
        this._activeAnimation = undefined;
        this._playAnimation(this._lanternOn ? "idle_torch" : "idle_1", 0);
      }

      this._updateHUDLabels();
    } catch (err) {
      console.error("[CharacterDiorama] Failed to load character:", err);
    }
  }

  private _buildLanternMesh(): Object3D {
    const lantern = new Object3D("StormLantern");
    const brassMat = new StandardMaterial({
      color: new Color(0.75, 0.55, 0.2),
      metallic: 0.8,
      roughness: 0.3,
    });
    const glowGlassMat = new StandardMaterial({
      color: new Color(1.0, 0.9, 0.6),
    });

    const handle = new Object3D("LanternHandle");
    handle.geometry = new Torus({
      radius: 0.06,
      tube: 0.008,
      radialSegments: 8,
    }).getGeometryData();
    handle.material = brassMat;
    lantern.add(handle);

    const body = new Object3D("LanternBody");
    body.geometry = new Cylinder({
      radiusTop: 0.05,
      radiusBottom: 0.07,
      height: 0.18,
      radialSegments: 12,
    }).getGeometryData();
    body.material = glowGlassMat;
    body.position.set(0, -0.16, 0);
    lantern.add(body);

    return lantern;
  }

  private _syncLanternTransform(): void {
    const bone = this._lanternHandBone;
    const lantern = this._lanternGroup;
    if (!bone || !lantern) return;

    const m = bone.worldMatrix.data;
    lantern.position.set(m[12]!, m[13]! + 0.05, m[14]!);
  }

  private _playAnimation(name: string, fadeSeconds: number = 0.35): void {
    if (!this._mixer || name === this._activeAnimation) return;
    const clip = this._clips.get(name);
    if (!clip) return;

    if (this._fade?.from) this._fade.from.stop();

    const fromAction = this._activeAnimation
      ? this._mixer.clipAction(this._clips.get(this._activeAnimation)!)
      : undefined;
    const toAction = this._mixer.clipAction(clip);
    toAction.setLoop(true);
    toAction.weight = 0;
    toAction.reset();
    toAction.play();

    this._fade = {
      from: fromAction,
      to: toAction,
      elapsed: 0,
      duration: Math.max(0, fadeSeconds),
    };
    this._activeAnimation = name;
    this._updateActiveButtonUI(name);
  }

  private _updateAnimationFade(deltaTime: number): void {
    const fade = this._fade;
    if (!fade) return;

    if (fade.duration <= 0) {
      fade.to.weight = 1;
      if (fade.from) fade.from.stop();
      this._fade = undefined;
      return;
    }

    fade.elapsed += deltaTime;
    const t = Math.min(1, fade.elapsed / fade.duration);
    fade.to.weight = t;
    if (fade.from) fade.from.weight = 1 - t;

    if (t >= 1) {
      if (fade.from) fade.from.stop();
      this._fade = undefined;
    }
  }

  private _initHUD(): void {
    this._lblChar = document.getElementById("lbl-char")!;
    this._lblTorch = document.getElementById("lbl-torch")!;
    this._lblTurntable = document.getElementById("lbl-turntable")!;

    document.getElementById("btn-char")?.addEventListener("click", () => this._cycleCharacter());
    document.getElementById("btn-torch")?.addEventListener("click", () => this._toggleTorch());
    document
      .getElementById("btn-turntable")
      ?.addEventListener("click", () => this._toggleTurntable());

    const animContainer = document.getElementById("anim-buttons");
    if (animContainer) {
      this._animButtons = Array.from(
        animContainer.querySelectorAll<HTMLButtonElement>("button[data-anim]"),
      );
      this._animButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const anim = btn.getAttribute("data-anim");
          if (anim) this._playAnimation(anim);
        });
      });
    }

    window.addEventListener("keydown", (e) => {
      const k = e.key.toUpperCase();
      if (k === "C") this._cycleCharacter();
      else if (k === "L") this._toggleTorch();
      else if (k === " ") {
        e.preventDefault();
        this._toggleTurntable();
      } else if (k === "1") this._playAnimation("idle_1");
      else if (k === "2") this._playAnimation("idle_2");
      else if (k === "3") this._playAnimation("idle_torch");
      else if (k === "4") this._playAnimation("walk");
      else if (k === "5") this._playAnimation("walk_torch");
      else if (k === "6") this._playAnimation("run_1");
      else if (k === "7") this._playAnimation("run_2");
      else if (k === "8") this._playAnimation("run_torch");
      else if (k === "9") this._playAnimation("stairs_up");
      else if (k === "0") this._playAnimation("stairs_down");
    });
  }

  private _cycleCharacter(): void {
    if (this._characterType === "male") this._loadCharacter("female");
    else if (this._characterType === "female") this._loadCharacter("yoshi");
    else this._loadCharacter("male");
  }

  private _toggleTorch(): void {
    this._lanternOn = !this._lanternOn;
    if (this._lanternGroup) this._lanternGroup.isVisible = this._lanternOn;
    if (this._lanternPointLight) this._lanternPointLight.isVisible = this._lanternOn;

    if (this._activeAnimation === "idle_1" || this._activeAnimation === "idle_2") {
      if (this._lanternOn) this._playAnimation("idle_torch");
    } else if (this._activeAnimation === "idle_torch") {
      if (!this._lanternOn) this._playAnimation("idle_1");
    } else if (this._activeAnimation === "walk" && this._lanternOn) {
      this._playAnimation("walk_torch");
    } else if (this._activeAnimation === "walk_torch" && !this._lanternOn) {
      this._playAnimation("walk");
    } else if (
      (this._activeAnimation === "run_1" || this._activeAnimation === "run_2") &&
      this._lanternOn
    ) {
      this._playAnimation("run_torch");
    } else if (this._activeAnimation === "run_torch" && !this._lanternOn) {
      this._playAnimation("run_1");
    }

    this._updateHUDLabels();
  }

  private _toggleTurntable(): void {
    this._turntableActive = !this._turntableActive;
    this._updateHUDLabels();
  }

  private _updateHUDLabels(): void {
    if (this._lblChar) {
      this._lblChar.textContent =
        this._characterType === "male"
          ? "Spieler (Männlich)"
          : this._characterType === "female"
            ? "Spielerin (Weiblich)"
            : "🦖 Yoshi";
    }
    if (this._lblTorch) {
      this._lblTorch.textContent = this._lanternOn ? "AN" : "AUS";
      this._lblTorch.style.color = this._lanternOn ? "#ffb84d" : "#8a99ad";
    }
    if (this._lblTurntable) {
      this._lblTurntable.textContent = this._turntableActive ? "AN" : "AUS";
      this._lblTurntable.style.color = this._turntableActive ? "#00f0ff" : "#8a99ad";
    }
  }

  private _updateActiveButtonUI(activeAnim: string): void {
    this._animButtons.forEach((btn) => {
      if (btn.getAttribute("data-anim") === activeAnim) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  public override update(deltaTime: number): void {
    super.update(deltaTime);

    if (this._turntableActive && this._dioramaRoot) {
      this._dioramaRoot.rotation.y += deltaTime * 0.35;
    }

    this._updateAnimationFade(deltaTime);
    if (this._mixer) {
      this._mixer.update(deltaTime);
    }

    this._syncLanternTransform();

    const time = performance.now() * 0.001;

    // Sanftes Halogen-Flackern der Baulampen
    if (this._lampLight1) {
      const flicker1 = Math.sin(time * 12.0) * 0.12 + Math.cos(time * 23.0) * 0.08;
      this._lampLight1.intensity = 3.6 + flicker1;
    }
    if (this._lampLight2) {
      const flicker2 = Math.sin(time * 15.0 + 1.2) * 0.12 + Math.cos(time * 19.0) * 0.08;
      this._lampLight2.intensity = 3.6 + flicker2;
    }

    // Ratten-Animation
    if (this._ratHead) {
      this._ratHead.position.y = 0.02 + Math.sin(time * 9.0) * 0.006;
      this._ratHead.rotation.x = Math.sin(time * 6.0) * 0.1;
    }
    for (let s = 0; s < this._ratTailSegments.length; s++) {
      const seg = this._ratTailSegments[s]!;
      seg.rotation.y = Math.sin(time * 3.5 + s * 0.7) * 0.25;
    }
  }
}

const app = new CharacterDioramaShowcase();
app.start().catch((err) => console.error("[CharacterDiorama] Startup failed:", err));
