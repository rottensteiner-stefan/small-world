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
  PointLight,
  ProjectionType,
  RendererType,
  StandardMaterial,
  Torus,
  Texture,
  CubeTexture,
  SkyboxMaterial,
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
  private _fountainWater!: Object3D;
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

    // Camera setup (Dramatic vantage point looking down the central nave of the courtyard)
    if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
      const aspect = window.innerWidth / window.innerHeight;
      this.camera.projection = new PerspectiveProjection({
        fov: (50 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 200,
      });
      this.camera.updateProjectionMatrix();
    }
    this.camera.setStrategy(CameraStrategyType.HYBRID_SYNC);
    this.camera.position.set(0, 4.5, 14);
    this.camera.target.set(0, 3.5, 0);
    this.camera.addBehavior(new OrbitController({ input: this.input, audio: this.audio }));

    // 1. Ambient Skyfill (Soft Mediterranean twilight sky)
    const ambientLight = new AmbientLight({
      color: new Color(0.12, 0.14, 0.2),
      intensity: 0.45,
    });
    this.scene.add(ambientLight);

    // 2. High-Altitude Raking Sun (The primary God-Ray & Cascade Caster)
    this._sunLight = new DirectionalLight({
      color: new Color(1.0, 0.94, 0.82),
      intensity: 2.2,
    });
    this._sunLight.position.set(12, 22, 10);
    this._sunLight.direction.set(-0.6, -1.0, -0.4);
    this._sunLight.castShadow = true;
    this._sunLight.shadowBias = 0.0012;
    this._sunLight.shadowResolution = 2048;
    this.scene.add(this._sunLight);

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

    let stoneDiffuse: Texture | undefined;
    let stoneNormal: Texture | undefined;
    let stoneRoughness: Texture | undefined;

    let woodDiffuse: Texture | undefined;
    let woodNormal: Texture | undefined;
    let woodRoughness: Texture | undefined;

    try {
      stoneDiffuse = await Texture.fromUrl("./assets/artdeco_diffuse.png");
      if (stoneDiffuse) {
        stoneDiffuse.repeat.x = 2;
        stoneDiffuse.repeat.y = 4;
      }
      stoneNormal = await Texture.fromUrl("./assets/artdeco_normal.png");
      if (stoneNormal) {
        stoneNormal.repeat.x = 2;
        stoneNormal.repeat.y = 4;
      }
      stoneRoughness = await Texture.fromUrl("./assets/artdeco_roughness.png");
      if (stoneRoughness) {
        stoneRoughness.repeat.x = 2;
        stoneRoughness.repeat.y = 4;
      }

      woodDiffuse = await Texture.fromUrl("./assets/oak_diffuse.png");
      if (woodDiffuse) {
        woodDiffuse.repeat.x = 1;
        woodDiffuse.repeat.y = 3;
      }
      woodNormal = await Texture.fromUrl("./assets/oak_normal.png");
      if (woodNormal) {
        woodNormal.repeat.x = 1;
        woodNormal.repeat.y = 3;
      }
      woodRoughness = await Texture.fromUrl("./assets/oak_roughness.png");
      if (woodRoughness) {
        woodRoughness.repeat.x = 1;
        woodRoughness.repeat.y = 3;
      }
    } catch (e) {
      console.warn("Could not load PBR textures:", e);
    }

    // Materials Palette
    const stoneLimestoneMat = new StandardMaterial({
      color: new Color(0.9, 0.86, 0.78),
      diffuseMap: stoneDiffuse,
      normalMap: stoneNormal,
      roughnessMap: stoneRoughness,
      roughness: 0.7,
      metallic: 0.05,
      envMap: envTexture,
    });

    const darkTrimMat = new StandardMaterial({
      color: new Color(0.45, 0.38, 0.32),
      diffuseMap: woodDiffuse,
      normalMap: woodNormal,
      roughnessMap: woodRoughness,
      roughness: 0.55,
      metallic: 0.15,
      envMap: envTexture,
    });

    const marbleFloorMat = new StandardMaterial({
      color: new Color(0.85, 0.82, 0.76),
      diffuseMap: stoneDiffuse,
      normalMap: stoneNormal,
      roughnessMap: stoneRoughness,
      roughness: 0.25,
      metallic: 0.1,
      envMap: envTexture,
    });

    const bannerRedMat = new StandardMaterial({
      color: new Color(0.65, 0.08, 0.1),
      roughness: 0.85,
      metallic: 0.0,
    });

    const waterMat = new StandardMaterial({
      color: new Color(0.1, 0.4, 0.5),
      roughness: 0.05,
      metallic: 0.1,
      transparent: true,
      emissiveColor: new Color(0.05, 0.15, 0.2),
      emissiveIntensity: 0.3,
    });

    const lanternGlowMat = new StandardMaterial({
      color: new Color(1.0, 0.6, 0.15),
      emissiveColor: new Color(2.5, 1.4, 0.3),
      emissiveIntensity: 4.0,
      roughness: 0.1,
    });

    // 3. Ground Floor (Grand Atrium Paving)
    const floor = new Object3D("AtriumFloor");
    floor.geometry = new Cube({ size: 1 }).getGeometryData();
    floor.scale.set(18, 0.4, 30);
    floor.material = marbleFloorMat;
    floor.position.set(0, -0.2, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 4. Perimeter Walls & Outer Cloister Walkways
    const wallLeft = new Object3D("WallLeft");
    wallLeft.geometry = new Cube({ size: 1 }).getGeometryData();
    wallLeft.scale.set(0.6, 12, 30);
    wallLeft.material = stoneLimestoneMat;
    wallLeft.position.set(-8.5, 6, 0);
    wallLeft.receiveShadow = true;
    this.scene.add(wallLeft);

    const wallRight = new Object3D("WallRight");
    wallRight.geometry = new Cube({ size: 1 }).getGeometryData();
    wallRight.scale.set(0.6, 12, 30);
    wallRight.material = stoneLimestoneMat;
    wallRight.position.set(8.5, 6, 0);
    wallRight.receiveShadow = true;
    this.scene.add(wallRight);

    const wallBack = new Object3D("WallBack");
    wallBack.geometry = new Cube({ size: 1 }).getGeometryData();
    wallBack.scale.set(18, 12, 0.6);
    wallBack.material = stoneLimestoneMat;
    wallBack.position.set(0, 6, -15);
    wallBack.receiveShadow = true;
    this.scene.add(wallBack);

    // 5. Two-Tiered Colonnade Arches (Left & Right Wings)
    const zSpacing = 4.5;
    const numBays = 6;
    const wingX = 5.2;

    for (const side of [-1, 1]) {
      const currentX = side * wingX;

      for (let bay = 0; bay < numBays; bay++) {
        const bayZ = (bay - (numBays - 1) / 2) * zSpacing;

        // Tier 1: Lower Ground Pillars (Heavy Tuscan Columns)
        const lowerCol = new Object3D(`LowerCol_${side}_${bay}`);
        lowerCol.geometry = new Cylinder({
          radiusTop: 0.32,
          radiusBottom: 0.38,
          height: 4.6,
          radialSegments: 24,
        }).getGeometryData();
        lowerCol.material = stoneLimestoneMat;
        lowerCol.position.set(currentX, 2.3, bayZ);
        lowerCol.castShadow = true;
        lowerCol.receiveShadow = true;
        this.scene.add(lowerCol);

        // Lower Archway Spandrel
        const lowerArch = new Object3D(`LowerArch_${side}_${bay}`);
        lowerArch.geometry = new Cube({ size: 1 }).getGeometryData();
        lowerArch.scale.set(0.7, 0.6, zSpacing);
        lowerArch.material = darkTrimMat;
        lowerArch.position.set(currentX, 4.8, bayZ);
        lowerArch.castShadow = true;
        this.scene.add(lowerArch);

        // Tier 2: Upper Gallery Balustrade & Cornice
        const galleryFloor = new Object3D(`GalleryFloor_${side}_${bay}`);
        galleryFloor.geometry = new Cube({ size: 1 }).getGeometryData();
        galleryFloor.scale.set(3.4, 0.4, zSpacing);
        galleryFloor.material = stoneLimestoneMat;
        galleryFloor.position.set(side * (wingX + 1.2), 5.1, bayZ);
        galleryFloor.receiveShadow = true;
        this.scene.add(galleryFloor);

        // Tier 2: Upper Twin Columns
        const upperColA = new Object3D(`UpperColA_${side}_${bay}`);
        upperColA.geometry = new Cylinder({
          radiusTop: 0.22,
          radiusBottom: 0.26,
          height: 3.8,
          radialSegments: 16,
        }).getGeometryData();
        upperColA.material = stoneLimestoneMat;
        upperColA.position.set(currentX, 7.2, bayZ - 0.6);
        upperColA.castShadow = true;
        this.scene.add(upperColA);

        const upperColB = new Object3D(`UpperColB_${side}_${bay}`);
        upperColB.geometry = new Cylinder({
          radiusTop: 0.22,
          radiusBottom: 0.26,
          height: 3.8,
          radialSegments: 16,
        }).getGeometryData();
        upperColB.material = stoneLimestoneMat;
        upperColB.position.set(currentX, 7.2, bayZ + 0.6);
        upperColB.castShadow = true;
        this.scene.add(upperColB);

        // Top Roof Architrave
        const roofTrim = new Object3D(`RoofTrim_${side}_${bay}`);
        roofTrim.geometry = new Cube({ size: 1 }).getGeometryData();
        roofTrim.scale.set(0.8, 0.8, zSpacing);
        roofTrim.material = darkTrimMat;
        roofTrim.position.set(currentX, 9.5, bayZ);
        roofTrim.castShadow = true;
        this.scene.add(roofTrim);

        // Medieval Silk Banners hanging from the upper gallery
        if (bay % 2 === 1) {
          const banner = new Object3D(`Banner_${side}_${bay}`);
          banner.geometry = new Cube({ size: 1 }).getGeometryData();
          banner.scale.set(0.08, 3.2, 1.4);
          banner.material = bannerRedMat;
          banner.position.set(currentX - side * 0.4, 3.6, bayZ);
          banner.castShadow = true;
          this.scene.add(banner);
        }

        // Cloister Lanterns in the dark outer arcade corridors
        if (bay === 1 || bay === 4) {
          const lanternMesh = new Object3D(`LanternMesh_${side}_${bay}`);
          lanternMesh.geometry = new Octahedron({ radius: 0.22 }).getGeometryData();
          lanternMesh.material = lanternGlowMat;
          lanternMesh.position.set(side * (wingX + 1.8), 3.2, bayZ);
          this.scene.add(lanternMesh);

          const lanternLight = new PointLight({
            color: new Color(1.0, 0.55, 0.15),
            intensity: 2.8,
            distance: 9.0,
          });
          lanternLight.position.set(side * (wingX + 1.8), 3.2, bayZ);
          this.scene.add(lanternLight);
          this._lanternLights.push(lanternLight);
        }
      }
    }

    // 6. Central Atrium Fountain & Pool
    const fountainRim = new Object3D("FountainRim");
    fountainRim.geometry = new Torus({
      radius: 2.4,
      tube: 0.28,
      radialSegments: 24,
      tubularSegments: 48,
    }).getGeometryData();
    fountainRim.material = darkTrimMat;
    fountainRim.rotation.x = Math.PI / 2;
    fountainRim.position.set(0, 0.28, 0);
    fountainRim.castShadow = true;
    fountainRim.receiveShadow = true;
    this.scene.add(fountainRim);

    this._fountainWater = new Object3D("FountainWater");
    this._fountainWater.geometry = new Cylinder({
      radiusTop: 2.3,
      radiusBottom: 2.3,
      height: 0.1,
      radialSegments: 36,
    }).getGeometryData();
    this._fountainWater.material = waterMat;
    this._fountainWater.position.set(0, 0.25, 0);
    this.scene.add(this._fountainWater);

    const centerPedestal = new Object3D("CenterPedestal");
    centerPedestal.geometry = new Cylinder({
      radiusTop: 0.6,
      radiusBottom: 0.8,
      height: 1.4,
      radialSegments: 24,
    }).getGeometryData();
    centerPedestal.material = stoneLimestoneMat;
    centerPedestal.position.set(0, 0.7, 0);
    centerPedestal.castShadow = true;
    this.scene.add(centerPedestal);

    // 7. Volumetric Light Shafts (God Rays from Clerestory Opening)
    this._godRaysGroup = new Object3D("GodRaysContainer");
    this.scene.add(this._godRaysGroup);

    const godRayMat = new StandardMaterial({
      color: new Color(1.0, 0.96, 0.85),
      emissiveColor: new Color(1.4, 1.3, 1.0),
      emissiveIntensity: 1.8,
      transparent: true,
      roughness: 0.1,
    });

    // Create 5 major volumetric light planes/cones spanning down into the atrium floor
    for (let r = 0; r < 5; r++) {
      const rayZ = (r - 2) * 4.8;
      const rayMesh = new Object3D(`GodRay_${r}`);
      rayMesh.geometry = new Cylinder({
        radiusTop: 0.4,
        radiusBottom: 2.6,
        height: 14.0,
        radialSegments: 16,
      }).getGeometryData();
      rayMesh.material = godRayMat;
      // Tilt ray to match directional sun vector
      rayMesh.rotation.z = -0.52;
      rayMesh.rotation.x = -0.28;
      rayMesh.position.set(2.2, 6.5, rayZ);
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

    // Warm cloister lantern flame flicker
    for (let j = 0; j < this._lanternLights.length; j++) {
      const light = this._lanternLights[j];
      if (light) {
        light.intensity = 2.6 + Math.sin(this._time * 8.0 + j * 3.0) * 0.4;
      }
    }

    // Gentle ripple oscillation on central fountain water
    if (this._fountainWater) {
      this._fountainWater.position.y = 0.25 + Math.sin(this._time * 2.0) * 0.015;
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
