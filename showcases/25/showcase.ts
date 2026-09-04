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
} from "../../src/index.js";

class Showcase25 extends AbstractShowcase {
  private _water: OpenWaterMaterial | undefined;

  protected async setupScene(): Promise<void> {
    const dirLight = new DirectionalLight({ color: new Color(1.0, 1.0, 1.0), intensity: 1.0 });
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    this.camera.setStrategy(CameraStrategyType.HYBRID_SYNC);
    // Low, grazing angle instead of looking down on the surface -- wave crests only read as
    // "height" when they can occlude each other and the horizon, the same reason real ocean
    // photos are shot near the waterline rather than from a bird's-eye view.
    this.camera.position.set(0, 2.5, 15);
    this.camera.target.set(0, 1.0, 0);
    this.camera.addBehavior(new OrbitController({ input: this.input, audio: this.audio }));

    this._water = new OpenWaterMaterial({
      waterColor: new Color(0.0, 0.4, 0.8),
      deepWaterColor: new Color(0.0, 0.1, 0.3),
      edgeColor: new Color(0.8, 0.9, 1.0),
      edgeSoftness: 1.0,
      speed: 1.0,
      // Amplitude = steepness * wavelength / 2*pi -- height comes from a LARGE wavelength here,
      // not high steepness. Per-wave steepness stays well under 1 (and the 3 waves' steepness
      // sums to well under 1 too) because overlapping Gerstner waves add their horizontal
      // displacement: push the combined steepness too high and the crests fold over into sharp
      // cusps/peaks instead of smooth rolling swells (an earlier, over-steepened attempt at this
      // did exactly that -- looked like mountain terrain, not ocean). ~1.3 units combined
      // amplitude this way.
      wave1: [1.0, 0.4, 0.2, 25.0],
      wave2: [0.3, 0.9, 0.15, 15.0],
      wave3: [-0.5, 0.6, 0.1, 8.0],
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
app.start().catch((err: unknown) => console.error("[Showcase25] Failed to start:", err));
