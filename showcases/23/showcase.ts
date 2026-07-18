import SHADERTOY_STAR_NEST from "./assets/shadertoy_star_nest.glsl?raw";
import GLSLSANDBOX_PLASMA from "./assets/glslsandbox_plasma.glsl?raw";
import SHADERTOY_FRACTAL from "./assets/shadertoy_fractal.glsl?raw";
import SHADERTOY_TOON_CREATURE from "./assets/shadertoy_toon_creature.glsl?raw";
import SHADERTOY_VORONOI_STAINED_GLASS from "./assets/shadertoy_voronoi_stained_glass.glsl?raw";
import GLSLSANDBOX_RETRO_ASCII from "./assets/glslsandbox_retro_ascii.glsl?raw";
import SHADERTOY_SIN_CITY from "./assets/shadertoy_sin_city.glsl?raw";
import SHADERTOY_CODE_TUNNEL from "./assets/shadertoy_code_tunnel.glsl?raw";
import COMPUTETOYS_SYNTHWAVE from "./assets/computetoys_synthwave.wgsl?raw";
import COMPUTETOYS_KISHIMISU from "./assets/computetoys_kishimisu.wgsl?raw";
import COMPUTETOYS_RAYMARCH from "./assets/computetoys_raymarch.wgsl?raw";
import COMPUTETOYS_TOON_SHAPE from "./assets/computetoys_toon_shape.wgsl?raw";
import COMPUTETOYS_HEX_HOLOGRAM from "./assets/computetoys_hex_hologram.wgsl?raw";
import COMPUTETOYS_MATRIX_RAIN from "./assets/computetoys_matrix_rain.wgsl?raw";
import COMPUTETOYS_SIN_CITY from "./assets/computetoys_sin_city.wgsl?raw";
import COMPUTETOYS_CODE_TUNNEL from "./assets/computetoys_code_tunnel.wgsl?raw";
import {
  AmbientLight,
  Behavior,
  CameraInterfaceData,
  CameraStrategyType,
  Color,
  ComputeToysImporter,
  Cube,
  CustomShaderMaterial,
  DirectionalLight,
  ExternalShaderUniformBehavior,
  GLSLSandboxImporter,
  Object3D,
  OrbitController,
  PhongMaterial,
  Plane,
  Raycaster,
  RendererType,
  ShadertoyImporter,
  SmallWorld,
  Vector2D,
  Vector3D,
} from "../../src/index.js";

class BobbingBehavior extends Behavior {
  private timeOffset: number = Math.random() * Math.PI * 2;
  private initialY: number = 0;
  private speed: number = 1.0 + Math.random() * 0.5;

  public onAttach(target: Object3D): void {
    super.onAttach(target);
    this.initialY = target.position.y;
  }

  public update(deltaTime: number): void {
    if (!this.target) return;
    this.timeOffset += deltaTime * this.speed;
    (this.target as Object3D).position.y = this.initialY + Math.sin(this.timeOffset) * 0.15;
  }
}

class CameraZoomBehavior extends Behavior {
  public basePosition: Vector3D;
  public targetPosition: Vector3D | null = null;
  public targetLook: Vector3D | null = null;
  public isFocused: boolean = false;
  public orbitController: OrbitController;

  constructor(basePos: Vector3D, orbit: OrbitController) {
    super();
    this.basePosition = basePos.clone();
    this.orbitController = orbit;
  }

  public update(deltaTime: number): void {
    if (!this.target) return;
    const cam = this.target as unknown as CameraInterfaceData;

    let goalPos = this.basePosition;
    let goalLook = new Vector3D(0, 0, 0);

    if (this.targetPosition) {
      goalPos = this.targetPosition;
      if (this.targetLook) goalLook = this.targetLook;

      if (this.orbitController.enabled) {
        this.orbitController.enabled = false;
        this.isFocused = true;
      }
    } else if (this.isFocused) {
      // Zooming out
      const dist =
        Math.abs(goalPos.x - cam.position.x) +
        Math.abs(goalPos.y - cam.position.y) +
        Math.abs(goalPos.z - cam.position.z);
      if (dist < 0.2) {
        this.isFocused = false;
        this.orbitController.enabled = true;
      }
    }

    // Smooth damp camera position
    cam.position.x += (goalPos.x - cam.position.x) * deltaTime * 5.0;
    cam.position.y += (goalPos.y - cam.position.y) * deltaTime * 5.0;
    cam.position.z += (goalPos.z - cam.position.z) * deltaTime * 5.0;

    // Smooth damp camera target
    cam.target.x += (goalLook.x - cam.target.x) * deltaTime * 5.0;
    cam.target.y += (goalLook.y - cam.target.y) * deltaTime * 5.0;
    cam.target.z += (goalLook.z - cam.target.z) * deltaTime * 5.0;
  }
}

class Showcase23Engine extends SmallWorld {
  public api: string;

  constructor(container: HTMLElement, api: string) {
    super({
      canvasId: container.id,
      rendererType: api === "webgl2" ? RendererType.WEB_GL2 : RendererType.WEB_GPU,
    });
    this.api = api;
  }

  protected async setupScene(): Promise<void> {
    // Setup Camera (pulled back further than before to frame three rows of screens)
    this.camera.position.set(0, 0, 11.5);
    this.camera.setStrategy(CameraStrategyType.HYBRID_SYNC);

    const orbit = new OrbitController();
    this.camera.addBehavior(orbit);

    const zoomBehavior = new CameraZoomBehavior(new Vector3D(0, 0, 11.5), orbit);
    this.camera.addBehavior(zoomBehavior);

    // Basic Light
    const dirLight = new DirectionalLight(new Color(1, 1, 1), 1.0);
    dirLight.direction.set(-1, -1, -1);
    this.scene.add(dirLight);

    // Fill Light for the right side
    const dirLight2 = new DirectionalLight(new Color(0.8, 0.8, 1.0), 0.5);
    dirLight2.direction.set(1, -0.5, -1);
    this.scene.add(dirLight2);

    // Ambient Light to illuminate dark metallic surfaces
    const ambLight = new AmbientLight(new Color(1, 1, 1), 0.3);
    this.scene.add(ambLight);

    // Build the Gallery Billboards based on API
    if (this.api === "webgl2") {
      this.buildWebGL2Gallery();
    } else {
      this.buildWebGPUGallery();
    }

    // Setup Interaction
    const raycaster = new Raycaster();
    const mouseCoords = new Vector2D();
    const canvas = document.getElementById("canvas23") as HTMLCanvasElement;

    window.addEventListener("mousedown", (e) => {
      try {
        // Don't intercept clicks on the UI
        const targetElement = e.target as HTMLElement;
        if (
          targetElement.tagName === "INPUT" ||
          targetElement.tagName === "A" ||
          targetElement.tagName === "LABEL"
        ) {
          return;
        }

        const rect = canvas.getBoundingClientRect();
        mouseCoords.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseCoords.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseCoords, this.camera);

        // Flatten scene to find frames
        const interactables: Object3D[] = [];
        for (const container of this.scene.objects) {
          if (container.name.startsWith("container_")) {
            const frame = container.children.find((c) => c.name.startsWith("frame_"));
            if (frame) {
              frame.computeBounds(); // Update bounds to current world matrix!
              interactables.push(frame);
            }
            const screen = container.children.find((c) => c.name.startsWith("screen_"));
            if (screen) {
              screen.computeBounds(); // Update bounds to current world matrix!
              interactables.push(screen);
            }
          }
        }

        const intersects = raycaster.intersectObjects(interactables, true);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          const container = hit.parent; // container_x_y

          if (container) {
            const zoomBehavior = this.camera.behaviors.find(
              (b) => b instanceof CameraZoomBehavior,
            ) as CameraZoomBehavior;
            if (zoomBehavior) {
              // Zoom into the screen specifically
              const screen = container.children.find((c) => c.name.startsWith("screen_"));
              if (screen) {
                // Calculate position slightly in front of the screen
                const screenWorldPos = screen.position.clone().add(container.position);
                const zoomDist = 2.5; // distance from screen

                // The screen is rotated around Y, so we need to push the camera back along its local Z normal
                const angle = container.rotation.y;
                zoomBehavior.targetPosition = new Vector3D(
                  screenWorldPos.x + Math.sin(angle) * zoomDist,
                  screenWorldPos.y,
                  screenWorldPos.z + Math.cos(angle) * zoomDist,
                );
                // Look directly at the screen's center
                zoomBehavior.targetLook = screenWorldPos;
              }
            }
          }
        } else {
          // Clicked on nothing, zoom out
          const zoomBehavior = this.camera.behaviors.find(
            (b) => b instanceof CameraZoomBehavior,
          ) as CameraZoomBehavior;
          if (zoomBehavior) {
            zoomBehavior.targetPosition = null;
            zoomBehavior.targetLook = null;
          }
        }
      } catch (err) {
        console.error("ERROR in mousedown handler:", err);
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const zoomBehavior = this.camera.behaviors.find(
          (b) => b instanceof CameraZoomBehavior,
        ) as CameraZoomBehavior;
        if (zoomBehavior) {
          zoomBehavior.targetPosition = null;
          zoomBehavior.targetLook = null;
        }
      }
    });
  }

  private buildWebGL2Gallery() {
    const shadertoyMat1 = new CustomShaderMaterial(
      new ShadertoyImporter().parse(SHADERTOY_STAR_NEST),
    );
    const sandboxMat = new CustomShaderMaterial(
      new GLSLSandboxImporter().parse(GLSLSANDBOX_PLASMA),
    );
    const shadertoyMat2 = new CustomShaderMaterial(
      new ShadertoyImporter().parse(SHADERTOY_FRACTAL),
    );
    const toonMat = new CustomShaderMaterial(
      new ShadertoyImporter().parse(SHADERTOY_TOON_CREATURE),
    );
    const voronoiMat = new CustomShaderMaterial(
      new ShadertoyImporter().parse(SHADERTOY_VORONOI_STAINED_GLASS),
    );
    const asciiMat = new CustomShaderMaterial(
      new GLSLSandboxImporter().parse(GLSLSANDBOX_RETRO_ASCII),
    );
    const sinCityMat = new CustomShaderMaterial(new ShadertoyImporter().parse(SHADERTOY_SIN_CITY));
    const codeTunnelMat = new CustomShaderMaterial(
      new ShadertoyImporter().parse(SHADERTOY_CODE_TUNNEL),
    );

    for (const mat of [
      shadertoyMat1,
      sandboxMat,
      shadertoyMat2,
      toonMat,
      voronoiMat,
      asciiMat,
      sinCityMat,
      codeTunnelMat,
    ]) {
      mat.backfaceCulling = false;
    }

    // Top row: the original gallery
    this.createScreen(-4.5, 3.6, Math.PI / 6, shadertoyMat1);
    this.createScreen(0, 3.6, 0, shadertoyMat2);
    this.createScreen(4.5, 3.6, -Math.PI / 6, sandboxMat);

    // Middle row: comic-style toon shading + 2 more
    this.createScreen(-4.5, 0, Math.PI / 6, toonMat);
    this.createScreen(0, 0, 0, asciiMat);
    this.createScreen(4.5, 0, -Math.PI / 6, voronoiMat);

    // Bottom row: Sin City & Code Tunnel
    this.createScreen(-2.5, -3.6, 0, sinCityMat);
    this.createScreen(2.5, -3.6, 0, codeTunnelMat);
  }

  private buildWebGPUGallery() {
    const wMat1 = new CustomShaderMaterial(new ComputeToysImporter().parse(COMPUTETOYS_SYNTHWAVE));
    const wMat2 = new CustomShaderMaterial(new ComputeToysImporter().parse(COMPUTETOYS_KISHIMISU));
    const wMat3 = new CustomShaderMaterial(new ComputeToysImporter().parse(COMPUTETOYS_RAYMARCH));
    const toonMat = new CustomShaderMaterial(
      new ComputeToysImporter().parse(COMPUTETOYS_TOON_SHAPE),
    );
    const hexMat = new CustomShaderMaterial(
      new ComputeToysImporter().parse(COMPUTETOYS_HEX_HOLOGRAM),
    );
    const matrixMat = new CustomShaderMaterial(
      new ComputeToysImporter().parse(COMPUTETOYS_MATRIX_RAIN),
    );
    const sinCityMat = new CustomShaderMaterial(
      new ComputeToysImporter().parse(COMPUTETOYS_SIN_CITY),
    );
    const codeTunnelMat = new CustomShaderMaterial(
      new ComputeToysImporter().parse(COMPUTETOYS_CODE_TUNNEL),
    );

    for (const mat of [
      wMat1,
      wMat2,
      wMat3,
      toonMat,
      hexMat,
      matrixMat,
      sinCityMat,
      codeTunnelMat,
    ]) {
      mat.backfaceCulling = false;
    }

    // Top row: the original gallery
    this.createScreen(-4.5, 3.6, Math.PI / 6, wMat1);
    this.createScreen(0, 3.6, 0, wMat2);
    this.createScreen(4.5, 3.6, -Math.PI / 6, wMat3);

    // Middle row: comic-style toon shading + 2 more
    this.createScreen(-4.5, 0, Math.PI / 6, toonMat);
    this.createScreen(0, 0, 0, hexMat);
    this.createScreen(4.5, 0, -Math.PI / 6, matrixMat);

    // Bottom row: Sin City & Code Tunnel
    this.createScreen(-2.5, -3.6, 0, sinCityMat);
    this.createScreen(2.5, -3.6, 0, codeTunnelMat);
  }

  private createScreen(
    xOffset: number,
    yOffset: number,
    yRotation: number,
    material: CustomShaderMaterial,
  ) {
    // Parent container for the screen and its frame
    const container = new Object3D(`container_${xOffset}_${yOffset}`);

    // Position it in a cylindrical layout
    const zOffset = Math.abs(xOffset) > 0 ? 1.5 : 0.0;
    container.position.set(xOffset, yOffset, zOffset);
    container.rotation.set(0, yRotation, 0);

    // Add Bobbing Animation
    container.addBehavior(new BobbingBehavior());

    // Frame (Dark Metallic)
    const frame = new Object3D(`frame_${xOffset}_${yOffset}`);
    frame.geometry = new Cube({ size: 1 }).getGeometryData();
    const frameMat = new PhongMaterial();
    frameMat.color.set(0.2, 0.2, 0.2);
    frameMat.specular = new Color(0.5, 0.5, 0.5);
    frameMat.shininess = 30;
    frame.material = frameMat;
    frame.scale.set(4.2, 3.2, 0.1);
    frame.position.set(0, 0, -0.05); // Push behind the screen
    container.add(frame);

    // Screen
    const screen = new Object3D(`screen_${xOffset}_${yOffset}`);
    screen.geometry = new Plane({
      width: 4,
      height: 3,
      widthSegments: 1,
      heightSegments: 1,
    }).getGeometryData();
    screen.material = material;
    screen.addBehavior(new ExternalShaderUniformBehavior(800, 600));
    screen.position.set(0, 0, 0.01);
    container.add(screen);

    this.scene.add(container);
  }

  protected update(): void {
    // Engine base update takes care of scene and behaviors
  }
}

async function init() {
  const container = document.getElementById("container") as HTMLElement;
  container.innerHTML = '<canvas id="canvas23"></canvas>';

  const params = new URLSearchParams(window.location.search);
  const api = params.get("api") || "off";

  if (api === "off") {
    return; // Wait for UI toggle
  }

  const engine = new Showcase23Engine(document.getElementById("canvas23") as HTMLElement, api);
  await engine.start();
}

init().catch(console.error);
