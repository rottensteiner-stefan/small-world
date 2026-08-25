import { describe, it, expect } from "vitest";
import { StageZone } from "../../../src/core/stage/StageZone.js";

describe("StageZone", () => {
  const zone = new StageZone({
    id: "test_square",
    name: "Test Square",
    points: [
      { u: 0, v: 0 },
      { u: 1, v: 0 },
      { u: 1, v: 1 },
      { u: 0, v: 1 },
    ],
  });

  it("should correctly identify points inside the convex quad", () => {
    expect(zone.containsPoint(0.5, 0.5)).toBe(true);
    expect(zone.containsPoint(0.1, 0.1)).toBe(true);
    expect(zone.containsPoint(0.9, 0.9)).toBe(true);
  });

  it("should correctly identify points outside the convex quad", () => {
    expect(zone.containsPoint(-0.1, 0.5)).toBe(false);
    expect(zone.containsPoint(1.1, 0.5)).toBe(false);
    expect(zone.containsPoint(0.5, -0.1)).toBe(false);
    expect(zone.containsPoint(0.5, 1.1)).toBe(false);
  });

  it("should accept an edge tolerance for seamless zone transitions", () => {
    expect(zone.containsPoint(1.05, 0.5)).toBe(false);
    expect(zone.containsPoint(1.05, 0.5, 0.1)).toBe(true);
  });

  it("should default corner scale to 1.0 when unspecified", () => {
    expect(zone.getScaleAt(0.5, 0.5)).toBeCloseTo(1.0, 5);
  });

  it("should interpolate scale correctly using barycentric interpolation", () => {
    const scaleZone = new StageZone({
      id: "test_perspective",
      name: "Test Perspective",
      points: [
        { u: 0, v: 0, scale: 1.0 },
        { u: 1, v: 0, scale: 1.0 },
        { u: 1, v: 1, scale: 0.2 },
        { u: 0, v: 1, scale: 0.2 },
      ],
    });

    expect(scaleZone.getScaleAt(0.5, 0)).toBeCloseTo(1.0, 1);
    expect(scaleZone.getScaleAt(0.5, 0.5)).toBeCloseTo(0.6, 1);
    expect(scaleZone.getScaleAt(0.5, 1)).toBeCloseTo(0.2, 1);
  });

  it("should derive image-axis-aligned local axes for an axis-aligned zone", () => {
    const axes = zone.getLocalAxes();
    expect(axes.right.u).toBeCloseTo(1.0, 5);
    expect(axes.right.v).toBeCloseTo(0.0, 5);
    expect(axes.forward.u).toBeCloseTo(0.0, 5);
    expect(axes.forward.v).toBeCloseTo(1.0, 5);
  });

  it("should derive diagonal local axes for a zone traced at an angle onto perspective art", () => {
    // A square rotated 45° (a diamond) -- diagonal in (u, v), but still a real rectangle.
    const diagonalZone = new StageZone({
      id: "test_diagonal",
      name: "Test Diagonal",
      points: [
        { u: 0.7, v: 0.5 },
        { u: 0.5, v: 0.7 },
        { u: 0.3, v: 0.5 },
        { u: 0.5, v: 0.3 },
      ],
    });

    const axes = diagonalZone.getLocalAxes();
    // Right and forward should be roughly perpendicular for this near-square quad.
    const dot = axes.right.u * axes.forward.u + axes.right.v * axes.forward.v;
    expect(Math.abs(dot)).toBeLessThan(0.1);
  });

  it("should clamp an inside point to itself", () => {
    expect(zone.clampToPolygon(0.5, 0.5)).toEqual({ u: 0.5, v: 0.5 });
  });

  it("should clamp an outside point onto the nearest edge of the polygon", () => {
    const clamped = zone.clampToPolygon(1.2, 0.5);
    expect(clamped.u).toBeCloseTo(1.0, 5);
    expect(clamped.v).toBeCloseTo(0.5, 5);
  });

  it("should fall back to image axes when a zone collapses to a single point", () => {
    const degenerateZone = new StageZone({
      id: "test_degenerate",
      name: "Test Degenerate",
      points: [
        { u: 0.5, v: 0.5 },
        { u: 0.5, v: 0.5 },
        { u: 0.5, v: 0.5 },
        { u: 0.5, v: 0.5 },
      ],
    });

    const axes = degenerateZone.getLocalAxes();
    expect(axes.right).toEqual({ u: 1, v: 0 });
    expect(axes.forward).toEqual({ u: 0, v: -1 });
  });
});
