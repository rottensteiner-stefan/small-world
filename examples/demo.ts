/// examples/demo.ts
import {
  AmbientLight,
  AreaLight,
  BoundingBox,
  BoundingSphere,
  Camera,
  CameraStrategyType,
  Collision,
  Color,
  Cube,
  DirectionalLight,
  FrustumCuller,
  HeightmapGenerator,
  HUD,
  Input,
  Keys,
  LambertMaterial,
  Matrix4,
  Object3D,
  ObjLoader,
  PerspectiveProjection,
  PhongMaterial,
  Scene,
  Skybox,
  SkyboxLoader,
  SmallWorld,
  Sphere,
  SpotLight,
  Terrain,
  TerrainStrategies,
  Texture,
  Vector3D,
} from "../src/index.js";

class Application {
  private sw: SmallWorld;
  private scene: Scene;
  private hud!: HUD;
  private cam: Camera;

  private player!: Object3D;
  private flashLight!: SpotLight;
  private moon!: Object3D;
  private skybox!: Skybox;
  private spheres: Object3D[] = [];

  private score = 0;
  private readonly TOTAL_SPHERES = 30;
  private readonly PLAYER_SIZE = 1.5;
  private hudVisible = true;
  private tabWasPressed = false;

  private playerVelocityY = 0;
  private isGrounded = true;

  private lastTime = 0;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 0;
  private viewMatrix = new Matrix4();
  private vpMatrix = new Matrix4();

  constructor() {
    this.sw = new SmallWorld();
    this.scene = new Scene();
    this.cam = new Camera(
      new PerspectiveProjection(Math.PI / 4, window.innerWidth / window.innerHeight, 0.1, 200),
    );
  }

  public async start() {
    Input.init();
    await this.sw.init("./config/small-world.json");
    this.sw.activeRenderer.setSize(window.innerWidth, window.innerHeight);

    this.hudVisible = this.sw.config.showHUD !== false;
    this.hud = new HUD(this.hudVisible);
    await this.hud.init();

    await this.setupScene();
    this.setupInput();

    const now = performance.now();
    this.lastTime = now;
    this.lastFrameTime = now;

    this.loop(now);
  }

  private async setupScene() {
    const ambient = new AmbientLight(new Color(0.1, 0.1, 0.15), 0.5);
    this.scene.add(ambient);

    const sun = new DirectionalLight(Color.YELLOW, 0.2);
    sun.direction.set(1, -1.5, -1).normalize();
    this.scene.add(sun);

    /*
        const WORLD_SIZE = this.sw.config.worldSize || 40;
        const grid = new Object3D("Grid");
        grid.geometry = new Grid(WORLD_SIZE, 50).getGeometryData();
        const gridMat = new WireframeMaterial();
        gridMat.color = Color.DARKSLATEGRAY;
        grid.material = gridMat;
        this.scene.add(grid);
        */

    this.player = new Object3D("Player");
    this.player.geometry = new Cube(this.PLAYER_SIZE).getGeometryData();

    const playerMaterial = new PhongMaterial();
    const playerTexture = new Texture("/resources/textures/dark-red-brick-wall.jpg");
    playerTexture.repeat.set(2, 2);
    playerMaterial.diffuseMap = playerTexture;
    playerMaterial.color = Color.WHITE;
    playerMaterial.specularColor = Color.WHITE;
    playerMaterial.shininess = 64;

    if (playerMaterial.diffuseMap) {
      playerMaterial.diffuseMap.setWrapMode("repeat");
      playerMaterial.diffuseMap.setFilterMode("nearest");
    }

    this.player.material = playerMaterial;
    this.scene.add(this.player);

    this.moon = new Object3D("Moon");
    this.moon.geometry = new Sphere(0.4).getGeometryData();
    const moonMaterial = new LambertMaterial();
    moonMaterial.color = Color.YELLOW;
    this.moon.material = moonMaterial;
    this.player.add(this.moon);

    this.flashLight = new SpotLight(Color.GREEN, 8.0);
    this.flashLight.angle = Math.PI / 7;
    this.flashLight.penumbra = 0.8;
    this.flashLight.position.set(0, 1, 1);
    this.player.add(this.flashLight);

    this.createSpheres();

    const skyLoader = new SkyboxLoader();
    const skyTexture = await skyLoader.load("./resources/textures/skybox.jpg");
    this.skybox = new Skybox(skyTexture, 100);
    this.scene.add(this.skybox);

    try {
      const objLoader = new ObjLoader();
      const snowman = await objLoader.load("./resources/models/snowman.obj");
      snowman.position.set(0, 0, 5);
      this.scene.add(snowman);
    } catch (error) {
      console.error("Fehler beim Laden des Schneemanns:", error);
    }

    // --- SANFTES ROTES AREA LIGHT ---
    // Parameter: Farbe (weiches Rot), Intensität, Breite, Höhe
    const redAreaLight = new AreaLight(new Color(1.0, 0.2, 0.2), 3.0, 20.0, 20.0);

    // Wir hängen das Leucht-Panel 10 Einheiten hoch über den Ursprung
    redAreaLight.position.set(0, 10, 0);

    // WICHTIG: Standardmäßig strahlt unser AreaLight entlang seiner Z-Achse.
    // Wir kippen es um 90 Grad (PI / 2) nach unten, damit es den Boden anstrahlt!
    redAreaLight.rotation.x = Math.PI / 2;

    this.scene.add(redAreaLight);

    const generatedMap = await HeightmapGenerator.generateDiamondSquare(8, 0.55);
    const terrainObj = new Object3D("Terrain");

    // Wir nutzen unsere frisch generierte Map!
    terrainObj.geometry = new Terrain(
      generatedMap,
      200, // Breite in Welt-Einheiten
      200, // Tiefe in Welt-Einheiten
      30, // Maximalhöhe der Berge
      256, // X-Auflösung der Geometrie
      256, // Z-Auflösung der Geometrie
      TerrainStrategies.CENTERED_AVERAGE,
    ).getGeometryData();

    const terrainMat = new PhongMaterial();
    terrainMat.color = new Color(0.3, 0.8, 0.3); // Schönes Gras-Grün
    terrainMat.shininess = 5; // Wenig Glanz für Erde/Gras
    terrainObj.material = terrainMat;

    this.scene.add(terrainObj);
  }

  private createSpheres() {
    const sGeo = new Sphere(0.6).getGeometryData();
    for (let i = 0; i < this.TOTAL_SPHERES; i++) {
      const s = new Object3D(`Sphere_${i}`);
      s.geometry = sGeo;
      const sMat = new PhongMaterial();
      sMat.color = Color.DODGERBLUE;
      sMat.specularColor = new Color(0.8, 0.8, 1.0);
      sMat.shininess = 32;
      s.material = sMat;
      s.position = new Vector3D(Math.random() * 40 - 20, 0, Math.random() * 40 - 20);
      s.bounds = new BoundingSphere(s.position, 0.6);
      this.scene.add(s);
      this.spheres.push(s);
    }
  }

  private setupInput() {
    const canvas = document.getElementById(this.sw.config.canvasId) as HTMLCanvasElement;

    // WICHTIG: Das Event liegt jetzt auf 'window'. Das HUD kann uns nicht mehr blockieren.
    window.addEventListener("click", () => {
      if (this.cam.activeStrategyType === CameraStrategyType.FPS) {
        Input.requestPointerLock(canvas);
      }
    });
  }

  private loop = (now: number = performance.now()) => {
    let dt = (now - this.lastFrameTime) * 0.001;
    this.lastFrameTime = now;

    if (dt > 0.1) dt = 0.1;

    const time = now * 0.001;
    this.frameCount++;

    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }

    this.update(time, dt);
    this.render();

    requestAnimationFrame(this.loop);
  };

  private update(time: number, dt: number) {
    this.updatePlayerMovement(dt);
    this.updateCamera();

    const tabDown = Input.isPressed(Keys.TAB);
    if (tabDown && !this.tabWasPressed) {
      this.hudVisible = !this.hudVisible;
      this.hud.setVisible(this.hudVisible);
    }
    this.tabWasPressed = tabDown;

    if (Input.isPressed(Keys.R)) {
      this.spheres.forEach((s) => this.scene.remove(s));
      this.spheres.length = 0;
      this.score = 0;
      this.createSpheres();
    }

    this.checkCollisions();

    this.moon.position.x = Math.cos(time * 2) * 3;
    this.moon.position.z = Math.sin(time * 2) * 3;
    this.moon.rotation.x = time;
    this.moon.rotation.y = time * 1.5;

    for (let i = 0; i < this.spheres.length; i++) {
      const s = this.spheres[i];
      s.rotation.x += 0.6 * dt;
      s.rotation.y += 1.2 * dt;
      s.position.y = Math.sin(time * 3 + i) * 0.5 + 0.5;

      if (s.bounds) s.bounds.center.copyFrom(s.position);
    }

    if (this.skybox && this.cam) {
      this.skybox.position.copyFrom(this.cam.position);
    }

    this.scene.update();
  }

  private updatePlayerMovement(dt: number) {
    const GRAVITY = 30.0;
    const JUMP_FORCE = 12.0;

    this.playerVelocityY -= GRAVITY * dt;
    this.player.position.y += this.playerVelocityY * dt;

    if (this.player.position.y <= 0) {
      this.player.position.y = 0;
      this.playerVelocityY = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    if (Input.isPressed(Keys.SPACE) && this.isGrounded) {
      this.playerVelocityY = JUMP_FORCE;
      this.isGrounded = false;
    }

    const baseSpeed = Input.isPressed(Keys.SHIFT_L) ? 25.0 : 10.0;
    const speed = baseSpeed * dt;

    const dx = Input.getAxis(Keys.A, Keys.D);
    const dz = Input.getAxis(Keys.W, Keys.S);

    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx * dx + dz * dz);
      const moveX = dx / len;
      const moveZ = dz / len;

      const s = Math.sin(this.cam.theta);
      const c = Math.cos(this.cam.theta);

      const forwardX = -s;
      const forwardZ = -c;
      const rightX = c;
      const rightZ = -s;

      const worldX = rightX * moveX - forwardX * moveZ;
      const worldZ = rightZ * moveX - forwardZ * moveZ;

      this.player.position.add(new Vector3D(worldX, 0, worldZ).scale(speed));

      if (this.cam.activeStrategyType !== CameraStrategyType.FPS) {
        this.player.rotation.y = Math.atan2(worldX, worldZ);
      } else {
        this.player.rotation.y = this.cam.theta;
      }

      this.flashLight.direction
        .set(Math.sin(this.player.rotation.y), -0.2, Math.cos(this.player.rotation.y))
        .normalize();
    }
  }

  private updateCamera() {
    if (Input.isPressed(Keys.D1)) this.cam.setStrategy(CameraStrategyType.FIXED);
    if (Input.isPressed(Keys.D2)) this.cam.setStrategy(CameraStrategyType.STIFF);
    if (Input.isPressed(Keys.D3)) this.cam.setStrategy(CameraStrategyType.SMOOTH);
    if (Input.isPressed(Keys.D4)) this.cam.setStrategy(CameraStrategyType.FPS);

    let mdx = 0,
      mdy = 0;

    // Wir rufen die Maus-Deltas nur ab, wenn wir gelockt sind ODER die rechte Maustaste halten
    if (
      (this.cam.activeStrategyType === CameraStrategyType.FPS && Input.isPointerLocked) ||
      Input.mouse.right
    ) {
      mdx = Input.mouse.dx;
      mdy = Input.mouse.dy;
    }

    this.cam.update(this.player.position, mdx, mdy);

    // WICHTIG: Nach dem Frame-Update setzen wir die aufsummierten Maus-Deltas wieder auf 0 zurück!
    Input.mouse.dx = 0;
    Input.mouse.dy = 0;
  }

  private checkCollisions() {
    const h = this.PLAYER_SIZE / 2;
    this.player.bounds = new BoundingBox(
      new Vector3D(
        this.player.position.x - h,
        this.player.position.y - h,
        this.player.position.z - h,
      ),
      new Vector3D(
        this.player.position.x + h,
        this.player.position.y + h,
        this.player.position.z + h,
      ),
    );

    for (let i = this.spheres.length - 1; i >= 0; i--) {
      const s = this.spheres[i];
      if (s.bounds && Collision.test(this.player.bounds as BoundingBox, s.bounds)) {
        this.scene.remove(s);
        this.spheres.splice(i, 1);
        this.score++;
      }
    }
  }

  private render() {
    Matrix4.lookAt(this.cam.position, this.cam.target, this.cam.up, this.viewMatrix);
    this.cam.getViewProjection(this.viewMatrix, this.vpMatrix);

    const visibleCount = FrustumCuller.cull(this.scene, this.vpMatrix);

    this.hud.update({
      "hud.fps": this.fps,
      "hud.cam.type": this.cam.activeStrategyType,
      "hud.renderer.type": this.sw.activeRenderer.type,
      "hud.player.pos.x": this.player.position.x.toFixed(1),
      "hud.player.pos.y": this.player.position.y.toFixed(1),
      "hud.player.pos.z": this.player.position.z.toFixed(1),
      "hud.score": `${this.score} / ${this.TOTAL_SPHERES}`,
      "hud.visible": visibleCount,
    });

    this.sw.activeRenderer.render(this.scene, this.vpMatrix.data, this.cam.position);
  }
}

const app = new Application();
app.start();
