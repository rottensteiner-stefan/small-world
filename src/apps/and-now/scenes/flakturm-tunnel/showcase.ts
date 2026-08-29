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
  AnimationClip,
  AnimationAction,
  Vector3D,
  StageMovementBehavior,
  StageZone,
  Cylinder,
  Torus,
} from "../../../../index.js";
import { AbstractShowcase } from "../../../../core/index.js";
import { GltfLoader } from "../../../../loaders/GltfLoader.js";

/** The background plane's world extent -- the only place a (u, v) stage coordinate is ever
 * turned into a 3D position. See `AndNowScene2._uvToWorld`. */
const BACKGROUND_WIDTH = 16;
const BACKGROUND_HEIGHT = 9;
const BACKGROUND_CENTER_Y = 4.5;
const BACKGROUND_Z = 0;

/** Single source of truth for each zone's default 4 corner points, in image-space (u, v) --
 * traced directly on the background art via the editor (key `E`). Used both to build the zones
 * in `setupScene()` and to restore them in `_resetToDefaultZones()`, so a coordinate only ever
 * needs to be edited in one place. */
type ZonePoint = { u: number; v: number; scale: number };
const DEFAULT_ZONE_POINTS: Record<
  "zone_a" | "zone_b" | "zone_c",
  [ZonePoint, ZonePoint, ZonePoint, ZonePoint]
> = {
  zone_a: [
    { u: 0.459, v: 0.895, scale: 1.0 },
    { u: 0.825, v: 0.893, scale: 1.0 },
    { u: 0.774, v: 0.82, scale: 1.0 },
    { u: 0.509, v: 0.823, scale: 1.0 },
  ],
  zone_b: [
    { u: 0.556, v: 0.822, scale: 1.0 },
    { u: 0.747, v: 0.819, scale: 1.0 },
    { u: 0.706, v: 0.725, scale: 0.3 },
    { u: 0.641, v: 0.725, scale: 0.3 },
  ],
  zone_c: [
    { u: 0.463, v: 0.894, scale: 1.0 },
    { u: 0.51, v: 0.823, scale: 1.0 },
    { u: 0.357, v: 0.594, scale: 0.5 },
    { u: 0.278, v: 0.613, scale: 0.5 },
  ],
};

/** Named animation clips shared by every Player skin. Add an entry here (and load the matching
 * FBX2glTF-converted `.glb` under `public/assets/and-now/mannequin/shared/anim/`) to make a new
 * animation available via `_playAnimation`. */
const ANIMATION_CLIP_URLS: Record<string, string> = {
  // Idle variations
  idle_1: "/assets/and-now/mannequin/shared/anim/idle_1.glb",
  idle_2: "/assets/and-now/mannequin/shared/anim/idle_2.glb",
  idle_torch: "/assets/and-now/mannequin/shared/anim/idle_torch.glb",
  // Walk & Run (neutral)
  walk: "/assets/and-now/mannequin/shared/anim/walking.glb",
  run_1: "/assets/and-now/mannequin/shared/anim/running_1.glb",
  run_2: "/assets/and-now/mannequin/shared/anim/running_2.glb",
  // Walk & Run (with lantern / torch)
  walk_torch: "/assets/and-now/mannequin/shared/anim/walking_torch.glb",
  run_torch: "/assets/and-now/mannequin/shared/anim/running_torch.glb",
  // Stairs
  stairs_up: "/assets/and-now/mannequin/shared/anim/ascending_stairs.glb",
  stairs_down: "/assets/and-now/mannequin/shared/anim/descending_stairs.glb",
};

const ANIMATION_FADE_SECONDS = 0.25;

/** Left hand bone candidates the lantern (mesh + light) attaches to across different rigs */
const LANTERN_HAND_BONE_NAMES = [
  "mixamorig:LeftHand",
  "mixamorig1:LeftHand",
  "L_Hand",
  "tripo::0_Left_Limb_2",
  "tripo::0_Left_Limb_3",
];

/** World-space offset from the hand bone's origin into the palm/fingers -- see
 * `AndNowScene2._syncLanternTransform()`'s doc comment for why this is applied in world space
 * every frame instead of as a local child-of-bone position set once. */
const LANTERN_GRIP_OFFSET = { x: 0.01, y: 0.06, z: 0.02 };

type CharacterType = "male" | "female" | "yoshi";

interface AnimationFade {
  from: AnimationAction | undefined;
  to: AnimationAction;
  elapsed: number;
  duration: number;
}

class AndNowScene2 extends AbstractShowcase {
  private _player!: Object3D;
  /** Stage anchor that `StageMovementBehavior` positions/scales (forced-perspective per zone).
   * `_player` sits inside it at a fixed 1.8m-real-world-height local scale, so the per-zone
   * scale factor multiplies on top of that instead of replacing it outright. */
  private _playerRig!: Object3D;
  private _movementBehavior!: StageMovementBehavior;
  private _pointLight!: PointLight;
  private _lanternGroup: Object3D | undefined = undefined;
  /** The current character's left-hand bone, tracked (position only, see `_syncLanternTransform()`)
   * rather than used as `_lanternGroup`'s scene-graph parent. */
  private _lanternHandBone: Object3D | undefined = undefined;
  private _lanternOn: boolean = true;
  private _mixer?: AnimationMixer;
  private _clips: Map<string, AnimationClip> = new Map();
  private _activeAnimation: string | undefined;
  private _fade: AnimationFade | undefined = undefined;
  private _idleTimer: number = 0;
  private _idleVariation: "idle_1" | "idle_2" = "idle_1";
  private _idleSwitchDuration: number = 8.0;
  private _zoneBadgeEl: HTMLElement | null = null;
  private _charDescEl: HTMLElement | null = null;
  private _characterType: CharacterType = "male";
  private _isSwitchingChar: boolean = false;
  private _lastCState: boolean = false;
  private _lastEState: boolean = false;
  private _lastLState: boolean = false;

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
  private _charTagEl!: HTMLElement | null;
  private _tagTitleEl!: HTMLElement | null;
  private _tagDetailsEl!: HTMLElement | null;

  protected override async setupScene(): Promise<void> {
    this._zoneBadgeEl = document.getElementById("zoneBadge");
    this._charDescEl = document.getElementById("charDesc");
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
    // Reparented onto Novotny's hand bone once the mannequin has loaded below -- this fallback
    // position only lights the scene if that load fails.

    let bgTex: Texture | undefined;
    try {
      bgTex = await Texture.fromUrl("/assets/and-now/flakturm_bg.webp", { flipY: true });
    } catch (e) {
      console.warn("[AndNowScene2] Konnte Hintergrund nicht laden:", e);
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
      points: DEFAULT_ZONE_POINTS.zone_a,
    });

    const zoneB = new StageZone({
      id: "zone_b",
      name: "ZONE B: TUNNELGANG (TIEFE)",
      points: DEFAULT_ZONE_POINTS.zone_b,
    });

    const zoneC = new StageZone({
      id: "zone_c",
      name: "ZONE C: TREPPENAUFGANG (SCHLEUSE)",
      points: DEFAULT_ZONE_POINTS.zone_c,
    });

    this._stageZones = [zoneA, zoneB, zoneC];

    const charParam =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("char")
        : null;
    const initialChar: CharacterType =
      charParam === "female" ? "female" : charParam === "yoshi" ? "yoshi" : "male";

    await this._loadCharacter(initialChar);

    this._setupEditorEvents();
  }

  /**
   * Lädt die ausgewählte Figur (männlich / weiblich / Yoshi), skaliert sie passend,
   * bindet die Laterne an mixamorig:LeftHand und hängt Behavior & AnimationMixer ein.
   */
  private async _loadCharacter(charType: CharacterType): Promise<void> {
    this._characterType = charType;
    let currentUv = { u: 0.65, v: 0.85 };

    if (this._movementBehavior) {
      currentUv = this._movementBehavior.uv;
    }

    if (this._player) {
      this._playerRig.remove(this._player);
    }
    if (!this._playerRig) {
      this._playerRig = new Object3D("PlayerRig");
      this.scene.add(this._playerRig);
    }

    try {
      const gltfLoader = new GltfLoader();
      let charModelUrl = "/assets/and-now/mannequin/player-male/character.glb";
      let charScale = 1.8;
      let descText = "Spieler (Männlich) auf der 2.5D-Bühne";

      if (charType === "female") {
        charModelUrl = "/assets/and-now/mannequin/player-female/character.glb";
        charScale = 1.8;
        descText = "Spielerin (Weiblich) auf der 2.5D-Bühne";
      } else if (charType === "yoshi") {
        charModelUrl = "/assets/and-now/mannequin/yoshi/character.glb";
        charScale = 1.35;
        descText = "🦖 Yoshi (Secret Easter Egg) auf der 2.5D-Bühne";
      }

      this._player = await gltfLoader.load(charModelUrl);
      this._player.scale.set(charScale, charScale, charScale);

      // 1. Alle Animationen aus dem Mocap-Pool laden
      this._clips.clear();
      for (const [name, url] of Object.entries(ANIMATION_CLIP_URLS)) {
        try {
          const animClips = await gltfLoader.loadAnimations(url);
          const clip = animClips[0];
          if (clip) {
            this._clips.set(name, clip);
          }
        } catch (animErr) {
          console.warn(`[AndNowScene2] Konnte Animation "${name}" nicht laden:`, animErr);
        }
      }
      const applyMaterialToHierarchy = (obj: Object3D): void => {
        if (obj.material) {
          const bMat = new BasicMaterial({ color: new Color(1, 1, 1) });
          if ("diffuseMap" in obj.material && obj.material.diffuseMap instanceof Texture) {
            bMat.diffuseMap = obj.material.diffuseMap;
          }
          obj.material = bMat;
        }
        for (const child of obj.children) {
          applyMaterialToHierarchy(child);
        }
      };
      applyMaterialToHierarchy(this._player);

      this._playerRig.add(this._player);

      // Laterne (Platzhalter-Mesh + Punktlicht) an die Hand-Bone hängen
      let handBone: Object3D | undefined;
      for (const boneName of LANTERN_HAND_BONE_NAMES) {
        const found = this._player.getObjectByName(boneName);
        if (found) {
          handBone = found;
          break;
        }
      }

      this._lanternHandBone = handBone;
      if (handBone) {
        if (!this._lanternGroup) {
          this._lanternGroup = this._buildLanternMesh();
          this._pointLight.position.set(0, -0.16, 0);
          this._lanternGroup.add(this._pointLight);
          // Scene-level sibling, deliberately NOT a child of `handBone` -- see
          // `_syncLanternTransform()`'s doc comment for why.
          this.scene.add(this._lanternGroup);
        }
        this._lanternGroup.isVisible = this._lanternOn;
        this._pointLight.isVisible = this._lanternOn;
      } else {
        console.warn(
          `[AndNowScene2] Hand-Bone nicht gefunden -- Laterne bleibt an fixer Position.`,
        );
      }

      // 2.5D Bühnen-Bewegung an Spieler ankoppeln
      this._movementBehavior = new StageMovementBehavior({
        input: this.input,
        speed: 0.15,
        runMultiplier: 2.2,
        rotationSpeed: 12.0,
        // convention -- confirmed live: rotation.y = 270° faces screen-left, 90° faces screen-right,
        // 180° faces into the tunnel (depth), and 0° faces the camera.
        facingOffset: Math.PI,
        startFacing: "left",
        zones: this._stageZones,
        uvToWorld: (u: number, v: number): { x: number; y: number; z: number } =>
          this._uvToWorld(u, v),
        startUV: currentUv,
        onZoneChange: (zone: StageZone): void => {
          this._updateHUD(zone);
          this._syncActiveAnimation();
        },
        onStateChange: (_state: "IDLE" | "WALK" | "RUN"): void => {
          this._syncActiveAnimation();
        },
      });
      this._playerRig.addBehavior(this._movementBehavior);

      if (0 < this._clips.size) {
        this._mixer = new AnimationMixer(this._player);
        this._activeAnimation = undefined;
        this._fade = undefined;
        this._syncActiveAnimation(0);
      }

      if (this._charDescEl) {
        this._charDescEl.textContent = descText;
      }
    } catch (e) {
      console.error("[AndNowScene2] Fehler beim Laden des Charakters:", e);
    }
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
    if (this._stageZones.length < 3) return;

    const ids = ["zone_a", "zone_b", "zone_c"] as const;
    for (let i = 0; i < ids.length; i++) {
      const defaults = DEFAULT_ZONE_POINTS[ids[i]!];
      const zone = this._stageZones[i]!;
      for (let p = 0; p < 4; p++) {
        // Clone rather than share the reference -- the editor mutates a point's `u`/`v`/`scale`
        // in place (drag handles, the scale input), which would otherwise corrupt
        // `DEFAULT_ZONE_POINTS` itself for every future reset.
        zone.points[p] = { ...defaults[p]! };
      }
    }
  }

  private _setupEditorEvents(): void {
    this._charTagEl = document.getElementById("characterTag");
    this._tagTitleEl = document.getElementById("tagTitle");
    this._tagDetailsEl = document.getElementById("tagDetails");

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

  /** Keeps the lantern's world POSITION locked to the hand bone's grip point every frame, while
   * deliberately NOT parenting it under that bone. Two independent reasons:
   * 1. A hand bone swings through a large rotation arc during walk/idle animation -- a lantern
   *    rigidly rotating with it would tumble around instead of hanging straight down from its
   *    handle, the way a real lantern pivots freely in a gripped hand. Never applying the bone's
   *    rotation to `_lanternGroup.rotation` (left at the identity `_buildLanternMesh()` sets it
   *    to) means it always hangs down, by construction.
   * 2. Mixamo rigs commonly bake a large (e.g. ~100x, a leftover cm-to-m unit conversion) uniform
   *    scale into the skeleton's bones -- the GPU-skinned character mesh never shows it because
   *    its skinning matrices are relative to each bone's *bind pose*
   *    (`bone.worldMatrix * inverseBindMatrix`, see `Skeleton.update()`), which cancels a static
   *    scale factor out. A plain `Object3D` parented directly onto a bone has no such
   *    cancellation and would inherit the raw ~100x bone scale. Not parenting under the bone at
   *    all sidesteps this entirely, rather than compensating for it every frame.
   * This mirrors `GadgetInspector`'s `_objectAxes` gizmo: added to `this._scene` (not the selected
   * object), then synced from the tracked object's world transform every frame instead of being a
   * scene-graph child of it -- here we copy only position, never rotation or scale. */
  private _syncLanternTransform(): void {
    const bone = this._lanternHandBone;
    const lantern = this._lanternGroup;
    if (!bone || !lantern) return;

    // Columns 12/13/14 of the world matrix are its translation -- the bone's grip point in world
    // space. `LANTERN_GRIP_OFFSET` nudges from the bone's own origin (typically the wrist joint)
    // into the palm/fingers; applied in world space since the lantern no longer inherits the
    // hand's rotation to apply it relative to.
    const m = bone.worldMatrix.data;
    lantern.position.set(
      m[12]! + LANTERN_GRIP_OFFSET.x,
      m[13]! + LANTERN_GRIP_OFFSET.y,
      m[14]! + LANTERN_GRIP_OFFSET.z,
    );
  }

  /** Greybox stand-in for the Sturmlaterne (storm lantern) from the concept art -- a glowing
   * cylinder body with a torus handle, sized relative to a roughly human-scale rig. Replace with
   * the real modeled prop once one exists; parenting onto the hand bone stays the same either way. */
  private _buildLanternMesh(): Object3D {
    const lantern = new Object3D("LanternPlaceholder");

    const brassMat = new BasicMaterial({
      color: new Color(0.9, 0.65, 0.25),
    });

    const glowGlassMat = new BasicMaterial({
      color: new Color(1.0, 0.9, 0.6),
    });

    // Brass handle (at the grip origin y = 0)
    const handle = new Object3D("LanternHandle");
    handle.geometry = new Torus({ radius: 0.06, tube: 0.008, radialSegments: 8 }).getGeometryData();
    handle.material = brassMat;
    handle.position.set(0, 0, 0);
    lantern.add(handle);

    // Brass top cap (hanging just below handle)
    const topCap = new Object3D("LanternTopCap");
    topCap.geometry = new Cylinder({
      radiusTop: 0.02,
      radiusBottom: 0.06,
      height: 0.04,
    }).getGeometryData();
    topCap.material = brassMat;
    topCap.position.set(0, -0.05, 0);
    lantern.add(topCap);

    // Outer brass lantern frame / cage (hanging below top cap)
    const body = new Object3D("LanternBody");
    body.geometry = new Cylinder({
      radiusTop: 0.05,
      radiusBottom: 0.07,
      height: 0.18,
    }).getGeometryData();
    body.material = glowGlassMat;
    body.position.set(0, -0.16, 0);
    lantern.add(body);

    // Initial offset and rotation: shift from the wrist pivot into the palm/fingers and hang
    // vertically down. Position is overwritten every frame by `_syncLanternTransform()` once the
    // hand bone's real world position is known -- set here only so the lantern isn't sitting at
    // the scene origin for the first frame after attaching. Rotation is intentionally never
    // touched again: staying at identity is exactly what keeps it hanging straight down.
    lantern.position.set(LANTERN_GRIP_OFFSET.x, LANTERN_GRIP_OFFSET.y, LANTERN_GRIP_OFFSET.z);
    lantern.rotation.set(0, 0, 0);

    return lantern;
  }

  /**
   * Ermittelt anhand von Bewegungsstatus (IDLE, WALK, RUN), Laternenzustand
   * und aktiver Zone (z. B. Treppe Auf/Ab) die exakt passende Animation.
   */
  private _resolveDesiredAnimation(): string {
    const state = this._movementBehavior?.state ?? "IDLE";
    const zone = this._movementBehavior?.activeZone;
    const isStairs = zone?.id === "zone_c";
    const isLantern = this._lanternOn;

    if (state === "IDLE") {
      return isLantern ? "idle_torch" : this._idleVariation;
    }

    if (isStairs) {
      const isMovingDown = (this._movementBehavior?.moveForward ?? 0) < 0;
      return isMovingDown ? "stairs_down" : "stairs_up";
    }

    if (state === "RUN") {
      return isLantern ? "run_torch" : "run_1";
    }

    // state === "WALK"
    return isLantern ? "walk_torch" : "walk";
  }

  private _syncActiveAnimation(fadeSeconds?: number): void {
    const anim = this._resolveDesiredAnimation();
    this._playAnimation(anim, fadeSeconds !== undefined ? { fadeSeconds } : undefined);
  }

  /** Crossfades to the named clip from ANIMATION_CLIP_URLS. No-op if the clip hasn't been loaded
   * (e.g. not yet converted/dropped in) or is already the active animation. */
  private _playAnimation(name: string, opts?: { loop?: boolean; fadeSeconds?: number }): void {
    if (!this._mixer || name === this._activeAnimation) return;
    const clip = this._clips.get(name);
    if (!clip) return;

    // A fade already in flight gets cut short here -- its `from` is dropped from tracking below,
    // so it must be stopped now or it would keep blending forever at its last, stale weight.
    if (this._fade?.from) this._fade.from.stop();

    const fromAction =
      undefined !== this._activeAnimation
        ? this._mixer.clipAction(this._clips.get(this._activeAnimation)!)
        : undefined;
    const toAction = this._mixer.clipAction(clip);
    toAction.setLoop(opts?.loop ?? true);
    toAction.weight = 0;
    toAction.reset();
    toAction.play();

    this._fade = {
      from: fromAction,
      to: toAction,
      elapsed: 0,
      duration: Math.max(0, opts?.fadeSeconds ?? ANIMATION_FADE_SECONDS),
    };
    this._activeAnimation = name;
  }

  /** Advances the current crossfade (if any) by shifting weight from the outgoing to the
   * incoming AnimationAction; AnimationMixer.update already blends simultaneously-playing
   * actions by weight, so this only has to move the two weights toward their target. */
  private _updateAnimationFade(deltaTime: number): void {
    const fade = this._fade;
    if (!fade) return;

    if (0 >= fade.duration) {
      fade.to.weight = 1;
      if (fade.from) fade.from.stop();
      this._fade = undefined;
      return;
    }

    fade.elapsed += deltaTime;
    const t = Math.min(1, fade.elapsed / fade.duration);
    fade.to.weight = t;
    if (fade.from) fade.from.weight = 1 - t;

    if (1 <= t) {
      if (fade.from) fade.from.stop();
      this._fade = undefined;
    }
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

    // Toggle Laterne mit Taste 'L' -- Mesh und Punktlicht hängen beide an der Hand-Bone, also
    // reicht ein gemeinsames isVisible statt separater An/Aus-Logik pro Teil.
    const isLPressed = this.input.isPressed("KeyL");
    if (isLPressed && !this._lastLState) {
      this._lanternOn = !this._lanternOn;
      if (this._lanternGroup) this._lanternGroup.isVisible = this._lanternOn;
      this._pointLight.isVisible = this._lanternOn;
      this._syncActiveAnimation();
    }
    this._lastLState = isLPressed;

    // Idle-Variations-Timer (Wechsel zwischen idle_1 und idle_2 bei inaktiver Laterne)
    if (this._movementBehavior?.state === "IDLE" && !this._lanternOn) {
      this._idleTimer += deltaTime;
      if (this._idleTimer >= this._idleSwitchDuration) {
        this._idleTimer = 0;
        this._idleVariation = this._idleVariation === "idle_1" ? "idle_2" : "idle_1";
        this._idleSwitchDuration =
          this._idleVariation === "idle_2" ? 3.5 : 7.0 + Math.random() * 5.0;
        this._syncActiveAnimation(0.4);
      }
    } else {
      this._idleTimer = 0;
      this._idleVariation = "idle_1";
    }

    // Toggle Charakter mit Taste 'C' (Männlich -> Weiblich -> Yoshi -> Männlich)
    const isCPressed = this.input.isPressed("KeyC");
    if (isCPressed && !this._lastCState && !this._isSwitchingChar) {
      this._isSwitchingChar = true;
      const nextChar: CharacterType =
        this._characterType === "male"
          ? "female"
          : this._characterType === "female"
            ? "yoshi"
            : "male";
      this._loadCharacter(nextChar)
        .catch((err: unknown) => console.error("[AndNowScene2] Fehler beim Charakterwechsel:", err))
        .finally(() => {
          this._isSwitchingChar = false;
        });
    }
    this._lastCState = isCPressed;

    if (this._editorActive) {
      this._updateEditorUI();
    }

    if (this._mixer) {
      this._updateAnimationFade(deltaTime);
      this._mixer.update(deltaTime);
    }

    this.scene.update(deltaTime);
    this._syncLanternTransform();

    // Overhead Debug Tag über dem Kopf der Spielfigur
    if (this._playerRig && this._charTagEl && this._tagTitleEl && this._tagDetailsEl) {
      const charHeadHeight = this._characterType === "yoshi" ? 1.3 : 1.9;
      const headPos = {
        x: this._playerRig.position.x,
        y: this._playerRig.position.y + charHeadHeight * this._playerRig.scale.y,
        z: this._playerRig.position.z,
      };
      const screenPos = this._worldToScreen(headPos.x, headPos.y, headPos.z);
      this._charTagEl.style.display = "block";
      this._charTagEl.style.left = `${screenPos.x}px`;
      this._charTagEl.style.top = `${screenPos.y - 12}px`;

      const clip = this._activeAnimation ? this._clips.get(this._activeAnimation) : undefined;
      const action = clip && this._mixer ? this._mixer.clipAction(clip) : undefined;
      const timeStr = action ? action.time.toFixed(2) : "0.00";

      // Orientierung / Blickrichtung berechnen (0..360 Grad)
      // Visual convention: 270° = Links, 90° = Rechts, 180° = Hinten, 0° = Vorne
      const rawDeg = ((this._playerRig.rotation.y * 180) / Math.PI) % 360;
      const deg = (rawDeg + 360) % 360;
      let dirName: string;
      if (deg >= 157.5 && deg < 202.5) dirName = "⬆️ HINTEN";
      else if (deg >= 112.5 && deg < 157.5) dirName = "↗️ HINTEN-RECHTS";
      else if (deg >= 67.5 && deg < 112.5) dirName = "➡️ RECHTS";
      else if (deg >= 22.5 && deg < 67.5) dirName = "↘️ VORNE-RECHTS";
      else if (deg >= 337.5 || deg < 22.5) dirName = "⬇️ VORNE (zur Kamera)";
      else if (deg >= 292.5 && deg < 337.5) dirName = "↙️ VORNE-LINKS";
      else if (deg >= 247.5 && deg < 292.5) dirName = "⬅️ LINKS";
      else dirName = "↖️ HINTEN-LINKS";

      this._tagTitleEl.textContent = `[${this._characterType.toUpperCase()}] ▶ ${this._activeAnimation ?? "none"} (t=${timeStr}s)`;
      this._tagDetailsEl.innerHTML = `
        Blickrichtung: <b style="color:#38bdf8;">${dirName} (${deg.toFixed(0)}°)</b><br>
        State: <b style="color:#fff;">${this._movementBehavior?.state ?? "IDLE"}</b> | Zone: <b style="color:#fff;">${this._movementBehavior?.activeZone?.id ?? "none"}</b><br>
        Laterne: <b style="color:#ffb84d;">${this._lanternOn ? "AN" : "AUS"}</b> (Anatomisch: Links)<br>
        Renderer: <b style="color: #38bdf8;">${this.renderer.type}</b>
      `;
    }
  }
}

const app = new AndNowScene2({
  rendererType: RendererType.BEST,
  enableInspector: true,
});
app.start().catch((err: unknown) => console.error("[AndNowScene2] Failed to start:", err));
