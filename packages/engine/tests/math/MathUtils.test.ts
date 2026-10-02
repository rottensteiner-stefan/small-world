import { describe, it, expect } from "vitest";
import { MathUtils } from "../../src/index.js";

describe("MathUtils", () => {
  it("should convert deg to rad correctly", () => {
    expect(MathUtils.degToRad(180)).toBeCloseTo(Math.PI);
    expect(MathUtils.degToRad(90)).toBeCloseTo(Math.PI / 2);
  });

  it("should convert rad to deg correctly", () => {
    expect(MathUtils.radToDeg(Math.PI)).toBe(180);
    expect(MathUtils.radToDeg(Math.PI / 2)).toBe(90);
  });

  it("should clamp values correctly", () => {
    expect(MathUtils.clamp(5, 0, 10)).toBe(5);
    expect(MathUtils.clamp(-5, 0, 10)).toBe(0);
    expect(MathUtils.clamp(15, 0, 10)).toBe(10);
  });

  it("should generate a valid UUID format", () => {
    const uuid = MathUtils.generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("should perform fast sin lookup correctly", () => {
    expect(MathUtils.fastSin(0)).toBeCloseTo(0, 2);
    expect(MathUtils.fastSin(Math.PI / 2)).toBeCloseTo(1, 2);
    expect(MathUtils.fastSin(Math.PI)).toBeCloseTo(0, 2);
  });

  it("should perform fast cos lookup correctly", () => {
    expect(MathUtils.fastCos(0)).toBeCloseTo(1, 2);
    expect(MathUtils.fastCos(Math.PI / 2)).toBeCloseTo(0, 2);
    expect(MathUtils.fastCos(Math.PI)).toBeCloseTo(-1, 2);
  });

  it("should lerp between two numbers correctly", () => {
    expect(MathUtils.lerp(0, 10, 0.5)).toBe(5);
    expect(MathUtils.lerp(0, 10, 0)).toBe(0);
    expect(MathUtils.lerp(0, 10, 1)).toBe(10);
    expect(MathUtils.lerp(5, 15, 0.25)).toBe(7.5);
  });

  it("should calculate smoothstep correctly", () => {
    expect(MathUtils.smoothstep(0, 10, -5)).toBe(0);
    expect(MathUtils.smoothstep(0, 10, 15)).toBe(1);
    expect(MathUtils.smoothstep(0, 10, 0)).toBe(0);
    expect(MathUtils.smoothstep(0, 10, 10)).toBe(1);
    expect(MathUtils.smoothstep(0, 10, 5)).toBeCloseTo(0.5);
    expect(MathUtils.smoothstep(0, 1, 0.25)).toBeCloseTo(0.25 * 0.25 * (3 - 2 * 0.25));
  });

  it("should calculate smootherstep correctly", () => {
    expect(MathUtils.smootherstep(0, 10, -5)).toBe(0);
    expect(MathUtils.smootherstep(0, 10, 15)).toBe(1);
    expect(MathUtils.smootherstep(0, 10, 0)).toBe(0);
    expect(MathUtils.smootherstep(0, 10, 10)).toBe(1);
    expect(MathUtils.smootherstep(0, 10, 5)).toBeCloseTo(0.5);
    const t = 0.3;
    const expected = t * t * t * (t * (t * 6 - 15) + 10);
    expect(MathUtils.smootherstep(0, 1, t)).toBeCloseTo(expected);
  });

  it("should calculate inverseLerp correctly", () => {
    expect(MathUtils.inverseLerp(0, 10, 5)).toBe(0.5);
    expect(MathUtils.inverseLerp(10, 20, 15)).toBe(0.5);
    expect(MathUtils.inverseLerp(0, 100, 25)).toBe(0.25);
    expect(MathUtils.inverseLerp(5, 5, 5)).toBe(0);
  });

  it("should calculate damp correctly", () => {
    const start = 0;
    const target = 10;
    const dt = 0.1;
    const lambda = 5;
    const dampened = MathUtils.damp(start, target, lambda, dt);
    expect(dampened).toBeGreaterThan(0);
    expect(dampened).toBeLessThan(10);
    expect(dampened).toBeCloseTo(MathUtils.lerp(start, target, 1 - Math.exp(-lambda * dt)));
  });

  it("should check isPowerOfTwo correctly", () => {
    expect(MathUtils.isPowerOfTwo(1)).toBe(true);
    expect(MathUtils.isPowerOfTwo(2)).toBe(true);
    expect(MathUtils.isPowerOfTwo(4)).toBe(true);
    expect(MathUtils.isPowerOfTwo(16)).toBe(true);
    expect(MathUtils.isPowerOfTwo(1024)).toBe(true);
    expect(MathUtils.isPowerOfTwo(0)).toBe(false);
    expect(MathUtils.isPowerOfTwo(-4)).toBe(false);
    expect(MathUtils.isPowerOfTwo(3)).toBe(false);
    expect(MathUtils.isPowerOfTwo(15)).toBe(false);
  });

  it("should calculate nextPowerOfTwo correctly", () => {
    expect(MathUtils.nextPowerOfTwo(1)).toBe(1);
    expect(MathUtils.nextPowerOfTwo(2)).toBe(2);
    expect(MathUtils.nextPowerOfTwo(3)).toBe(4);
    expect(MathUtils.nextPowerOfTwo(4)).toBe(4);
    expect(MathUtils.nextPowerOfTwo(5)).toBe(8);
    expect(MathUtils.nextPowerOfTwo(1000)).toBe(1024);
  });
});
