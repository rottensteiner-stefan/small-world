/// src/examples/example13.ts

import {
  Color,
  DirectionalLight,
  PerspectiveProjection,
  AmbientLight,
  Plane,
  StandardMaterial,
  Object3D,
  FPSController,
  CameraStrategyType,
  SpotLight,
  Input,
  Texture,
} from "../index.js";
import { AbstractExample } from "../core/index.js";
import { RendererType, InputMode } from "../enums/index.js";
import { WorkbenchTable } from "./objects/WorkbenchTable.js";

class Example13 extends AbstractExample {
  constructor() {
    super({ rendererType: RendererType.WEB_GL2 });
  }

  protected override async setupScene(): Promise<void> {
    this.camera.projection = new PerspectiveProjection({
      fov: (75 * Math.PI) / 180,
      aspect: this.canvas.width / this.canvas.height,
      near: 0.1,
      far: 1000,
    });
    this.camera.updateProjectionMatrix();

    // 1. Lighting
    const ambientLight = new AmbientLight({ color: new Color(0.1, 0.1, 0.12), intensity: 0.5 });
    this.scene.add(ambientLight);

    const sun = new DirectionalLight({ color: new Color(1.0, 0.9, 0.8), intensity: 3.0 });
    sun.direction.set(-1, -1.5, -1);
    sun.castShadow = true;
    sun.shadowBias = 0.002;
    sun.shadowResolution = 2048;
    this.scene.add(sun);

    const spotLight = new SpotLight({
      color: new Color(1.0, 0.9, 0.7),
      intensity: 15.0,
      distance: 20.0,
      angle: Math.PI / 3,
      penumbra: 0.5,
    });
    spotLight.position.set(0, 4, 2);
    spotLight.direction.set(0, -1, -0.5);
    spotLight.castShadow = true;
    spotLight.shadowBias = 0.002;
    this.scene.add(spotLight);

    // 2. Floor
    const floor = new Object3D("Floor");
    floor.geometry = new Plane({ width: 10, depth: 10 }).getGeometryData();
    const floorMaterial = new StandardMaterial({
      color: new Color(0.1, 0.1, 0.1),
      roughness: 0.9,
      metallic: 0.0,
    });
    floor.material = floorMaterial;
    floor.receiveShadow = true;
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // 3. Load Textures
    let woodDiffuse: Texture | undefined;
    let woodNormal: Texture | undefined;

    try {
      woodDiffuse = await Texture.fromUrl("/resources/textures/wood_diffuse.png");
      woodNormal = await Texture.fromUrl("/resources/textures/wood_normal.png");
    } catch (e) {
      console.warn("Could not load wood textures", e);
    }

    // 4. Materials
    const woodMaterial = new StandardMaterial({
      color: woodDiffuse ? new Color(1.0, 1.0, 1.0) : new Color(0.4, 0.25, 0.15),
      diffuseMap: woodDiffuse,
      normalMap: woodNormal,
      roughness: 0.85,
      metallic: 0.02,
    });

    const metalMaterial = new StandardMaterial({
      color: new Color(0.2, 0.2, 0.2), // Dark metal
      roughness: 0.4,
      metallic: 0.9,
    });

    // 5. The Workbench
    const table = new WorkbenchTable("MyWorkbench", {
      width: 1.2,
      depth: 0.7,
      height: 0.45,
      topThickness: 0.08,
      woodMaterial,
      metalMaterial,
    });

    // Place it on the floor
    table.position.set(0, 0, 0);
    this.scene.add(table);

    // 6. Camera setup
    this.camera.position.set(0, 1.2, 2.0);
    this.camera.target.set(0, 0.3, 0);
    this.camera.updateViewMatrix();

    // FPS Controller
    this.camera.setStrategy(CameraStrategyType.FPS);
    const controller = new FPSController({
      moveSpeed: 2.0,
      inputMode: InputMode.STRAFE,
      enableVertical: true,
    });
    this.camera.addBehavior(controller);

    // Pointer Lock for mouse controls
    const canvas = document.querySelector("canvas");
    if (canvas) {
      canvas.addEventListener("click", () => {
        Input.requestPointerLock(canvas);
      });
    }
  }

  public override update(deltaTime: number): void {
    super.update(deltaTime);
  }
}

const example = new Example13();
example.start();
