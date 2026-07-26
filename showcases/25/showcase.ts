import {
  AbstractShowcase,
  Color,
  Object3D,
  Plane,
  OpenWaterMaterial,
  OrbitController,
  CameraStrategyType,
  DirectionalLight,
  MathUtils,
  DeviceCaps,
  DeviceFeature,
} from "../../src/index.js";

class Showcase25 extends AbstractShowcase {
  private _water: OpenWaterMaterial | undefined;

  protected async setupScene(): Promise<void> {
    const dirLight = new DirectionalLight({ color: new Color(1.0, 1.0, 1.0), intensity: 1.0 });
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    this.camera.setStrategy(CameraStrategyType.HYBRID_SYNC);
    this.camera.position.set(0, 5, 20);
    this.camera.target.set(0, 0, 0);
    this.camera.addBehavior(new OrbitController({ input: this.input, audio: this.audio }));

    // OpenWaterMaterial only has a WGSL implementation (no WebGL2/WebGL1 fallback shaders).
    // This engine silently falls back to WebGL2 when WebGPU isn't available (RendererFactory),
    // which would otherwise crash trying to read the missing glsl300 shader source. Skip
    // adding the water surface entirely rather than let that happen on non-WebGPU browsers.
    if (!DeviceCaps.hasFeature(DeviceFeature.WEBGPU)) {
      console.warn("[Showcase25] WebGPU not available — OpenWaterMaterial requires it.");
      return;
    }

    this._water = new OpenWaterMaterial({
      waterColor: new Color(0.0, 0.4, 0.8),
      deepWaterColor: new Color(0.0, 0.1, 0.3),
      edgeColor: new Color(0.8, 0.9, 1.0),
      edgeSoftness: 1.0,
      speed: 1.0,
      wave1: [1.0, 0.5, 0.1, 10.0],
      wave2: [0.2, 0.8, 0.15, 6.0],
      wave3: [-0.3, 0.7, 0.05, 3.0],
    });

    const water = new Object3D("Water");
    const plane = new Plane({
      width: 100,
      height: 100,
      widthSegments: 128,
      heightSegments: 128,
    });
    plane.computeTangents();
    water.geometry = plane.getGeometryData();
    water.material = this._water;
    water.rotation.x = -MathUtils.HALF_PI;
    this.scene.add(water);
  }

  protected override update(deltaTime: number): void {
    if (undefined === this._water) return;
    this._water.time += deltaTime;
  }
}

const app = new Showcase25();
app.start();
