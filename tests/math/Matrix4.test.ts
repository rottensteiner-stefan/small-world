/// tests/math/Matrix4.test.ts

import { describe, expect, it } from "vitest";
import { Matrix4, Vector3D } from "../../src/index.js";

describe("Matrix4", () => {
  it("should initialize as identity matrix", () => {
    const m = new Matrix4();
    const d = m.data;
    expect(d[0]).toBe(1);
    expect(d[5]).toBe(1);
    expect(d[10]).toBe(1);
    expect(d[15]).toBe(1);
    expect(d[1]).toBe(0);
    expect(d[12]).toBe(0);
  });

  it("should multiply two matrices correctly", () => {
    const m1 = new Matrix4();
    const m2 = new Matrix4();

    // Translation matrix
    m2.data[12] = 10;
    m2.data[13] = 20;
    m2.data[14] = 30;

    m1.multiply(m2);
    expect(m1.data[12]).toBe(10);
    expect(m1.data[13]).toBe(20);
    expect(m1.data[14]).toBe(30);
  });

  it("should invert a translation matrix correctly", () => {
    const m = new Matrix4();
    m.data[12] = 10;
    m.data[13] = 20;
    m.data[14] = 30;

    const inv = new Matrix4();
    const success = m.invert(inv);

    expect(success).toBe(true);
    expect(inv.data[12]).toBe(-10);
    expect(inv.data[13]).toBe(-20);
    expect(inv.data[14]).toBe(-30);
  });

  it("should transform a vector correctly", () => {
    const m = new Matrix4();
    // Translate by 5, 0, 0
    m.data[12] = 5;

    const v = new Vector3D(1, 1, 1);
    m.transformVector(v);

    expect(v.x).toBe(6);
    expect(v.y).toBe(1);
    expect(v.z).toBe(1);
  });

  it("should correctly compose and decompose", () => {
    const m = new Matrix4();
    const pos = new Vector3D(10, 20, 30);
    const rot = new Vector3D(0.5, 0.5, 0.5);
    const scale = new Vector3D(2, 2, 2);

    m.compose(pos, rot, scale);

    const outPos = new Vector3D();
    const outRot = new Vector3D();
    const outScale = new Vector3D();

    m.decompose(outPos, outRot, outScale);

    expect(outPos.x).toBeCloseTo(pos.x);
    expect(outPos.y).toBeCloseTo(pos.y);
    expect(outPos.z).toBeCloseTo(pos.z);

    expect(outScale.x).toBeCloseTo(scale.x);
    expect(outScale.y).toBeCloseTo(scale.y);
    expect(outScale.z).toBeCloseTo(scale.z);

    expect(outRot.x).toBeCloseTo(rot.x);
    expect(outRot.y).toBeCloseTo(rot.y);
    expect(outRot.z).toBeCloseTo(rot.z);
  });

  it("should enforce strictly Right-Handed rotations (X-axis +90 degrees)", () => {
    const m = new Matrix4();
    // Rotate +90 degrees around X-axis
    m.compose(new Vector3D(0, 0, 0), new Vector3D(Math.PI / 2, 0, 0), new Vector3D(1, 1, 1));

    // A forward vector points down -Z
    const forward = new Vector3D(0, 0, -1);
    m.transformVector(forward);

    // If right-handed, rotating +90 around X pitches the forward vector UP (+Y)
    expect(forward.x).toBeCloseTo(0);
    expect(forward.y).toBeCloseTo(1);
    expect(forward.z).toBeCloseTo(0);

    // An up vector points up +Y
    const up = new Vector3D(0, 1, 0);
    m.transformVector(up);

    // If right-handed, rotating +90 around X pitches the up vector BACK (+Z)
    expect(up.x).toBeCloseTo(0);
    expect(up.y).toBeCloseTo(0);
    expect(up.z).toBeCloseTo(1);
  });
});
