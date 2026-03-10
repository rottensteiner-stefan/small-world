import {
  SmallWorld,
  Scene,
  Object3D,
  Color,
  Cube,
  Sphere,
  Grid,
  Camera,
  PerspectiveProjection,
  Matrix4,
  Input,
  Vector3D,
  HUD,
  BoundingSphere,
  BoundingBox,
  Collision,
  Keys,
  FrustumCuller,
  WireframeMaterial,
  LambertMaterial,
  PhongMaterial,
  DirectionalLight,
  AmbientLight,
  SpotLight,
  CameraStrategyType,
} from "../src/index.js";

class Application {
  // --- Core Engine ---
  private sw: SmallWorld;
  private scene: Scene;
  private hud!: HUD;
  private cam: Camera;

  // --- Game Objects ---
  private player!: Object3D;
  private flashLight!: SpotLight;
  private moon!: Object3D;
  private spheres: Object3D[] = [];

  // --- State & Settings ---
  private score = 0;
  private readonly TOTAL_SPHERES = 30;
  private readonly PLAYER_SIZE = 1.5;
  private hudVisible = true;
  private tabWasPressed = false;

  // --- Timing & Matrices ---
  private lastTime = 0;
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

    this.setupScene();
    this.setupInput();

    this.lastTime = performance.now();
    this.loop();
  }

  private setupScene() {
    // 1. Lichtstimmung
    const ambient = new AmbientLight(new Color(0.1, 0.1, 0.15), 0.5);
    this.scene.add(ambient);

    const sun = new DirectionalLight(Color.WHITE, 0.2);
    sun.direction.set(1, -1.5, -1);
    this.scene.add(sun);

    // 2. Welt (Boden)
    const WORLD_SIZE = this.sw.config.worldSize || 40;
    const grid = new Object3D("Grid");
    grid.geometry = new Grid(WORLD_SIZE, 50).getGeometryData();
    const gridMat = new WireframeMaterial();
    gridMat.color = Color.DARKSLATEGRAY;
    grid.material = gridMat;
    this.scene.add(grid);

    // 3. Spieler
    this.player = new Object3D("Player");
    this.player.geometry = new Cube(this.PLAYER_SIZE).getGeometryData();
    const playerMat = new PhongMaterial();
    playerMat.color = Color.ORANGE;
    playerMat.specularColor = Color.WHITE;
    playerMat.shininess = 64;
    this.player.material = playerMat;
    this.scene.add(this.player);

    // 4. Mond
    this.moon = new Object3D("Moon");
    this.moon.geometry = new Sphere(0.4).getGeometryData();
    const moonMat = new LambertMaterial();
    moonMat.color = Color.YELLOW;
    this.moon.material = moonMat;
    this.player.add(this.moon);

    // 5. Taschenlampe
    this.flashLight = new SpotLight(Color.GREEN, 8.0);
    this.flashLight.angle = Math.PI / 7;
    this.flashLight.penumbra = 0.8;
    this.flashLight.position.set(0, 1, 1);
    this.player.add(this.flashLight);

    // 6. Sammelobjekte
    this.createSpheres();
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
    canvas.addEventListener("click", () => {
      if (this.cam.activeStrategyType === CameraStrategyType.FPS) {
        Input.requestPointerLock(canvas);
      }
    });
  }

  private loop = () => {
    const now = performance.now();
    const time = now * 0.001; // Zeit in Sekunden
    this.frameCount++;

    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }

    this.update(time);
    this.render();

    requestAnimationFrame(this.loop);
  };

  private update(time: number) {
    // --- BEWEGUNG & KAMERA ---
    this.updatePlayerMovement();
    this.updateCamera();

    // --- SYSTEM & HUD TOGGLE ---
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

    // --- KOLLISION ---
    this.checkCollisions();

    // --- ANIMATIONEN ---
    this.moon.position.x = Math.cos(time * 2) * 3;
    this.moon.position.z = Math.sin(time * 2) * 3;
    this.moon.rotation.x = time;
    this.moon.rotation.y = time * 1.5;

    for (let i = 0; i < this.spheres.length; i++) {
      const s = this.spheres[i];
      s.rotation.x += 0.01;
      s.rotation.y += 0.02;
      s.position.y = Math.sin(time * 3 + i) * 0.5 + 0.5;

      if (s.bounds) s.bounds.center.copyFrom(s.position);
    }

    // Szenengraph durchrechnen
    this.scene.update();
  }

  private updatePlayerMovement() {
    const speed = Input.isPressed(Keys.SHIFT_L) ? 0.6 : 0.25;
    const dx = Input.getAxis(Keys.A, Keys.D);
    const dz = Input.getAxis(Keys.W, Keys.S);

    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx * dx + dz * dz);
      const moveX = dx / len;
      const moveZ = dz / len;

      if (this.cam.activeStrategyType === CameraStrategyType.FPS) {
        const s = Math.sin(this.cam.theta);
        const c = Math.cos(this.cam.theta);

        const forwardX = -s,
          forwardZ = -c;
        const rightX = -c,
          rightZ = s;

        const worldX = rightX * moveX - forwardX * moveZ;
        const worldZ = rightZ * moveX - forwardZ * moveZ;

        this.player.position.add(new Vector3D(worldX, 0, worldZ).scale(speed));
        this.player.rotation.y = this.cam.theta;
      } else {
        this.player.position.add(new Vector3D(moveX, 0, moveZ).scale(speed));
        this.player.rotation.y = Math.atan2(moveX, moveZ);
      }

      this.flashLight.direction.set(
        Math.sin(this.player.rotation.y),
        -0.2,
        Math.cos(this.player.rotation.y),
      );
    }
  }

  private updateCamera() {
    if (Input.isPressed(Keys.D1)) this.cam.setStrategy(CameraStrategyType.FIXED);
    if (Input.isPressed(Keys.D2)) this.cam.setStrategy(CameraStrategyType.STIFF);
    if (Input.isPressed(Keys.D3)) this.cam.setStrategy(CameraStrategyType.SMOOTH);
    if (Input.isPressed(Keys.D4)) this.cam.setStrategy(CameraStrategyType.FPS);

    let mdx = 0,
      mdy = 0;
    if (
      (this.cam.activeStrategyType === CameraStrategyType.FPS && Input.isPointerLocked) ||
      Input.mouse.right
    ) {
      mdx = Input.mouse.dx;
      mdy = Input.mouse.dy;
    }

    this.cam.update(this.player.position, mdx, mdy);
    Input.mouse.dx = 0;
    Input.mouse.dy = 0;
  }

  private checkCollisions() {
    const h = this.PLAYER_SIZE / 2;
    this.player.bounds = new BoundingBox(
      new Vector3D(this.player.position.x - h, -h, this.player.position.z - h),
      new Vector3D(this.player.position.x + h, h, this.player.position.z + h),
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
      "hud.player.pos.x": this.player.position.x.toFixed(1),
      "hud.player.pos.y": this.player.position.y.toFixed(1),
      "hud.player.pos.z": this.player.position.z.toFixed(1),
      "hud.score": `${this.score} / ${this.TOTAL_SPHERES}`,
      "hud.visible": visibleCount,
    });

    this.sw.activeRenderer.render(this.scene, this.vpMatrix.data, this.cam.position);
  }
}

// Einstiegspunkt der Demo
const app = new Application();
app.start();
