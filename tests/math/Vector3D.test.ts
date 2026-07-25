import { describe, it, expect } from "vitest";
import { Vector3D } from "../../src/index.js";

describe("Vector3D", () => {
  it("should initialize with default values", () => {
    const v = new Vector3D();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });

  it("should initialize with provided values", () => {
    const v = new Vector3D(1, 2, 3);
    expect(v.x).toBe(1);
    expect(v.y).toBe(2);
    expect(v.z).toBe(3);
  });

  it("should add vectors correctly", () => {
    const v1 = new Vector3D(1, 2, 3);
    const v2 = new Vector3D(4, 5, 6);
    v1.add(v2);
    expect(v1.x).toBe(5);
    expect(v1.y).toBe(7);
    expect(v1.z).toBe(9);
  });

  it("should subtract vectors correctly", () => {
    const v1 = new Vector3D(5, 7, 9);
    const v2 = new Vector3D(1, 2, 3);
    v1.sub(v2);
    expect(v1.x).toBe(4);
    expect(v1.y).toBe(5);
    expect(v1.z).toBe(6);
  });

  it("should normalize vectors correctly", () => {
    const v = new Vector3D(10, 0, 0);
    v.normalize();
    expect(v.x).toBe(1);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
    expect(v.length()).toBe(1);
  });

  it("should handle normalization of zero vector", () => {
    const v = new Vector3D(0, 0, 0);
    v.normalize();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
    expect(v.length()).toBe(0);
  });

  it("should calculate distance correctly", () => {
    const v1 = new Vector3D(0, 0, 0);
    const v2 = new Vector3D(0, 10, 0);
    expect(v1.distanceTo(v2)).toBe(10);
  });

  it("should copy from another vector", () => {
    const v1 = new Vector3D(1, 2, 3);
    const v2 = new Vector3D();
    v2.copyFrom(v1);
    expect(v2.x).toBe(1);
    expect(v2.y).toBe(2);
    expect(v2.z).toBe(3);
  });
});
