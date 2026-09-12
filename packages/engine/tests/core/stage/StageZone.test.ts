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
    const axes = zone.getLocalAxes(0.5, 0.5);
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

    const axes = diagonalZone.getLocalAxes(0.5, 0.5);
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

    const axes = degenerateZone.getLocalAxes(0.5, 0.5);
    expect(axes.right).toEqual({ u: 1, v: 0 });
    expect(axes.forward).toEqual({ u: 0, v: -1 });
  });

  it("should reject fewer than 3 points", () => {
    expect(
      () =>
        new StageZone({
          id: "test_invalid",
          name: "Test Invalid",
          points: [
            { u: 0, v: 0 },
            { u: 1, v: 0 },
          ],
        }),
    ).toThrow();
  });

  it("should support an arbitrary polygon (hexagon) for containment and scale", () => {
    const hexagon = new StageZone({
      id: "test_hexagon",
      name: "Test Hexagon",
      points: [
        { u: 0.2, v: 0 },
        { u: 0.8, v: 0 },
        { u: 1, v: 0.5 },
        { u: 0.8, v: 1 },
        { u: 0.2, v: 1 },
        { u: 0, v: 0.5 },
      ],
    });

    expect(hexagon.containsPoint(0.5, 0.5)).toBe(true);
    expect(hexagon.containsPoint(0.5, -0.5)).toBe(false);
    expect(hexagon.getScaleAt(0.5, 0.5)).toBeCloseTo(1.0, 5);
  });

  it("should derive a gradient-based forward direction for a non-quad polygon", () => {
    // A single fan triangle (n=3): scale falls linearly from 1 at v=0 to 0 at v=1, with no u
    // component -- the gradient (direction of steepest increase) is exactly (0, -1), so
    // "forward" (steepest decrease) must be exactly (0, 1), "right" exactly (1, 0). Hand-derived
    // from the gradient formula: e1=(1,0), e2=(0,1), d1=0, d2=-1, det=1 -> gu=0, gv=-1.
    const triangle = new StageZone({
      id: "test_triangle_gradient",
      name: "Test Triangle Gradient",
      points: [
        { u: 0, v: 0, scale: 1.0 },
        { u: 1, v: 0, scale: 1.0 },
        { u: 0, v: 1, scale: 0.0 },
      ],
    });

    const axes = triangle.getLocalAxes(0.3, 0.3);
    expect(axes.forward.u).toBeCloseTo(0, 5);
    expect(axes.forward.v).toBeCloseTo(1, 5);
    expect(axes.right.u).toBeCloseTo(1, 5);
    expect(axes.right.v).toBeCloseTo(0, 5);
  });
});
