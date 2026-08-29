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
type GlitchLevel = "off" | "normal" | "overdrive";

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
    var localPos = pos;
    let time = glob.time;
    let glitchIntensity = obj.extraParams.x;

    let edgeDist = max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0;
    if (edgeDist > 0.70 && glitchIntensity > 0.05) {
        let factor = (edgeDist - 0.70) / 0.30;
        let noise = sin(pos.y * 35.0 + time * 18.0) * cos(pos.x * 25.0 - time * 12.0);
        let jitter = step(0.65, hash12(vec2f(floor(pos.y * 20.0), floor(time * 24.0)))) * 0.12 * factor * glitchIntensity;
        localPos += normal * (noise * 0.04 * factor * glitchIntensity + jitter);
        localPos.x += (hash12(vec2f(pos.y, time)) - 0.5) * 0.08 * factor * glitchIntensity;
    }

    let worldPos = (obj.model * vec4f(localPos, 1.0)).xyz;
    o.worldPos = worldPos;
    o.clipPos = glob.viewProj * vec4f(worldPos, 1.0);
    o.normal = (obj.model * vec4f(normal, 0.0)).xyz;
    o.tangent = (obj.model * vec4f(tangent, 0.0)).xyz;
    o.uv = uv;
    o.color = obj.color.rgb;
    o.texIndex = 0.0;
    return o;
}

@fragment fn fs(i: Out) -> @location(0) vec4f {
    let time = glob.time;
    let glitchIntensity = obj.extraParams.x;
    let uv = i.uv;

    let brickScale = vec2f(14.0, 28.0);
    var bUv = uv * brickScale;
    if (fract(bUv.y * 0.5) > 0.5) {
        bUv.x += 0.5;
    }
    let bGrid = fract(bUv);
    let mortar = step(0.06, bGrid.x) * step(0.08, bGrid.y);
    let bId = floor(bUv);
    let bNoise = hash12(bId);

    var baseColor = mix(vec3f(0.18, 0.20, 0.24), mix(vec3f(0.45, 0.22, 0.16), vec3f(0.35, 0.18, 0.12), bNoise), mortar);
    baseColor *= (0.75 + 0.25 * hash12(uv * 120.0));

    let N = normalize(i.normal);
    let L = normalize(vec3f(0.6, 1.0, 0.8));
    let diff = max(dot(N, L), 0.0);
    var finalCol = baseColor * (diff * 0.75 + 0.25);

    let edgeDist = max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0;
    if (edgeDist > 0.65) {
        let factor = clamp((edgeDist - 0.65) / 0.35, 0.0, 1.0);
        let scanline = sin(uv.y * 220.0 - time * 25.0) * 0.5 + 0.5;
        let matrixCell = vec2f(floor(uv.x * 40.0), floor((uv.y + time * 0.8) * 40.0));
        let matrixChar = step(0.4, hash12(matrixCell));
        let matrixGreen = vec3f(0.05, 1.0, 0.4) * matrixChar * scanline * 2.0;
        let cyanGlitch = vec3f(0.0, 0.9, 1.0);
        let magentaGlitch = vec3f(1.0, 0.0, 0.6);

        let shift = hash12(vec2f(floor(uv.y * 30.0), floor(time * 15.0)));
        var glitchColor = matrixGreen;
        if (shift > 0.7) {
            glitchColor = mix(cyanGlitch, magentaGlitch, step(0.85, shift)) * 2.5;
        }

        let gridLines = step(0.92, fract(uv.x * 20.0)) + step(0.92, fract(uv.y * 20.0));
        glitchColor += cyanGlitch * gridLines * 1.5;

        finalCol = mix(finalCol, glitchColor, factor * 0.85 * glitchIntensity);
        
        let dissolveNoise = hash12(vec2f(floor(uv.x * 60.0), floor(uv.y * 60.0)) + floor(time * 12.0));
        if (edgeDist > 0.92 && dissolveNoise < (factor - 0.7) * 3.0) {
            discard;
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
  private _glitchLevel: GlitchLevel = "normal";
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
    this.camera.position.set(3.6, 2.6, 4.0);

    this.camera.addBehavior(
      new OrbitController({
        input: this.input,
        lookSensitivity: 0.004,
        rotationSpeed: 1.5,
      }),
    );

    // 1. Lighting Setup
    const ambientLight = new DirectionalLight({ color: new Color(0.12, 0.15, 0.22) });
    ambientLight.intensity = 0.4;
    ambientLight.position.set(-2, 5, -2);
    this.scene.add(ambientLight);

    const keySpot = new PointLight({ color: new Color(1.0, 0.88, 0.65) });
    keySpot.intensity = 2.2;
    keySpot.distance = 10.0;
    keySpot.position.set(1.8, 3.5, 2.2);
    this.scene.add(keySpot);

    const cyberRimLight = new PointLight({ color: new Color(0.0, 0.95, 1.0) });
    cyberRimLight.intensity = 2.5;
    cyberRimLight.distance = 8.0;
    cyberRimLight.position.set(-2.5, 2.0, -2.5);
    this.scene.add(cyberRimLight);

    // 2. Build Diorama Platform & Walls
    this._dioramaRoot = new Object3D("DioramaRoot");
    this.scene.add(this._dioramaRoot);

    this._buildDioramaCorner();
    this._buildIndustrialPipes();
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
        u_extraParams: new Float32Array([1.0, 0, 0, 0]),
      },
    });
    this._glitchMaterials.push(mat);
    return mat;
  }

  private _buildDioramaCorner(): void {
    const root = this._dioramaRoot!;

    const floorMat = this._createGlitchMaterial();
    const wallMat1 = this._createGlitchMaterial();
    const wallMat2 = this._createGlitchMaterial();

    const floor = new Object3D("DioramaFloor");
    floor.geometry = new Plane({
      width: 4.2,
      height: 4.2,
      widthSegments: 24,
      heightSegments: 24,
    }).getGeometryData();
    floor.material = floorMat;
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    root.add(floor);

    const leftWall = new Object3D("LeftWall");
    leftWall.geometry = new Plane({
      width: 4.2,
      height: 3.6,
      widthSegments: 24,
      heightSegments: 20,
    }).getGeometryData();
    leftWall.material = wallMat1;
    leftWall.position.set(-2.1, 1.8, 0);
    leftWall.rotation.y = Math.PI / 2;
    root.add(leftWall);

    const backWall = new Object3D("BackWall");
    backWall.geometry = new Plane({
      width: 4.2,
      height: 3.6,
      widthSegments: 24,
      heightSegments: 20,
    }).getGeometryData();
    backWall.material = wallMat2;
    backWall.position.set(0, 1.8, -2.1);
    root.add(backWall);
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

    const hPipe = new Object3D("HorizontalSteamPipe");
    hPipe.geometry = new Cylinder({
      radiusTop: 0.08,
      radiusBottom: 0.08,
      height: 3.8,
      radialSegments: 16,
    }).getGeometryData();
    hPipe.material = copperMat;
    hPipe.rotation.z = Math.PI / 2;
    hPipe.position.set(0.1, 2.2, -1.95);
    root.add(hPipe);

    for (const x of [-1.2, 0.0, 1.2]) {
      const flange = new Object3D("Flange");
      flange.geometry = new Cylinder({
        radiusTop: 0.11,
        radiusBottom: 0.11,
        height: 0.05,
        radialSegments: 16,
      }).getGeometryData();
      flange.material = steelMat;
      flange.rotation.z = Math.PI / 2;
      flange.position.set(x, 2.2, -1.95);
      root.add(flange);
    }

    const valve = new Object3D("ValveWheel");
    valve.geometry = new Torus({
      radius: 0.12,
      tube: 0.02,
      radialSegments: 12,
      tubularSegments: 16,
    }).getGeometryData();
    valve.material = valveRedMat;
    valve.position.set(0.0, 2.2, -1.82);
    root.add(valve);

    const vPipe = new Object3D("VerticalDrainPipe");
    vPipe.geometry = new Cylinder({
      radiusTop: 0.07,
      radiusBottom: 0.07,
      height: 3.2,
      radialSegments: 16,
    }).getGeometryData();
    vPipe.material = steelMat;
    vPipe.position.set(-1.95, 1.6, -1.2);
    root.add(vPipe);

    const elbow = new Object3D("PipeElbow");
    elbow.geometry = new Torus({
      radius: 0.09,
      tube: 0.07,
      radialSegments: 12,
      tubularSegments: 16,
    }).getGeometryData();
    elbow.material = steelMat;
    elbow.position.set(-1.95, 0.09, -1.2);
    elbow.rotation.z = Math.PI / 2;
    root.add(elbow);
  }

  private _buildStreetProps(): void {
    const root = this._dioramaRoot!;
    const woodMat = new StandardMaterial({ color: new Color(0.42, 0.28, 0.16), roughness: 0.8 });
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
    const ratMat = new StandardMaterial({ color: new Color(0.25, 0.22, 0.2), roughness: 0.9 });
    const pinkMat = new StandardMaterial({ color: new Color(0.85, 0.55, 0.55), roughness: 0.5 });
    const eyeMat = new StandardMaterial({ color: new Color(1.0, 0.1, 0.1) });

    const ratRoot = new Object3D("RatRoot");
    ratRoot.position.set(-1.6, 0.06, -0.85);
    ratRoot.rotation.y = 1.1;
    root.add(ratRoot);

    const body = new Object3D("RatBody");
    body.geometry = new Sphere({
      radius: 0.07,
      widthSegments: 12,
      heightSegments: 8,
    }).getGeometryData();
    body.material = ratMat;
    body.scale.set(1.0, 0.8, 1.6);
    ratRoot.add(body);

    const head = new Object3D("RatHead");
    head.geometry = new Sphere({
      radius: 0.045,
      widthSegments: 10,
      heightSegments: 8,
    }).getGeometryData();
    head.material = ratMat;
    head.scale.set(0.9, 0.9, 1.3);
    head.position.set(0, 0.02, 0.1);
    ratRoot.add(head);
    this._ratHead = head;

    const leftEye = new Object3D("RatEyeL");
    leftEye.geometry = new Sphere({
      radius: 0.008,
      widthSegments: 6,
      heightSegments: 6,
    }).getGeometryData();
    leftEye.material = eyeMat;
    leftEye.position.set(-0.025, 0.025, 0.12);
    ratRoot.add(leftEye);

    const rightEye = new Object3D("RatEyeR");
    rightEye.geometry = new Sphere({
      radius: 0.008,
      widthSegments: 6,
      heightSegments: 6,
    }).getGeometryData();
    rightEye.material = eyeMat;
    rightEye.position.set(0.025, 0.025, 0.12);
    ratRoot.add(rightEye);

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
      ratRoot.add(seg);
      this._ratTailSegments.push(seg);
      segZ -= 0.055;
    }
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
          this._lanternPointLight = new PointLight({ color: new Color(1.0, 0.8, 0.4) });
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
    const glowGlassMat = new StandardMaterial({ color: new Color(1.0, 0.9, 0.6) });

    const handle = new Object3D("LanternHandle");
    handle.geometry = new Torus({ radius: 0.06, tube: 0.008, radialSegments: 8 }).getGeometryData();
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
    if (this._glitchLevel === "normal") this._glitchLevel = "overdrive";
    else if (this._glitchLevel === "overdrive") this._glitchLevel = "off";
    else this._glitchLevel = "normal";

    const intensity =
      this._glitchLevel === "off" ? 0.0 : this._glitchLevel === "overdrive" ? 2.5 : 1.0;
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
          : this._glitchLevel === "normal"
            ? "Matrix Normal"
            : "⚡ Cyberpunk Overdrive";
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
