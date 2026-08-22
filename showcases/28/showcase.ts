import {
  AbstractShowcase,
  AmbientLight,
  CameraStrategyType,
  Color,
  Cube,
  Cylinder,
  DirectionalLight,
  EngineOptions,
  Octahedron,
  Object3D,
  OrbitController,
  PerspectiveProjection,
  PostProcessingEffectType,
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
} from "../../src/index.js";

/**
 * Showcase 28: "The Quantum Refraction Lab / Optical Prism"
 *
 * Benchmark testing transmission, optical dispersion, spectral split,
 * and high-refractive glass polyhedra under coherent laser illumination.
 */
class Showcase28 extends AbstractShowcase {
  private _turntable!: Object3D;
  private _prismMesh!: Object3D;
  private _gemMesh!: Object3D;
  private _laserLight!: SpotLight;
  private _spectralRays: Object3D[] = [];
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
    // Post-Processing: Vivid HDR Bloom for laser and dispersed spectral rays
    this.renderer.postProcessing.enabled = true;
    const bloom = this.renderer.postProcessing.get<BloomElement>(PostProcessingEffectType.BLOOM);
    if (bloom) {
      bloom.enabled = true;
      bloom.intensity = 1.4;
      bloom.threshold = 0.75;
    }

    const hbao = this.renderer.postProcessing.get<HbaoElement>(PostProcessingEffectType.HBAO);
    if (hbao) {
      hbao.enabled = true;
      hbao.radius = 0.6;
      hbao.intensity = 1.0;
    }

    // Camera setup
    if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
      const aspect = window.innerWidth / window.innerHeight;
      this.camera.projection = new PerspectiveProjection({
        fov: (45 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 100,
      });
      this.camera.updateProjectionMatrix();
    }
    this.camera.setStrategy(CameraStrategyType.HYBRID_SYNC);
    this.camera.position.set(0, 5.5, 11);
    this.camera.target.set(0, 1.2, 0);
    this.camera.addBehavior(new OrbitController({ input: this.input, audio: this.audio }));

    // Ambient Optical Environment (Dark cleanroom lab aesthetic)
    const ambientLight = new AmbientLight({
      color: new Color(0.04, 0.05, 0.08),
      intensity: 0.8,
    });
    this.scene.add(ambientLight);

    // Laboratory Overhead Soft Light
    const overheadLight = new DirectionalLight({
      color: new Color(0.9, 0.95, 1.0),
      intensity: 0.5,
    });
    overheadLight.direction.set(0.3, -1, -0.4);
    this.scene.add(overheadLight);

    // Load Environment Map & PBR Textures
    const envTexture = new CubeTexture();
    try {
      await envTexture.loadFrom("./assets/skybox.png");
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

    let steelDiffuse: Texture | undefined;
    let steelNormal: Texture | undefined;
    let steelRoughness: Texture | undefined;

    let brassDiffuse: Texture | undefined;
    let brassNormal: Texture | undefined;
    let brassRoughness: Texture | undefined;

    try {
      steelDiffuse = await Texture.fromUrl("./assets/scratched_steel_diffuse.png");
      if (steelDiffuse) {
        steelDiffuse.repeat.x = 4;
        steelDiffuse.repeat.y = 3;
      }
      steelNormal = await Texture.fromUrl("./assets/scratched_steel_normal.png");
      if (steelNormal) {
        steelNormal.repeat.x = 4;
        steelNormal.repeat.y = 3;
      }
      steelRoughness = await Texture.fromUrl("./assets/scratched_steel_roughness.png");
      if (steelRoughness) {
        steelRoughness.repeat.x = 4;
        steelRoughness.repeat.y = 3;
      }

      brassDiffuse = await Texture.fromUrl("./assets/rusty_brass_diffuse.png");
      brassNormal = await Texture.fromUrl("./assets/rusty_brass_normal.png");
      brassRoughness = await Texture.fromUrl("./assets/rusty_brass_roughness.png");
    } catch (e) {
      console.warn("Could not load PBR textures:", e);
    }

    // 1. Heavy Optical Isolation Bench (Anodized Aluminum Slab)
    const tableMat = new StandardMaterial({
      color: new Color(0.2, 0.22, 0.25),
      diffuseMap: steelDiffuse,
      normalMap: steelNormal,
      roughnessMap: steelRoughness,
      metallic: 0.95,
      roughness: 0.35,
      envMap: envTexture,
    });
    const benchTop = new Object3D("BenchTop");
    benchTop.geometry = new Cube({
      size: 1,
    }).getGeometryData();
    benchTop.scale.set(14, 0.4, 10);
    benchTop.material = tableMat;
    benchTop.position.set(0, -0.2, 0);
    benchTop.receiveShadow = true;
    this.scene.add(benchTop);

    // Rotary Optical Stage (Center turntable)
    this._turntable = new Object3D("TurntableStage");
    this._turntable.position.set(0, 0, 0);
    this.scene.add(this._turntable);

    const stageMat = new StandardMaterial({
      color: new Color(0.3, 0.32, 0.36),
      diffuseMap: steelDiffuse,
      normalMap: steelNormal,
      roughnessMap: steelRoughness,
      metallic: 0.95,
      roughness: 0.2,
      envMap: envTexture,
    });
    const stagePlate = new Object3D("StagePlate");
    stagePlate.geometry = new Cylinder({
      radiusTop: 2.2,
      radiusBottom: 2.4,
      height: 0.15,
      radialSegments: 48,
    }).getGeometryData();
    stagePlate.material = stageMat;
    stagePlate.position.set(0, 0.075, 0);
    stagePlate.receiveShadow = true;
    this._turntable.add(stagePlate);

    // Brass Scale Ring around turntable
    const brassRingMat = new StandardMaterial({
      color: new Color(0.85, 0.7, 0.3),
      diffuseMap: brassDiffuse,
      normalMap: brassNormal,
      roughnessMap: brassRoughness,
      metallic: 0.9,
      roughness: 0.25,
      envMap: envTexture,
    });
    const dialRing = new Object3D("DialRing");
    dialRing.geometry = new Torus({
      radius: 2.3,
      tube: 0.04,
      radialSegments: 32,
      tubularSegments: 64,
    }).getGeometryData();
    dialRing.material = brassRingMat;
    dialRing.rotation.x = Math.PI / 2;
    dialRing.position.set(0, 0.15, 0);
    this._turntable.add(dialRing);

    // The Central Optical Prism (Equilateral triangular cylinder, n = 1.65 flint glass)
    const glassMat = new StandardMaterial({
      color: new Color(0.92, 0.96, 1.0),
      metallic: 0.1,
      roughness: 0.05,
      transparent: true,
      emissiveColor: new Color(0.1, 0.2, 0.35),
      emissiveIntensity: 0.3,
    });
    this._prismMesh = new Object3D("CentralPrism");
    this._prismMesh.geometry = new Cylinder({
      radiusTop: 1.2,
      radiusBottom: 1.2,
      height: 2.2,
      radialSegments: 3,
    }).getGeometryData();
    this._prismMesh.material = glassMat;
    this._prismMesh.position.set(0, 1.25, 0);
    this._prismMesh.rotation.y = Math.PI / 6;
    this._prismMesh.castShadow = true;
    this._turntable.add(this._prismMesh);

    // Secondary Floating Diamond Polyhedron
    const diamondMat = new StandardMaterial({
      color: new Color(1.0, 0.95, 1.0),
      metallic: 0.2,
      roughness: 0.02,
      transparent: true,
      emissiveColor: new Color(0.3, 0.15, 0.4),
      emissiveIntensity: 0.4,
    });
    this._gemMesh = new Object3D("DiamondOctahedron");
    this._gemMesh.geometry = new Octahedron({
      radius: 0.65,
    }).getGeometryData();
    this._gemMesh.material = diamondMat;
    this._gemMesh.position.set(2.8, 1.5, -1.2);
    this._gemMesh.castShadow = true;
    this.scene.add(this._gemMesh);

    // Laser Emitter Pillar & Housing
    const emitterPillar = new Object3D("EmitterPillar");
    emitterPillar.geometry = new Cylinder({
      radiusTop: 0.15,
      radiusBottom: 0.25,
      height: 1.8,
      radialSegments: 24,
    }).getGeometryData();
    emitterPillar.material = tableMat;
    emitterPillar.position.set(-4.5, 0.9, 0);
    this.scene.add(emitterPillar);

    const laserHousingMat = new StandardMaterial({
      color: new Color(0.1, 0.1, 0.12),
      metallic: 0.9,
      roughness: 0.3,
    });
    const laserHousing = new Object3D("LaserHousing");
    laserHousing.geometry = new Cylinder({
      radiusTop: 0.22,
      radiusBottom: 0.22,
      height: 0.8,
      radialSegments: 24,
    }).getGeometryData();
    laserHousing.material = laserHousingMat;
    laserHousing.rotation.z = Math.PI / 2;
    laserHousing.position.set(-4.5, 1.8, 0);
    this.scene.add(laserHousing);

    // Glowing Laser Lens Aperture
    const laserLensMat = new StandardMaterial({
      color: new Color(1, 1, 1),
      emissiveColor: new Color(1.5, 1.5, 1.5),
      emissiveIntensity: 3.0,
      roughness: 0.1,
    });
    const laserEmitterMesh = new Object3D("LaserLens");
    laserEmitterMesh.geometry = new Cylinder({
      radiusTop: 0.12,
      radiusBottom: 0.12,
      height: 0.05,
      radialSegments: 24,
    }).getGeometryData();
    laserEmitterMesh.material = laserLensMat;
    laserEmitterMesh.rotation.z = Math.PI / 2;
    laserEmitterMesh.position.set(-4.08, 1.8, 0);
    this.scene.add(laserEmitterMesh);

    // Coherent Incident White Laser Beam
    const incidentBeamMat = new StandardMaterial({
      color: new Color(1.0, 1.0, 1.0),
      emissiveColor: new Color(2.5, 2.5, 2.5),
      emissiveIntensity: 4.0,
      transparent: true,
    });
    const incidentBeam = new Object3D("IncidentBeam");
    incidentBeam.geometry = new Cylinder({
      radiusTop: 0.03,
      radiusBottom: 0.03,
      height: 3.8,
      radialSegments: 16,
    }).getGeometryData();
    incidentBeam.material = incidentBeamMat;
    incidentBeam.rotation.z = Math.PI / 2;
    incidentBeam.position.set(-2.2, 1.8, 0);
    this.scene.add(incidentBeam);

    // SpotLight collinear with the incident laser
    this._laserLight = new SpotLight({
      color: new Color(1.0, 1.0, 1.0),
      intensity: 8.0,
      distance: 15,
      angle: Math.PI / 16,
      penumbra: 0.2,
    });
    this._laserLight.position.set(-4.0, 1.8, 0);
    this._laserLight.direction.set(1, 0, 0);
    this._laserLight.castShadow = true;
    this._laserLight.shadowBias = 0.0008;
    this._laserLight.shadowResolution = 1024;
    this.scene.add(this._laserLight);

    // Phosphor Target / Measurement Screen (White curved detector arc behind prism)
    const screenMat = new StandardMaterial({
      color: new Color(0.9, 0.92, 0.95),
      metallic: 0.05,
      roughness: 0.85,
    });
    const screenPanel = new Object3D("PhosphorScreen");
    screenPanel.geometry = new Cube({
      size: 1,
    }).getGeometryData();
    screenPanel.scale.set(0.3, 3.2, 7.0);
    screenPanel.material = screenMat;
    screenPanel.position.set(5.2, 1.6, 0);
    screenPanel.receiveShadow = true;
    this.scene.add(screenPanel);

    // Spectral Ray Bundle (Chromatic dispersion fan emerging from the prism)
    const spectrumColors = [
      { name: "Red", color: new Color(1.0, 0.05, 0.05), angle: 0.18 },
      { name: "Orange", color: new Color(1.0, 0.45, 0.0), angle: 0.12 },
      { name: "Yellow", color: new Color(1.0, 0.9, 0.05), angle: 0.06 },
      { name: "Green", color: new Color(0.1, 1.0, 0.2), angle: 0.0 },
      { name: "Cyan", color: new Color(0.05, 0.9, 1.0), angle: -0.06 },
      { name: "Blue", color: new Color(0.1, 0.3, 1.0), angle: -0.12 },
      { name: "Violet", color: new Color(0.7, 0.1, 1.0), angle: -0.18 },
    ];

    for (const spec of spectrumColors) {
      const rayMat = new StandardMaterial({
        color: spec.color,
        emissiveColor: new Color(spec.color.r * 2.2, spec.color.g * 2.2, spec.color.b * 2.2),
        emissiveIntensity: 3.5,
        transparent: true,
      });

      const rayMesh = new Object3D(`SpectralRay_${spec.name}`);
      rayMesh.geometry = new Cylinder({
        radiusTop: 0.02,
        radiusBottom: 0.04,
        height: 4.8,
        radialSegments: 12,
      }).getGeometryData();
      rayMesh.material = rayMat;
      rayMesh.rotation.z = Math.PI / 2;
      rayMesh.rotation.y = spec.angle;
      rayMesh.position.set(2.4, 1.8, spec.angle * 4.2);
      this.scene.add(rayMesh);
      this._spectralRays.push(rayMesh);
    }
  }

  protected override update(deltaTime: number): void {
    this._time += deltaTime * 0.5;

    // Gentle slow turntable rotation showcasing prism facets and refraction shifts
    if (this._turntable) {
      this._turntable.rotation.y = Math.sin(this._time * 0.6) * 0.25;
    }

    // Floating gem levitation & counter-spin
    if (this._gemMesh) {
      this._gemMesh.rotation.x = this._time * 0.8;
      this._gemMesh.rotation.y = this._time * 1.1;
      this._gemMesh.position.y = 1.5 + Math.sin(this._time * 2.0) * 0.15;
    }

    // Dynamic spectral pulse oscillation
    for (let i = 0; i < this._spectralRays.length; i++) {
      const ray = this._spectralRays[i];
      if (ray) {
        const pulse = 0.95 + Math.sin(this._time * 4.0 + i * 0.5) * 0.08;
        ray.scale.set(pulse, 1.0, pulse);
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Bootstrap the example
// ----------------------------------------------------------------------------
const app = new Showcase28();
app.start().catch((err: unknown) => console.error("[Showcase28] Failed to start:", err));
