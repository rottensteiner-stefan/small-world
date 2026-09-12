import {
  AmbientLight,
  CameraStrategyType,
  Color,
  DirectionalLight,
  FPSController,
  Object3D,
  PerspectiveProjection,
  ProjectionType,
  RendererType,
  PostProcessingEffectType,
  CubeTexture,
  BloomElement,
  StandardMaterial,
  PointLight,
} from "../../packages/engine/src/index.js";
import { AbstractShowcase } from "../../packages/engine/src/core/index.js";
import { Cube } from "../../packages/engine/src/geometry/Cube.js";
import { SkyboxMaterial } from "../../packages/engine/src/core/materials/SkyboxMaterial.js";
import { GltfLoader } from "../../packages/engine/src/loaders/GltfLoader.js";

class Showcase36 extends AbstractShowcase {
  protected override async setupScene(): Promise<void> {
    // Post-Processing to complement the glass and cracked-shard highlights
    this.renderer.postProcessing.enabled = true;
    const bloom = this.renderer.postProcessing.get<BloomElement>(PostProcessingEffectType.BLOOM);
    if (bloom) {
      bloom.enabled = true;
      bloom.intensity = 0.6;
      bloom.threshold = 1.0;
      bloom.radius = 0.6;
    }

    // Camera setup
    if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
      const aspect: number = window.innerWidth / window.innerHeight;
      this.camera.projection = new PerspectiveProjection({
        fov: (55 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 1000,
      });
      this.camera.updateProjectionMatrix();
    }

    // The window pane is ~0.5m tall, centered around y=0.25 -- frame the camera accordingly
    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, 0.25, 1.1);

    const fpsController = new FPSController({
      input: this.input,
      audio: this.audio,
      moveSpeed: 2.0,
      enableCollision: false,
      scene: this.scene,
    });
    this.camera.addBehavior(fpsController);

    // Lighting: a soft backlight sells the shattered glass silhouette and cracks
    const ambientLight = new AmbientLight({
      color: new Color(0.15, 0.16, 0.2),
      intensity: 0.3,
    });
    this.scene.add(ambientLight);

    const backLight = new DirectionalLight({
      color: new Color(1.0, 0.97, 0.9),
      intensity: 1.1,
    });
    backLight.position.set(0, 3, -6);
    backLight.direction.set(0, -0.3, 1);
    backLight.castShadow = true;
    backLight.shadowBias = 0.003;
    this.scene.add(backLight);

    const fillLight = new DirectionalLight({
      color: new Color(0.3, 0.45, 0.7),
      intensity: 0.4,
    });
    fillLight.position.set(-4, 1, 4);
    fillLight.direction.set(0.6, -0.2, -1);
    this.scene.add(fillLight);

    // Warm accent light near the camera to bring out the metallic clasp/frame detail
    const accentLight = new PointLight({
      color: new Color(1.0, 0.85, 0.6),
      intensity: 1.5,
      distance: 5.0,
    });
    accentLight.position.set(0.6, 0.4, 1.0);
    this.scene.add(accentLight);

    // Environment map for reflections
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

    // Load the shattered window
    try {
      const gltfLoader = new GltfLoader({ basePath: "./assets/" });
      const brokenWindow = await gltfLoader.load("GlassBrokenWindow.glb");

      brokenWindow.position.set(0, 0, 0);

      const setupNode = (node: Object3D): void => {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material && "envMap" in node.material && envTexture) {
          (node.material as StandardMaterial).envMap = envTexture;
        }
        node.children.forEach(setupNode);
      };
      setupNode(brokenWindow);

      this.scene.add(brokenWindow);
    } catch (e) {
      console.error("Failed to load GlassBrokenWindow:", e);
    }
  }

  protected override update(deltaTime: number): void {
    super.update(deltaTime);

    const skybox = this.scene.objects.find((o) => o.name === "Skybox");
    if (skybox) {
      skybox.position.copyFrom(this.camera.position);
      skybox.updateMatrixWorld();
    }
  }
}

// ----------------------------------------------------------------------------
// Bootstrap the example
// ----------------------------------------------------------------------------
const app = new Showcase36({
  rendererType: RendererType.WEB_GPU,
});
app.start().catch((err: unknown) => console.error("[Showcase36] Failed to start:", err));
