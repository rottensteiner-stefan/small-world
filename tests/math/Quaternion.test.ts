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

  it("should leave the quaternion unchanged when slerp factor is 0", () => {
    const q1 = new Quaternion().setFromAxisAngle(new Vector3D(0, 1, 0), 0.4);
    const target = new Quaternion().setFromAxisAngle(new Vector3D(0, 1, 0), Math.PI);
    q1.slerp(target, 0);
    expect(q1.x).toBeCloseTo(0);
    expect(q1.y).toBeCloseTo(Math.sin(0.2));
    expect(q1.w).toBeCloseTo(Math.cos(0.2));
  });

  it("should fully reach the target quaternion when slerp factor is 1", () => {
    const q1 = new Quaternion().setFromAxisAngle(new Vector3D(0, 1, 0), 0.4);
    const target = new Quaternion().setFromAxisAngle(new Vector3D(0, 1, 0), Math.PI);
    q1.slerp(target, 1);
    expect(q1.x).toBeCloseTo(target.x);
    expect(q1.y).toBeCloseTo(target.y);
    expect(q1.z).toBeCloseTo(target.z);
    expect(q1.w).toBeCloseTo(target.w);
  });

  it("should slerp halfway between two rotations about the same axis", () => {
    // Two rotations about the same axis should slerp to the angle-average rotation.
    const q1 = new Quaternion().setFromAxisAngle(new Vector3D(0, 1, 0), 0);
    const target = new Quaternion().setFromAxisAngle(new Vector3D(0, 1, 0), Math.PI / 2);
    q1.slerp(target, 0.5);
    const expected = new Quaternion().setFromAxisAngle(new Vector3D(0, 1, 0), Math.PI / 4);
    expect(q1.x).toBeCloseTo(expected.x);
    expect(q1.y).toBeCloseTo(expected.y);
    expect(q1.z).toBeCloseTo(expected.z);
    expect(q1.w).toBeCloseTo(expected.w);
    expect(q1.length()).toBeCloseTo(1);
  });

  it("should take the shortest arc when quaternions are more than 90 degrees apart", () => {
    const q1 = new Quaternion(0, 0, 0, 1);
    const q2 = new Quaternion(0, 0, 0, -1); // Same rotation, opposite sign (long way around)
    q1.slerp(q2, 0.5);
    // Should stay at identity (shortest arc is zero distance), not fly off through -w.
    expect(q1.x).toBeCloseTo(0);
    expect(q1.y).toBeCloseTo(0);
    expect(q1.z).toBeCloseTo(0);
    expect(Math.abs(q1.w)).toBeCloseTo(1);
  });
});
