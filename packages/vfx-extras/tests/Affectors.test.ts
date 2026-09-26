import { describe, it, expect } from "vitest";
import { Particle } from "../src/Particle.js";
import { PointAttractorAffector } from "../src/affectors/PointAttractorAffector.js";
import { VortexAffector } from "../src/affectors/VortexAffector.js";
import { PlanarSpringAffector } from "../src/affectors/PlanarSpringAffector.js";
import { ThermalCoolingAffector } from "../src/affectors/ThermalCoolingAffector.js";
import { FadeOutZoneAffector } from "../src/affectors/FadeOutZoneAffector.js";
import { Vector3D } from "@small-world/engine";

describe("Affectors", () => {
  it("PointAttractorAffector pulls particles towards center", () => {
    const attractor = new PointAttractorAffector({
      center: new Vector3D(0, 0, 0),
      strength: 100,
      softening: 0.5,
      plummer: true,
    });

    const p = new Particle({ position: new Vector3D(10, 0, 0) });
    attractor.apply(p, 0.1);

    expect(p.acceleration.x).toBeLessThan(0); // Pulled in -X direction
    expect(p.acceleration.y).toBe(0);
    expect(p.acceleration.z).toBe(0);
  });

  it("VortexAffector applies tangential acceleration around Y axis", () => {
    const vortex = new VortexAffector({
      center: new Vector3D(0, 0, 0),
      strength: 5.0,
      axis: "y",
    });

    // Particle at (1, 0, 0) -> tangential direction should be (0, 0, 1)
    const p = new Particle({ position: new Vector3D(1, 0, 0) });
    vortex.apply(p, 0.1);

    expect(p.acceleration.x).toBeCloseTo(0);
    expect(p.acceleration.z).toBeGreaterThan(0);
  });

  it("PlanarSpringAffector restores particles towards plane", () => {
    const spring = new PlanarSpringAffector({
      axis: "y",
      planePosition: 0,
      stiffness: 10.0,
    });

    const p = new Particle({ position: new Vector3D(0, 2, 0) });
    spring.apply(p, 0.1);

    expect(p.acceleration.y).toBeLessThan(0); // Pushed down towards y = 0
  });

  it("ThermalCoolingAffector calculates compression heat and blackbody color", () => {
    const thermal = new ThermalCoolingAffector({
      heatCenter: new Vector3D(0, 0, 0),
      compressionRadius: 2.0,
      compressionHeatingRate: 20.0,
      coolingRate: 1.0,
      updateColor: true,
    });

    const p = new Particle({ position: new Vector3D(0.5, 0, 0), heat: 0 });
    thermal.apply(p, 0.1);

    expect(p.heat).toBeGreaterThan(0);
    expect(p.color.r).toBeGreaterThan(0.5); // Blackbody red/orange ramp
  });

  it("FadeOutZoneAffector reduces alpha and flags dead inside horizon", () => {
    const fade = new FadeOutZoneAffector({
      center: new Vector3D(0, 0, 0),
      fadeStartRadius: 1.0,
      fadeEndRadius: 0.5,
      shrinkSize: true,
    });

    // Particle midway in fading zone
    const pMid = new Particle({ position: new Vector3D(0.75, 0, 0) });
    fade.apply(pMid, 0.1);
    expect(pMid.alpha).toBeCloseTo(0.5);
    expect(pMid.dead).toBe(false);

    // Particle past inner horizon
    const pSwallowed = new Particle({ position: new Vector3D(0.4, 0, 0) });
    fade.apply(pSwallowed, 0.1);
    expect(pSwallowed.alpha).toBe(0);
    expect(pSwallowed.dead).toBe(true);
  });
});
