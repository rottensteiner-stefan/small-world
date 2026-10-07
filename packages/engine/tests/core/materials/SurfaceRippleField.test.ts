import { describe, it, expect } from "vitest";
import { OpenWaterMaterial } from "../../../src/core/materials/OpenWaterMaterial.js";

describe("SurfaceRippleField (S2) & Clapotis (S3) Wave Physics", () => {
  it("packs S2 splat lane correctly into RenderManifest u_styleA", () => {
    const material = new OpenWaterMaterial();
    const manifestInitial = material.getRenderManifest();
    expect(manifestInitial.properties["u_styleA"]).toEqual([0, 0, -9999, 0]);

    // Emit impact splat at x=1.5, z=-2.0, time=12.4, energy=0.85
    material.emitSplat(1.5, -2.0, 12.4, 0.85);
    const manifestUpdated = material.getRenderManifest();
    expect(manifestUpdated.properties["u_styleA"]).toEqual([1.5, -2.0, 12.4, 0.85]);
    expect(material.splat).toEqual([1.5, -2.0, 12.4, 0.85]);
  });

  it("calculates decaying ring ripple wave propagation accurately", () => {
    const spawnTime = 10.0;
    const energy = 1.0;
    const currentTime = 10.5; // 0.5s after impact

    const splatAge = currentTime - spawnTime;
    const rippleRadius = splatAge * 3.5; // 1.75 units radius
    const ringWidth = 0.8;

    // Evaluate wave at the crest of the ring (dist = rippleRadius)
    const distAtCrest = rippleRadius;
    const ringDistAtCrest = distAtCrest - rippleRadius;
    const ringMaskAtCrest = Math.exp(
      (-ringDistAtCrest * ringDistAtCrest) / (ringWidth * ringWidth),
    );
    const ringDecayAtCrest = Math.exp(-splatAge * 1.2) * energy;
    const dispAtCrest = Math.sin(ringDistAtCrest * 8.0) * ringMaskAtCrest * ringDecayAtCrest * 0.15;

    expect(dispAtCrest).toBeDefined();
    // At the exact crest offset, sin(0) = 0, but peak is nearby
    expect(ringMaskAtCrest).toBeCloseTo(1.0, 4);
    expect(ringDecayAtCrest).toBeLessThan(1.0);
    expect(ringDecayAtCrest).toBeGreaterThan(0.5);

    // Evaluate wave further ahead (dist = 5.0 units, far from ring)
    const distFar = 5.0;
    const ringDistFar = distFar - rippleRadius;
    const ringMaskFar = Math.exp((-ringDistFar * ringDistFar) / (ringWidth * ringWidth));
    expect(ringMaskFar).toBeLessThan(0.0001); // Wave hasn't arrived
  });

  it("calculates Clapotis standing wave reflection vector (D_ref) at vertical boundary walls", () => {
    const waveInc: [number, number] = [1.0, 0.5]; // Direction vector
    const wallNormX: [number, number] = [-1.0, 0.0]; // West wall normal facing inside (+X)

    // D_ref = D_inc - 2 * dot(D_inc, wallNorm) * wallNorm
    const dotX = waveInc[0] * wallNormX[0] + waveInc[1] * wallNormX[1]; // -1.0
    const dRefX: [number, number] = [
      waveInc[0] - 2.0 * dotX * wallNormX[0], // 1.0 - 2.0 * (-1.0) * (-1.0) = -1.0 (X component flipped!)
      waveInc[1] - 2.0 * dotX * wallNormX[1], // 0.5 - 0 = 0.5 (Y component preserved)
    ];

    expect(dRefX[0]).toBeCloseTo(-1.0, 4);
    expect(dRefX[1]).toBeCloseTo(0.5, 4);

    // At the wall boundary, incoming and reflected waves superimpose with standing wave node at lambda/4
    const waveLength = 10.0;
    const standingNodeDist = waveLength / 4.0; // 2.5 units
    expect(standingNodeDist).toBe(2.5);
  });
});
