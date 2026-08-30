import {
  AbstractShowcase,
  Color,
  Cube,
  CustomShaderMaterial,
  Cylinder,
  DirectionalLight,
  GltfLoader,
  Object3D,
  Plane,
  PointLight,
  ShaderPropertyType,
  Sphere,
  StandardMaterial,
  StandardWebGPULayout,
  Torus,
} from "../../../../index.js";
import { OrbitController } from "../../../../core/controllers/OrbitController.js";
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
} from "../../../../core/animation/index.js";

type CharacterType = "male" | "female" | "yoshi";
type GlitchLevel = "off" | "subtle" | "normal";

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

const MATRIX_GLITCH_WGSL = `[WGSL_STRUCTS]

fn hash12(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

@vertex fn vs(
    @location(0) pos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) tangent: vec3f,
    @location(4) joints: vec4f,
    @location(5) weights: vec4f
) -> Out {
    var o: Out;
    let worldPos = obj.model * vec4f(pos, 1.0);
    o.wp = worldPos.xyz;
    o.pos = view.vp * worldPos;
    o.uv = uv * obj.texRepeat + obj.texOffset;
    o.original_uv = uv;
    
    let m33 = mat3x3f(obj.model[0].xyz, obj.model[1].xyz, obj.model[2].xyz);
    o.n = normalize(m33 * normal);
    o.t = normalize(m33 * tangent);
    o.b = normalize(cross(o.n, o.t));
    o.texIndex = 0.0;
    return o;
}

@fragment fn fs(i: Out) -> @location(0) vec4f {
    let time = obj.time;
    let glitchIntensity = obj.extraParams.x;
    let uv = i.original_uv;
    let wp = i.wp;

    // 1. Procedural Brick & Tile Pattern
    let brickScale = vec2f(12.0, 24.0);
    var bUv = uv * brickScale;
    if (fract(bUv.y * 0.5) > 0.5) {
        bUv.x += 0.5;
    }
    let bGrid = fract(bUv);
    let mortar = step(0.04, bGrid.x) * step(0.06, bGrid.y);
    let bId = floor(bUv);
    let bNoise = hash12(bId);

    // Weathered Red Brick Base
    var baseColor = mix(vec3f(0.12, 0.14, 0.16), mix(vec3f(0.44, 0.22, 0.16), vec3f(0.32, 0.16, 0.11), bNoise), mortar);
    baseColor *= (0.80 + 0.20 * hash12(uv * 80.0));

    // Simple Directional & Ambient Shading
    let N = normalize(i.n);
    let L = normalize(vec3f(0.6, 1.0, 0.8));
    let diff = max(dot(N, L), 0.0);
    var finalCol = baseColor * (diff * 0.70 + 0.30);

    // 2. Controlled Outer-Edge Glitch Falloff
    let distFloor = max(max(wp.x - 1.2, wp.z - 1.2) / 1.1, 0.0);
    let distHeight = max((wp.y - 2.8) / 1.0, 0.0);
    let outerEdge = clamp(max(distFloor, distHeight), 0.0, 1.0);

    if (outerEdge > 0.05 && glitchIntensity > 0.01) {
        let f = outerEdge * glitchIntensity;
        
        let scanline = sin((wp.y + wp.x + wp.z) * 45.0 - time * 6.0) * 0.5 + 0.5;
        let cell = vec2f(floor((wp.x + wp.z) * 16.0), floor((wp.y + time * 0.4) * 16.0));
        let digitalSparkle = step(0.65, hash12(cell)) * scanline;
        
        let matrixGlow = vec3f(0.0, 0.9, 0.5) * digitalSparkle * 1.2;
        let cyanEdge = vec3f(0.0, 0.75, 1.0) * (sin(time * 3.0 + wp.y * 10.0) * 0.2 + 0.8);

        finalCol = mix(finalCol, mix(finalCol + matrixGlow, cyanEdge, 0.35), f * 0.75);

        if (outerEdge > 0.85) {
            let dither = hash12(vec2f(floor(wp.x * 30.0 + wp.z * 30.0), floor(wp.y * 30.0)));
            if (dither < (outerEdge - 0.85) / 0.15) {
                discard;
            }
        }
    }

    return vec4f(finalCol, 1.0);
}`;

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
  private _glitchLevel: GlitchLevel = "subtle";
  private _glitchMaterials: CustomShaderMaterial[] = [];

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
  private _lblGlitch!: HTMLElement;
  private _animButtons: HTMLButtonElement[] = [];

  // Corner Rat Animation
  private _ratHead: Object3D | undefined;
  private _ratTailSegments: Object3D[] = [];

  public override async setupScene(): Promise<void> {
    this.camera.position.set(3.8, 2.7, 4.2);

    this.camera.addBehavior(
      new OrbitController({
        input: this.input,
        lookSensitivity: 0.004,
        rotationSpeed: 1.5,
      }),
    );

    // 1. Studio & Stage Lighting
    const ambientLight = new DirectionalLight({ color: new Color(0.24, 0.26, 0.32) });
    ambientLight.intensity = 0.65;
    ambientLight.position.set(0, 6, 2);
    this.scene.add(ambientLight);

    const keySpot = new PointLight({ color: new Color(1.0, 0.92, 0.78) });
    keySpot.intensity = 2.8;
    keySpot.distance = 12.0;
    keySpot.position.set(2.2, 3.8, 2.6);
    this.scene.add(keySpot);

    const cyberRimLight = new PointLight({ color: new Color(0.0, 0.85, 1.0) });
    cyberRimLight.intensity = 1.8;
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
    this._buildCornerRat();

    // 3. Load Initial Character
    this._initHUD();
    await this._loadCharacter("male");
  }

  private _createGlitchMaterial(): CustomShaderMaterial {
    const mat = new CustomShaderMaterial({
      sources: {
        wgsl: MATRIX_GLITCH_WGSL,
      },
      layout: {
        ...StandardWebGPULayout,
        uniforms: {
          ...StandardWebGPULayout.uniforms,
          u_extraParams: { type: ShaderPropertyType.VEC4 },
        },
      },
      properties: {
        u_extraParams: new Float32Array([0.4, 0, 0, 0]),
      },
    });
    this._glitchMaterials.push(mat);
    return mat;
  }

  /**
   * 1. 3D Foundation Podest (Bodenplatte mit echter Dicke & Schichten)
   */
  private _buildFoundationPlatform(): void {
    const root = this._dioramaRoot!;
    const floorGlitchMat = this._createGlitchMaterial();
    const concreteMat = new StandardMaterial({
      color: new Color(0.24, 0.25, 0.28),
      roughness: 0.85,
    });
    const brickSubMat = new StandardMaterial({
      color: new Color(0.38, 0.18, 0.14),
      roughness: 0.9,
    });

    // Oberste begehbare Pflaster-Ebene
    const topFloor = new Object3D("TopFloorPavement");
    topFloor.geometry = new Plane({
      width: 4.2,
      height: 4.2,
      widthSegments: 24,
      heightSegments: 24,
    }).getGeometryData();
    topFloor.material = floorGlitchMat;
    topFloor.rotation.x = -Math.PI / 2;
    topFloor.position.set(0, 0, 0);
    root.add(topFloor);

    // Massiver Beton-/Schotter-Kern
    const slabCore = new Object3D("FoundationSlabCore");
    slabCore.geometry = new Cube({ size: 1.0 }).getGeometryData();
    slabCore.scale.set(4.2, 0.35, 4.2);
    slabCore.material = concreteMat;
    slabCore.position.set(0, -0.175, 0);
    root.add(slabCore);

    // Freiliegende Ziegelschichten an den vorderen Bruchkanten (+X und +Z Stirnseite)
    const stepsX = 6;
    for (let i = 0; i < stepsX; i++) {
      const stepBlock = new Object3D("FoundationBrickStepX_" + i);
      stepBlock.geometry = new Cube({ size: 1.0 }).getGeometryData();
      const w = 0.5 + (i % 2) * 0.15;
      const h = 0.12;
      const d = 0.25;
      stepBlock.scale.set(w, h, d);
      stepBlock.material = i % 2 === 0 ? brickSubMat : concreteMat;
      stepBlock.position.set(-1.8 + i * 0.65, -0.18 - (i % 3) * 0.04, 2.15);
      stepBlock.rotation.y = i % 2 === 0 ? 0.05 : -0.05;
      root.add(stepBlock);
    }

    const stepsZ = 6;
    for (let i = 0; i < stepsZ; i++) {
      const stepBlock = new Object3D("FoundationBrickStepZ_" + i);
      stepBlock.geometry = new Cube({ size: 1.0 }).getGeometryData();
      const w = 0.25;
      const h = 0.12;
      const d = 0.5 + (i % 2) * 0.15;
      stepBlock.scale.set(w, h, d);
      stepBlock.material = i % 2 === 0 ? brickSubMat : concreteMat;
      stepBlock.position.set(2.15, -0.18 - (i % 3) * 0.04, -1.8 + i * 0.65);
      stepBlock.rotation.y = i % 2 === 0 ? -0.05 : 0.05;
      root.add(stepBlock);
    }
  }

  /**
   * 2. Gewölbte Backstein-Mauern mit Ziegeldicke und stufigen Bogenkanten
   */
  private _buildVaultedWalls(): void {
    const root = this._dioramaRoot!;
    const wallGlitchMat1 = this._createGlitchMaterial();
    const wallGlitchMat2 = this._createGlitchMaterial();
    const brickMat = new StandardMaterial({ color: new Color(0.44, 0.2, 0.14), roughness: 0.85 });
    const plasterMat = new StandardMaterial({ color: new Color(0.3, 0.32, 0.35), roughness: 0.9 });

    // Linke Wand (Hauptfläche)
    const leftWall = new Object3D("LeftWall");
    leftWall.geometry = new Plane({
      width: 4.2,
      height: 3.6,
      widthSegments: 24,
      heightSegments: 20,
    }).getGeometryData();
    leftWall.material = wallGlitchMat1;
    leftWall.position.set(-2.1, 1.8, 0);
    leftWall.rotation.y = Math.PI / 2;
    root.add(leftWall);

    // Rückwand (Hauptfläche)
    const backWall = new Object3D("BackWall");
    backWall.geometry = new Plane({
      width: 4.2,
      height: 3.6,
      widthSegments: 24,
      heightSegments: 20,
    }).getGeometryData();
    backWall.material = wallGlitchMat2;
    backWall.position.set(0, 1.8, -2.1);
    root.add(backWall);

    // Wandstärke / Backing Casing (0.22m Ziegel-Tiefe hinter den Wänden)
    const leftCasing = new Object3D("LeftWallCasing");
    leftCasing.geometry = new Cube({ size: 1.0 }).getGeometryData();
    leftCasing.scale.set(0.22, 3.6, 4.2);
    leftCasing.material = brickMat;
    leftCasing.position.set(-2.21, 1.8, 0);
    root.add(leftCasing);

    const backCasing = new Object3D("BackWallCasing");
    backCasing.geometry = new Cube({ size: 1.0 }).getGeometryData();
    backCasing.scale.set(4.2, 3.6, 0.22);
    backCasing.material = brickMat;
    backCasing.position.set(0, 1.8, -2.21);
    root.add(backCasing);

    // Stufenförmig gewölbter oberer Mauerbogen (Left Wall Top Arch)
    const archSegments = 8;
    for (let s = 0; s < archSegments; s++) {
      const t = s / (archSegments - 1);
      const z = -2.1 + t * 4.2;
      // Bogen fällt von Y = 3.6m am Eck auf Y = 1.9m am Rand ab
      const archHeight = 3.6 - Math.pow(t, 1.8) * 1.7;

      const brickRow = new Object3D("ArchBrickLeft_" + s);
      brickRow.geometry = new Cube({ size: 1.0 }).getGeometryData();
      brickRow.scale.set(0.28, 0.16, 0.52);
      brickRow.material = s % 2 === 0 ? brickMat : plasterMat;
      brickRow.position.set(-2.14, archHeight, z);
      brickRow.rotation.x = t * 0.35; // Sanfte Bogenneigung
      root.add(brickRow);
    }

    // Stufenförmig gewölbter oberer Mauerbogen (Back Wall Top Arch)
    for (let s = 0; s < archSegments; s++) {
      const t = s / (archSegments - 1);
      const x = -2.1 + t * 4.2;
      const archHeight = 3.6 - Math.pow(t, 1.8) * 1.7;

      const brickRow = new Object3D("ArchBrickBack_" + s);
      brickRow.geometry = new Cube({ size: 1.0 }).getGeometryData();
      brickRow.scale.set(0.52, 0.16, 0.28);
      brickRow.material = s % 2 === 0 ? brickMat : plasterMat;
      brickRow.position.set(x, archHeight, -2.14);
      brickRow.rotation.z = -t * 0.35;
      root.add(brickRow);
    }
  }

  /**
   * 3. Herausgerissene Rohrstümpfe & lose herabhängende Kabelstränge
   */
  private _buildCutawayStubs(): void {
    const root = this._dioramaRoot!;
    const rustyPipeMat = new StandardMaterial({
      color: new Color(0.42, 0.28, 0.22),
      metallic: 0.7,
      roughness: 0.5,
    });
    const darkCableMat = new StandardMaterial({
      color: new Color(0.12, 0.14, 0.16),
      roughness: 0.7,
    });

    // 1. Rohrstümpfe am Boden-Querschnitt (vorne links)
    const floorPipe1 = new Object3D("FloorPipeStub1");
    floorPipe1.geometry = new Cylinder({
      radiusTop: 0.07,
      radiusBottom: 0.07,
      height: 0.55,
      radialSegments: 12,
    }).getGeometryData();
    floorPipe1.material = rustyPipeMat;
    floorPipe1.rotation.x = Math.PI / 2 + 0.1;
    floorPipe1.rotation.y = 0.15;
    floorPipe1.position.set(-0.6, -0.16, 2.25);
    root.add(floorPipe1);

    const floorPipe2 = new Object3D("FloorPipeStub2");
    floorPipe2.geometry = new Cylinder({
      radiusTop: 0.055,
      radiusBottom: 0.055,
      height: 0.45,
      radialSegments: 10,
    }).getGeometryData();
    floorPipe2.material = rustyPipeMat;
    floorPipe2.rotation.x = Math.PI / 2 + 0.15;
    floorPipe2.position.set(-0.35, -0.22, 2.22);
    root.add(floorPipe2);

    // 2. Rohrstumpf an der rechten Wand-Schnittfläche
    const wallPipeRight = new Object3D("WallPipeStubRight");
    wallPipeRight.geometry = new Cylinder({
      radiusTop: 0.065,
      radiusBottom: 0.065,
      height: 0.5,
      radialSegments: 12,
    }).getGeometryData();
    wallPipeRight.material = rustyPipeMat;
    wallPipeRight.rotation.z = Math.PI / 2 - 0.2;
    wallPipeRight.position.set(2.28, 2.2, -1.95);
    root.add(wallPipeRight);

    // 3. Rohrstumpf an der linken Wand-Schnittfläche
    const wallPipeLeft = new Object3D("WallPipeStubLeft");
    wallPipeLeft.geometry = new Cylinder({
      radiusTop: 0.06,
      radiusBottom: 0.06,
      height: 0.5,
      radialSegments: 12,
    }).getGeometryData();
    wallPipeLeft.material = rustyPipeMat;
    wallPipeLeft.rotation.x = Math.PI / 2 + 0.2;
    wallPipeLeft.position.set(-1.95, 2.2, 2.28);
    root.add(wallPipeLeft);

    // 4. Lose Kabelbündel / Drahtstränge an der rechten Schnittseite
    for (let c = 0; c < 3; c++) {
      const cable = new Object3D("DanglingCableRight_" + c);
      cable.geometry = new Cylinder({
        radiusTop: 0.007,
        radiusBottom: 0.005,
        height: 0.7 + c * 0.15,
        radialSegments: 6,
      }).getGeometryData();
      cable.material = darkCableMat;
      cable.rotation.z = -0.15 + c * 0.12;
      cable.rotation.x = 0.1 * c;
      cable.position.set(2.26 + c * 0.03, 1.6 - c * 0.1, -1.98);
      root.add(cable);
    }

    // 5. Lose Kabelbündel an der linken Schnittseite
    for (let c = 0; c < 3; c++) {
      const cable = new Object3D("DanglingCableLeft_" + c);
      cable.geometry = new Cylinder({
        radiusTop: 0.007,
        radiusBottom: 0.005,
        height: 0.7 + c * 0.15,
        radialSegments: 6,
      }).getGeometryData();
      cable.material = darkCableMat;
      cable.rotation.x = 0.15 - c * 0.12;
      cable.rotation.z = -0.1 * c;
      cable.position.set(-1.98, 1.6 - c * 0.1, 2.26 + c * 0.03);
      root.add(cable);
    }
  }

  private _buildIndustrialPipes(): void {
    const root = this._dioramaRoot!;
    const copperMat = new StandardMaterial({
      color: new Color(0.72, 0.45, 0.28),
      metallic: 0.85,
      roughness: 0.25,
    });
    const steelMat = new StandardMaterial({
      color: new Color(0.35, 0.38, 0.42),
      metallic: 0.9,
      roughness: 0.3,
    });
    const valveRedMat = new StandardMaterial({
      color: new Color(0.85, 0.15, 0.12),
      metallic: 0.3,
      roughness: 0.4,
    });

    // 1. Horizontales Rohr um die Ecke entlang beider Wände
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

    // Eck-Winkel-Verbindung (Corner Pipe Elbow)
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

    // Wandflansche
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

    // 2. Vertikales Fallrohr an der Rückwand
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

    // 1. Baulampe an der linken Wand (strahlt schräg nach vorne/rechts auf den Charakter)
    const lamp1 = this._createConstructionLamp(
      "Baulampe_LeftWall",
      new Color(1.0, 0.86, 0.62),
      3.4,
    );
    lamp1.position.set(-1.96, 2.4, -0.3);
    lamp1.rotation.y = Math.PI / 4;
    lamp1.rotation.x = 0.22;
    root.add(lamp1);

    // 2. Baulampe an der Rückwand (strahlt schräg nach vorne/links auf den Charakter)
    const lamp2 = this._createConstructionLamp("Baulampe_BackWall", new Color(1.0, 0.9, 0.68), 3.4);
    lamp2.position.set(0.85, 2.45, -1.96);
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
    light.distance = 9.5;
    light.position.set(0, 0, 0.22);
    lamp.add(light);

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

  private _buildCornerRat(): void {
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

    // Ratte 1: In der Ecke bei den Kisten
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

    // Ratte 2: Huscht entlang der rechten Wandkante
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
    this._lblGlitch = document.getElementById("lbl-glitch")!;

    document.getElementById("btn-char")?.addEventListener("click", () => this._cycleCharacter());
    document.getElementById("btn-torch")?.addEventListener("click", () => this._toggleTorch());
    document
      .getElementById("btn-turntable")
      ?.addEventListener("click", () => this._toggleTurntable());
    document.getElementById("btn-glitch")?.addEventListener("click", () => this._cycleGlitch());

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
      } else if (k === "G") this._cycleGlitch();
      else if (k === "1") this._playAnimation("idle_1");
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

  private _cycleGlitch(): void {
    if (this._glitchLevel === "subtle") this._glitchLevel = "normal";
    else if (this._glitchLevel === "normal") this._glitchLevel = "off";
    else this._glitchLevel = "subtle";

    const intensity =
      this._glitchLevel === "off" ? 0.0 : this._glitchLevel === "subtle" ? 0.4 : 0.9;
    for (const mat of this._glitchMaterials) {
      mat.properties["u_extraParams"] = new Float32Array([intensity, 0, 0, 0]);
    }
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
    if (this._lblGlitch) {
      this._lblGlitch.textContent =
        this._glitchLevel === "off"
          ? "AUS"
          : this._glitchLevel === "subtle"
            ? "Subtil (Dezent)"
            : "Matrix Normal";
      this._lblGlitch.style.color = this._glitchLevel === "off" ? "#8a99ad" : "#39ff14";
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
    for (const mat of this._glitchMaterials) {
      mat.properties["u_time"] = time;
    }

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
