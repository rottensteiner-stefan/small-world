import {
  SmallWorld,
  Object3D,
  Sphere,
  Plane,
  Grid,
  DirectionalLight,
  AmbientLight,
  PointLight,
  Color,
  Vector3D,
  StandardMaterial,
  BasicMaterial,
  WireframeMaterial,
  Texture,
  KitRegistry,
  CameraStrategyType,
  PerspectiveProjection,
  BoundingType,
  BoundingBox,
  CullMode,
  EngineOptions,
} from "@small-world/engine";
import type { KitSocket } from "@small-world/engine";

export type LightingPreset = "studio" | "bunker" | "cold";

export interface KitInspectorOptions extends EngineOptions {
  canvasId: string;
  basePath?: string;
  onAssetLoaded?: ((info: InspectedAssetInfo) => void) | undefined;
  onLoadingStateChange?: ((loading: boolean, message?: string) => void) | undefined;
  onError?: ((err: Error) => void) | undefined;
}

export interface InspectedAssetInfo {
  type: "prop" | "texture" | "decal";
  id: string;
  kitId: string;
  name: string;
  category: string;
  description: string;
  author: string;
  license: string;
  version: string;
  previewUrl: string;
  triangles?: number | undefined;
  materialsCount?: number | undefined;
  dimensions?: { width: number; height: number; depth: number } | undefined;
  recommendedScale?: number | undefined;
  sockets?: KitSocket[] | undefined;
  textureMaps?: string[] | undefined;
  decalFile?: string | undefined;
}

/**
 * 3D Engine controller for the Asset Kit Inspector tool.
 * Provides interactive orbital navigation, studio lighting presets, wireframe and
 * socket inspection, as well as PBR material previewing on standard test primitives.
 */
export class KitInspectorApp extends SmallWorld {
  private readonly _kitRegistry: KitRegistry;
  private readonly _onAssetLoaded: ((info: InspectedAssetInfo) => void) | undefined;
  private readonly _onLoadingStateChange:
    ((loading: boolean, message?: string) => void) | undefined;
  private readonly _onError: ((err: Error) => void) | undefined;

  // Scene roots
  private _gridMesh!: Object3D;
  private _assetRoot!: Object3D;
  private _socketsRoot!: Object3D;

  // Lighting
  private _ambientLight!: AmbientLight;
  private _keyLight!: DirectionalLight;
  private _fillLight!: DirectionalLight;
  private _rimLight!: DirectionalLight;
  private _currentLightingPreset: LightingPreset = "studio";

  // Orbit navigation state
  private _orbitTarget: Vector3D = new Vector3D(0, 0.5, 0);
  private _orbitDistance: number = 2.5;
  private _orbitYaw: number = 0.6;
  private _orbitPitch: number = 0.35;
  private _isTurntable: boolean = false;
  private _turntableSpeed: number = 0.3; // rad/s
  private _isWireframe: boolean = false;
  private _showSockets: boolean = true;
  private _showGrid: boolean = true;

  // Pointer dragging state
  private _isDragging: boolean = false;
  private _dragButton: number = 0;
  private _lastPointerX: number = 0;
  private _lastPointerY: number = 0;

  // Current loaded state
  private _currentAssetInfo: InspectedAssetInfo | null = null;
  private _originalMaterials = new Map<Object3D, unknown>();

  constructor(options: KitInspectorOptions) {
    super({
      ...options,
      fullscreen: false,
    });

    this._kitRegistry = new KitRegistry({ basePath: options.basePath ?? "/assets/kits/" });
    this._onAssetLoaded = options.onAssetLoaded;
    this._onLoadingStateChange = options.onLoadingStateChange;
    this._onError = options.onError;

    this._assetRoot = new Object3D("AssetRoot");
    this._socketsRoot = new Object3D("SocketsRoot");

    this._gridMesh = new Object3D("InspectorGrid");
    this._gridMesh.geometry = new Grid({ size: 20, divisions: 20 }).getGeometryData();
    this._gridMesh.material = new WireframeMaterial(new Color(0.18, 0.24, 0.32));
    this._gridMesh.position.set(0, 0, 0);

    this._ambientLight = new AmbientLight({
      name: "InspectorAmbient",
      color: new Color(0.2, 0.22, 0.26),
      intensity: 0.6,
    });

    this._keyLight = new DirectionalLight({
      name: "InspectorKeyLight",
      color: new Color(1.0, 0.98, 0.94),
      intensity: 1.6,
      direction: new Vector3D(1.4, 2.0, 1.2).normalize(),
    });

    this._fillLight = new DirectionalLight({
      name: "InspectorFillLight",
      color: new Color(0.65, 0.8, 1.0),
      intensity: 0.65,
      direction: new Vector3D(-1.6, 1.0, -1.0).normalize(),
    });

    this._rimLight = new DirectionalLight({
      name: "InspectorRimLight",
      color: new Color(0.9, 0.85, 0.8),
      intensity: 0.8,
      direction: new Vector3D(0.2, -1.0, -2.0).normalize(),
    });
  }

  public get kitRegistry(): KitRegistry {
    return this._kitRegistry;
  }

  public get currentAssetInfo(): InspectedAssetInfo | null {
    return this._currentAssetInfo;
  }

  protected override async setupScene(): Promise<void> {
    const aspect = this.canvas.width / Math.max(1, this.canvas.height);
    this.camera.projection = new PerspectiveProjection({
      fov: (45 * Math.PI) / 180,
      aspect,
      near: 0.05,
      far: 150,
    });
    this.camera.updateProjectionMatrix();
    this.camera.setStrategy(CameraStrategyType.MANUAL);

    // Add lighting & containers to scene
    this.scene.add(this._ambientLight);
    this.scene.add(this._keyLight);
    this.scene.add(this._fillLight);
    this.scene.add(this._rimLight);
    this.scene.add(this._gridMesh);
    this.scene.add(this._assetRoot);
    this.scene.add(this._socketsRoot);

    // Setup Camera and Pointer
    this._updateCameraTransform();
    this._setupPointerNavigation();
  }

  protected override update(deltaTime: number): void {
    if (this._isTurntable && !this._isDragging) {
      this._orbitYaw += this._turntableSpeed * deltaTime;
      this._updateCameraTransform();
    }
  }

  // --- Public View Controls ---

  public setLightingPreset(preset: LightingPreset): void {
    this._currentLightingPreset = preset;
    if (preset === "studio") {
      this._ambientLight.color.set(0.2, 0.22, 0.26);
      this._ambientLight.intensity = 0.6;
      this._keyLight.color.set(1.0, 0.98, 0.94);
      this._keyLight.intensity = 1.6;
      this._keyLight.direction.set(1.4, 2.0, 1.2).normalize();
      this._fillLight.color.set(0.65, 0.8, 1.0);
      this._fillLight.intensity = 0.65;
      this._rimLight.color.set(0.9, 0.85, 0.8);
      this._rimLight.intensity = 0.8;
    } else if (preset === "bunker") {
      this._ambientLight.color.set(0.08, 0.08, 0.1);
      this._ambientLight.intensity = 0.35;
      this._keyLight.color.set(1.0, 0.68, 0.28); // Warm Kerosene amber
      this._keyLight.intensity = 2.4;
      this._keyLight.direction.set(1.2, 1.6, 1.0).normalize();
      this._fillLight.color.set(0.22, 0.32, 0.45); // Deep shadow cold
      this._fillLight.intensity = 0.45;
      this._rimLight.color.set(0.95, 0.5, 0.15);
      this._rimLight.intensity = 1.2;
    } else if (preset === "cold") {
      this._ambientLight.color.set(0.12, 0.16, 0.22);
      this._ambientLight.intensity = 0.4;
      this._keyLight.color.set(0.72, 0.88, 1.0); // Industrial fluorescent
      this._keyLight.intensity = 2.0;
      this._keyLight.direction.set(0.6, 2.2, 0.8).normalize();
      this._fillLight.color.set(0.2, 0.6, 0.85); // Frost cyan
      this._fillLight.intensity = 0.8;
      this._rimLight.color.set(0.4, 0.75, 1.0);
      this._rimLight.intensity = 1.0;
    }
  }

  public getLightingPreset(): LightingPreset {
    return this._currentLightingPreset;
  }

  public setTurntable(enabled: boolean): void {
    this._isTurntable = enabled;
  }

  public isTurntable(): boolean {
    return this._isTurntable;
  }

  public setWireframe(enabled: boolean): void {
    this._isWireframe = enabled;
    const wireMat = new WireframeMaterial(new Color(0.0, 0.9, 1.0));

    this._assetRoot.traverse((child) => {
      if (!child.geometry) return;
      if (enabled) {
        if (!this._originalMaterials.has(child)) {
          this._originalMaterials.set(child, child.material);
        }
        child.material = wireMat;
      } else {
        const orig = this._originalMaterials.get(child);
        if (orig) {
          child.material = orig as typeof child.material;
        }
      }
    });
  }

  public isWireframe(): boolean {
    return this._isWireframe;
  }

  public setSocketsVisible(visible: boolean): void {
    this._showSockets = visible;
    this._socketsRoot.isVisible = visible;
  }

  public areSocketsVisible(): boolean {
    return this._showSockets;
  }

  public setGridVisible(visible: boolean): void {
    this._showGrid = visible;
    this._gridMesh.isVisible = visible;
  }

  public isGridVisible(): boolean {
    return this._showGrid;
  }

  public focusCamera(): void {
    this._orbitTarget.set(0, 0.5, 0);
    this._orbitDistance = 2.5;
    this._orbitYaw = 0.6;
    this._orbitPitch = 0.35;
    this._updateCameraTransform();
  }

  // --- Asset Loading ---

  /**
   * Loads and displays a 3D kit prop by its ID (e.g. "bunker/kerosene_lantern").
   */
  public async inspectProp(kitPropId: string): Promise<void> {
    this._onLoadingStateChange?.(true, `Lade 3D-Prop ${kitPropId}...`);
    this._clearAsset();

    try {
      const parts = kitPropId.split("/");
      const kitId = parts[0] ?? "";
      const manifest = await this._kitRegistry.getKitManifest(kitId);
      const meta = await this._kitRegistry.getPropMeta(kitPropId);
      const propInst = await this._kitRegistry.loadProp(kitPropId);

      this._assetRoot.add(propInst.root);

      // Measure bounding box to center object and adjust camera
      const bounds = this._computeHierarchyBounds(propInst.root);
      const sizeX = bounds.max.x - bounds.min.x;
      const sizeY = bounds.max.y - bounds.min.y;
      const sizeZ = bounds.max.z - bounds.min.z;
      const maxDim = Math.max(sizeX, sizeY, sizeZ, 0.1);

      // Center model horizontally and align bottom to ground (y=0)
      propInst.root.position.x -= bounds.center.x;
      propInst.root.position.z -= bounds.center.z;
      propInst.root.position.y -= bounds.min.y;

      // Adjust orbit target and distance
      this._orbitTarget.set(0, sizeY * 0.5, 0);
      this._orbitDistance = Math.max(0.6, maxDim * 2.2);
      this._updateCameraTransform();

      // Sockets visualization
      this._buildSocketGizmos(meta.sockets, propInst.root);

      // Re-apply wireframe if currently active
      if (this._isWireframe) {
        this.setWireframe(true);
      }

      const itemDef = (manifest.items ?? []).find((it) => it.id === kitPropId);
      const previewPath = itemDef ? `${this._kitRegistry.basePath}${kitId}/${itemDef.preview}` : "";

      const info: InspectedAssetInfo = {
        type: "prop",
        id: kitPropId,
        kitId,
        name: meta.name,
        category: meta.category,
        description: meta.description,
        author: meta.author,
        license: meta.license,
        version: meta.version,
        previewUrl: previewPath,
        triangles: meta.triangles,
        materialsCount: meta.materials,
        dimensions: {
          width: meta.dimensions.width ?? meta.dimensions.radius ?? sizeX,
          height: meta.dimensions.height ?? sizeY,
          depth: meta.dimensions.depth ?? meta.dimensions.radius ?? sizeZ,
        },
        recommendedScale: meta.recommendedScale,
        sockets: meta.sockets,
      };

      this._currentAssetInfo = info;
      this._onAssetLoaded?.(info);
      this._onLoadingStateChange?.(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._onError?.(error);
      this._onLoadingStateChange?.(false);
    }
  }

  /**
   * Displays a PBR texture set on a preview sphere.
   */
  public async inspectPbrTexture(
    kitId: string,
    texItem: { id: string; name: string; category?: string; maps: string[] },
  ): Promise<void> {
    this._onLoadingStateChange?.(true, `Lade PBR Material ${texItem.name}...`);
    this._clearAsset();

    try {
      const sphereGeo = new Sphere({
        radius: 0.8,
        widthSegments: 36,
        heightSegments: 24,
      }).getGeometryData();
      const pbrSphere = new Object3D("PbrPreviewSphere");
      pbrSphere.geometry = sphereGeo;

      // maps[] are bare filenames; actual files live under textures/<slug>/
      // e.g. id "flakturm/concrete_board" → slug "concrete_board"
      const slug = texItem.id.includes("/") ? texItem.id.split("/").pop()! : texItem.id;
      const base = `${this._kitRegistry.basePath}${kitId}/textures/${slug}`;
      const mat = new StandardMaterial({
        color: Color.WHITE,
        roughness: 0.5,
        metallic: 0.0,
      });

      // Find maps
      const findMapUrl = (keyword: string): string | undefined => {
        const found = texItem.maps.find((m) => m.toLowerCase().includes(keyword));
        return found ? `${base}/${found}` : undefined;
      };

      const albedoUrl = findMapUrl("albedo") ?? findMapUrl("diffuse");
      const normalUrl = findMapUrl("normal");
      const roughnessUrl = findMapUrl("roughness");
      const aoUrl = findMapUrl("ao");
      const metalnessUrl = findMapUrl("metalness") ?? findMapUrl("metallic");

      if (albedoUrl) {
        mat.diffuseMap = await Texture.fromUrl(albedoUrl);
      }
      if (normalUrl) {
        mat.normalMap = await Texture.fromUrl(normalUrl);
      }
      if (roughnessUrl) {
        mat.roughnessMap = await Texture.fromUrl(roughnessUrl);
      }
      if (aoUrl) {
        mat.aoMap = await Texture.fromUrl(aoUrl);
      }
      if (metalnessUrl) {
        mat.metallicMap = await Texture.fromUrl(metalnessUrl);
        mat.metallic = 1.0;
      }

      pbrSphere.material = mat;
      pbrSphere.position.set(0, 0.85, 0);
      this._assetRoot.add(pbrSphere);

      this._orbitTarget.set(0, 0.85, 0);
      this._orbitDistance = 2.4;
      this._updateCameraTransform();

      const manifest = await this._kitRegistry.getKitManifest(kitId);
      const info: InspectedAssetInfo = {
        type: "texture",
        id: texItem.id,
        kitId,
        name: texItem.name,
        category: texItem.category ?? "surfaces",
        description: `PBR-Textursatz aus dem Kit '${kitId}' mit ${texItem.maps.length} Texturkanälen.`,
        author: manifest.author,
        license: manifest.license,
        version: manifest.version,
        previewUrl: albedoUrl ?? "",
        textureMaps: texItem.maps.map((m) => `${base}/${m}`),
      };

      this._currentAssetInfo = info;
      this._onAssetLoaded?.(info);
      this._onLoadingStateChange?.(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._onError?.(error);
      this._onLoadingStateChange?.(false);
    }
  }

  /**
   * Displays a decal sticker on a floating quad.
   */
  public async inspectDecal(
    kitId: string,
    decalItem: { id: string; name: string; file: string },
  ): Promise<void> {
    this._onLoadingStateChange?.(true, `Lade Decal ${decalItem.name}...`);
    this._clearAsset();

    try {
      // file is a bare filename; actual files live under the decals/ subfolder
      const fileUrl = `${this._kitRegistry.basePath}${kitId}/decals/${decalItem.file}`;
      const decalTex = await Texture.fromUrl(fileUrl, { flipY: true });

      // Dynamically determine aspect ratio from the decoded image to avoid distortion
      let aspect = 1.0;
      if (decalTex.image && "width" in decalTex.image && "height" in decalTex.image) {
        aspect = decalTex.image.width / Math.max(1, decalTex.image.height);
      }

      const planeWidth = aspect >= 1.0 ? 1.6 : 1.6 * aspect;
      const planeHeight = aspect >= 1.0 ? 1.6 / aspect : 1.6;

      const quadGeo = new Plane({ width: planeWidth, height: planeHeight }).getGeometryData();
      const decalQuad = new Object3D("DecalQuad");
      decalQuad.geometry = quadGeo;

      const mat = new StandardMaterial({
        color: Color.WHITE,
        diffuseMap: decalTex,
        roughness: 0.6,
        metallic: 0.1,
      });
      mat.transparent = true;
      mat.cullMode = CullMode.NONE;

      decalQuad.material = mat;
      decalQuad.position.set(0, 0.85, 0);
      this._assetRoot.add(decalQuad);

      this._orbitTarget.set(0, 0.85, 0);
      this._orbitDistance = 2.4;
      this._orbitYaw = 0;
      this._orbitPitch = 0.05;
      this._updateCameraTransform();

      const manifest = await this._kitRegistry.getKitManifest(kitId);
      const info: InspectedAssetInfo = {
        type: "decal",
        id: decalItem.id,
        kitId,
        name: decalItem.name,
        category: "decals",
        description: `Grafischer Decal-Sticker aus dem Kit '${kitId}'.`,
        author: manifest.author,
        license: manifest.license,
        version: manifest.version,
        previewUrl: fileUrl,
        decalFile: fileUrl,
      };

      this._currentAssetInfo = info;
      this._onAssetLoaded?.(info);
      this._onLoadingStateChange?.(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._onError?.(error);
      this._onLoadingStateChange?.(false);
    }
  }

  // --- Internal Helpers ---

  private _clearAsset(): void {
    this._originalMaterials.clear();

    while (this._assetRoot.children.length > 0) {
      const child = this._assetRoot.children[0];
      if (child) this._assetRoot.remove(child);
    }

    while (this._socketsRoot.children.length > 0) {
      const child = this._socketsRoot.children[0];
      if (child) this._socketsRoot.remove(child);
    }
  }

  private _buildSocketGizmos(sockets?: KitSocket[], parent?: Object3D): void {
    if (!sockets || sockets.length === 0) return;

    const sphereGeo = new Sphere({
      radius: 0.04,
      widthSegments: 16,
      heightSegments: 12,
    }).getGeometryData();

    for (const socket of sockets) {
      const lightColorHex = socket.recommendedLight?.color ?? "#ffd273";
      const lightCol = Color.fromHex(lightColorHex);

      const marker = new Object3D(`SocketMarker_${socket.name}`);
      marker.geometry = sphereGeo;
      marker.material = new BasicMaterial({ color: lightCol });
      marker.position.set(socket.position[0], socket.position[1], socket.position[2]);

      // Mount active light
      const pLight = new PointLight({
        name: `SocketLight_${socket.name}`,
        color: lightCol,
        intensity: Math.min(socket.recommendedLight?.intensity ?? 1.5, 3.0),
        distance: socket.recommendedLight?.distance ?? 4.0,
      });
      pLight.position.set(socket.position[0], socket.position[1], socket.position[2]);

      if (parent) {
        parent.add(marker);
        parent.add(pLight);
      } else {
        this._socketsRoot.add(marker);
        this._socketsRoot.add(pLight);
      }
    }
  }

  private _computeHierarchyBounds(root: Object3D): BoundingBox {
    const min = new Vector3D(Infinity, Infinity, Infinity);
    const max = new Vector3D(-Infinity, -Infinity, -Infinity);
    let foundGeometry = false;

    root.traverse((child) => {
      if (!child.geometry) return;
      const bv = child.geometry.getBoundingVolume();
      if (bv && bv.type === BoundingType.BOX) {
        const box = bv as BoundingBox;
        foundGeometry = true;
        min.x = Math.min(min.x, box.min.x * child.scale.x + child.position.x);
        min.y = Math.min(min.y, box.min.y * child.scale.y + child.position.y);
        min.z = Math.min(min.z, box.min.z * child.scale.z + child.position.z);
        max.x = Math.max(max.x, box.max.x * child.scale.x + child.position.x);
        max.y = Math.max(max.y, box.max.y * child.scale.y + child.position.y);
        max.z = Math.max(max.z, box.max.z * child.scale.z + child.position.z);
      }
    });

    if (!foundGeometry) {
      return new BoundingBox(new Vector3D(-0.5, 0, -0.5), new Vector3D(0.5, 1.0, 0.5));
    }
    return new BoundingBox(min, max);
  }

  private _updateCameraTransform(): void {
    const cosPitch = Math.cos(this._orbitPitch);
    this.camera.position.x =
      this._orbitTarget.x + this._orbitDistance * cosPitch * Math.sin(this._orbitYaw);
    this.camera.position.y = this._orbitTarget.y + this._orbitDistance * Math.sin(this._orbitPitch);
    this.camera.position.z =
      this._orbitTarget.z + this._orbitDistance * cosPitch * Math.cos(this._orbitYaw);
    this.camera.target.copyFrom(this._orbitTarget);
    this.camera.updateViewMatrix();
  }

  private _setupPointerNavigation(): void {
    const canvas = this.canvas;

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      this._isDragging = true;
      this._dragButton = e.button;
      this._lastPointerX = e.clientX;
      this._lastPointerY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e: PointerEvent) => {
      if (!this._isDragging) return;

      const dx = e.clientX - this._lastPointerX;
      const dy = e.clientY - this._lastPointerY;
      this._lastPointerX = e.clientX;
      this._lastPointerY = e.clientY;

      if (this._dragButton === 0 && !e.shiftKey) {
        // Left drag: Rotate
        this._orbitYaw -= dx * 0.007;
        this._orbitPitch = Math.min(1.48, Math.max(-1.48, this._orbitPitch - dy * 0.007));
      } else {
        // Right drag or Shift+Left drag: Pan
        const panFactor = this._orbitDistance * 0.0015;
        const cosYaw = Math.cos(this._orbitYaw);
        const sinYaw = Math.sin(this._orbitYaw);

        this._orbitTarget.x -= (dx * cosYaw + dy * sinYaw) * panFactor;
        this._orbitTarget.y += dy * panFactor;
        this._orbitTarget.z -= (-dx * sinYaw + dy * cosYaw) * panFactor;
      }

      this._updateCameraTransform();
    });

    const endDrag = (e: PointerEvent): void => {
      this._isDragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    canvas.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        e.preventDefault();
        const factor = Math.exp(e.deltaY * 0.0015);
        this._orbitDistance = Math.min(40.0, Math.max(0.3, this._orbitDistance * factor));
        this._updateCameraTransform();
      },
      { passive: false },
    );

    // Keyboard shortcuts
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key === "f" || e.key === "F") {
        this.focusCamera();
      } else if (e.key === "r" || e.key === "R") {
        this.setTurntable(!this._isTurntable);
      } else if (e.key === "w" || e.key === "W") {
        this.setWireframe(!this._isWireframe);
      } else if (e.key === "s" || e.key === "S") {
        this.setSocketsVisible(!this._showSockets);
      } else if (e.key === "g" || e.key === "G") {
        this.setGridVisible(!this._showGrid);
      }
    });

    window.addEventListener("resize", () => {
      const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      if (this.camera.projection instanceof PerspectiveProjection) {
        this.camera.projection.aspect = aspect;
        this.camera.updateProjectionMatrix();
      }
      this._updateCameraTransform();
    });
  }
}
