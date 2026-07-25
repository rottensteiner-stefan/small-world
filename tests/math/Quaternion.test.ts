import { describe, expect, it } from "vitest";
import { Quaternion, Vector3D } from "../../src/index.js";

describe("Quaternion", () => {
  it("should initialize as identity quaternion", () => {
    const q = new Quaternion();
    expect(q.x).toBe(0);
    expect(q.y).toBe(0);
    expect(q.z).toBe(0);
    expect(q.w).toBe(1);
  });

  it("should set from axis angle correctly", () => {
    const q = new Quaternion();
    const axis = new Vector3D(0, 1, 0);
    const angle = Math.PI; // 180 degrees

    q.setFromAxisAngle(axis, angle);

    // For 180 deg about Y, q should be (0, 1, 0, 0)
    expect(q.x).toBeCloseTo(0);
    expect(q.y).toBeCloseTo(1);
    expect(q.z).toBeCloseTo(0);
    expect(q.w).toBeCloseTo(0);
  });

  it("should multiply quaternions correctly", () => {
    const q1 = new Quaternion().setFromAxisAngle(new Vector3D(1, 0, 0), Math.PI / 2);
    const q2 = new Quaternion().setFromAxisAngle(new Vector3D(1, 0, 0), Math.PI / 2);

    q1.multiply(q2); // Should result in 180 deg rotation

    expect(q1.x).toBeCloseTo(1);
    expect(q1.y).toBeCloseTo(0);
    expect(q1.z).toBeCloseTo(0);
    expect(q1.w).toBeCloseTo(0);
  });

  it("should normalize correctly", () => {
    const q = new Quaternion(1, 1, 1, 1);
    q.normalize();
    expect(q.length()).toBeCloseTo(1);
  });
});
