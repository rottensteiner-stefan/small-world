/// showcases/21/showcase.ts

import {
  AbstractShowcase,
  Color,
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
} from "../../src/index.js";
import { AmbientLight } from "../../src/core/lights/index.js";
import { DeviceCaps, PerformanceTier } from "../../src/core/DeviceCaps.js";

class Showcase21 extends AbstractShowcase {
  private _spheres: Object3D[] = [];
  private _physics: PhysicsSystem;
  private _heatMap: Map<Object3D, number> = new Map();

  constructor() {
    super({ enableInspector: false });
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
      if (!DeviceCaps.isMobile() && !this.input.isPointerLocked) {
        this.input.requestPointerLock(this.canvas);
      }
    });

    const tier = DeviceCaps.getPerformanceTier();

    // 0. Enable Bloom & Gravitational Lensing!
    this.renderer.postProcessing.enabled = true;
    this.renderer.postProcessing.filterMode = 8; // Our new Black Hole Shader!

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
    const skyTexture = await Texture.fromUrl("./assets/space-2.jpg");
    const skydome = new Skydome({
      texture: skyTexture,
      radius: 1000,
      widthSegments: 32,
      heightSegments: 32,
    });
    skydome.name = "Skydome";
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
    this.events.addEventListener(
      "physics:collision",
      (data: { objectA: Object3D; objectB: Object3D; impulse: number }) => {
        const heatA = this._heatMap.get(data.objectA) || 0;
        const heatB = this._heatMap.get(data.objectB) || 0;

        // Heat generation is extremely violent now
        this._heatMap.set(data.objectA, heatA + data.impulse * 8.0);
        this._heatMap.set(data.objectB, heatB + data.impulse * 8.0);

        // User requested NO other sounds except White Noise
        // if (data.impulse > 2.0) {
        //    const freq = 41.2 + (Math.random() * 5.0);
        //    const vol = Math.min(1.0, data.impulse * 0.1);
        //    AudioSystem.instance.playTone(freq, 0.4, vol, "square");
        // }
      },
    );
  }

  protected override update(dt: number): void {
    // 1. N-Body Gravity Simulation (O(N^2))
    for (let i = 0; i < this._spheres.length; i++) {
      const a = this._spheres[i]!;
      const pA = a.position;

      const distSqC = pA.x * pA.x + pA.y * pA.y + pA.z * pA.z;
      const distC = Math.sqrt(distSqC) || 1.0;

      // Event Horizon: Consumed!
      if (distC < 0.4) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 3.0; // Respawn at the outer edge of the dense disk
        pA.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 0.2, Math.sin(angle) * radius);
        const orbitalSpeed = Math.sqrt(this._spheres.length / radius) * 0.98;
        a.rigidBody!.velocity.set(
          -Math.sin(angle) * orbitalSpeed,
          0,
          Math.cos(angle) * orbitalSpeed,
        );
        a.rigidBody!.angularVelocity.set(0, 0, 0);
        this._heatMap.set(a, 2.0); // Reset heat to a moderate orange
        continue;
      }
      // Force scales with 1/d^2
      const pullC = this._spheres.length / Math.max(distSqC, 2.0);

      let fx = -(pA.x / distC) * pullC;
      let fy = -(pA.y / distC) * pullC;
      let fz = -(pA.z / distC) * pullC;

      // Sphere-Sphere Micro-Gravity
      for (let j = i + 1; j < this._spheres.length; j++) {
        const b = this._spheres[j]!;
        const pB = b.position;
        const dx = pB.x - pA.x;
        const dy = pB.y - pA.y;
        const dz = pB.z - pA.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq > 0.1) {
          const forceMag = 2.0 / distSq;
          const dist = Math.sqrt(distSq);
          const fxG = (dx / dist) * forceMag;
          const fyG = (dy / dist) * forceMag;
          const fzG = (dz / dist) * forceMag;

          fx += fxG;
          fy += fyG;
          fz += fzG;

          // Newton's third law
          b.rigidBody!.forces.x -= fxG;
          b.rigidBody!.forces.y -= fyG;
          b.rigidBody!.forces.z -= fzG;
        }
      }

      a.rigidBody!.forces.x += fx;
      a.rigidBody!.forces.y += fy;
      a.rigidBody!.forces.z += fz;
    }

    // 2. Step Physics Engine (SAT Collision & Integration)
    this._physics.step(this.scene, dt);

    // 3. Update Heat and Emissive Colors
    for (const s of this._spheres) {
      let heat = this._heatMap.get(s)!;

      // Increase heat based on pressure (proximity to singularity center)
      const distC = s.position.length();
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

        // Cool (0) = 0.5, 0.0, 0.0 (Deep Dark Red)
        // Hot (1) = 1.0, 1.0, 1.0 (Blinding White)
        const r = 0.6 + t * 0.4;
        const g = Math.max(0, (t - 0.2) / 0.8);
        const b = Math.max(0, (t - 0.7) / 0.3);

        s.material.emissiveColor.set(r, g, b);
      }
    }

    // 4. Update Skydome position to follow camera (infinite background)
    const skydome = this.scene.objects.find((o) => o.name === "Skydome");
    if (skydome) {
      skydome.position.copyFrom(this.camera.position);
    }
  }
}

const app = new Showcase21();
app.start();
