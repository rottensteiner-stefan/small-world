import { describe, it, expect } from "vitest";
import { AccretionDiskEmitter } from "../src/AccretionDiskEmitter.js";

describe("AccretionDiskEmitter", () => {
  it("initializes particles with Keplerian velocities and updates them", () => {
    const disk = new AccretionDiskEmitter({
      particleCount: 50,
      innerRadius: 1.0,
      outerRadius: 5.0,
      mass: 100,
    });

    expect(disk.system.particles.length).toBe(50);

    const firstParticle = disk.system.particles[0]!;
    expect(firstParticle.velocity.length()).toBeGreaterThan(0);
    expect(firstParticle.color).toBeDefined();

    // Step simulation for 5 frames
    for (let i = 0; i < 5; i++) {
      disk.update(0.016);
    }

    expect(firstParticle.position.length()).toBeGreaterThan(0);
  });

  it("respawns absorbed particles cleanly at outer radius", () => {
    const disk = new AccretionDiskEmitter({
      particleCount: 10,
      innerRadius: 1.0,
      outerRadius: 4.0,
      eventHorizonRadius: 0.5,
    });

    const p = disk.system.particles[0]!;
    // Place particle inside event horizon
    p.position.set(0.1, 0, 0);

    disk.update(0.016);

    // Particle should have been swallowed and respawned near outerRadius (4.0)
    expect(p.dead).toBe(false);
    expect(p.position.length()).toBeCloseTo(4.0, 1);
  });
});
