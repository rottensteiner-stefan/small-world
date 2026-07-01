/// src/tools/pbr-preview.ts

import {
  SmallWorld,
  Object3D,
  Sphere,
  Cube,
  Torus,
  Plane,
  StandardMaterial,
  Texture,
  Color,
  DirectionalLight,
  AmbientLight,
  PerspectiveProjection,
  CameraStrategyType,
  Vector2D,
  GeometryDataInterface,
} from "../index.js";

declare global {
  interface Window {
    update3DTextures?: (
      diffuseCanvas: HTMLCanvasElement,
      normalCanvas: HTMLCanvasElement,
      roughnessCanvas: HTMLCanvasElement,
      normalStrength: number,
      metallicValue: number,
      roughnessValue: number,
    ) => Promise<void>;
    update3DGeometry?: (geomType: string) => void;
  }
}

class PbrPreviewApp extends SmallWorld {
  private _previewObject!: Object3D;
  private _pbrMaterial!: StandardMaterial;
  private _time: number = 0;

  // Geometries
  private _sphereGeometry!: GeometryDataInterface;
  private _cubeGeometry!: GeometryDataInterface;
  private _torusGeometry!: GeometryDataInterface;
  private _planeGeometry!: GeometryDataInterface;

  constructor() {
    super({
      canvasId: "SmallWorldPreview",
      fullscreen: false,
      enableInspector: false, // Turn off tweaks UI inside preview
    });
  }

  protected override async setupScene(): Promise<void> {
    const aspect = this.canvas.width / this.canvas.height;
    this.camera.projection = new PerspectiveProjection({
      fov: (50 * Math.PI) / 180,
      aspect,
      near: 0.1,
      far: 100,
    });
    this.camera.updateProjectionMatrix();

    // 1. Camera positioning
    this.camera.setStrategy(CameraStrategyType.FIXED);
    this.camera.position.set(0, 0, 4.5);
    this.camera.target.set(0, 0, 0);
    this.camera.updateViewMatrix();

    // 2. Lights
    // Ambient light
    this.scene.add(new AmbientLight({ color: new Color(1, 1, 1), intensity: 0.15 }));

    // Key directional light (Dynamic highlights)
    const keyLight = new DirectionalLight({ color: new Color(1, 0.95, 0.9), intensity: 1.2 });
    keyLight.direction.set(1.5, 1, 1).normalize();
    this.scene.add(keyLight);

    // Rim/Fill directional light (Back light)
    const fillLight = new DirectionalLight({ color: new Color(0.6, 0.8, 1.0), intensity: 0.5 });
    fillLight.direction.set(-1.5, -0.5, -1).normalize();
    this.scene.add(fillLight);

    // 3. Materials & Geometries
    this._pbrMaterial = new StandardMaterial({
      color: Color.WHITE,
      roughness: 0.6,
      metallic: 0.0,
      normalScale: new Vector2D(1.0, 1.0),
    });

    this._sphereGeometry = new Sphere({
      radius: 1,
      widthSegments: 32,
      heightSegments: 24,
    }).getGeometryData();
    this._cubeGeometry = new Cube({ size: 1.5 }).getGeometryData();
    this._torusGeometry = new Torus({
      radius: 0.9,
      tube: 0.35,
      radialSegments: 24,
      tubularSegments: 32,
    }).getGeometryData();
    this._planeGeometry = new Plane({ width: 2, depth: 2 }).getGeometryData();

    this._previewObject = new Object3D("PreviewObject").setPosition(0, 0, 0);
    this._previewObject.geometry = this._sphereGeometry;
    this._previewObject.material = this._pbrMaterial;

    this.scene.add(this._previewObject);

    // Register global communication helpers
    window.update3DTextures = async (
      diffuseCanvas: HTMLCanvasElement,
      normalCanvas: HTMLCanvasElement,
      roughnessCanvas: HTMLCanvasElement,
      normalStrength: number,
      metallicValue: number,
      roughnessValue: number,
    ): Promise<void> => {
      if (!this._pbrMaterial) return;

      try {
        // Capture frames/bitmaps from canvas elements
        const diffuseBitmap = await createImageBitmap(diffuseCanvas);
        const normalBitmap = await createImageBitmap(normalCanvas);
        const roughnessBitmap = await createImageBitmap(roughnessCanvas);

        // StandardMaterial texture maps
        this._pbrMaterial.diffuseMap = Texture.fromImage(diffuseBitmap, { generateMipmaps: true });
        this._pbrMaterial.normalMap = Texture.fromImage(normalBitmap, { generateMipmaps: true });
        this._pbrMaterial.roughnessMap = Texture.fromImage(roughnessBitmap, {
          generateMipmaps: true,
        });

        // Numeric parameters
        this._pbrMaterial.normalScale.x = normalStrength;
        this._pbrMaterial.normalScale.y = normalStrength;
        this._pbrMaterial.metallic = metallicValue;
        this._pbrMaterial.roughness = roughnessValue;
      } catch (err) {
        console.error("Error updating 3D textures in SmallWorld:", err);
      }
    };

    window.update3DGeometry = (geomType: string): void => {
      if (!this._previewObject) return;

      switch (geomType) {
        case "cube":
          this._previewObject.geometry = this._cubeGeometry;
          this._previewObject.rotation.set(0.4, 0.4, 0); // Tilt slightly to show multiple sides
          break;
        case "torus":
          this._previewObject.geometry = this._torusGeometry;
          this._previewObject.rotation.set(0.5, 0, 0);
          break;
        case "plane":
          this._previewObject.geometry = this._planeGeometry;
          this._previewObject.rotation.set(Math.PI / 6, 0, 0); // Tilt plane
          break;
        case "sphere":
        default:
          this._previewObject.geometry = this._sphereGeometry;
          this._previewObject.rotation.set(0, 0, 0);
          break;
      }
    };
  }

  protected override update(deltaTime: number): void {
    this._time += deltaTime;
    // Slowly rotate geometry to show off details
    if (this._previewObject) {
      // Rotate on Y for all except plane
      if (this._previewObject.geometry !== this._planeGeometry) {
        this._previewObject.rotation.y += deltaTime * 0.45;
      } else {
        // Plane can just rock slightly
        this._previewObject.rotation.y = Math.sin(this._time * 0.5) * 0.15;
      }
    }
    this.scene.update();
  }
}

// Start application
window.addEventListener("DOMContentLoaded", () => {
  const app = new PbrPreviewApp();
  app.start().catch((err) => {
    console.error("Failed to start SmallWorld PBR Preview:", err);
  });
});
