/// src/examples/example15.ts

import {
  AbstractExample,
  AmbientLight,
  CameraStrategyType,
  Color,
  Cube,
  CubeTexture,
  DirectionalLight,
  FPSController,
  Object3D,
  PerspectiveProjection,
  Plane,
  PointLight,
  ProjectionType,
  RendererType,
  SkyboxMaterial,
  Sphere,
  StandardMaterial,
  StateMachine,
  StateMachineBehavior,
  Texture,
  TextureFilter,
} from "../index.js";

interface ReflectedBall {
  object: Object3D;
  largeSphereIndex: number;
}

interface Ball {
  object: Object3D;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  radius: number;
  reflectedBalls: ReflectedBall[];
  reflectedFloorBall: Object3D;
  stateMachine: StateMachine<"active" | "falling" | "exploding", BallContext>;
  timeOnFloor: number;
  lifeTime: number;
}

interface BallContext {
  ball: Ball;
  example: Example15;
}

export class Example15 extends AbstractExample {
  private _balls: Ball[] = [];
  private _largeSpheres: { object: Object3D; radius: number; x: number; y: number; z: number }[] =
    [];
  private _orbitingLight!: PointLight;
  private _time: number = 0;

  protected override async setupScene(): Promise<void> {
    this.onCanvasRecreated();

    // Set up camera
    if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
      const aspect: number = window.innerWidth / window.innerHeight;
      this.camera.projection = new PerspectiveProjection({
        fov: (65 * Math.PI) / 180,
        aspect,
        near: 0.1,
        far: 1000,
      });
      this.camera.updateProjectionMatrix();
    }

    this.camera.setStrategy(CameraStrategyType.FPS);
    this.camera.position.set(0, 5, 15);
    this.camera.theta = 0;
    this.camera.phi = 0;

    const fpsController = new FPSController({
      moveSpeed: 8.0,
      enableCollision: false,
      scene: this.scene,
    });
    this.camera.addBehavior(fpsController);

    // 1. Lights
    this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.15 }));

    const sun = new DirectionalLight({
      color: new Color(1.0, 0.95, 0.9),
      intensity: 1.2,
    });
    sun.position.set(10, 20, 10);
    sun.direction.set(-0.5, -1.0, -0.5).normalize();
    sun.castShadow = true;
    this.scene.add(sun);

    // Orbiting point light
    this._orbitingLight = new PointLight({
      color: new Color(1.0, 0.6, 0.3),
      intensity: 2.0,
      distance: 30,
    });
    this.scene.add(this._orbitingLight);

    // 2. Load environment texture for skybox & PBR reflections
    const envTexture = new CubeTexture();
    try {
      await envTexture.loadFrom("/resources/examples/13/skybox.png");

      const skybox = new Object3D("Skybox");
      skybox.geometry = new Cube({ size: 1000 }).getGeometryData();
      skybox.material = new SkyboxMaterial({ cubeMap: envTexture });
      skybox.frustumCulled = false;
      this.scene.add(skybox);
    } catch (e) {
      console.warn("Skybox image not loaded:", e);
    }

    // 3. Generate Checkered and Roughness maps procedurally via canvas
    const checkCanvas = document.createElement("canvas");
    checkCanvas.width = 512;
    checkCanvas.height = 512;
    const ctx = checkCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "#111111"; // Very dark gray for black tiles
    const tileSize = 64;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }

    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = 512;
    roughCanvas.height = 512;
    const rCtx = roughCanvas.getContext("2d")!;
    rCtx.fillStyle = "rgb(230, 230, 230)"; // White tiles are rough (0.9)
    rCtx.fillRect(0, 0, 512, 512);
    rCtx.fillStyle = "rgb(15, 15, 15)"; // Black tiles are smooth/shiny (0.06)
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if ((x + y) % 2 === 0) {
          rCtx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }

    const diffuseBitmap = await createImageBitmap(checkCanvas);
    const roughBitmap = await createImageBitmap(roughCanvas);

    const checkTexture = Texture.fromImage(diffuseBitmap, {
      magFilter: TextureFilter.NEAREST,
      minFilter: TextureFilter.NEAREST,
    });
    const roughTexture = Texture.fromImage(roughBitmap, {
      magFilter: TextureFilter.NEAREST,
      minFilter: TextureFilter.NEAREST,
    });

    // We repeat the checkerboard pattern
    checkTexture.repeat.x = 6;
    checkTexture.repeat.y = 6;
    roughTexture.repeat.x = 6;
    roughTexture.repeat.y = 6;

    // 4. Checkered Floor plane
    const floor = new Object3D("Floor").setPosition(0, 0, 0);
    floor.geometry = new Plane({ width: 30, depth: 30 }).getGeometryData();
    floor.material = new StandardMaterial({
      color: new Color(1.0, 1.0, 1.0, 0.45), // 45% opacity for floor mirror reflections
      metallic: 0.05,
      roughness: 1.0, // Multiplied by roughnessMap
      diffuseMap: checkTexture,
      roughnessMap: roughTexture,
      envMap: envTexture,
      transparent: true,
    });
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 5. Create 3 Large Mirrored Spheres (dezent farbig, voll verspiegelt)
    const sphereGeom = new Sphere({
      radius: 1,
      widthSegments: 32,
      heightSegments: 24,
    }).getGeometryData();

    // Large Sphere 1: Lavender
    const sphere1 = new Object3D("LargeSphere1").setPosition(-3.5, 2.0, -1.5);
    sphere1.geometry = sphereGeom;
    sphere1.setScale(2.0); // radius = 2.0
    sphere1.material = new StandardMaterial({
      color: new Color(0.9, 0.85, 0.95, 0.78), // Lavender tint (alpha = 0.78)
      metallic: 1.0,
      roughness: 0.02,
      envMap: envTexture,
      transparent: true,
    });
    sphere1.castShadow = true;
    sphere1.receiveShadow = true;
    this.scene.add(sphere1);
    this._largeSpheres.push({ object: sphere1, radius: 2.0, x: -3.5, y: 2.0, z: -1.5 });

    // Large Sphere 2: Pale Mint
    const sphere2 = new Object3D("LargeSphere2").setPosition(3.5, 1.5, -2.0);
    sphere2.geometry = sphereGeom;
    sphere2.setScale(1.5); // radius = 1.5
    sphere2.material = new StandardMaterial({
      color: new Color(0.85, 0.95, 0.9, 0.78), // Mint tint (alpha = 0.78)
      metallic: 1.0,
      roughness: 0.02,
      envMap: envTexture,
      transparent: true,
    });
    sphere2.castShadow = true;
    sphere2.receiveShadow = true;
    this.scene.add(sphere2);
    this._largeSpheres.push({ object: sphere2, radius: 1.5, x: 3.5, y: 1.5, z: -2.0 });

    // Large Sphere 3: Pale Rose
    const sphere3 = new Object3D("LargeSphere3").setPosition(0.0, 1.0, 3.0);
    sphere3.geometry = sphereGeom;
    sphere3.setScale(1.0); // radius = 1.0
    sphere3.material = new StandardMaterial({
      color: new Color(0.95, 0.85, 0.88, 0.8), // Rose tint (highly reflective, alpha = 0.80)
      metallic: 1.0,
      roughness: 0.02,
      envMap: envTexture,
      transparent: true,
    });
    sphere3.castShadow = true;
    sphere3.receiveShadow = true;
    this.scene.add(sphere3);
    this._largeSpheres.push({ object: sphere3, radius: 1.0, x: 0.0, y: 1.0, z: 3.0 });

    // Create static floor-reflected large spheres
    const refSphere1 = new Object3D("ReflectedLargeSphere1").setPosition(-3.5, -2.0, -1.5);
    refSphere1.geometry = sphereGeom;
    refSphere1.setScale(2.0);
    refSphere1.material = sphere1.material;
    refSphere1.castShadow = false;
    refSphere1.receiveShadow = false;
    this.scene.add(refSphere1);

    const refSphere2 = new Object3D("ReflectedLargeSphere2").setPosition(3.5, -1.5, -2.0);
    refSphere2.geometry = sphereGeom;
    refSphere2.setScale(1.5);
    refSphere2.material = sphere2.material;
    refSphere2.castShadow = false;
    refSphere2.receiveShadow = false;
    this.scene.add(refSphere2);

    const refSphere3 = new Object3D("ReflectedLargeSphere3").setPosition(0.0, -1.0, 3.0);
    refSphere3.geometry = sphereGeom;
    refSphere3.setScale(1.0);
    refSphere3.material = sphere3.material;
    refSphere3.castShadow = false;
    refSphere3.receiveShadow = false;
    this.scene.add(refSphere3);

    // 6. Spawn 100 Small Bouncing Rubber Balls
    const ballGeom = new Sphere({
      radius: 0.2,
      widthSegments: 16,
      heightSegments: 12,
    }).getGeometryData();
    const ballColors = [
      new Color(1.0, 0.45, 0.35), // Neon peach
      new Color(0.4, 0.85, 0.4), // Lime
      new Color(1.0, 0.85, 0.2), // Neon yellow
      new Color(0.2, 0.8, 0.85), // Neon cyan
      new Color(0.9, 0.4, 0.75), // Magenta
    ];

    for (let i = 0; i < 100; i++) {
      const ballObj = new Object3D(`Ball_${i}`);
      ballObj.geometry = ballGeom;

      const randomColor = ballColors[Math.floor(Math.random() * ballColors.length)]!;
      ballObj.material = new StandardMaterial({
        color: new Color(randomColor.r, randomColor.g, randomColor.b, 1.0),
        metallic: 0.0,
        roughness: 0.95, // High roughness for a matte rubber look
        transparent: true,
      });
      ballObj.castShadow = true;

      this.scene.add(ballObj);

      // Create reflected virtual balls inside the large spheres
      const reflectedBalls: ReflectedBall[] = [];
      for (let s = 0; s < this._largeSpheres.length; s++) {
        // Reflect inside all large spheres
        const refObj = new Object3D(`Ball_${i}_Ref_${s}`);
        refObj.geometry = ballGeom;
        refObj.material = new StandardMaterial({
          color: new Color(randomColor.r, randomColor.g, randomColor.b, 1.0),
          metallic: 0.0,
          roughness: 0.95,
          transparent: true,
        });
        refObj.castShadow = false;
        refObj.receiveShadow = false;
        this.scene.add(refObj);
        reflectedBalls.push({ object: refObj, largeSphereIndex: s });
      }

      // Create floor-reflected ball under the floor (Y = -y)
      const floorRefObj = new Object3D(`Ball_${i}_FloorRef`);
      floorRefObj.geometry = ballGeom;
      floorRefObj.material = ballObj.material;
      floorRefObj.castShadow = false;
      floorRefObj.receiveShadow = false;
      this.scene.add(floorRefObj);

      const ball: Partial<Ball> = {
        object: ballObj,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        radius: 0.2,
        reflectedBalls,
        reflectedFloorBall: floorRefObj,
        timeOnFloor: 0,
        lifeTime: 0,
      };

      const stateMachine = this._createBallStateMachine(ball as Ball);
      ball.stateMachine = stateMachine;

      const fsmBehavior = new StateMachineBehavior(stateMachine);
      ballObj.addBehavior(fsmBehavior);

      this._balls.push(ball as Ball);
    }
  }

  private _createBallStateMachine(
    ball: Ball,
  ): StateMachine<"active" | "falling" | "exploding", BallContext> {
    const context: BallContext = {
      ball,
      example: this,
    };

    const fsm = new StateMachine<"active" | "falling" | "exploding", BallContext>(context);

    fsm.addState("active", {
      onEnter: (ctx) => {
        const b = ctx.ball;
        b.timeOnFloor = 0;
        b.lifeTime = 0;

        // Reset scale
        b.object.setScale(1.0);
        b.reflectedFloorBall.setScale(1.0);
        for (const ref of b.reflectedBalls) {
          ref.object.setScale(1.0);
        }

        // Reset alpha
        const mat = b.object.material as StandardMaterial;
        mat.color.a = 1.0;
        for (const ref of b.reflectedBalls) {
          const refMat = ref.object.material as StandardMaterial;
          refMat.color.a = 1.0;
        }

        // Reset position in cloud above
        const x = (Math.random() - 0.5) * 12;
        const y = 8.0 + Math.random() * 8.0;
        const z = (Math.random() - 0.5) * 12;
        b.position.x = x;
        b.position.y = y;
        b.position.z = z;
        b.object.setPosition(x, y, z);
        b.reflectedFloorBall.setPosition(x, -y, z);

        // Reset velocity
        b.velocity.x = (Math.random() - 0.5) * 4.0;
        b.velocity.y = -1.0 - Math.random() * 2.0;
        b.velocity.z = (Math.random() - 0.5) * 4.0;
      },
      onUpdate: (ctx, deltaTime) => {
        const b = ctx.ball;
        const gravity = -9.81;

        // 1. Gravity
        b.velocity.y += gravity * deltaTime;

        // 2. Position update
        b.position.x += b.velocity.x * deltaTime;
        b.position.y += b.velocity.y * deltaTime;
        b.position.z += b.velocity.z * deltaTime;

        const limit = 15.0;
        const isOverFloor = Math.abs(b.position.x) <= limit && Math.abs(b.position.z) <= limit;

        if (isOverFloor) {
          // 3. Collision with procedural floor (y = 0)
          const floorRestitution = 0.82;
          const floorFriction = 0.98;
          if (b.position.y < b.radius) {
            b.position.y = b.radius;
            b.velocity.y = -b.velocity.y * floorRestitution;
            // Friction on floor contact
            b.velocity.x *= floorFriction;
            b.velocity.z *= floorFriction;
          }

          // Track time resting on the floor
          if (b.position.y <= b.radius + 0.01) {
            b.timeOnFloor += deltaTime;
            if (b.timeOnFloor > 2.0) {
              b.stateMachine.transitionTo("exploding");
              return;
            }
          } else {
            b.timeOnFloor = 0;
          }
        } else {
          // Off floor, transitions to falling
          b.stateMachine.transitionTo("falling");
          return;
        }

        // 4. Collision with 3 Large Spheres
        const sphereRestitution = 0.85;
        for (const large of ctx.example._largeSpheres) {
          const dx = b.position.x - large.x;
          const dy = b.position.y - large.y;
          const dz = b.position.z - large.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const minDist = large.radius + b.radius;

          if (dist < minDist) {
            // Normal vector of contact
            const nx = dx / dist;
            const ny = dy / dist;
            const nz = dz / dist;

            // Push ball out of collision
            b.position.x = large.x + nx * minDist;
            b.position.y = large.y + ny * minDist;
            b.position.z = large.z + nz * minDist;

            // Reflect velocity vector along normal N
            const dotProd = b.velocity.x * nx + b.velocity.y * ny + b.velocity.z * nz;
            b.velocity.x = (b.velocity.x - 2.0 * dotProd * nx) * sphereRestitution;
            b.velocity.y = (b.velocity.y - 2.0 * dotProd * ny) * sphereRestitution;
            b.velocity.z = (b.velocity.z - 2.0 * dotProd * nz) * sphereRestitution;

            // Reset time on floor if it hit a sphere and bounced
            b.timeOnFloor = 0;
          }
        }

        // Sync Object3D position
        b.object.setPosition(b.position.x, b.position.y, b.position.z);
        b.reflectedFloorBall.setPosition(b.position.x, -b.position.y, b.position.z);
      },
    });

    fsm.addState("falling", {
      onEnter: (ctx) => {
        ctx.ball.lifeTime = 0;
      },
      onUpdate: (ctx, deltaTime, stateDuration) => {
        const b = ctx.ball;
        const gravity = -9.81;

        // Fall under gravity
        b.velocity.y += gravity * deltaTime;
        b.position.x += b.velocity.x * deltaTime;
        b.position.y += b.velocity.y * deltaTime;
        b.position.z += b.velocity.z * deltaTime;

        b.lifeTime = stateDuration;
        const progress = Math.min(b.lifeTime / 1.0, 1.0); // 1s dissolve
        const scale = 1.0 - progress;
        const alpha = 1.0 - progress;

        b.object.setScale(scale);
        b.reflectedFloorBall.setScale(scale);
        const mat = b.object.material as StandardMaterial;
        mat.color.a = alpha;

        for (const ref of b.reflectedBalls) {
          ref.object.setScale(scale);
          const refMat = ref.object.material as StandardMaterial;
          refMat.color.a = alpha;
        }

        b.object.setPosition(b.position.x, b.position.y, b.position.z);
        b.reflectedFloorBall.setPosition(b.position.x, -b.position.y, b.position.z);

        if (progress >= 1.0 || b.position.y < -10.0) {
          b.stateMachine.transitionTo("active");
        }
      },
    });

    fsm.addState("exploding", {
      onEnter: (ctx) => {
        ctx.ball.lifeTime = 0;
        ctx.ball.velocity.x = 0;
        ctx.ball.velocity.y = 0;
        ctx.ball.velocity.z = 0;
      },
      onUpdate: (ctx, _deltaTime, stateDuration) => {
        const b = ctx.ball;
        b.lifeTime = stateDuration;
        const progress = Math.min(b.lifeTime / 0.5, 1.0); // 0.5s explosion
        const scale = 1.0 + progress * 3.0; // expand up to 4x
        const alpha = 1.0 - progress;

        b.object.setScale(scale);
        b.reflectedFloorBall.setScale(scale);
        const mat = b.object.material as StandardMaterial;
        mat.color.a = alpha;

        for (const ref of b.reflectedBalls) {
          const refMat = ref.object.material as StandardMaterial;
          refMat.color.a = alpha;
        }

        if (progress >= 1.0) {
          b.stateMachine.transitionTo("active");
        }
      },
    });

    fsm.transitionTo("active");

    return fsm;
  }

  protected override update(deltaTime: number): void {
    super.update(deltaTime);
    this._time += deltaTime;

    // Orbit point light
    const orbitRadius = 8.0;
    const lightX = Math.cos(this._time * 0.8) * orbitRadius;
    const lightZ = Math.sin(this._time * 0.8) * orbitRadius;
    this._orbitingLight.position.set(lightX, 5.0, lightZ);

    const skybox = this.scene.objects.find((o) => o.name === "Skybox");
    if (skybox) {
      skybox.position.copyFrom(this.camera.position);
      skybox.updateMatrixWorld();
    }

    // 1. Update scene (this ticks behaviors including the StateMachineBehavior for each ball)
    this.scene.update(deltaTime);

    // 2. Sync reflected balls positions & scales using sphere inversion
    for (const ball of this._balls) {
      for (const ref of ball.reflectedBalls) {
        const large = this._largeSpheres[ref.largeSphereIndex]!;
        const dx = ball.position.x - large.x;
        const dy = ball.position.y - large.y;
        const dz = ball.position.z - large.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const r = ball.radius;
        const R = large.radius;

        const denom = d * d - r * r;
        if (denom > 0.001) {
          const factor = (R * R) / denom;
          const refX = large.x + dx * factor;
          const refY = large.y + dy * factor;
          const refZ = large.z + dz * factor;
          const refRadius = r * factor;

          ref.object.setPosition(refX, refY, refZ);

          const currentStateName = ball.stateMachine.currentState;
          const currentScale =
            currentStateName === "falling"
              ? 1.0 - ball.lifeTime / 1.0
              : currentStateName === "exploding"
                ? 1.0 + (ball.lifeTime / 0.5) * 3.0
                : 1.0;
          ref.object.setScale((refRadius / 0.2) * Math.max(currentScale, 0.0));
          ref.object.isVisible = true;

          // Update matrices for rendering as coordinates were updated post scene.update()
          ref.object.updateMatrixWorld(true);
        } else {
          ref.object.isVisible = false;
        }
      }
    }
  }
}

// === START THE ENGINE ===
const app = new Example15({
  rendererType: RendererType.BEST,
});
app
  .start()
  .then((): void => {
    console.log("Example 15 running");
  })
  .catch((err: Error): void => {
    console.error("Error while starting the engine: ", err);
  });
