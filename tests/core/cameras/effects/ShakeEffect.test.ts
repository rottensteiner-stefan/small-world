import { ShakeEffect } from "../../../../src/core/cameras/effects/ShakeEffect.js";

describe("ShakeEffect", () => {
  it("keeps the offset magnitude within the trauma^2 envelope on every axis", () => {
    const intensity = 0.5;
    const duration = 0.5;
    const effect = new ShakeEffect(intensity, duration);

    let t = 0;
    const step = 1 / 60;
    while (t < duration) {
      effect.update(step);
      t += step;

      const elapsed = Math.min(t, duration);
      const trauma = 1.0 - elapsed / duration;
      const envelope = intensity * trauma * trauma + 1e-6;

      expect(Math.abs(effect.offset.x)).toBeLessThanOrEqual(envelope);
      expect(Math.abs(effect.offset.y)).toBeLessThanOrEqual(envelope);
      expect(Math.abs(effect.offset.z)).toBeLessThanOrEqual(envelope);
    }
  });

  it("finishes and zeroes the offset once the duration elapses", () => {
    const effect = new ShakeEffect(0.5, 0.2);

    effect.update(0.25);

    expect(effect.isFinished).toBe(true);
    expect(effect.offset.x).toBe(0);
    expect(effect.offset.y).toBe(0);
    expect(effect.offset.z).toBe(0);
  });

  it("produces different offsets for two simultaneously-created effects (per-instance seed)", () => {
    const a = new ShakeEffect(0.5, 1.0);
    const b = new ShakeEffect(0.5, 1.0);

    a.update(0.1);
    b.update(0.1);

    // Extremely unlikely to collide unless the per-instance seed offset were missing.
    expect(
      a.offset.x === b.offset.x && a.offset.y === b.offset.y && a.offset.z === b.offset.z,
    ).toBe(false);
  });
});
