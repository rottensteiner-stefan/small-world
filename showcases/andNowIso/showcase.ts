import {
  AmbientLight,
  Color,
  Cube,
  Plane,
  Object3D,
  PointLight,
  BasicMaterial,
  Texture,
  RendererType,
  AnimationMixer,
} from "../../src/index.js";
import { AbstractShowcase } from "../../src/core/index.js";
import { GltfLoader } from "../../src/loaders/GltfLoader.js";

class IsoExploreScene extends AbstractShowcase {
  private _novotny!: Object3D;
  private _pointLight!: PointLight;
  private _mixer?: AnimationMixer;

  protected override async setupScene(): Promise<void> {
    this.camera.position.set(0, 3.0, 8.5);
    this.camera.target.set(0, 1.8, 0);
    this.camera.updateViewMatrix();

    const ambient = new AmbientLight({ color: new Color(1, 1, 1), intensity: 1.0 });
    this.scene.add(ambient);

    this._pointLight = new PointLight({
      color: new Color(1, 0.5, 0.5),
      intensity: 10,
      distance: 100,
    });
    this.scene.add(this._pointLight);

    let bgTex: Texture | undefined;
    try {
      bgTex = await Texture.fromUrl("/assets/and-now/flakturm_bg.webp", { flipY: true });
    } catch (e) {
      console.warn("IsoExplore: Konnte Hintergrund nicht laden", e);
    }

    // 16:9 Standard: 16 Einheiten breit, 9 Einheiten hoch. Bei Y=4.5 schließt der untere Rand bündig mit dem Boden (Y=0) ab.
    const bgGeo = new Plane({ width: 16, height: 9 }).getGeometryData();
    const bgMat = new BasicMaterial({ color: new Color(1, 1, 1) });
    if (bgTex) {
      (bgMat as BasicMaterial).diffuseMap = bgTex;
    }

    const background = new Object3D("Background");
    background.geometry = bgGeo;
    background.material = bgMat;
    background.position.set(0, 4.5, -2);
    this.scene.add(background);

    const floorGeo = new Cube({ size: 1 }).getGeometryData();
    const floorMat = new BasicMaterial({ color: new Color(0.1, 0.1, 0.1) });
    const floor = new Object3D("Floor");
    floor.geometry = floorGeo;
    floor.material = floorMat;
    floor.scale.set(16, 0.5, 8);
    floor.position.set(0, -0.25, 2);
    this.scene.add(floor);

    try {
      const gltfLoader = new GltfLoader();
      this._novotny = await gltfLoader.load("/assets/and-now/mannequin.glb");

      this._novotny.scale.set(1.0, 1.0, 1.0);
      this._novotny.position.set(0, 0, 2);
      this.scene.add(this._novotny);

      // Lade separate Idle-Animation und binde sie an den AnimationMixer
      try {
        const animClips = await gltfLoader.loadAnimations("/assets/and-now/idle.glb");
        const activeClip = animClips[0] || this._novotny.animations[0];
        if (activeClip) {
          this._mixer = new AnimationMixer(this._novotny);
          this._mixer.clipAction(activeClip).play();
          console.log(`[IsoExplore] Animation '${activeClip.name}' gestartet!`);
        }
      } catch (animErr) {
        console.warn("[IsoExplore] Konnte Idle Animation nicht laden:", animErr);
      }
    } catch (e) {
      console.error(e);
    }
  }

  protected override update(deltaTime: number): void {
    super.update(deltaTime);
    this.camera.updateViewMatrix();

    if (this._mixer) {
      this._mixer.update(deltaTime);
    }

    if (this._novotny) {
      this._pointLight.position.set(
        this._novotny.position.x + 0.5,
        2.0,
        this._novotny.position.z + 0.5,
      );
    }
    this.scene.update(deltaTime);
  }
}

// WEBGL2 (RendererType.BEST) kommt mit den 32-Bit Indices des GLB klar!
// Und weil wir das Material gepatcht haben, sprengt es auch nicht das 16-Texturen-Limit!
const app = new IsoExploreScene({ rendererType: RendererType.WEB_GL2 });
app.start().catch((err: unknown) => console.error("[IsoExplore] Failed to start:", err));
