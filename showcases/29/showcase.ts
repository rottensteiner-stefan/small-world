import {
  AbstractShowcase,
  AmbientLight,
  CameraStrategyType,
  Color,
  Cylinder,
  DirectionalLight,
  EngineOptions,
  Object3D,
  PerspectiveProjection,
  PostProcessingEffectType,
  PointLight,
  ProjectionType,
  RendererType,
  StandardMaterial,
  GltfLoader,
  FlyController,
  Sphere,
  Texture,
  BasicMaterial,
  CullMode,
  BloomElement,
  HbaoElement,
} from "../../src/index.js";

/**
 * Showcase 29: "Sponza Atrium: Global Illumination & Volumetric Light Shafts"
 *
 * Benchmark testing architectural rendering, two-tiered colonnade shadow cascades,
 * warm cloister lanterns, and atmospheric god rays streaming through clerestory arches.
 */
class Showcase29 extends AbstractShowcase {
  private _sunLight!: DirectionalLight;
  private _godRaysGroup!: Object3D;
  private _godRayMeshes: Object3D[] = [];
  private _lanternLights: PointLight[] = [];
  private _skydome?: Object3D;
  private _time = 0;

  constructor(options: EngineOptions = {}) {
    super({
      canvasId: "SmallWorld",
      rendererType: RendererType.BEST,
      fullscreen: true,
      enableInspector: true,
      quality: {
        maxPixelRatio: 1.5,
      },
      ...options,
    });
  }

  protected override async setupScene(): Promise<void> {
    // Post-Processing: Atmospheric Bloom for God Rays & HBAO for architectural crevices
    this.renderer.postProcessing.enabled = true;
    const bloom = this.renderer.postProcessing.get<BloomElement>(PostProcessingEffectType.BLOOM);
    if (bloom) {
      bloom.enabled = true;
      bloom.intensity = 1.1;
      bloom.threshold = 0.8;
    }

    const hbao = this.renderer.postProcessing.get<HbaoElement>(PostProcessingEffectType.HBAO);
    if (hbao) {
      hbao.enabled = true;
      hbao.radius = 1.0;
      hbao.intensity = 1.3;
    }

    // Camera setup (Dramatic ground-floor perspective down the central colonnade)
    if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
      const aspect = window.innerWidth / window.innerHeight;
      this.camera.projection = new PerspectiveProjection({
        fov: (60 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 300,
      });
      this.camera.updateProjectionMatrix();
    }
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(9.5, 1.8, 0.0);
    this.camera.theta = -Math.PI * 0.5; // Look along -X down the long atrium axis
    this.camera.phi = 0.02;
    this.camera.target.set(0, 1.8, 0);
    this.camera.addBehavior(
      new FlyController({
        input: this.input,
        audio: this.audio,
        moveSpeed: 6.0,
        fastMultiplier: 2.2,
        slowMultiplier: 0.35,
        enableCollision: false,
      }),
    );

    // 1. Ambient Skyfill (Soft Mediterranean twilight sky)
    const ambientLight = new AmbientLight({
      color: new Color(0.22, 0.24, 0.3),
      intensity: 0.65,
    });
    this.scene.add(ambientLight);

    // 2. High-Altitude Raking Sun (The primary God-Ray & Cascade Caster)
    this._sunLight = new DirectionalLight({
      color: new Color(1.0, 0.95, 0.85),
      intensity: 2.8,
    });
    this._sunLight.position.set(10, 24, 12);
    this._sunLight.direction.set(-0.35, -1.0, -0.45);
    this._sunLight.castShadow = true;
    this._sunLight.shadowBias = 0.0012;
    this._sunLight.shadowResolution = 1024;
    this.scene.add(this._sunLight);

    // Load Mediterranean Skydome & Ambient Environment
    try {
      const skyTexture = await Texture.fromUrl("./assets/sky_panorama.webp");
      const skydome = new Object3D("Skydome");
      skydome.geometry = new Sphere({
        radius: 180,
        widthSegments: 32,
        heightSegments: 24,
      }).getGeometryData();
      const skydomeMat = new BasicMaterial({
        diffuseMap: skyTexture,
      });
      skydomeMat.cullMode = CullMode.NONE;
      skydomeMat.depthWrite = false;
      skydome.material = skydomeMat;
      skydome.frustumCulled = false;
      this._skydome = skydome;
      this.scene.add(skydome);
    } catch (e) {
      console.warn("Could not load skydome texture:", e);
    }

    // 3. Load the Official Khronos Sponza Atrium Model
    try {
      const loader = new GltfLoader();
      const sponza = await loader.load("./assets/sponza/Sponza.gltf");
      sponza.name = "SponzaAtrium";

      const setupMesh = (obj: Object3D): void => {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.frustumCulled = false;
        for (const child of obj.children) {
          setupMesh(child);
        }
      };
      setupMesh(sponza);
      this.scene.add(sponza);
    } catch (e) {
      console.error("[Showcase29] Failed to load Khronos Sponza glTF:", e);
    }

    // 4. Cloister Lanterns in the dark arcade corridors
    for (const side of [-1, 1]) {
      for (const bayX of [-8, 0, 8]) {
        const lanternLight = new PointLight({
          color: new Color(1.0, 0.55, 0.15),
          intensity: 2.8,
          distance: 9.0,
        });
        lanternLight.position.set(bayX, 2.4, side * 5.2);
        this.scene.add(lanternLight);
        this._lanternLights.push(lanternLight);
      }
    }

    // 5. Volumetric Light Shafts (God Rays from Clerestory Roof Opening)
    this._godRaysGroup = new Object3D("GodRaysContainer");
    this.scene.add(this._godRaysGroup);

    const godRayMat = new StandardMaterial({
      color: new Color(1.0, 0.94, 0.82, 0.16),
      emissiveColor: new Color(1.0, 0.92, 0.75),
      emissiveIntensity: 0.9,
      transparent: true,
      roughness: 1.0,
      metallic: 0.0,
    });
    godRayMat.cullMode = CullMode.NONE;
    godRayMat.depthWrite = false;

    // Create 5 major volumetric light shafts streaming through the central roof opening
    for (let r = 0; r < 5; r++) {
      const rayX = (r - 2) * 3.6;
      const rayMesh = new Object3D(`GodRay_${r}`);
      rayMesh.geometry = new Cylinder({
        radiusTop: 0.45,
        radiusBottom: 2.2,
        height: 12.0,
        radialSegments: 24,
        openEnded: true,
      }).getGeometryData();
      rayMesh.material = godRayMat;
      rayMesh.rotation.z = 0.28;
      rayMesh.rotation.x = -0.38;
      rayMesh.position.set(rayX, 6.0, 1.2);
      this._godRaysGroup.add(rayMesh);
      this._godRayMeshes.push(rayMesh);
    }
  }

  protected override update(deltaTime: number): void {
    this._time += deltaTime;

    // Atmospheric breathing & turbulence in the volumetric God Rays
    for (let i = 0; i < this._godRayMeshes.length; i++) {
      const ray = this._godRayMeshes[i];
      if (ray) {
        const flicker =
          0.9 + Math.sin(this._time * 1.5 + i * 1.2) * 0.12 + Math.cos(this._time * 3.1 + i) * 0.05;
        ray.scale.set(flicker, 1.0, flicker);
      }
    }

    // Keep skydome centered on camera
    if (this._skydome) {
      this._skydome.position.copyFrom(this.camera.position);
    }

    // Warm cloister lantern flame flicker
    for (let j = 0; j < this._lanternLights.length; j++) {
      const light = this._lanternLights[j];
      if (light) {
        light.intensity = 2.6 + Math.sin(this._time * 8.0 + j * 3.0) * 0.4;
      }
    }

    // Slow solar drift for moving shadow patterns
    if (this._sunLight) {
      const sunAngle = this._time * 0.08;
      this._sunLight.direction.set(
        -0.6 + Math.sin(sunAngle) * 0.1,
        -1.0,
        -0.4 + Math.cos(sunAngle) * 0.1,
      );
    }
  }
}

// ----------------------------------------------------------------------------
// Bootstrap the example
// ----------------------------------------------------------------------------
const app = new Showcase29();
app.start().catch((err: unknown) => console.error("[Showcase29] Failed to start:", err));
