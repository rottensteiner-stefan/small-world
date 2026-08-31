import { ForgeTool, ForgeToolOptions } from "./forge/ForgeTool.js";
import { SmallWorld, Object3D } from "../core/index.js";
import { Sphere, Cube, Torus, Ground } from "../geometry/index.js";
import { StandardMaterial } from "../core/materials/index.js";
import { Texture } from "../core/textures/index.js";
import { Color } from "../core/colors/index.js";
import { DirectionalLight, AmbientLight } from "../core/lights/index.js";
import { PerspectiveProjection } from "../math/projections/index.js";
import { CameraStrategyType } from "../enums/index.js";
import { Vector2D } from "../math/index.js";
import { GeometryDataInterface } from "../interfaces/index.js";
import {
  generateHeightMap,
  generateNormalMap,
  generateSpecularMap,
  generateRoughnessMap,
  generateAOMap,
  generateEdgeMap,
} from "./common/dsp/TextureFilters.js";

export class MaterialStudioApp extends SmallWorld {
  private _previewObject!: Object3D;
  private _pbrMaterial!: StandardMaterial;
  private _time: number = 0;
  private _sphereGeometry!: GeometryDataInterface;
  private _cubeGeometry!: GeometryDataInterface;
  private _torusGeometry!: GeometryDataInterface;
  private _planeGeometry!: GeometryDataInterface;

  constructor(canvasId: string) {
    super({
      canvasId: canvasId,
      fullscreen: false,
      enableInspector: false,
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

    this.camera.setStrategy(CameraStrategyType.FIXED);
    this.camera.position.set(0, 0, 4.5);
    this.camera.target.set(0, 0, 0);
    this.camera.updateViewMatrix();

    this.scene.add(new AmbientLight({ color: new Color(1, 1, 1), intensity: 0.15 }));

    const keyLight = new DirectionalLight({ color: new Color(1, 0.95, 0.9), intensity: 1.2 });
    keyLight.direction.set(1.5, 1, 1).normalize();
    this.scene.add(keyLight);

    const fillLight = new DirectionalLight({ color: new Color(0.6, 0.8, 1.0), intensity: 0.5 });
    fillLight.direction.set(-1.5, -0.5, -1).normalize();
    this.scene.add(fillLight);

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
    this._planeGeometry = new Ground({ width: 2, depth: 2 }).getGeometryData();

    this._previewObject = new Object3D("PreviewObject").setPosition(0, 0, 0);
    this._previewObject.geometry = this._sphereGeometry;
    this._previewObject.material = this._pbrMaterial;

    this.scene.add(this._previewObject);
  }

  public async updateTextures(
    diffuseCanvas: HTMLCanvasElement,
    normalCanvas: HTMLCanvasElement,
    roughnessCanvas: HTMLCanvasElement,
    normalStrength: number,
    metallicValue: number,
    roughnessValue: number,
  ): Promise<void> {
    if (!this._pbrMaterial) return;
    try {
      const diffuseBitmap = await createImageBitmap(diffuseCanvas);
      const normalBitmap = await createImageBitmap(normalCanvas);
      const roughnessBitmap = await createImageBitmap(roughnessCanvas);

      this._pbrMaterial.diffuseMap = Texture.fromImage(diffuseBitmap, { generateMipmaps: true });
      this._pbrMaterial.normalMap = Texture.fromImage(normalBitmap, { generateMipmaps: true });
      this._pbrMaterial.roughnessMap = Texture.fromImage(roughnessBitmap, {
        generateMipmaps: true,
      });

      this._pbrMaterial.normalScale.x = normalStrength;
      this._pbrMaterial.normalScale.y = normalStrength;
      this._pbrMaterial.metallic = metallicValue;
      this._pbrMaterial.roughness = roughnessValue;
    } catch (err) {
      console.error("Error updating 3D textures in SmallWorld:", err);
    }
  }

  public updateGeometry(geomType: string): void {
    if (!this._previewObject) return;
    switch (geomType) {
      case "cube":
        this._previewObject.geometry = this._cubeGeometry;
        this._previewObject.rotation.set(0.4, 0.4, 0);
        break;
      case "torus":
        this._previewObject.geometry = this._torusGeometry;
        this._previewObject.rotation.set(0.5, 0, 0);
        break;
      case "plane":
        this._previewObject.geometry = this._planeGeometry;
        this._previewObject.rotation.set(Math.PI / 6, 0, 0);
        break;
      case "sphere":
      default:
        this._previewObject.geometry = this._sphereGeometry;
        this._previewObject.rotation.set(0, 0, 0);
        break;
    }
  }

  protected override update(deltaTime: number): void {
    this._time += deltaTime;
    if (this._previewObject) {
      if (this._previewObject.geometry !== this._planeGeometry) {
        this._previewObject.rotation.y += deltaTime * 0.45;
      } else {
        this._previewObject.rotation.y = Math.sin(this._time * 0.5) * 0.15;
      }
    }
    this.scene.update();
  }
}

export class MaterialStudio extends ForgeTool {
  private _app: MaterialStudioApp | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _onBase64Image: ((b64: string) => void) | null = null;

  constructor(options: ForgeToolOptions = {}) {
    super(options);
    this._injectCSS();
    this._buildUI();
    // delay bind logic to ensure DOM is ready
    setTimeout(() => this._bindLogic(), 100);
  }

  public getState(): unknown {
    return {};
  }

  public setState(_state: unknown): void {}

  private _injectCSS(): void {
    if (document.getElementById("material-studio-style")) return;
    const style = document.createElement("style");
    style.id = "material-studio-style";
    style.innerHTML = `
      .swf-ms-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow-y: auto;
        background: var(--bg-dark);
        color: var(--text-main);
      }
      /* Inherited from pbr-gen.html */
      :root {
        --bg-dark: #0f111a;
        --bg-panel: rgba(22, 28, 45, 0.7);
        --bg-control: #1a1f35;
        --accent: #3b82f6;
        --accent-glow: rgba(59, 130, 246, 0.3);
        --accent-green: #10b981;
        --accent-green-glow: rgba(16, 185, 129, 0.2);
        --text-main: #f8fafc;
        --text-muted: #94a3b8;
        --border: rgba(148, 163, 184, 0.1);
        --border-focus: rgba(59, 130, 246, 0.5);
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: "Outfit", sans-serif;
        background-color: var(--bg-dark);
        color: var(--text-main);
        min-height: 100vh;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
      }

      /* Custom Scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: var(--bg-dark);
      }
      ::-webkit-scrollbar-thumb {
        background: var(--bg-control);
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: var(--accent);
      }

      .badge {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        background: var(--accent-glow);
        border: 1px solid var(--accent);
        border-radius: 9999px;
        color: #93c5fd;
        font-weight: 500;
      }

      .app-container {
        display: flex;
        flex: 1;
        height: 100%;
        position: relative;
      }

      /* Sidebar controls */
      .sidebar {
        width: 380px;
        background: var(--bg-panel);
        backdrop-filter: blur(20px);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        height: 100%;
        z-index: 5;
      }

      .sidebar-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
      }

      .section-title {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.08);
        padding-bottom: 0.5rem;
      }

      .control-group {
        margin-bottom: 1.5rem;
        background: rgba(26, 31, 53, 0.3);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.1rem;
        transition: all 0.3s ease;
      }

      .control-group:hover {
        border-color: rgba(148, 163, 184, 0.15);
      }

      .control-row {
        margin-bottom: 1rem;
      }

      .control-row:last-child {
        margin-bottom: 0;
      }

      label {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
      }

      .value-display {
        color: var(--accent);
        font-family: "JetBrains Mono", monospace;
        font-size: 0.8rem;
        font-weight: 600;
      }

      select,
      input[type="text"] {
        width: 100%;
        background: var(--bg-control);
        border: 1px solid var(--border);
        color: var(--text-main);
        padding: 0.6rem 0.8rem;
        border-radius: 8px;
        font-family: inherit;
        font-size: 0.85rem;
        outline: none;
        transition: all 0.2s ease;
      }

      select:focus,
      input[type="text"]:focus {
        border-color: var(--border-focus);
        box-shadow: 0 0 0 2px var(--accent-glow);
      }

      /* Range slider custom styling */
      input[type="range"] {
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: var(--bg-control);
        outline: none;
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--accent);
        cursor: pointer;
        transition:
          transform 0.1s ease,
          background-color 0.1s ease;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
      }

      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        background: #60a5fa;
      }

      /* Toggle switch styling */
      .switch-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.2rem 0;
      }

      .switch-row label {
        margin-bottom: 0;
        cursor: pointer;
      }

      .switch {
        position: relative;
        display: inline-block;
        width: 38px;
        height: 20px;
      }

      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--bg-control);
        transition: 0.3s;
        border-radius: 20px;
        border: 1px solid var(--border);
      }

      .slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 2px;
        bottom: 2px;
        background-color: var(--text-muted);
        transition: 0.3s;
        border-radius: 50%;
      }

      input:checked + .slider {
        background-color: var(--accent);
        border-color: var(--accent);
      }

      input:checked + .slider:before {
        transform: translateX(18px);
        background-color: var(--text-main);
      }

      /* Dropzone */
      .dropzone {
        border: 2px dashed var(--border);
        border-radius: 12px;
        padding: 1.5rem 1rem;
        text-align: center;
        cursor: pointer;
        background: rgba(26, 31, 53, 0.2);
        transition: all 0.3s ease;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .dropzone:hover,
      .dropzone.dragover {
        border-color: var(--accent);
        background: rgba(59, 130, 246, 0.05);
      }

      .dropzone-icon {
        color: var(--accent);
        transition: transform 0.3s ease;
      }

      .dropzone:hover .dropzone-icon {
        transform: translateY(-3px);
      }

      .dropzone-text {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-muted);
      }

      .dropzone-sub {
        font-size: 0.7rem;
        color: rgba(148, 163, 184, 0.6);
      }

      /* Sidebar action buttons */
      .sidebar-actions {
        padding: 1.25rem 1.5rem;
        border-top: 1px solid var(--border);
        background: rgba(15, 17, 26, 0.4);
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        outline: none;
      }

      .btn-primary {
        background: var(--accent);
        color: var(--text-main);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
      }

      .btn-primary:hover {
        background: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
      }

      .btn-secondary {
        background: var(--bg-control);
        color: var(--text-main);
        border: 1px solid var(--border);
      }

      .btn-secondary:hover {
        background: #232a48;
        border-color: rgba(148, 163, 184, 0.3);
      }

      .btn-secondary.active {
        border-color: var(--accent);
        background: var(--accent-glow);
        color: var(--text-main);
      }

      /* Main Viewport & Tabs */
      .viewport {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #090a0f;
        overflow: hidden;
        position: relative;
      }

      .tabs-bar {
        display: flex;
        padding: 0.75rem 1.5rem 0 1.5rem;
        background: rgba(15, 17, 26, 0.5);
        border-bottom: 1px solid var(--border);
        gap: 0.25rem;
        overflow-x: auto;
      }

      .tab {
        padding: 0.6rem 1rem;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-family: inherit;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        border-radius: 8px 8px 0 0;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        white-space: nowrap;
      }

      .tab:hover {
        color: var(--text-main);
        background: rgba(255, 255, 255, 0.02);
      }

      .tab.active {
        color: var(--accent);
        border-bottom-color: var(--accent);
        background: rgba(59, 130, 246, 0.05);
        font-weight: 600;
      }

      .canvas-container {
        flex: 1;
        padding: 2.5rem 1.5rem 1.5rem 1.5rem;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        overflow: auto;
        position: relative;
      }

      .checkerboard {
        background-image:
          linear-gradient(45deg, #181b28 25%, transparent 25%),
          linear-gradient(-45deg, #181b28 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #181b28 75%),
          linear-gradient(-45deg, transparent 75%, #181b28 75%);
        background-size: 20px 20px;
        background-position:
          0 0,
          0 10px,
          10px -10px,
          -10px 0px;
        background-color: #10121a;
        border-radius: 12px;
        border: 1px solid var(--border);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        max-width: 100%;
        max-height: 100%;
        padding: 10px;
        transition: all 0.3s ease;
      }

      .swf-ms-content canvas {
        max-width: 100%;
        max-height: 70vh;
        object-fit: contain;
        border-radius: 6px;
        display: block;
      }

      /* Grid View */
      .grid-view {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
        width: 100%;
        height: 100%;
        padding: 0.5rem;
        overflow-y: auto;
      }

      .grid-item {
        background: var(--bg-panel);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        align-items: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        position: relative;
      }

      .grid-item-title {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        align-self: flex-start;
        display: flex;
        justify-content: space-between;
        width: 100%;
        align-items: center;
        border-bottom: 1px solid rgba(148, 163, 184, 0.08);
        padding-bottom: 0.4rem;
      }

      .grid-item-download {
        cursor: pointer;
        color: var(--accent);
        transition: color 0.2s ease;
        display: flex;
        align-items: center;
      }

      .grid-item-download:hover {
        color: #60a5fa;
      }

      .grid-item .checkerboard {
        width: 100%;
        aspect-ratio: 1;
        padding: 6px;
      }

      .grid-item canvas {
        width: 100%;
        height: 100%;
        max-height: 100%;
      }

      /* Tooltip/overlay loading indicator */
      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(9, 10, 15, 0.85);
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        backdrop-filter: blur(5px);
      }

      .loading-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(59, 130, 246, 0.1);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 1s infinite linear;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .hidden {
        display: none !important;
      }

      .tab-content-hidden {
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }

      /* Expandable sections */
      .collapsible-header {
        background: rgba(26, 31, 53, 0.5);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0.75rem 1rem;
        margin-bottom: 0.5rem;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.85rem;
        font-weight: 600;
        transition: all 0.2s ease;
      }

      .collapsible-header:hover {
        border-color: rgba(148, 163, 184, 0.2);
        background: rgba(26, 31, 53, 0.7);
      }

      .collapsible-header svg {
        transition: transform 0.2s ease;
      }

      .collapsible-header.active svg {
        transform: rotate(90deg);
      }

      .collapsible-content {
        max-height: 0;
        overflow: hidden;
        transition:
          max-height 0.3s ease-out,
          padding 0.3s ease;
        padding: 0 0.5rem;
      }

      .collapsible-content.open {
        max-height: 1000px;
        padding: 0.75rem 0.5rem 1.25rem 0.5rem;
      }
    `;
    document.head.appendChild(style);
  }

  private _buildUI(): void {
    const wrapper = document.createElement("div");
    wrapper.className = "swf-ms-container";
    wrapper.innerHTML = `
    <div class="app-container">
      <!-- Loading Screen -->
      <div id="loading-overlay" class="loading-overlay active">
        <div class="spinner"></div>
        <div id="loading-text" style="font-weight: 600; font-size: 0.95rem">
          Processing rock texture...
        </div>
      </div>

      <!-- Sidebar controls -->
      <div class="sidebar">
        <div class="sidebar-scroll">
          <!-- Dropzone / File Upload -->
          <div id="dropzone" class="dropzone">
            <svg
              class="dropzone-icon"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <div class="dropzone-text">Upload / Drag & Drop Image</div>
            <div class="dropzone-sub">PNG, JPG, WebP up to 8MB</div>
            <input type="file" id="file-input" class="hidden" accept="image/*" />
          </div>

          <!-- Preset select -->
          <div class="section-title">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            Preset Profile
          </div>
          <div class="control-row" style="margin-bottom: 1.5rem">
            <select id="profile-select">
              <option value="default" selected>Default (Balanced)</option>
              <option value="stone">Stone (High Normal, Rough)</option>
              <option value="metal">Metal (Smooth, Shiny Spec)</option>
              <option value="wood">Wood (Grained, Deep Relief)</option>
            </select>
          </div>

          <div class="section-title">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Configure Parameters
          </div>

          <!-- 1. Height Map Settings -->
          <div class="collapsible-header active" data-target="height-settings">
            <span>Height Map Settings</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div id="height-settings" class="collapsible-content open">
            <div class="control-row">
              <label>
                Blur Radius
                <span id="height-blur-val" class="value-display">0</span>
              </label>
              <input type="range" id="height-blur-slider" min="0" max="10" step="1" value="0" />
            </div>
            <div class="control-row">
              <label>
                Contrast
                <span id="height-contrast-val" class="value-display">1.0</span>
              </label>
              <input
                type="range"
                id="height-contrast-slider"
                min="0.5"
                max="3.0"
                step="0.1"
                value="1.0"
              />
            </div>
            <div class="control-row switch-row">
              <label for="height-invert">Invert Map</label>
              <div class="switch">
                <input type="checkbox" id="height-invert" />
                <span class="slider"></span>
              </div>
            </div>
          </div>

          <!-- 2. Normal Map Settings -->
          <div class="collapsible-header" data-target="normal-settings">
            <span>Normal Map Settings</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div id="normal-settings" class="collapsible-content">
            <div class="control-row">
              <label>
                Bump Strength
                <span id="normal-strength-val" class="value-display">100%</span>
              </label>
              <input
                type="range"
                id="normal-strength-slider"
                min="10"
                max="300"
                step="5"
                value="100"
              />
            </div>
            <div class="control-row">
              <label> Format </label>
              <select id="normal-format">
                <option value="opengl">OpenGL (+Y / Green Up)</option>
                <option value="directx">DirectX (-Y / Green Down)</option>
              </select>
            </div>
            <div class="control-row switch-row">
              <label for="normal-invert-r">Invert Red (X-axis)</label>
              <div class="switch">
                <input type="checkbox" id="normal-invert-r" />
                <span class="slider"></span>
              </div>
            </div>
          </div>

          <!-- 3. Specular Map Settings -->
          <div class="collapsible-header" data-target="specular-settings">
            <span>Specular Map Settings</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div id="specular-settings" class="collapsible-content">
            <div class="control-row">
              <label>
                Sigmoidal Contrast
                <span id="spec-contrast-val" class="value-display">10</span>
              </label>
              <input type="range" id="spec-contrast-slider" min="0" max="30" step="1" value="10" />
            </div>
            <div class="control-row">
              <label>
                Midpoint Threshold
                <span id="spec-thresh-val" class="value-display">50%</span>
              </label>
              <input type="range" id="spec-thresh-slider" min="10" max="90" step="5" value="50" />
            </div>
            <div class="control-row switch-row">
              <label for="spec-invert">Invert Specular</label>
              <div class="switch">
                <input type="checkbox" id="spec-invert" />
                <span class="slider"></span>
              </div>
            </div>
          </div>

          <!-- 4. Roughness Map Settings -->
          <div class="collapsible-header" data-target="roughness-settings">
            <span>Roughness Map Settings</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div id="roughness-settings" class="collapsible-content">
            <div class="control-row">
              <label>
                Gamma Exponent
                <span id="rough-gamma-val" class="value-display">1.20</span>
              </label>
              <input
                type="range"
                id="rough-gamma-slider"
                min="0.20"
                max="3.00"
                step="0.05"
                value="1.20"
              />
            </div>
            <div class="control-row switch-row">
              <label for="rough-invert">Invert Roughness</label>
              <div class="switch">
                <input type="checkbox" id="rough-invert" />
                <span class="slider"></span>
              </div>
            </div>
          </div>

          <!-- 5. Ambient Occlusion Settings -->
          <div class="collapsible-header" data-target="ao-settings">
            <span>Ambient Occlusion Settings</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div id="ao-settings" class="collapsible-content">
            <div class="control-row">
              <label>
                Soft Shadow Blur
                <span id="ao-soft-val" class="value-display">15px</span>
              </label>
              <input type="range" id="ao-soft-slider" min="3" max="40" step="1" value="15" />
            </div>
            <div class="control-row">
              <label>
                Crevice Strength (Fine)
                <span id="ao-fine-val" class="value-display">1.0</span>
              </label>
              <input type="range" id="ao-fine-slider" min="0.0" max="3.0" step="0.1" value="1.0" />
            </div>
            <div class="control-row">
              <label>
                AO Intensity Level
                <span id="ao-level-val" class="value-display">30%</span>
              </label>
              <input type="range" id="ao-level-slider" min="0" max="80" step="5" value="30" />
            </div>
          </div>

          <!-- 6. Edge Map Settings -->
          <div class="collapsible-header" data-target="edge-settings">
            <span>Edge Map Settings</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div id="edge-settings" class="collapsible-content">
            <div class="control-row">
              <label>
                Contrast Threshold
                <span id="edge-thresh-val" class="value-display">90%</span>
              </label>
              <input type="range" id="edge-thresh-slider" min="50" max="98" step="1" value="90" />
            </div>
            <div class="control-row">
              <label>
                Edge Thickness
                <span id="edge-thick-val" class="value-display">1</span>
              </label>
              <input type="range" id="edge-thick-slider" min="1" max="5" step="1" value="1" />
            </div>
            <div class="control-row switch-row">
              <label for="edge-invert">Invert Colors (Dark line)</label>
              <div class="switch">
                <input type="checkbox" id="edge-invert" checked />
                <span class="slider"></span>
              </div>
            </div>
          </div>

          <!-- 7. 3D Preview Settings -->
          <div class="collapsible-header" data-target="preview-3d-settings">
            <span>3D Preview Settings</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div id="preview-3d-settings" class="collapsible-content">
            <div class="control-row">
              <label>
                Metallic Base
                <span id="metallic-val" class="value-display">0%</span>
              </label>
              <input type="range" id="metallic-slider" min="0" max="100" step="5" value="0" />
            </div>
            <div class="control-row">
              <label>
                Roughness Override
                <span id="roughness-override-val" class="value-display">60%</span>
              </label>
              <input
                type="range"
                id="roughness-override-slider"
                min="0"
                max="100"
                step="5"
                value="60"
              />
            </div>
          </div>

          <!-- Global Export Size -->
          <div class="section-title" style="margin-top: 1.5rem">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Export Properties
          </div>
          <div class="control-row">
            <label>Working Max Resolution</label>
            <select id="export-size">
              <option value="256">256 x 256 (Ultra Fast)</option>
              <option value="512" selected>512 x 512 (Recommended)</option>
              <option value="1024">1024 x 1024 (HD Detail)</option>
              <option value="original">Original Image Size (Full Resolution)</option>
            </select>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="sidebar-actions">
          <button id="btn-download-all" class="btn btn-primary">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download All Maps
          </button>
        </div>
      </div>

      <!-- Main Viewport -->
      <div class="viewport">
        <div class="tabs-bar">
          <button class="tab active" data-tab="grid">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            All Maps Grid
          </button>
          <button class="tab" data-tab="original">Original (Diffuse)</button>
          <button class="tab" data-tab="height">Height Map</button>
          <button class="tab" data-tab="normal">Normal Map</button>
          <button class="tab" data-tab="specular">Specular Map</button>
          <button class="tab" data-tab="roughness">Roughness Map</button>
          <button class="tab" data-tab="ao">Ambient Occlusion</button>
          <button class="tab" data-tab="edge">Edge Map</button>
          <button class="tab" data-tab="preview3d" style="color: #60a5fa; font-weight: 600">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path
                d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
              />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            Small World Engine Preview
          </button>
        </div>

        <div class="canvas-container">
          <!-- Grid View Content -->
          <div id="grid-view-container" class="grid-view">
            <div class="grid-item">
              <div class="grid-item-title">
                <span>Original (Diffuse)</span>
              </div>
              <div class="checkerboard">
                <canvas id="canvas-grid-original"></canvas>
              </div>
            </div>

            <div class="grid-item">
              <div class="grid-item-title">
                <span>Height Map</span>
                <span class="grid-item-download" data-map="height" title="Download Height Map">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </span>
              </div>
              <div class="checkerboard">
                <canvas id="canvas-grid-height"></canvas>
              </div>
            </div>

            <div class="grid-item">
              <div class="grid-item-title">
                <span>Normal Map</span>
                <span class="grid-item-download" data-map="normal" title="Download Normal Map">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </span>
              </div>
              <div class="checkerboard">
                <canvas id="canvas-grid-normal"></canvas>
              </div>
            </div>

            <div class="grid-item">
              <div class="grid-item-title">
                <span>Specular Map</span>
                <span class="grid-item-download" data-map="specular" title="Download Specular Map">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </span>
              </div>
              <div class="checkerboard">
                <canvas id="canvas-grid-specular"></canvas>
              </div>
            </div>

            <div class="grid-item">
              <div class="grid-item-title">
                <span>Roughness Map</span>
                <span
                  class="grid-item-download"
                  data-map="roughness"
                  title="Download Roughness Map"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </span>
              </div>
              <div class="checkerboard">
                <canvas id="canvas-grid-roughness"></canvas>
              </div>
            </div>

            <div class="grid-item">
              <div class="grid-item-title">
                <span>Ambient Occlusion</span>
                <span class="grid-item-download" data-map="ao" title="Download AO Map">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </span>
              </div>
              <div class="checkerboard">
                <canvas id="canvas-grid-ao"></canvas>
              </div>
            </div>

            <div class="grid-item">
              <div class="grid-item-title">
                <span>Edge Map</span>
                <span class="grid-item-download" data-map="edge" title="Download Edge Map">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </span>
              </div>
              <div class="checkerboard">
                <canvas id="canvas-grid-edge"></canvas>
              </div>
            </div>
          </div>

          <!-- Single Active Map Preview -->
          <div
            id="single-view-container"
            class="checkerboard tab-content-hidden"
            style="width: auto; height: auto"
          >
            <canvas id="canvas-main-preview"></canvas>
          </div>

          <!-- 3D Preview Container -->
          <div
            id="preview3d-container"
            class="tab-content-hidden"
              style="
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              gap: 1.25rem;
              align-items: center;
              justify-content: flex-start;
              padding-top: 1rem;
            "
          >
            <div
              style="
                display: flex;
                gap: 0.5rem;
                background: var(--bg-panel);
                padding: 0.4rem;
                border-radius: 8px;
                border: 1px solid var(--border);
              "
            >
              <button
                class="btn btn-secondary geom-btn active"
                data-geom="sphere"
                style="padding: 0.4rem 0.8rem; font-size: 0.75rem"
              >
                Sphere
              </button>
              <button
                class="btn btn-secondary geom-btn"
                data-geom="cube"
                style="padding: 0.4rem 0.8rem; font-size: 0.75rem"
              >
                Cube
              </button>
              <button
                class="btn btn-secondary geom-btn"
                data-geom="torus"
                style="padding: 0.4rem 0.8rem; font-size: 0.75rem"
              >
                Torus
              </button>
              <button
                class="btn btn-secondary geom-btn"
                data-geom="plane"
                style="padding: 0.4rem 0.8rem; font-size: 0.75rem"
              >
                Plane
              </button>
            </div>
            <div
              style="
                flex: 1;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
              "
            >
              <canvas
                id="SmallWorldPreview"
                width="512"
                height="384"
                style="
                  max-width: 100%;
                  max-height: 60vh;
                  border-radius: 12px;
                  background: #000;
                  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
                "
              ></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Load SmallWorld 3D Preview Engine Entry -->`;
    this._container.appendChild(wrapper);
  }

  private _bindLogic(): void {
    try {
      // ----------------------------------------------------
      // Presets Configuration (Derived from pbr.profiles)
      // ----------------------------------------------------
      const PRESETS = {
        default: {
          heightBlur: 0,
          heightContrast: 1.0,
          heightInvert: false,
          normalStrength: 100,
          normalFormat: "opengl",
          normalInvertR: false,
          specContrast: 10,
          specThresh: 50,
          specInvert: false,
          roughGamma: 1.2,
          roughInvert: false,
          aoSoft: 15,
          aoFine: 1.0,
          aoLevel: 30,
          edgeThresh: 90,
          edgeThick: 1,
          edgeInvert: true,
        },
        stone: {
          heightBlur: 1,
          heightContrast: 1.2,
          heightInvert: false,
          normalStrength: 180,
          normalFormat: "opengl",
          normalInvertR: false,
          specContrast: 5,
          specThresh: 40,
          specInvert: false,
          roughGamma: 0.7,
          roughInvert: false,
          aoSoft: 25,
          aoFine: 1.5,
          aoLevel: 20,
          edgeThresh: 85,
          edgeThick: 2,
          edgeInvert: true,
        },
        metal: {
          heightBlur: 0,
          heightContrast: 0.8,
          heightInvert: false,
          normalStrength: 50,
          normalFormat: "opengl",
          normalInvertR: false,
          specContrast: 25,
          specThresh: 60,
          specInvert: false,
          roughGamma: 1.8,
          roughInvert: false,
          aoSoft: 5,
          aoFine: 0.5,
          aoLevel: 40,
          edgeThresh: 95,
          edgeThick: 1,
          edgeInvert: true,
        },
        wood: {
          heightBlur: 1,
          heightContrast: 1.1,
          heightInvert: false,
          normalStrength: 200,
          normalFormat: "opengl",
          normalInvertR: false,
          specContrast: 0,
          specThresh: 40,
          specInvert: false,
          roughGamma: 1.5,
          roughInvert: false,
          aoSoft: 20,
          aoFine: 1.2,
          aoLevel: 20,
          edgeThresh: 85,
          edgeThick: 1,
          edgeInvert: true,
        },
      };

      // ----------------------------------------------------
      // State variables
      // ----------------------------------------------------
      const originalImage = new Image();
      let originalFileName = "rock";
      let loadedData: ImageData | null = null; // Original scaled ImageData
      let activeTab = "grid";
      let isProcessing = false;
      let needsUpdate = false;

      // Cache canvases
      const canvases = {
        original: document.createElement("canvas"),
        height: document.createElement("canvas"),
        normal: document.createElement("canvas"),
        specular: document.createElement("canvas"),
        roughness: document.createElement("canvas"),
        ao: document.createElement("canvas"),
        edge: document.createElement("canvas"),
      };

      // Display canvases (visible on screen)
      const displays = {
        original: document.getElementById("canvas-grid-original"),
        height: document.getElementById("canvas-grid-height"),
        normal: document.getElementById("canvas-grid-normal"),
        specular: document.getElementById("canvas-grid-specular"),
        roughness: document.getElementById("canvas-grid-roughness"),
        ao: document.getElementById("canvas-grid-ao"),
        edge: document.getElementById("canvas-grid-edge"),
        preview: document.getElementById("canvas-main-preview"),
      };

      // ----------------------------------------------------
      // Expandable Collapsibles UI
      // ----------------------------------------------------
      document.querySelectorAll(".collapsible-header").forEach((header) => {
        header.addEventListener("click", () => {
          header.classList.toggle("active");
          const targetId = header.getAttribute("data-target") || "";
          const content = document.getElementById(targetId);
          if (content) content.classList.toggle("open");
        });
      });

      // ----------------------------------------------------
      // Drag and Drop & Upload Files
      // ----------------------------------------------------
      const dropzone = document.getElementById("dropzone");
      const fileInput = document.getElementById("file-input") as HTMLInputElement | null;

      if (dropzone && fileInput) {
        dropzone.addEventListener("click", () => fileInput.click());

        dropzone.addEventListener("dragover", (e) => {
          e.preventDefault();
          dropzone.classList.add("dragover");
        });

        dropzone.addEventListener("dragleave", () => {
          dropzone.classList.remove("dragover");
        });

        dropzone.addEventListener("drop", (e) => {
          e.preventDefault();
          dropzone.classList.remove("dragover");
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        });

        fileInput.addEventListener("change", () => {
          if (fileInput.files && fileInput.files[0]) {
            handleFile(fileInput.files[0]);
          }
        });
      }

      function handleFile(file: File): void {
        if (!file.type.match("image.*")) {
          alert("Please upload an image file (PNG, JPG, WebP).");
          return;
        }
        originalFileName = file.name.split(".")[0] || "unknown";

        const reader = new FileReader();
        reader.onload = (e): void => {
          const loadingText = document.getElementById("loading-text");
          if (loadingText) loadingText.innerText = "Loading uploaded image...";
          const loadingOverlay = document.getElementById("loading-overlay");
          if (loadingOverlay) loadingOverlay.classList.add("active");
          originalImage.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }

      this._onBase64Image = (b64: string): void => {
        originalFileName = "pasted_image";
        const loadingText = document.getElementById("loading-text");
        if (loadingText) loadingText.innerText = "Loading pasted image...";
        const loadingOverlay = document.getElementById("loading-overlay");
        if (loadingOverlay) loadingOverlay.classList.add("active");
        originalImage.src = b64;
      };

      // ----------------------------------------------------
      // Pre-load default texture
      // ----------------------------------------------------
      // ----------------------------------------------------
      // Pre-load default texture
      // ----------------------------------------------------
      // Load standard rock image from public files
      originalImage.onload = (): void => {
        initializeImageData();
      };
      originalImage.onerror = (): void => {
        // Fallback: draw a noise pattern if the file doesn't load
        createProceduralFallback();
      };
      // Load rock texture
      originalImage.src = "/showcases/10/assets/rock.webp";

      function createProceduralFallback(): void {
        // Simple canvas fallback texture (256x256 simple rock noise)
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          for (let y = 0; y < 256; y++) {
            for (let x = 0; x < 256; x++) {
              const v = Math.floor(
                128 + Math.sin(x * 0.1) * 30 + Math.cos(y * 0.1) * 30 + Math.random() * 20,
              );
              ctx.fillStyle = `rgb(${v},${v - 10},${v - 20})`;
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
        originalFileName = "procedural_fallback";
        originalImage.src = canvas.toDataURL();
      }

      // Initialize dimensions and read data
      function initializeImageData(): void {
        const maxRes = (document.getElementById("export-size") as HTMLInputElement).value;
        let w = originalImage.naturalWidth;
        let h = originalImage.naturalHeight;

        if (maxRes !== "original") {
          const sizeLimit = parseInt(maxRes, 10);
          if (w > sizeLimit || h > sizeLimit) {
            if (w > h) {
              h = Math.round((h * sizeLimit) / w);
              w = sizeLimit;
            } else {
              w = Math.round((w * sizeLimit) / h);
              h = sizeLimit;
            }
          }
        }

        // Set offscreen sizes
        for (const k in canvases) {
          const key = k as keyof typeof canvases;
          canvases[key].width = w;
          canvases[key].height = h;
        }

        const ctx = canvases.original.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(originalImage, 0, 0, w, h);
          loadedData = ctx.getImageData(0, 0, w, h);
        }

        // Trigger update
        triggerPBRUpdate();
      }

      // ----------------------------------------------------
      // UI Slider Input Handlers
      // ----------------------------------------------------
      const sliders = [
        { id: "height-blur", suffix: "" },
        { id: "height-contrast", suffix: "" },
        { id: "normal-strength", suffix: "%" },
        { id: "spec-contrast", suffix: "" },
        { id: "spec-thresh", suffix: "%" },
        { id: "rough-gamma", suffix: "" },
        { id: "ao-soft", suffix: "px" },
        { id: "ao-fine", suffix: "" },
        { id: "ao-level", suffix: "%" },
        { id: "edge-thresh", suffix: "%" },
        { id: "edge-thick", suffix: "" },
        { id: "metallic", suffix: "%" },
        { id: "roughness-override", suffix: "%" },
      ];

      sliders.forEach((s) => {
        const slider = document.getElementById(s.id + "-slider") as HTMLInputElement | null;
        const valDisp = document.getElementById(s.id + "-val");

        if (slider && valDisp) {
          slider.addEventListener("input", () => {
            valDisp.innerText = slider.value + s.suffix;
            triggerPBRUpdate();
          });
        }
      });

      document.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.addEventListener("change", triggerPBRUpdate);
      });

      document.getElementById("normal-format")?.addEventListener("change", triggerPBRUpdate);
      document.getElementById("export-size")?.addEventListener("change", initializeImageData);

      // Profile select changes preset values
      document.getElementById("profile-select")?.addEventListener("change", (e) => {
        const profile = (e.target as HTMLSelectElement)?.value;
        if (PRESETS[profile as keyof typeof PRESETS]) {
          applyPreset(PRESETS[profile as keyof typeof PRESETS], profile);
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function applyPreset(preset: any, profileName: string): void {
        const updateSliderAndVal = (
          id: string,
          val: string | number | boolean,
          postfix: string = "",
        ): void => {
          const slider = document.getElementById(id + "-slider") as HTMLInputElement | null;
          if (slider) slider.value = String(val);
          const valEl = document.getElementById(id + "-val");
          if (valEl) valEl.innerText = String(val) + postfix;
        };

        const updateCheckbox = (id: string, checked: unknown): void => {
          const cb = document.getElementById(id) as HTMLInputElement | null;
          if (cb) cb.checked = Boolean(checked);
        };

        // Loop sliders and checkboxes
        updateSliderAndVal("height-blur", preset.heightBlur);
        updateSliderAndVal("height-contrast", preset.heightContrast);
        updateCheckbox("height-invert", preset.heightInvert);

        updateSliderAndVal("normal-strength", preset.normalStrength, "%");

        const normalFormat = document.getElementById("normal-format") as HTMLInputElement | null;
        if (normalFormat) normalFormat.value = preset.normalFormat;

        updateCheckbox("normal-invert-r", preset.normalInvertR);

        updateSliderAndVal("spec-contrast", preset.specContrast);
        updateSliderAndVal("spec-thresh", preset.specThresh, "%");
        updateCheckbox("spec-invert", preset.specInvert);

        updateSliderAndVal("rough-gamma", preset.roughGamma);
        updateCheckbox("rough-invert", preset.roughInvert);

        updateSliderAndVal("ao-soft", preset.aoSoft, "px");
        updateSliderAndVal("ao-fine", preset.aoFine);
        updateSliderAndVal("ao-level", preset.aoLevel, "%");

        updateSliderAndVal("edge-thresh", preset.edgeThresh, "%");
        updateSliderAndVal("edge-thick", preset.edgeThick);
        updateCheckbox("edge-invert", preset.edgeInvert);

        // Adjust preview material based on preset
        if (profileName === "metal") {
          updateSliderAndVal("metallic", 90, "%");
        } else {
          updateSliderAndVal("metallic", 0, "%");
        }

        triggerPBRUpdate();
      }

      // Tab switcher
      document.querySelectorAll(".tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");

          activeTab = tab.getAttribute("data-tab") || "";

          const gridView = document.getElementById("grid-view-container");
          const singleView = document.getElementById("single-view-container");
          const preview3dContainer = document.getElementById("preview3d-container");

          if (activeTab === "grid") {
            gridView?.classList.remove("tab-content-hidden");
            singleView?.classList.add("tab-content-hidden");
            preview3dContainer?.classList.add("tab-content-hidden");
          } else if (activeTab === "preview3d") {
            gridView?.classList.add("tab-content-hidden");
            singleView?.classList.add("tab-content-hidden");
            preview3dContainer?.classList.remove("tab-content-hidden");
            // Trigger immediate push of textures to 3D view
            pushTexturesTo3D();
          } else {
            gridView?.classList.add("tab-content-hidden");
            singleView?.classList.remove("tab-content-hidden");
            preview3dContainer?.classList.add("tab-content-hidden");

            // Draw active map onto preview canvas
            const mainPreview = displays.preview as HTMLCanvasElement;
            mainPreview.width = canvases[activeTab as keyof typeof canvases].width;
            mainPreview.height = canvases[activeTab as keyof typeof canvases].height;
            const ctx = mainPreview.getContext("2d");
            if (ctx) ctx.drawImage(canvases[activeTab as keyof typeof canvases], 0, 0);
          }

          // Show/hide relevant settings in the sidebar
          document.querySelectorAll(".collapsible-header").forEach((header) => {
            const target = header.getAttribute("data-target") || "";
            const content = document.getElementById(target);
            if (activeTab === "grid" || activeTab === "preview3d") {
              (header as HTMLElement).style.display = "flex";
            } else {
              if (target === activeTab + "-settings") {
                (header as HTMLElement).style.display = "flex";
                header.classList.add("active");
                if (content) content.classList.add("open");
              } else {
                (header as HTMLElement).style.display = "none";
                header.classList.remove("active");
                if (content) content.classList.remove("open");
              }
            }
          });
        });
      });

      // 3D Geometry Swap buttons
      document.querySelectorAll(".geom-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".geom-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const geom = btn.getAttribute("data-geom") || "";
          if (this._app) {
            this._app.updateGeometry(geom);
          }
        });
      });

      // Individual downloads in grid view
      document.querySelectorAll(".grid-item-download").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const mapType = btn.getAttribute("data-map") || "";
          downloadMap(mapType);
        });
      });

      // Click main canvas to download active map
      document.getElementById("canvas-main-preview")?.addEventListener("click", () => {
        if (activeTab === "grid" || activeTab === "preview3d") {
          return;
        }
        downloadMap(activeTab);
      });
      // Add cursor style to indicate it's clickable
      const mainPreviewCanvas = document.getElementById("canvas-main-preview");
      if (mainPreviewCanvas) {
        mainPreviewCanvas.style.cursor = "pointer";
        mainPreviewCanvas.title = "Click to download this map";
      }

      document.getElementById("btn-download-all")?.addEventListener("click", () => {
        const mapsToDownload = ["height", "normal", "specular", "roughness", "ao", "edge"];
        mapsToDownload.forEach((mapType) => {
          downloadMap(mapType);
        });
      });

      function downloadMap(mapType: string): void {
        const canvas = canvases[mapType as keyof typeof canvases];
        const link = document.createElement("a");
        link.download = `${originalFileName}_${mapType}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }

      // ----------------------------------------------------
      // Update Trigger
      // ----------------------------------------------------
      function triggerPBRUpdate(): void {
        needsUpdate = true;
        if (!isProcessing) {
          requestAnimationFrame(updateLoop);
        }
      }

      function updateLoop(): void {
        if (needsUpdate && loadedData) {
          needsUpdate = false;
          isProcessing = true;

          document.getElementById("loading-overlay")?.classList.add("active");
          const el = document.getElementById("loading-text");
          if (el) el.innerText = "Recalculating maps...";

          // Use timeout to let browser render loading overlay before blocking thread
          setTimeout(() => {
            generatePBRMaps();
            pushTexturesTo3D();
            isProcessing = false;
            document.getElementById("loading-overlay")?.classList.remove("active");

            // Recurse if needed
            if (needsUpdate) {
              triggerPBRUpdate();
            }
          }, 30);
        }
      }

      const pushTexturesTo3D = (): void => {
        if (this._app) {
          const normalStrength =
            parseFloat(
              (document.getElementById("normal-strength-slider") as HTMLInputElement).value,
            ) / 100.0;
          const metallicValue =
            parseFloat((document.getElementById("metallic-slider") as HTMLInputElement).value) /
            100.0;
          const roughnessValue =
            parseFloat(
              (document.getElementById("roughness-override-slider") as HTMLInputElement).value,
            ) / 100.0;

          this._app.updateTextures(
            canvases.original,
            canvases.normal,
            canvases.roughness,
            normalStrength,
            metallicValue,
            roughnessValue,
          );
        }
      };

      // ----------------------------------------------------
      // Main Processing Pipeline
      // ----------------------------------------------------
      function generatePBRMaps(): void {
        const w = loadedData!.width;
        const h = loadedData!.height;
        const pixels = loadedData!.data;

        // Extract slider parameters
        const heightBlur = parseInt(
          (document.getElementById("height-blur-slider") as HTMLInputElement).value,
          10,
        );
        const heightContrast = parseFloat(
          (document.getElementById("height-contrast-slider") as HTMLInputElement).value,
        );
        const heightInvert = (document.getElementById("height-invert") as HTMLInputElement).checked;

        const normalStrength =
          parseFloat(
            (document.getElementById("normal-strength-slider") as HTMLInputElement).value,
          ) / 100.0;
        const normalFormat = (document.getElementById("normal-format") as HTMLInputElement).value;
        const normalInvertR = (document.getElementById("normal-invert-r") as HTMLInputElement)
          .checked;

        const specContrast = parseInt(
          (document.getElementById("spec-contrast-slider") as HTMLInputElement).value,
          10,
        );
        const specThresh =
          parseInt((document.getElementById("spec-thresh-slider") as HTMLInputElement).value, 10) /
          100.0;
        const specInvert = (document.getElementById("spec-invert") as HTMLInputElement).checked;

        const roughGamma = parseFloat(
          (document.getElementById("rough-gamma-slider") as HTMLInputElement).value,
        );
        const roughInvert = (document.getElementById("rough-invert") as HTMLInputElement).checked;

        const aoSoft = parseInt(
          (document.getElementById("ao-soft-slider") as HTMLInputElement).value,
          10,
        );
        const aoFine = parseFloat(
          (document.getElementById("ao-fine-slider") as HTMLInputElement).value,
        );
        const aoLevel =
          parseInt((document.getElementById("ao-level-slider") as HTMLInputElement).value, 10) /
          100.0;

        const edgeThresh =
          parseInt((document.getElementById("edge-thresh-slider") as HTMLInputElement).value, 10) /
          100.0;
        const edgeThick = parseInt(
          (document.getElementById("edge-thick-slider") as HTMLInputElement).value,
          10,
        );
        const edgeInvert = (document.getElementById("edge-invert") as HTMLInputElement).checked;

        // 1. HEIGHT MAP
        const heightCtx = canvases.height.getContext("2d");
        const heightData = heightCtx!.createImageData(w, h);
        heightData.data.set(
          generateHeightMap(pixels, w, h, {
            blur: heightBlur,
            contrast: heightContrast,
            invert: heightInvert,
          }),
        );
        heightCtx!.putImageData(heightData, 0, 0);
        const hPixels = heightData.data;

        // 2. NORMAL MAP
        const normalCtx = canvases.normal.getContext("2d");
        const normalData = normalCtx!.createImageData(w, h);
        normalData.data.set(
          generateNormalMap(hPixels, w, h, {
            strength: normalStrength,
            format: normalFormat,
            invertR: normalInvertR,
          }),
        );
        normalCtx!.putImageData(normalData, 0, 0);

        // 3. SPECULAR MAP
        const specCtx = canvases.specular.getContext("2d");
        const specData = specCtx!.createImageData(w, h);
        specData.data.set(
          generateSpecularMap(hPixels, {
            contrast: specContrast,
            threshold: specThresh,
            invert: specInvert,
          }),
        );
        specCtx!.putImageData(specData, 0, 0);
        const sPixels = specData.data;

        // 4. ROUGHNESS MAP
        const roughCtx = canvases.roughness.getContext("2d");
        const roughData = roughCtx!.createImageData(w, h);
        roughData.data.set(
          generateRoughnessMap(sPixels, { gamma: roughGamma, invert: roughInvert }),
        );
        roughCtx!.putImageData(roughData, 0, 0);

        // 5. AO MAP
        const aoCtx = canvases.ao.getContext("2d");
        const aoData = aoCtx!.createImageData(w, h);
        aoData.data.set(
          generateAOMap(hPixels, w, h, { soft: aoSoft, fine: aoFine, level: aoLevel }),
        );
        aoCtx!.putImageData(aoData, 0, 0);

        // 6. EDGE MAP
        const edgeCtx = canvases.edge.getContext("2d");
        const edgeData = edgeCtx!.createImageData(w, h);
        edgeData.data.set(
          generateEdgeMap(hPixels, w, h, {
            threshold: edgeThresh,
            thickness: edgeThick,
            invert: edgeInvert,
          }),
        );
        edgeCtx!.putImageData(edgeData, 0, 0);

        // 7. DRAW TO VIEWPORTS
        // Draw to grid views
        for (const key in displays) {
          if (key === "preview") continue;

          const canvas = (displays as unknown as Record<string, HTMLCanvasElement>)[key];
          if (!canvas) continue;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          const srcCanvas = (canvases as unknown as Record<string, HTMLCanvasElement>)[key];
          if (ctx && srcCanvas) ctx.drawImage(srcCanvas, 0, 0);
        }

        // Draw active single view if active
        if (activeTab !== "grid" && activeTab !== "preview3d") {
          const mainPreview = displays.preview as HTMLCanvasElement;
          if (mainPreview) {
            mainPreview.width = w;
            mainPreview.height = h;
            const ctx = mainPreview.getContext("2d");
            if (ctx) {
              const targetCanvas = (canvases as unknown as Record<string, HTMLCanvasElement>)[
                activeTab
              ];
              if (targetCanvas) ctx.drawImage(targetCanvas, 0, 0);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  public override mount(container: HTMLElement): void {
    super.mount(container);

    // Check if the canvas exists in our HTML
    this._canvas = this._container.querySelector("#SmallWorldPreview") as HTMLCanvasElement;
    if (this._canvas) {
      this._app = new MaterialStudioApp("SmallWorldPreview");
      this._app.start().catch((err) => {
        console.error("Failed to start MaterialStudio engine:", err);
      });
    }
  }

  public override onPasteImage(base64: string): void {
    if (this._onBase64Image) {
      this._onBase64Image(base64);
    }
  }

  public override unmount(): void {
    super.unmount();
    this._app = null;
    this._canvas = null;
  }

  public override resize(width: number, height: number): void {
    super.resize(width, height);
    if (this._app && this._app.renderer && this._app.camera && this._canvas) {
      if (this._canvas.clientWidth > 0 && this._canvas.clientHeight > 0) {
        this._canvas.width = this._canvas.clientWidth;
        this._canvas.height = this._canvas.clientHeight;
        this._app.camera.aspect = this._canvas.clientWidth / this._canvas.clientHeight;
        this._app.camera.updateProjectionMatrix();
        this._app.renderer.setSize(this._canvas.clientWidth, this._canvas.clientHeight);
      }
    }
  }
}
