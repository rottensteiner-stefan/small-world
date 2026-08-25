import {
  AmbientLight,
  DirectionalLight,
  Color,
  Plane,
  Object3D,
  PointLight,
  BasicMaterial,
  Texture,
  RendererType,
  AnimationMixer,
  Vector3D,
  StageMovementBehavior,
  StageZone,
} from "../../src/index.js";
import { AbstractShowcase } from "../../src/core/index.js";
import { GltfLoader } from "../../src/loaders/GltfLoader.js";

/** The background plane's world extent -- the only place a (u, v) stage coordinate is ever
 * turned into a 3D position. See `IsoExploreScene._uvToWorld`. */
const BACKGROUND_WIDTH = 16;
const BACKGROUND_HEIGHT = 9;
const BACKGROUND_CENTER_Y = 4.5;
const BACKGROUND_Z = 0;

class IsoExploreScene extends AbstractShowcase {
  private _novotny!: Object3D;
  private _movementBehavior!: StageMovementBehavior;
  private _pointLight!: PointLight;
  private _mixer?: AnimationMixer;
  private _zoneBadgeEl: HTMLElement | null = null;
  private _lastEState: boolean = false;

  // Editor State
  private _editorActive: boolean = false;
  private _activeZoneIndex: number | null = 1; // Default to Zone B (Tunnel)
  private _visibleZones: Set<number> = new Set([0, 1, 2]); // All zones visible by default
  private _stageZones: StageZone[] = [];
  private _draggingHandleIdx: number | null = null;

  // DOM Elements
  private _editorSvg!: SVGElement | null;
  private _editorPanel!: HTMLElement | null;
  private _editorPolygonsGroup!: SVGGElement | null;
  private _editorHandlesGroup!: SVGGElement | null;
  private _pointsListEl!: HTMLElement | null;

  protected override async setupScene(): Promise<void> {
    this._zoneBadgeEl = document.getElementById("zoneBadge");
    this._editorSvg = document.getElementById("editorSvgOverlay") as unknown as SVGElement;
    this._editorPanel = document.getElementById("editorPanel");
    this._editorPolygonsGroup = document.getElementById(
      "editorPolygonsGroup",
    ) as unknown as SVGGElement;
    this._editorHandlesGroup = document.getElementById("editorHandles") as unknown as SVGGElement;
    this._pointsListEl = document.getElementById("pointsList");

    // A level, centered camera: it only ever renders the scene, it is never involved in zone
    // authoring or movement logic (see StageZone / StageMovementBehavior / _uvToWorld below).
    this.camera.position.set(0, BACKGROUND_CENTER_Y, 10.864);
    this.camera.target.set(0, BACKGROUND_CENTER_Y, 0);
    this.camera.updateViewMatrix();

    const ambient = new AmbientLight({ color: new Color(1, 1, 1), intensity: 1.0 });
    this.scene.add(ambient);

    const dirLight = new DirectionalLight({
      direction: new Vector3D(0.2, -0.8, -1.0),
      color: new Color(1, 0.95, 0.9),
      intensity: 2.0,
    });
    this.scene.add(dirLight);

    this._pointLight = new PointLight({
      color: new Color(1, 0.7, 0.5),
      intensity: 10,
      distance: 30,
    });
    this._pointLight.position.set(0, BACKGROUND_CENTER_Y, 4);
    this.scene.add(this._pointLight);

    let bgTex: Texture | undefined;
    try {
      bgTex = await Texture.fromUrl("/assets/and-now/flakturm_bg.webp", { flipY: true });
    } catch (e) {
      console.warn("IsoExplore: Konnte Hintergrund nicht laden", e);
    }

    const bgGeo = new Plane({
      width: BACKGROUND_WIDTH,
      height: BACKGROUND_HEIGHT,
    }).getGeometryData();
    const bgMat = new BasicMaterial({ color: new Color(1, 1, 1) });
    bgMat.depthWrite = false;
    if (bgTex) {
      bgMat.diffuseMap = bgTex;
    }

    const background = new Object3D("Background");
    background.geometry = bgGeo;
    background.material = bgMat;
    background.position.set(0, BACKGROUND_CENTER_Y, BACKGROUND_Z);
    this.scene.add(background);

    // --- 2.5D Bühnen-Zonen (in Bild-Koordinaten, u/v 0..1) ---
    // Direkt im Editor (Taste E) auf dem Bild nachgezogen.
    const zoneA = new StageZone({
      id: "zone_a",
      name: "ZONE A: HAUPTBÜHNE (VORPLATZ)",
      points: [
        { u: 0.459, v: 0.895, scale: 1.0 },
        { u: 0.825, v: 0.893, scale: 1.0 },
        { u: 0.774, v: 0.82, scale: 1.0 },
        { u: 0.509, v: 0.823, scale: 1.0 },
      ],
    });

    const zoneB = new StageZone({
      id: "zone_b",
      name: "ZONE B: TUNNELGANG (TIEFE)",
      points: [
        { u: 0.556, v: 0.822, scale: 1.0 },
        { u: 0.747, v: 0.819, scale: 1.0 },
        { u: 0.706, v: 0.725, scale: 0.3 },
        { u: 0.641, v: 0.725, scale: 0.3 },
      ],
    });

    const zoneC = new StageZone({
      id: "zone_c",
      name: "ZONE C: TREPPENAUFGANG (SCHLEUSE)",
      points: [
        { u: 0.463, v: 0.894, scale: 1.0 },
        { u: 0.51, v: 0.823, scale: 1.0 },
        { u: 0.357, v: 0.594, scale: 0.5 },
        { u: 0.278, v: 0.613, scale: 0.5 },
      ],
    });

    this._stageZones = [zoneA, zoneB, zoneC];

    try {
      const gltfLoader = new GltfLoader();
      this._novotny = await gltfLoader.load("/assets/and-now/mannequin.glb");

      let charDiffuse: Texture | undefined;
      try {
        charDiffuse = await Texture.fromUrl("/assets/and-now/mannequin.fbm/Ch36_1001_Diffuse.png");
      } catch (err) {
        console.warn("[IsoExplore] Konnte Mannequin-Texturen nicht laden:", err);
      }

      const applyMaterialToHierarchy = (obj: Object3D): void => {
        if (obj.material) {
          const bMat = new BasicMaterial({ color: new Color(1, 1, 1) });
          if (charDiffuse) {
            bMat.diffuseMap = charDiffuse;
          }
          obj.material = bMat;
        }
        for (const child of obj.children) {
          applyMaterialToHierarchy(child);
        }
      };
      applyMaterialToHierarchy(this._novotny);

      this.scene.add(this._novotny);

      // 2.5D Bühnen-Bewegung an Novotny ankoppeln -- läuft komplett in (u, v)-Bildkoordinaten,
      // `_uvToWorld` ist die einzige Stelle, an der daraus eine echte 3D-Position wird.
      this._movementBehavior = new StageMovementBehavior({
        input: this.input,
        speed: 0.15,
        rotationSpeed: 12.0,
        zones: this._stageZones,
        uvToWorld: (u: number, v: number): { x: number; y: number; z: number } =>
          this._uvToWorld(u, v),
        startUV: { u: 0.65, v: 0.85 },
        onZoneChange: (zone: StageZone): void => this._updateHUD(zone),
      });
      this._novotny.addBehavior(this._movementBehavior);

      // Lade separate Idle-Animation
      try {
        const animClips = await gltfLoader.loadAnimations("/assets/and-now/idle.glb");
        const activeClip = animClips[0] || this._novotny.animations[0];
        if (activeClip) {
          this._mixer = new AnimationMixer(this._novotny);
          this._mixer.clipAction(activeClip).play();
        }
      } catch (animErr) {
        console.warn("[IsoExplore] Konnte Idle Animation nicht laden:", animErr);
      }
    } catch (e) {
      console.error(e);
    }

    this._setupEditorEvents();
  }

  /**
   * The only place a normalized stage-space (u, v) coordinate becomes a 3D world position.
   * `u`/`v` map linearly onto the background plane's known world rectangle, and the character
   * is placed exactly on that plane's Z -- since the plane is fronto-parallel to a level camera,
   * this reproduces the on-screen pixel position exactly, with no camera math involved at all.
   */
  private _uvToWorld(u: number, v: number): { x: number; y: number; z: number } {
    return {
      x: (u - 0.5) * BACKGROUND_WIDTH,
      y: BACKGROUND_CENTER_Y + (0.5 - v) * BACKGROUND_HEIGHT,
      z: BACKGROUND_Z,
    };
  }

  /** Screen-space rectangle the background image currently occupies, recomputed each time the
   * editor needs it (cheap: 2 projections) so it stays correct across window resizes. */
  private _backgroundScreenRect(): { left: number; top: number; width: number; height: number } {
    const topLeft = this._worldToScreen(
      -BACKGROUND_WIDTH / 2,
      BACKGROUND_CENTER_Y + BACKGROUND_HEIGHT / 2,
      BACKGROUND_Z,
    );
    const bottomRight = this._worldToScreen(
      BACKGROUND_WIDTH / 2,
      BACKGROUND_CENTER_Y - BACKGROUND_HEIGHT / 2,
      BACKGROUND_Z,
    );
    return {
      left: topLeft.x,
      top: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  private _worldToScreen(wx: number, wy: number, wz: number): { x: number; y: number } {
    const vp = this.camera.viewProjectionMatrix;
    const cx = (vp[0] ?? 0) * wx + (vp[4] ?? 0) * wy + (vp[8] ?? 0) * wz + (vp[12] ?? 0);
    const cy = (vp[1] ?? 0) * wx + (vp[5] ?? 0) * wy + (vp[9] ?? 0) * wz + (vp[13] ?? 0);
    const cw = (vp[3] ?? 0) * wx + (vp[7] ?? 0) * wy + (vp[11] ?? 0) * wz + (vp[15] ?? 0);
    const w = cw !== 0 ? cw : 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      x: ((cx / w) * 0.5 + 0.5) * width,
      y: (-(cy / w) * 0.5 + 0.5) * height,
    };
  }

  private _uvToScreen(
    u: number,
    v: number,
    rect: { left: number; top: number; width: number; height: number },
  ): { x: number; y: number } {
    return { x: rect.left + u * rect.width, y: rect.top + v * rect.height };
  }

  private _screenToUv(
    sx: number,
    sy: number,
    rect: { left: number; top: number; width: number; height: number },
  ): { u: number; v: number } {
    return { u: (sx - rect.left) / rect.width, v: (sy - rect.top) / rect.height };
  }

  private _resetToDefaultZones(): void {
    if (this._stageZones.length >= 3) {
      this._stageZones[0]!.points[0] = { u: 0.459, v: 0.895, scale: 1.0 };
      this._stageZones[0]!.points[1] = { u: 0.825, v: 0.893, scale: 1.0 };
      this._stageZones[0]!.points[2] = { u: 0.774, v: 0.82, scale: 1.0 };
      this._stageZones[0]!.points[3] = { u: 0.509, v: 0.823, scale: 1.0 };

      this._stageZones[1]!.points[0] = { u: 0.556, v: 0.822, scale: 1.0 };
      this._stageZones[1]!.points[1] = { u: 0.747, v: 0.819, scale: 1.0 };
      this._stageZones[1]!.points[2] = { u: 0.706, v: 0.725, scale: 0.3 };
      this._stageZones[1]!.points[3] = { u: 0.641, v: 0.725, scale: 0.3 };

      this._stageZones[2]!.points[0] = { u: 0.463, v: 0.894, scale: 1.0 };
      this._stageZones[2]!.points[1] = { u: 0.51, v: 0.823, scale: 1.0 };
      this._stageZones[2]!.points[2] = { u: 0.357, v: 0.594, scale: 0.5 };
      this._stageZones[2]!.points[3] = { u: 0.278, v: 0.613, scale: 0.5 };
    }
  }

  private _setupEditorEvents(): void {
    const btnA = document.getElementById("btnZoneA");
    const btnB = document.getElementById("btnZoneB");
    const btnC = document.getElementById("btnZoneC");
    const resetBtn = document.getElementById("resetConfigBtn");
    const copyBtn = document.getElementById("copyConfigBtn");

    const toggleZone = (idx: number): void => {
      if (this._visibleZones.has(idx) && this._activeZoneIndex === idx) {
        this._visibleZones.delete(idx);
        this._activeZoneIndex = null;
      } else {
        this._visibleZones.add(idx);
        this._activeZoneIndex = idx;
      }
      this._updateEditorUI();
    };

    btnA?.addEventListener("click", () => toggleZone(0));
    btnB?.addEventListener("click", () => toggleZone(1));
    btnC?.addEventListener("click", () => toggleZone(2));

    resetBtn?.addEventListener("click", () => {
      this._resetToDefaultZones();
      this._updateEditorUI();
    });

    copyBtn?.addEventListener("click", () => {
      const exportText = this._generateExportConfig();
      navigator.clipboard.writeText(exportText).then(() => {
        if (copyBtn) {
          const orig = copyBtn.textContent;
          copyBtn.textContent = "✅ Kopiert!";
          setTimeout(() => (copyBtn.textContent = orig), 2000);
        }
      });
    });

    // Handle Dragging -- direct pixel <-> (u, v) conversion, no camera involved.
    window.addEventListener("pointerdown", (e) => {
      if (!this._editorActive) return;
      const target = e.target as SVGElement;
      if (target && target.classList.contains("handle-circle")) {
        const idx = parseInt(target.getAttribute("data-idx") || "-1", 10);
        if (idx >= 0) {
          this._draggingHandleIdx = idx;
          target.classList.add("active");
        }
      }
    });

    window.addEventListener("pointermove", (e) => {
      if (!this._editorActive || this._draggingHandleIdx === null || this._activeZoneIndex === null)
        return;
      const activeZone = this._stageZones[this._activeZoneIndex];
      if (!activeZone) return;

      const pt = activeZone.points[this._draggingHandleIdx];
      if (!pt) return;

      const rect = this._backgroundScreenRect();
      const { u, v } = this._screenToUv(e.clientX, e.clientY, rect);
      pt.u = u;
      pt.v = v;

      this._updateEditorUI();
    });

    window.addEventListener("pointerup", () => {
      this._draggingHandleIdx = null;
      document.querySelectorAll(".handle-circle").forEach((c) => c.classList.remove("active"));
    });
  }

  private _updateEditorUI(): void {
    if (!this._editorActive || !this._editorPolygonsGroup || !this._editorHandlesGroup) return;

    const btnA = document.getElementById("btnZoneA");
    const btnB = document.getElementById("btnZoneB");
    const btnC = document.getElementById("btnZoneC");
    [btnA, btnB, btnC].forEach((b, i) => {
      b?.classList.toggle("active", this._visibleZones.has(i));
    });

    const zoneColors = [
      {
        stroke: "#38bdf8",
        fill: "rgba(56, 189, 248, 0.20)",
        activeFill: "rgba(56, 189, 248, 0.40)",
      }, // A: Vorplatz (Cyan)
      {
        stroke: "#4ade80",
        fill: "rgba(74, 222, 128, 0.20)",
        activeFill: "rgba(74, 222, 128, 0.40)",
      }, // B: Tunnel (Green)
      {
        stroke: "#fbbf24",
        fill: "rgba(251, 191, 36, 0.20)",
        activeFill: "rgba(251, 191, 36, 0.40)",
      }, // C: Treppe (Gold)
    ];

    const rect = this._backgroundScreenRect();

    let polygonsHtml = "";
    this._stageZones.forEach((z, zIdx) => {
      if (!this._visibleZones.has(zIdx)) return;

      const screenPoints = z.points.map((p) => this._uvToScreen(p.u, p.v, rect));
      const ptsStr = screenPoints.map((sp) => `${sp.x},${sp.y}`).join(" ");
      const color = zoneColors[zIdx] ?? {
        stroke: "#fff",
        fill: "rgba(255,255,255,0.2)",
        activeFill: "rgba(255,255,255,0.4)",
      };
      const isActive = zIdx === this._activeZoneIndex;

      polygonsHtml += `
        <polygon points="${ptsStr}"
          style="fill: ${isActive ? color.activeFill : color.fill}; stroke: ${color.stroke}; stroke-width: ${isActive ? "2.5px" : "1.5px"}; stroke-dasharray: ${isActive ? "none" : "4"}; cursor: pointer; pointer-events: all;"
          data-zidx="${zIdx}"
        />
      `;
    });
    this._editorPolygonsGroup.innerHTML = polygonsHtml;

    this._editorPolygonsGroup.querySelectorAll("polygon").forEach((poly) => {
      poly.addEventListener("click", (e) => {
        const zidx = parseInt(
          (e.target as SVGPolygonElement).getAttribute("data-zidx") || "-1",
          10,
        );
        if (zidx >= 0) {
          this._activeZoneIndex = zidx;
          this._visibleZones.add(zidx);
          this._updateEditorUI();
        }
      });
    });

    const activeZone =
      this._activeZoneIndex !== null && this._visibleZones.has(this._activeZoneIndex)
        ? this._stageZones[this._activeZoneIndex]
        : null;

    if (!activeZone || this._activeZoneIndex === null) {
      this._editorHandlesGroup.innerHTML = "";
      if (this._pointsListEl) {
        this._pointsListEl.innerHTML = `
          <div style="color: #888; font-size: 11px; text-align: center; padding: 16px 8px; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px;">
            Keine Zone aktiv.<br>Klicke oben auf <strong>A</strong>, <strong>B</strong> oder <strong>C</strong>, um eine Zone einzuschalten.
          </div>
        `;
      }
      return;
    }

    const activeColor = zoneColors[this._activeZoneIndex] ?? { stroke: "#ffb84d" };
    const screenPoints = activeZone.points.map((p) => this._uvToScreen(p.u, p.v, rect));

    let handlesHtml = "";
    const labels = ["P0", "P1", "P2", "P3"];
    screenPoints.forEach((sp, i) => {
      handlesHtml += `
        <circle cx="${sp.x}" cy="${sp.y}" r="8" class="handle-circle" data-idx="${i}" style="fill: ${activeColor.stroke}; stroke: #fff;"></circle>
        <text x="${sp.x + 12}" y="${sp.y + 4}" class="handle-label">${labels[i]}</text>
      `;
    });
    this._editorHandlesGroup.innerHTML = handlesHtml;

    if (this._pointsListEl) {
      let listHtml = "";
      activeZone.points.forEach((p, i) => {
        listHtml += `
          <div class="point-row" style="margin-bottom: 6px; font-size: 11px;">
            <span><strong>${labels[i]}</strong></span>
            <div class="point-coords" style="display: flex; gap: 4px; align-items: center; margin-top: 2px;">
              <span>U:${p.u.toFixed(3)} V:${p.v.toFixed(3)}</span>
              <span>S:<input type="number" step="0.05" min="0.1" max="2.0" value="${p.scale.toFixed(2)}" data-sidx="${i}" class="point-scale-input" style="width: 44px; background: #1a232f; color: #88c0d0; border: 1px solid rgba(136,192,208,0.4); border-radius: 3px; padding: 1px 2px; font-family: monospace; font-size: 10px;"></span>
            </div>
          </div>
        `;
      });
      this._pointsListEl.innerHTML = listHtml;

      this._pointsListEl.querySelectorAll<HTMLInputElement>(".point-scale-input").forEach((inp) => {
        inp.addEventListener("change", (e) => {
          const target = e.target as HTMLInputElement;
          const sidx = parseInt(target.getAttribute("data-sidx") || "-1", 10);
          if (sidx >= 0 && activeZone.points[sidx]) {
            activeZone.points[sidx]!.scale = parseFloat(target.value) || 1.0;
            this._updateEditorUI();
          }
        });
      });
    }
  }

  private _generateExportConfig(): string {
    return this._stageZones
      .map(
        (z) =>
          `new StageZone({\n  id: "${z.id}",\n  name: "${z.name}",\n  points: [\n` +
          z.points
            .map(
              (p) =>
                `    { u: ${p.u.toFixed(3)}, v: ${p.v.toFixed(3)}, scale: ${p.scale.toFixed(2)} },`,
            )
            .join("\n") +
          `\n  ],\n})`,
      )
      .join(",\n\n");
  }

  private _updateHUD(zone: StageZone): void {
    if (!this._zoneBadgeEl) return;
    this._zoneBadgeEl.textContent = zone.name;
  }

  protected override update(deltaTime: number): void {
    super.update(deltaTime);
    this.camera.updateViewMatrix();

    // Toggle Editor mit Taste 'E'
    const isEPressed = this.input.isPressed("KeyE");
    if (isEPressed && !this._lastEState) {
      this._editorActive = !this._editorActive;
      if (this._editorSvg) this._editorSvg.style.display = this._editorActive ? "block" : "none";
      if (this._editorPanel)
        this._editorPanel.style.display = this._editorActive ? "block" : "none";
      if (this._movementBehavior) this._movementBehavior.enabled = !this._editorActive;
      if (this._editorActive) this._updateEditorUI();
    }
    this._lastEState = isEPressed;

    if (this._editorActive) {
      this._updateEditorUI();
    }

    if (this._mixer) {
      this._mixer.update(deltaTime);
    }

    if (this._novotny) {
      this._pointLight.position.set(
        this._novotny.position.x + 0.4,
        this._novotny.position.y + 2.2,
        this._novotny.position.z + 0.6,
      );
    }

    this.scene.update(deltaTime);
  }
}

const app = new IsoExploreScene({ rendererType: RendererType.WEB_GL2 });
app.start().catch((err: unknown) => console.error("[IsoExplore] Failed to start:", err));
