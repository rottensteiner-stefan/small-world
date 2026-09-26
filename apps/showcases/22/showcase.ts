import {
  AbstractShowcase,
  Color,
  EngineOptions,
  Object3D,
  StandardMaterial,
  Sphere,
  OrbitController,
  CameraStrategyType,
  DirectionalLight,
  PostProcessingEffectType,
  BloomElement,
  BoundingSphere,
  RigidBody,
  PhysicsSystem,
  Skydome,
  Texture,
  AmbientLight,
  PerformanceTier,
  FollowCameraBehavior,
} from "@small-world/engine";

class Showcase22 extends AbstractShowcase {
  private _spheres: Object3D[] = [];
  private _physics: PhysicsSystem;
  private _heatMap: Map<Object3D, number> = new Map();
  private _lastFuzzAt: number = 0;

  constructor(options: EngineOptions = {}) {
    super(options);
    this._physics = new PhysicsSystem(this.events);
    this._physics.gravity.set(0, 0, 0); // No global gravity
  }

  protected async setupScene(): Promise<void> {
    let droneStarted = false;
    // Use pointerdown to support both mouse clicks and mobile touch
    this.canvas.addEventListener("pointerdown", () => {
      if (!droneStarted) {
        this.audio.startDrone();
        droneStarted = true;
      }
      if (!this.context.deviceCaps.isMobile() && !this.input.isPointerLocked) {
        this.input.requestPointerLock(this.canvas);
      }
    });

    const tier = this.context.deviceCaps.getPerformanceTier();

    // 0. Enable Bloom & Gravitational Lensing!
    // filterMode 8 dynamically lenses the background around the projected singularity position,
    // bending light toward the event horizon.
    this.renderer.postProcessing.enabled = true;
    this.renderer.postProcessing.filterMode = 8; // Black Hole Shader (Gravitational Lensing)

    const bloom = this.renderer.postProcessing.get<BloomElement>(PostProcessingEffectType.BLOOM);
    if (bloom) {
      if (tier === PerformanceTier.LOW) {
        // Disable bloom for low-end devices to save fill rate
        bloom.enabled = false;
      } else {
        bloom.enabled = true;
        bloom.intensity = tier === PerformanceTier.MEDIUM ? 1.0 : 2.0;
        bloom.threshold = 0.2;
        bloom.radius = 1.0;
      }
    }

    // 1. Lighting Setup
    const ambient = new AmbientLight({ color: new Color(0.1, 0.1, 0.2), intensity: 1.0 });
    const dirLight = new DirectionalLight({ color: new Color(0.8, 0.9, 1.0), intensity: 2.0 });
    dirLight.position.set(10, 20, 10);
    this.scene.add(ambient, dirLight);

    // 2. Camera Setup
    this.camera.setStrategy(CameraStrategyType.HYBRID_SYNC);
    this.camera.position.set(0, 20, 40);
    this.camera.target.set(0, 0, 0);
    this.camera.addBehavior(new OrbitController({ input: this.input, audio: this.audio }));

    // 3. Environment: The Magnetic Singularity & Space Background
    const skyTexture = await Texture.fromUrl("./assets/milkyway.webp");
    const skydome = new Skydome({
      texture: skyTexture,
      radius: 1000,
      widthSegments: 32,
      heightSegments: 32,
    });
    skydome.name = "Skydome";
    skydome.addBehavior(new FollowCameraBehavior({ camera: this.camera }));
    this.scene.add(skydome);

    // We add a tiny visual marker for the singularity, but it has no physical bounds.
    const singularity = new Object3D("Singularity");
    singularity.geometry = new Sphere({
      radius: 0.2,
      widthSegments: 16,
      heightSegments: 16,
    }).getGeometryData();
    singularity.material = new StandardMaterial({
      color: new Color(0.0, 0.0, 0.0),
      emissiveColor: new Color(0.0, 0.5, 1.0),
      metallic: 1.0,
      roughness: 0.0,
    });
    // No RigidBody and No Bounds means it's a ghost object
    this.scene.add(singularity);

    // 4. Pre-allocate sphere geometry (make them large enough to overlap into a solid ring)
    const geo = new Sphere({ radius: 0.1, widthSegments: 8, heightSegments: 8 }).getGeometryData();

    let sphereCount = 400;
    if (tier === PerformanceTier.LOW) sphereCount = 100;
    else if (tier === PerformanceTier.MEDIUM) sphereCount = 200;

    // Spawn spheres packed closely together
    for (let i = 0; i < sphereCount; i++) {
      const s = new Object3D();
      s.geometry = geo;

      // Base accretion disk material (extremely hot and glowing)
      s.material = new StandardMaterial({
        color: new Color(0.1, 0.05, 0.0),
        metallic: 0.5,
        roughness: 0.8,
        emissiveColor: new Color(1.0, 0.3, 0.05), // Fiery orange by default
      });

      // Spawn in a very tight, dense torus (r=0.6 to r=3.0)
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.6 + Math.pow(Math.random(), 2) * 2.4;

      // Extremely flat disk
      const yOffset = (Math.random() - 0.5) * 0.2;

      s.position.set(Math.cos(angle) * radius, yOffset, Math.sin(angle) * radius);

      const rb = new RigidBody(1.0);
      rb.restitution = 0.0; // Perfect inelasticity (friction heats it up instead of bouncing)
      rb.friction = 1.0;

      // Orbital velocity: v = Math.sqrt(GM / r). GM = sphereCount
      // 98% of orbital velocity so it slowly spirals in
      const orbitalSpeed = Math.sqrt(sphereCount / radius) * 0.98;

      // Tangential velocity
      const tangentX = -Math.sin(angle);
      const tangentZ = Math.cos(angle);

      rb.velocity.set(
        tangentX * orbitalSpeed,
        (Math.random() - 0.5) * 0.5, // Tiny vertical perturbation
        tangentZ * orbitalSpeed,
      );

      s.rigidBody = rb;
      s.bounds = new BoundingSphere(s.position, 0.05);

      this._spheres.push(s);

      // Base heat depends on how close it is to the event horizon!
      const baseHeat = Math.max(0, 10.0 - radius);
      this._heatMap.set(s, baseHeat);
      this.scene.add(s);
    }

    // 5. Subscribe to Physics Collisions for heat transfer & Fuzz Audio!
    this.events.addEventListener("physics:collision", (event: Record<string, unknown>): void => {
      const objectA = event["objectA"] as Object3D;
      const objectB = event["objectB"] as Object3D;
      const impulse = event["impulse"] as number;
      const heatA = this._heatMap.get(objectA) || 0;
      const heatB = this._heatMap.get(objectB) || 0;

      // Heat generation is extremely violent now
      this._heatMap.set(objectA, heatA + impulse * 8.0);
      this._heatMap.set(objectB, heatB + impulse * 8.0);

      // Impact "fuzz": a genuine white-noise burst per hard collision, throttled so up to 400
      // colliding spheres don't blur into one continuous hiss. Harder hits are louder and
      // harsher (higher band-pass center). No other collision sounds -- policy intact.
      const now = performance.now();
      if (impulse > 0.75 && now - this._lastFuzzAt > 25) {
        this._lastFuzzAt = now;
        const volume = Math.min(0.5, 0.08 + impulse * 0.025);
        const duration = Math.min(0.12, 0.03 + impulse / 300);
        this.audio.playWhiteNoiseBurst(duration, volume, 1400 + impulse * 90, 1.2);
      }
    });
  }

  protected override update(dt: number): void {
    const numSpheres = this._spheres.length;

    // 1. N-Body Simulation: O(N) singularity gravity + local neighbor micro-gravity
    for (let i = 0; i < numSpheres; i++) {
      const a = this._spheres[i]!;
      const pA = a.position;

      const distSqC = pA.x * pA.x + pA.y * pA.y + pA.z * pA.z;
      const distC = Math.sqrt(distSqC) || 1.0;

      // Event Horizon: Absorbed & Teleported to outer disc
      if (distC < 0.35) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 3.0; // Respawn at the outer edge of the dense disk
        pA.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 0.2, Math.sin(angle) * radius);
        const orbitalSpeed = Math.sqrt(numSpheres / radius) * 0.98;
        a.rigidBody!.velocity.set(
          -Math.sin(angle) * orbitalSpeed,
          0,
          Math.cos(angle) * orbitalSpeed,
        );
        a.rigidBody!.angularVelocity.set(0, 0, 0);
        a.rigidBody!.forces.set(0, 0, 0);
        this._heatMap.set(a, 2.0); // Reset heat to a moderate orange
        if (a.material instanceof StandardMaterial) {
          a.material.color.set(0.1, 0.05, 0.0, 1.0);
        }
        continue;
      }

      // Softened Newtonian gravity (Plummer softening)
      const pullC = (numSpheres * distC) / Math.pow(distSqC + 0.5, 1.5);
      let fx = -(pA.x / distC) * pullC;
      let fy = -(pA.y / distC) * pullC;
      let fz = -(pA.z / distC) * pullC;

      // Keep the accretion disk flat: weak spring toward the orbital plane (y = 0)
      fy += -pA.y * 2.0;

      // Cheap O(N) "clustering" stand-in: couples each sphere to its 4 list-adjacent ring
      // neighbours (NOT spatial neighbours -- spawn order is random in angle) that happen to be
      // within ~1.4 units. One-sided (no Newton's 3rd law), so global momentum is not conserved;
      // it's a cheap visual jostle, not physical micro-gravity.
      const lookAhead = 4;
      for (let j = 1; j <= lookAhead; j++) {
        const nextIdx = (i + j) % numSpheres;
        const b = this._spheres[nextIdx]!;
        const pB = b.position;
        const dx = pB.x - pA.x;
        const dy = pB.y - pA.y;
        const dz = pB.z - pA.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq > 0.1 && distSq < 2.0) {
          const forceMag = 1.0 / distSq;
          const dist = Math.sqrt(distSq);
          fx += (dx / dist) * forceMag;
          fy += (dy / dist) * forceMag;
          fz += (dz / dist) * forceMag;
        }
      }

      a.rigidBody!.forces.set(fx, fy, fz);
    }

    // 2. Step Physics Engine (SAT Collision & Integration)
    this._physics.step(this.scene, dt);

    // 3. Update Heat and Emissive Colors (with Gravitational Redshift Fading)
    for (const s of this._spheres) {
      const distC = s.position.length();

      // Inside the Redshift & Fading Zone (0.35 < distC < 0.55)
      if (distC < 0.55) {
        const fadeFactor = Math.max(0.0, Math.min(1.0, (distC - 0.35) / 0.2));

        if (s.material instanceof StandardMaterial) {
          // Dying deep dark red to black (gravitational redshift into infrared)
          s.material.emissiveColor.set(0.5 * fadeFactor, 0.05 * Math.pow(fadeFactor, 3.0), 0.0);
          s.material.color.set(0.1 * fadeFactor, 0.05 * fadeFactor, 0.0, fadeFactor);
        }

        // NOTE: collisions stay ENABLED through the funnel on purpose. Disabling them via
        // `bounds.radius = 0` never took effect -- `Object3D.computeBounds()` re-derives the
        // radius from geometry before collision resolution each physics substep. Spheres are
        // absorbed at distC < 0.35 and respawned at the outer disc anyway, flushing the funnel.
        continue;
      }

      let heat = this._heatMap.get(s)!;

      // Increase heat based on pressure (proximity to singularity center)
      if (distC < 1.0) {
        heat += (1.0 - distC) * dt * 10.0;
      }

      // Cool down over time in the void of space
      heat -= dt * 1.5;
      heat = Math.max(0, Math.min(10.0, heat));
      this._heatMap.set(s, heat);

      // Interpolate Color to match EHT Black Hole: Deep Red -> Orange -> Yellow/White
      if (s.material instanceof StandardMaterial) {
        const t = Math.min(1.0, heat / 8.0);
        Color.blackbody(t, s.material.emissiveColor);
        s.material.color.set(0.1, 0.05, 0.0, 1.0);
      }
    }
  }
}

const app = new Showcase22();
app.start().catch((err: unknown) => console.error("[Showcase22] Failed to start:", err));
