import {
  AbstractShowcase,
  AmbientLight,
  CameraStrategyType,
  Color,
  Cube,
  Cylinder,
  DirectionalLight,
  EngineOptions,
  Object3D,
  OrbitController,
  PerspectiveProjection,
  PostProcessingEffectType,
  PointLight,
  ProjectionType,
  RendererType,
  SpotLight,
  StandardMaterial,
  Torus,
  Texture,
  CubeTexture,
  SkyboxMaterial,
  BloomElement,
  HbaoElement,
  VignetteElement,
} from "../../src/index.js";

/**
 * Showcase 30: "The Rain-Drenched Cyberpunk Albedo: Screen-Space Reflections & Neon Wetness"
 *
 * Benchmark testing planar & screen-space reflection response, roughness gradient
 * on water puddles, contrasting teal/magenta specular highlights, and HDR neon bloom.
 */
class Showcase30 extends AbstractShowcase {
  private _neonSignMagenta!: Object3D;
  private _neonSignCyan!: Object3D;
  private _spotTeal!: SpotLight;
  private _spotPink!: SpotLight;
  private _puddlePlates: Object3D[] = [];
  private _hoverCar!: Object3D;
  private _time = 0;

  constructor(options: EngineOptions = {}) {
    super({
      canvasId: "SmallWorld",
      rendererType: RendererType.BEST,
      fullscreen: true,
      enableInspector: true,
      ...options,
    });
  }

  protected override async setupScene(): Promise<void> {
    // Post-Processing: Vivid Cyberpunk Neon Glow + Cinematographic Vignette & HBAO
    this.renderer.postProcessing.enabled = true;
    const bloom = this.renderer.postProcessing.get<BloomElement>(PostProcessingEffectType.BLOOM);
    if (bloom) {
      bloom.enabled = true;
      bloom.intensity = 1.6;
      bloom.threshold = 0.7;
    }

    const hbao = this.renderer.postProcessing.get<HbaoElement>(PostProcessingEffectType.HBAO);
    if (hbao) {
      hbao.enabled = true;
      hbao.radius = 0.8;
      hbao.intensity = 1.4;
    }

    const vig = this.renderer.postProcessing.get<VignetteElement>(
      PostProcessingEffectType.VIGNETTE,
    );
    if (vig) {
      vig.enabled = true;
      vig.darkness = 0.65;
      vig.offset = 0.9;
    }

    // Camera setup (Low-angle rain street camera)
    if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
      const aspect = window.innerWidth / window.innerHeight;
      this.camera.projection = new PerspectiveProjection({
        fov: (48 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 150,
      });
      this.camera.updateProjectionMatrix();
    }
    this.camera.setStrategy(CameraStrategyType.HYBRID_SYNC);
    this.camera.position.set(0, 1.8, 8.5);
    this.camera.target.set(0, 1.5, 0);
    this.camera.addBehavior(new OrbitController({ input: this.input, audio: this.audio }));

    // 1. Dark Rainy Night Ambient
    const ambientLight = new AmbientLight({
      color: new Color(0.02, 0.04, 0.08),
      intensity: 0.5,
    });
    this.scene.add(ambientLight);

    // 2. Far Street Rim Light (Moonlight through rain haze)
    const moonLight = new DirectionalLight({
      color: new Color(0.2, 0.45, 0.7),
      intensity: 0.8,
    });
    moonLight.position.set(5, 15, -10);
    moonLight.direction.set(-0.3, -1.0, 0.5);
    moonLight.castShadow = true;
    this.scene.add(moonLight);

    // 3. Neon Cyberpunk Street Spotlights
    this._spotTeal = new SpotLight({
      color: new Color(0.05, 0.95, 1.0),
      intensity: 6.0,
      angle: Math.PI / 3.5,
      penumbra: 0.3,
      distance: 25.0,
    });
    this._spotTeal.position.set(-4.5, 6.0, 3.0);
    this._spotTeal.direction.set(1.0, -1.2, -0.5);
    this._spotTeal.castShadow = true;
    this.scene.add(this._spotTeal);

    this._spotPink = new SpotLight({
      color: new Color(1.0, 0.08, 0.65),
      intensity: 6.5,
      angle: Math.PI / 3.5,
      penumbra: 0.35,
      distance: 25.0,
    });
    this._spotPink.position.set(4.5, 6.5, -2.0);
    this._spotPink.direction.set(-1.0, -1.2, 0.3);
    this._spotPink.castShadow = true;
    this.scene.add(this._spotPink);

    // Load Environment Map & PBR Texture Maps
    const envTexture = new CubeTexture();
    try {
      await envTexture.loadFrom("./assets/skybox.webp");
      const skybox = new Object3D("Skybox");
      skybox.geometry = new Cube({ size: 1000 }).getGeometryData();
      skybox.material = new SkyboxMaterial({ cubeMap: envTexture });
      skybox.frustumCulled = false;
      this.scene.add(skybox);
      this.scene.irradianceMap = envTexture;
      this.scene.prefilterMap = envTexture;
    } catch (e) {
      console.warn("Could not load envmap:", e);
    }

    let asphaltDiffuse: Texture | undefined;
    let asphaltNormal: Texture | undefined;
    let asphaltRoughness: Texture | undefined;

    let steelDiffuse: Texture | undefined;
    let steelNormal: Texture | undefined;
    let steelRoughness: Texture | undefined;

    let brassDiffuse: Texture | undefined;
    let brassNormal: Texture | undefined;
    let brassRoughness: Texture | undefined;

    try {
      asphaltDiffuse = await Texture.fromUrl("./assets/steampunk_diffuse.webp");
      if (asphaltDiffuse) {
        asphaltDiffuse.repeat.x = 4;
        asphaltDiffuse.repeat.y = 7;
      }
      asphaltNormal = await Texture.fromUrl("./assets/steampunk_normal.webp");
      if (asphaltNormal) {
        asphaltNormal.repeat.x = 4;
        asphaltNormal.repeat.y = 7;
      }
      asphaltRoughness = await Texture.fromUrl("./assets/steampunk_roughness.webp");
      if (asphaltRoughness) {
        asphaltRoughness.repeat.x = 4;
        asphaltRoughness.repeat.y = 7;
      }

      steelDiffuse = await Texture.fromUrl("./assets/scratched_steel_diffuse.webp");
      if (steelDiffuse) {
        steelDiffuse.repeat.x = 2;
        steelDiffuse.repeat.y = 4;
      }
      steelNormal = await Texture.fromUrl("./assets/scratched_steel_normal.webp");
      if (steelNormal) {
        steelNormal.repeat.x = 2;
        steelNormal.repeat.y = 4;
      }
      steelRoughness = await Texture.fromUrl("./assets/scratched_steel_roughness.webp");
      if (steelRoughness) {
        steelRoughness.repeat.x = 2;
        steelRoughness.repeat.y = 4;
      }

      brassDiffuse = await Texture.fromUrl("./assets/rusty_brass_diffuse.webp");
      brassNormal = await Texture.fromUrl("./assets/rusty_brass_normal.webp");
      brassRoughness = await Texture.fromUrl("./assets/rusty_brass_roughness.webp");
    } catch (e) {
      console.warn("Could not load PBR textures:", e);
    }

    // Materials Palette
    const dryAsphaltMat = new StandardMaterial({
      color: new Color(0.18, 0.2, 0.22),
      diffuseMap: asphaltDiffuse,
      normalMap: asphaltNormal,
      roughnessMap: asphaltRoughness,
      roughness: 0.8,
      metallic: 0.3,
      envMap: envTexture,
    });

    const wetPuddleMat = new StandardMaterial({
      color: new Color(0.04, 0.05, 0.07),
      roughness: 0.02,
      metallic: 0.95,
      envMap: envTexture,
    });

    const buildingMat = new StandardMaterial({
      color: new Color(0.2, 0.22, 0.25),
      diffuseMap: steelDiffuse,
      normalMap: steelNormal,
      roughnessMap: steelRoughness,
      roughness: 0.6,
      metallic: 0.6,
      envMap: envTexture,
    });

    const chromeMat = new StandardMaterial({
      color: new Color(0.85, 0.88, 0.92),
      diffuseMap: brassDiffuse,
      normalMap: brassNormal,
      roughnessMap: brassRoughness,
      roughness: 0.15,
      metallic: 0.92,
      envMap: envTexture,
    });

    const neonMagentaMat = new StandardMaterial({
      color: new Color(1.0, 0.05, 0.6),
      emissiveColor: new Color(3.5, 0.1, 1.8),
      emissiveIntensity: 4.5,
      roughness: 0.1,
    });

    const neonCyanMat = new StandardMaterial({
      color: new Color(0.05, 0.95, 1.0),
      emissiveColor: new Color(0.1, 3.2, 3.8),
      emissiveIntensity: 4.5,
      roughness: 0.1,
    });

    const neonGoldMat = new StandardMaterial({
      color: new Color(1.0, 0.8, 0.1),
      emissiveColor: new Color(3.0, 2.2, 0.2),
      emissiveIntensity: 3.5,
      roughness: 0.1,
    });

    // 4. Main Wet Asphalt Ground
    const street = new Object3D("CyberStreet");
    street.geometry = new Cube({ size: 1 }).getGeometryData();
    street.scale.set(16, 0.4, 28);
    street.material = dryAsphaltMat;
    street.position.set(0, -0.2, 0);
    street.receiveShadow = true;
    this.scene.add(street);

    // 5. Mirrored Rain Water Puddles (High-Gloss Reflective Plates)
    const puddleConfigs = [
      { x: -1.2, z: 1.5, rx: 3.2, rz: 4.5 },
      { x: 1.8, z: -2.0, rx: 2.8, rz: 3.6 },
      { x: -0.5, z: -4.5, rx: 2.2, rz: 2.5 },
      { x: 2.2, z: 3.5, rx: 2.0, rz: 3.0 },
    ];

    for (let p = 0; p < puddleConfigs.length; p++) {
      const cfg = puddleConfigs[p]!;
      const puddle = new Object3D(`Puddle_${p}`);
      puddle.geometry = new Cylinder({
        radiusTop: 1.0,
        radiusBottom: 1.0,
        height: 0.02,
        radialSegments: 32,
      }).getGeometryData();
      puddle.scale.set(cfg.rx, 1.0, cfg.rz);
      puddle.material = wetPuddleMat;
      puddle.position.set(cfg.x, 0.015, cfg.z);
      puddle.receiveShadow = true;
      this.scene.add(puddle);
      this._puddlePlates.push(puddle);

      // Puddle Ripple Rings
      const ripple = new Object3D(`Ripple_${p}`);
      ripple.geometry = new Torus({
        radius: 0.8,
        tube: 0.015,
        radialSegments: 16,
        tubularSegments: 32,
      }).getGeometryData();
      ripple.material = chromeMat;
      ripple.rotation.x = Math.PI / 2;
      ripple.position.set(cfg.x, 0.025, cfg.z);
      this.scene.add(ripple);
    }

    // 6. Cyberpunk Street Architecture (Alley Skyscrapers & Overhangs)
    for (const side of [-1, 1]) {
      const xBase = side * 6.8;

      // Primary Block
      const bldg = new Object3D(`Building_${side}`);
      bldg.geometry = new Cube({ size: 1 }).getGeometryData();
      bldg.scale.set(3.5, 16.0, 26.0);
      bldg.material = buildingMat;
      bldg.position.set(xBase, 8.0, 0);
      bldg.castShadow = true;
      bldg.receiveShadow = true;
      this.scene.add(bldg);

      // Cyber Conduit Pipes running along the walls
      for (let pipe = 0; pipe < 3; pipe++) {
        const conduit = new Object3D(`Conduit_${side}_${pipe}`);
        conduit.geometry = new Cylinder({
          radiusTop: 0.08,
          radiusBottom: 0.08,
          height: 24.0,
          radialSegments: 12,
        }).getGeometryData();
        conduit.material = chromeMat;
        conduit.rotation.x = Math.PI / 2;
        conduit.position.set(side * 4.9, 1.5 + pipe * 1.2, 0);
        this.scene.add(conduit);
      }
    }

    // 7. Neon Billboards & Hologram Frames (Left & Right)
    this._neonSignMagenta = new Object3D("NeonSignMagenta");
    this._neonSignMagenta.geometry = new Cube({ size: 1 }).getGeometryData();
    this._neonSignMagenta.scale.set(0.15, 3.2, 5.0);
    this._neonSignMagenta.material = neonMagentaMat;
    this._neonSignMagenta.position.set(-4.8, 5.5, 1.0);
    this.scene.add(this._neonSignMagenta);

    const magentaLight = new PointLight({
      color: new Color(1.0, 0.05, 0.6),
      intensity: 4.5,
      distance: 12.0,
    });
    magentaLight.position.set(-4.4, 5.5, 1.0);
    this.scene.add(magentaLight);

    this._neonSignCyan = new Object3D("NeonSignCyan");
    this._neonSignCyan.geometry = new Cube({ size: 1 }).getGeometryData();
    this._neonSignCyan.scale.set(0.15, 4.0, 3.0);
    this._neonSignCyan.material = neonCyanMat;
    this._neonSignCyan.position.set(4.8, 6.2, -3.0);
    this.scene.add(this._neonSignCyan);

    const cyanLight = new PointLight({
      color: new Color(0.05, 0.95, 1.0),
      intensity: 4.5,
      distance: 12.0,
    });
    cyanLight.position.set(4.4, 6.2, -3.0);
    this.scene.add(cyanLight);

    // Overhead Street Arch Sign
    const overheadSign = new Object3D("OverheadSign");
    overheadSign.geometry = new Cube({ size: 1 }).getGeometryData();
    overheadSign.scale.set(6.0, 0.5, 0.2);
    overheadSign.material = neonGoldMat;
    overheadSign.position.set(0, 7.5, -6.0);
    this.scene.add(overheadSign);

    // 8. Futuristic Hover Vehicle in Center
    this._hoverCar = new Object3D("HoverCar");
    this._hoverCar.position.set(0, 0.8, -1.0);
    this.scene.add(this._hoverCar);

    const carChassis = new Object3D("CarChassis");
    carChassis.geometry = new Cube({ size: 1 }).getGeometryData();
    carChassis.scale.set(1.8, 0.6, 3.6);
    carChassis.material = buildingMat;
    carChassis.castShadow = true;
    this._hoverCar.add(carChassis);

    const carCockpit = new Object3D("CarCockpit");
    carCockpit.geometry = new Cube({ size: 1 }).getGeometryData();
    carCockpit.scale.set(1.4, 0.45, 1.8);
    carCockpit.material = chromeMat;
    carCockpit.position.set(0, 0.45, -0.2);
    this._hoverCar.add(carCockpit);

    // Tail Lights (Red Neon)
    const tailLights = new Object3D("TailLights");
    tailLights.geometry = new Cube({ size: 1 }).getGeometryData();
    tailLights.scale.set(1.6, 0.12, 0.1);
    tailLights.material = new StandardMaterial({
      color: new Color(1.0, 0.0, 0.05),
      emissiveColor: new Color(3.0, 0.0, 0.1),
      emissiveIntensity: 4.0,
      roughness: 0.1,
    });
    tailLights.position.set(0, 0.1, 1.8);
    this._hoverCar.add(tailLights);
  }

  protected override update(deltaTime: number): void {
    this._time += deltaTime;

    // Hover vehicle levitation bobbing
    if (this._hoverCar) {
      this._hoverCar.position.y = 0.8 + Math.sin(this._time * 2.5) * 0.08;
      this._hoverCar.rotation.z = Math.sin(this._time * 1.5) * 0.02;
    }

    // Neon sign pulse flicker
    if (this._neonSignMagenta) {
      const pulseM = 1.0 + Math.sin(this._time * 6.0) * 0.08 + (Math.random() - 0.5) * 0.04;
      this._neonSignMagenta.scale.y = 3.2 * pulseM;
    }
    if (this._neonSignCyan) {
      const pulseC = 1.0 + Math.sin(this._time * 4.5 + 1.0) * 0.08;
      this._neonSignCyan.scale.y = 4.0 * pulseC;
    }

    // Swaying neon spotlights across the wet asphalt
    if (this._spotTeal) {
      this._spotTeal.position.x = -4.5 + Math.sin(this._time * 1.2) * 0.8;
      this._spotTeal.direction.set(
        1.0 + Math.sin(this._time * 0.8) * 0.2,
        -1.2,
        -0.5 + Math.cos(this._time * 0.8) * 0.3,
      );
    }
    if (this._spotPink) {
      this._spotPink.position.x = 4.5 + Math.cos(this._time * 1.4) * 0.8;
      this._spotPink.direction.set(
        -1.0 + Math.cos(this._time * 0.9) * 0.2,
        -1.2,
        0.3 + Math.sin(this._time * 0.9) * 0.3,
      );
    }
  }
}

// ----------------------------------------------------------------------------
// Bootstrap the example
// ----------------------------------------------------------------------------
const app = new Showcase30();
app.start().catch((err: unknown) => console.error("[Showcase30] Failed to start:", err));
