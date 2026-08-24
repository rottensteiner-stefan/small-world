import {
  AbstractShowcase,
  AmbientLight,
  BloomElement,
  Color,
  Cube,
  Cylinder,
  EngineOptions,
  MathUtils,
  Object3D,
  OutlineElement,
  PointLight,
  PostProcessingEffectType,
  SpotLight,
  StandardMaterial,
  ToneMappingElement,
  ToneMappingMode,
  Vector3D,
  VignetteElement,
  RendererType,
} from "../../../../index.js";

export class PrologueScene extends AbstractShowcase {
  private _bunkerDoor: Object3D | null = null;
  private _doorSpot: SpotLight | null = null;
  private _screenMaterial: StandardMaterial | null = null;
  private _dustParticles: Object3D[] = [];

  // Timeline & State
  private _currentTime: number = 0;
  private _isPlaying: boolean = false;
  private _isPausedForChoice: boolean = false;
  private _currentPhase: number = 0;
  private _targetCameraPos: Vector3D = new Vector3D(0, 1.6, 4.2);
  private _targetCameraLook: Vector3D = new Vector3D(0, 1.2, 0);

  // Door angle
  private _doorOpenAngle: number = 0;
  private _targetDoorAngle: number = 0;

  constructor(options: EngineOptions = {}) {
    super(options);
  }

  protected override async setupScene(): Promise<void> {
    // 1. Camera (Use default projection, just position it)
    this.camera.position.set(0, 1.6, 4.2);
    this.camera.target.set(0, 1.2, 0);
    this.camera.updateViewMatrix();

    // 2. Setup Post Processing
    if (this.renderer?.postProcessing) {
      this.renderer.postProcessing.enabled = true;

      const outline = this.renderer.postProcessing.get<OutlineElement>(
        PostProcessingEffectType.OUTLINE,
      );
      if (outline) {
        outline.enabled = true;
        outline.thickness = 1.0;
        outline.sensitivity = 0.5;
        outline.color = new Color(0.04, 0.05, 0.08);
      }

      const bloom = this.renderer.postProcessing.get<BloomElement>(PostProcessingEffectType.BLOOM);
      if (bloom) {
        bloom.enabled = true;
        bloom.intensity = 1.2;
        bloom.threshold = 0.6;
      }

      const vignette = this.renderer.postProcessing.get<VignetteElement>(
        PostProcessingEffectType.VIGNETTE,
      );
      if (vignette) {
        vignette.enabled = true;
        vignette.darkness = 0.75;
        vignette.offset = 0.9;
      }

      const tone = this.renderer.postProcessing.get<ToneMappingElement>(
        PostProcessingEffectType.TONE_MAPPING,
      );
      if (tone) {
        tone.enabled = true;
        tone.mode = ToneMappingMode.ACES_FILMIC;
        tone.exposure = 1.2;
      }
    }

    // 3. Lighting (Dark Noir style)
    const ambient = new AmbientLight({
      color: new Color(0.12, 0.15, 0.22),
      intensity: 0.35,
    });
    this.scene.add(ambient);

    // Flur-Lichtstrahl durch die Tür
    this._doorSpot = new SpotLight({
      name: "HallwayDoorBeam",
      color: new Color(1.0, 0.82, 0.45), // Warm yellow hallway light
      intensity: 18.0, // The bloom threshold needs this punch
      distance: 14.0,
      angle: Math.PI / 4.5,
      penumbra: 0.6,
      decay: 1.1,
    });
    this._doorSpot.position.set(-2.6, 2.2, -0.6);
    this._doorSpot.lookAt(new Vector3D(0.5, 0.8, 0.5));
    this.scene.add(this._doorSpot);

    // Schwaches Deckenlicht (Flackern)
    const ceilingLight = new PointLight({
      name: "BunkerCeilingBulb",
      color: new Color(0.85, 0.9, 1.0),
      intensity: 1.5,
      distance: 8.0,
    });
    ceilingLight.position.set(0, 2.6, 0);
    this.scene.add(ceilingLight);

    // 4. Build 3D Bunker Koje
    this._buildBunkerRoom();

    // 5. Build Dust Particles
    this._buildDustParticles();

    // 6. UI Handlers
    this._initUiListeners();
  }

  private _buildBunkerRoom(): void {
    const cubeGeo = new Cube({ size: 1.0 }).getGeometryData();
    const cylGeo = new Cylinder({
      radiusTop: 0.5,
      radiusBottom: 0.5,
      height: 1.0,
      radialSegments: 16,
    }).getGeometryData();

    // Materials (Dark and gritty)
    const concreteWallMat = new StandardMaterial({
      color: new Color(0.18, 0.2, 0.24),
      roughness: 0.92,
      metallic: 0.1,
    });

    const floorMat = new StandardMaterial({
      color: new Color(0.12, 0.13, 0.16),
      roughness: 0.85,
      metallic: 0.2,
    });

    const rustSteelMat = new StandardMaterial({
      color: new Color(0.25, 0.15, 0.1),
      roughness: 0.75,
      metallic: 0.6,
    });

    const woodMat = new StandardMaterial({
      color: new Color(0.2, 0.15, 0.12),
      roughness: 0.88,
      metallic: 0.05,
    });

    const brassMat = new StandardMaterial({
      color: new Color(0.5, 0.4, 0.2),
      roughness: 0.35,
      metallic: 0.85,
    });

    // Back Wall
    const backWall = new Object3D("BackWall");
    backWall.geometry = cubeGeo;
    backWall.material = concreteWallMat;
    backWall.scale.set(5.0, 3.2, 0.3);
    backWall.position.set(0, 1.6, -1.5);
    this.scene.add(backWall);

    // Floor
    const floor = new Object3D("Floor");
    floor.geometry = cubeGeo;
    floor.material = floorMat;
    floor.scale.set(5.0, 0.3, 3.5);
    floor.position.set(0, -0.15, 0.2);
    this.scene.add(floor);

    // Ceiling
    const ceiling = new Object3D("Ceiling");
    ceiling.geometry = cubeGeo;
    ceiling.material = concreteWallMat;
    ceiling.scale.set(5.0, 0.3, 3.5);
    ceiling.position.set(0, 3.2, 0.2);
    this.scene.add(ceiling);

    // Right Wall
    const rightWall = new Object3D("RightWall");
    rightWall.geometry = cubeGeo;
    rightWall.material = concreteWallMat;
    rightWall.scale.set(0.3, 3.2, 3.5);
    rightWall.position.set(2.5, 1.6, 0.2);
    this.scene.add(rightWall);

    // Left Wall with Doorframe
    const leftWallTop = new Object3D("LeftWallTop");
    leftWallTop.geometry = cubeGeo;
    leftWallTop.material = concreteWallMat;
    leftWallTop.scale.set(0.3, 1.0, 3.5);
    leftWallTop.position.set(-2.5, 2.7, 0.2);
    this.scene.add(leftWallTop);

    const leftWallBack = new Object3D("LeftWallBack");
    leftWallBack.geometry = cubeGeo;
    leftWallBack.material = concreteWallMat;
    leftWallBack.scale.set(0.3, 2.2, 1.5);
    leftWallBack.position.set(-2.5, 1.1, -0.8);
    this.scene.add(leftWallBack);

    const leftWallFront = new Object3D("LeftWallFront");
    leftWallFront.geometry = cubeGeo;
    leftWallFront.material = concreteWallMat;
    leftWallFront.scale.set(0.3, 2.2, 0.8);
    leftWallFront.position.set(-2.5, 1.1, 1.5);
    this.scene.add(leftWallFront);

    // 🚪 Heavy Blast Door (Rotatable Hinge at x=-2.4, z=0.0)
    const doorHinge = new Object3D("DoorHinge");
    doorHinge.position.set(-2.4, 0, -0.05);

    const doorMesh = new Object3D("DoorLeaf");
    doorMesh.geometry = cubeGeo;
    doorMesh.material = rustSteelMat;
    doorMesh.scale.set(0.12, 2.1, 1.15);
    doorMesh.position.set(0, 1.05, 0.575);
    doorHinge.add(doorMesh);

    // Door Rivets
    for (let r = 0; r < 4; r++) {
      const rib = new Object3D(`DoorRib_${r}`);
      rib.geometry = cubeGeo;
      rib.material = rustSteelMat;
      rib.scale.set(0.16, 0.08, 1.0);
      rib.position.set(0, 0.35 + r * 0.5, 0.575);
      doorHinge.add(rib);
    }

    this.scene.add(doorHinge);
    this._bunkerDoor = doorHinge;

    // 🛏️ Bunk Bed (Stockbett)
    const bedGroup = new Object3D("BunkBed");
    bedGroup.position.set(1.5, 0, -0.6);

    const postOffsets: [number, number, number][] = [
      [-0.5, 0.85, -0.6],
      [0.5, 0.85, -0.6],
      [-0.5, 0.85, 0.6],
      [0.5, 0.85, 0.6],
    ];
    postOffsets.forEach(([px, py, pz], idx) => {
      const post = new Object3D(`BedPost_${idx}`);
      post.geometry = cubeGeo;
      post.material = rustSteelMat;
      post.scale.set(0.06, 1.7, 0.06);
      post.position.set(px, py, pz);
      bedGroup.add(post);
    });

    const bottomBed = new Object3D("BottomMattress");
    bottomBed.geometry = cubeGeo;
    bottomBed.material = new StandardMaterial({
      color: new Color(0.22, 0.24, 0.28),
      roughness: 0.95,
    });
    bottomBed.scale.set(1.0, 0.15, 1.25);
    bottomBed.position.set(0, 0.35, 0);
    bedGroup.add(bottomBed);

    const topBed = new Object3D("TopMattress");
    topBed.geometry = cubeGeo;
    topBed.material = new StandardMaterial({ color: new Color(0.18, 0.2, 0.22), roughness: 0.95 });
    topBed.scale.set(1.0, 0.15, 1.25);
    topBed.position.set(0, 1.25, 0);
    bedGroup.add(topBed);

    this.scene.add(bedGroup);

    // ☕ Wooden Shelf & Coffee Grinder
    const shelf = new Object3D("Shelf");
    shelf.geometry = cubeGeo;
    shelf.material = woodMat;
    shelf.scale.set(1.2, 0.06, 0.4);
    shelf.position.set(-0.5, 1.5, -1.3);
    this.scene.add(shelf);

    const grinder = new Object3D("CoffeeGrinder");
    grinder.position.set(-0.5, 1.62, -1.3);

    const grinderBox = new Object3D("GrinderBox");
    grinderBox.geometry = cubeGeo;
    grinderBox.material = woodMat;
    grinderBox.scale.set(0.22, 0.18, 0.22);
    grinder.add(grinderBox);

    const grinderHopper = new Object3D("GrinderHopper");
    grinderHopper.geometry = cylGeo;
    grinderHopper.material = brassMat;
    grinderHopper.scale.set(0.18, 0.1, 0.18);
    grinderHopper.position.set(0, 0.13, 0);
    grinder.add(grinderHopper);

    const grinderCrank = new Object3D("GrinderCrank");
    grinderCrank.geometry = cubeGeo;
    grinderCrank.material = brassMat;
    grinderCrank.scale.set(0.16, 0.02, 0.03);
    grinderCrank.position.set(0.06, 0.2, 0);
    grinder.add(grinderCrank);

    this.scene.add(grinder);

    // 📟 The AZS Handheld Terminal
    const terminal = new Object3D("HandheldTerminal");
    terminal.position.set(0, 1.0, 0.8);
    terminal.rotation.x = -Math.PI / 6;

    const terminalBody = new Object3D("TerminalBody");
    terminalBody.geometry = cubeGeo;
    terminalBody.material = new StandardMaterial({
      color: new Color(0.2, 0.2, 0.22),
      roughness: 0.6,
      metallic: 0.3,
    });
    terminalBody.scale.set(0.38, 0.52, 0.1);
    terminal.add(terminalBody);

    this._screenMaterial = new StandardMaterial({
      color: new Color(0.9, 0.55, 0.1),
      roughness: 0.3,
      metallic: 0.1,
    });
    const terminalScreen = new Object3D("TerminalScreen");
    terminalScreen.geometry = cubeGeo;
    terminalScreen.material = this._screenMaterial;
    terminalScreen.scale.set(0.3, 0.26, 0.02);
    terminalScreen.position.set(0, 0.08, 0.05);
    terminal.add(terminalScreen);

    // Amber screen light
    const screenGlow = new PointLight({
      name: "ScreenGlow",
      color: new Color(1.0, 0.65, 0.15),
      intensity: 1.5,
      distance: 3.0,
    });
    screenGlow.position.set(0, 0.08, 0.15);
    terminal.add(screenGlow);

    this.scene.add(terminal);
  }

  private _buildDustParticles(): void {
    const cubeGeo = new Cube({ size: 0.02 }).getGeometryData();
    const dustMat = new StandardMaterial({
      color: new Color(1.0, 0.9, 0.7),
      roughness: 0.1,
      metallic: 0.0,
    });

    for (let i = 0; i < 35; i++) {
      const p = new Object3D(`DustParticle_${i}`);
      p.geometry = cubeGeo;
      p.material = dustMat;
      p.position.set(
        (Math.random() - 0.5) * 3.5,
        0.5 + Math.random() * 2.2,
        (Math.random() - 0.5) * 2.5,
      );
      this.scene.add(p);
      this._dustParticles.push(p);
    }
  }

  private _initUiListeners(): void {
    const btnPlay = document.getElementById("btnPlay");
    if (btnPlay) {
      const newBtn = btnPlay.cloneNode(true);
      btnPlay.parentNode?.replaceChild(newBtn, btnPlay);
      newBtn.addEventListener("click", () => this.togglePlayback());
    }

    const btnQ1 = document.getElementById("btnQuestion1");
    const btnQ2 = document.getElementById("btnQuestion2");

    if (btnQ1) {
      const newBtn = btnQ1.cloneNode(true);
      btnQ1.parentNode?.replaceChild(newBtn, btnQ1);
      newBtn.addEventListener("click", () => this.selectQuestion(1));
    }
    if (btnQ2) {
      const newBtn = btnQ2.cloneNode(true);
      btnQ2.parentNode?.replaceChild(newBtn, btnQ2);
      newBtn.addEventListener("click", () => this.selectQuestion(2));
    }
  }

  public togglePlayback(): void {
    this._isPlaying = !this._isPlaying;
    const btn = document.getElementById("btnPlay");
    if (btn) {
      btn.innerText = this._isPlaying ? "⏸ Szene Pausieren" : "▶ Szene Fortsetzen";
    }
  }

  public selectQuestion(q: number): void {
    const choiceBox = document.getElementById("dialogChoice");
    if (choiceBox) choiceBox.style.display = "none";

    this._isPausedForChoice = false;
    this._isPlaying = true;

    const sub = document.getElementById("subText");
    const speaker = document.getElementById("subSpeaker");
    if (q === 1) {
      if (speaker) speaker.innerText = "Herr Hawelka";
      if (sub)
        sub.innerText =
          "„Unten bei den Kühlleitungen... aber er sah nicht gut aus. Da waren dunkle Flecken am Hals, Novotny!“";
    } else {
      if (speaker) speaker.innerText = "Herr Hawelka";
      if (sub)
        sub.innerText =
          "„Weil die AZS-Schergen jeden Speicherchip sofort löschen! František wollte, dass du es hast!“";
    }

    this._currentTime = 28.0;
  }

  protected override update(deltaTime: number): void {
    super.update(deltaTime);

    if (this._isPlaying && !this._isPausedForChoice) {
      this._currentTime += deltaTime;
      this._updateTimeline(this._currentTime);
    }

    // 1. Smooth Camera Kinematics
    this.camera.position.lerp(this._targetCameraPos, Math.min(1.0, deltaTime * 2.5));
    this.camera.target.lerp(this._targetCameraLook, Math.min(1.0, deltaTime * 2.5));
    this.camera.updateViewMatrix();

    // 2. Door Animation
    this._doorOpenAngle = MathUtils.lerp(
      this._doorOpenAngle,
      this._targetDoorAngle,
      Math.min(1.0, deltaTime * 3.0),
    );
    if (this._bunkerDoor) {
      this._bunkerDoor.rotation.y = this._doorOpenAngle;
    }

    // 3. Floating Dust Particles
    for (let i = 0; i < this._dustParticles.length; i++) {
      const p = this._dustParticles[i];
      if (p) {
        p.position.y += Math.sin(this._currentTime * 1.5 + i) * 0.002;
        p.position.x += Math.cos(this._currentTime * 0.8 + i) * 0.001;
      }
    }

    // 4. Subtle CRT Screen Flicker
    if (this._screenMaterial) {
      const flicker =
        0.95 + Math.sin(this._currentTime * 45.0) * 0.05 + (Math.random() - 0.5) * 0.04;
      this._screenMaterial.color.set(0.9 * flicker, 0.55 * flicker, 0.1 * flicker);
    }

    // 5. Update UI Progress
    const progressEl = document.getElementById("timelineProgress");
    if (progressEl) {
      const pct = Math.min(100, (this._currentTime / 60.0) * 100);
      progressEl.style.width = pct + "%";
    }

    const timerEl = document.getElementById("timerText");
    if (timerEl) {
      const s = Math.floor(this._currentTime);
      const str = (s < 10 ? "0" : "") + s;
      timerEl.innerText = `00:${str} / 01:00`;
    }

    this.scene.update(deltaTime);
  }

  private _updateTimeline(time: number): void {
    const speaker = document.getElementById("subSpeaker");
    const sub = document.getElementById("subText");

    // Timeline Events
    if (time >= 0 && time < 4.0 && this._currentPhase === 0) {
      this._currentPhase = 1;
      if (speaker) speaker.innerText = "Geräuschkulisse";
      if (sub)
        sub.innerText =
          "*Dumpfes, panisches Pochen gegen die rostige Panzertür hallt durch die Koje.*";
      this._targetDoorAngle = 0;
    } else if (time >= 4.0 && time < 10.0 && this._currentPhase === 1) {
      this._currentPhase = 2;
      this._targetDoorAngle = -Math.PI / 4.5;
      if (speaker) speaker.innerText = "Herr Hawelka (AZS-Blockwart)";
      if (sub) sub.innerText = "„Novotny... psst! Mach keinen Lärm. Nimm das. Schnell!“";
      this._targetCameraPos.set(-0.8, 1.4, 3.0);
      this._targetCameraLook.set(-1.2, 1.2, 0);
    } else if (time >= 10.0 && time < 20.0 && this._currentPhase === 2) {
      this._currentPhase = 3;
      if (speaker) speaker.innerText = "Herr Hawelka";
      if (sub)
        sub.innerText =
          "„Sie haben František im Maschinenstrang aufgelesen. Er ist hinüber... Das ist meine Schuld von damals. Pack seine Sachen.“";
    } else if (time >= 20.0 && this._currentPhase === 3) {
      this._currentPhase = 4;
      this._isPausedForChoice = true;
      this._isPlaying = false;
      const choiceBox = document.getElementById("dialogChoice");
      if (choiceBox) choiceBox.style.display = "block";
    } else if (time >= 35.0 && time < 38.0 && this._currentPhase === 4) {
      this._currentPhase = 5;
      if (speaker) speaker.innerText = "Geräuschkulisse";
      if (sub) sub.innerText = "*Schweres Stiefeldröhnen der AZS-Wachen nähert sich im Flur!*";
    } else if (time >= 38.0 && time < 44.0 && this._currentPhase === 5) {
      this._currentPhase = 6;
      this._targetDoorAngle = 0; // Door slams shut!
      if (speaker) speaker.innerText = "Herr Hawelka";
      if (sub)
        sub.innerText =
          "„Verdammt, die Patrouille! Ich war nie hier, hörst du?!“ *[Tür fällt ins Schloss]*";
      this._targetCameraPos.set(0, 1.2, 1.8);
      this._targetCameraLook.set(0, 1.0, 0.8);
    } else if (time >= 44.0 && time < 52.0 && this._currentPhase === 6) {
      this._currentPhase = 7;
      this._targetCameraPos.set(0, 1.15, 1.35);
      this._targetCameraLook.set(0, 1.08, 0.85);
      if (speaker) speaker.innerText = "Amts-Terminal 2100 (KI Amtsrat 4.1)";
      if (sub)
        sub.innerText =
          "„GZ 2100-AZS/STERBEFALL-0815 // BÜRGER FRANTIŠEK NOVOTNY: GELÖSCHT // FACH K-42 // KOMPOSTIERUNG IN 48:00.“";
    } else if (time >= 52.0 && this._currentPhase === 7) {
      this._currentPhase = 8;
      if (speaker) speaker.innerText = "Amts-Logbuch (Auto-Journal)";
      if (sub)
        sub.innerText =
          "[Eintrag archiviert: Sektor 0 / Kältekammer Fach K-42] — Der Entschluss steht fest: Hinabsteigen.";
    }
  }
}

const app = new PrologueScene({
  rendererType: RendererType.BEST,
});

app.start().catch((err: unknown) => {
  console.error("[Prologue] Failed to start 3D scene:", err);
});
