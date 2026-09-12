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
});
