/// tests/core/Object3D.test.ts

import { Object3D } from "../../src/index.js";
import { describe, it, expect } from "vitest";

describe("Object3D", () => {
  it("should initialize with default shadow properties", () => {
    const obj = new Object3D();

    // By default, objects should not cast or receive shadows
    expect(obj.castShadow).toBe(false);
    expect(obj.receiveShadow).toBe(false);
  });

  it("should allow setting shadow properties", () => {
    const obj = new Object3D();

    obj.castShadow = true;
    obj.receiveShadow = true;

    expect(obj.castShadow).toBe(true);
    expect(obj.receiveShadow).toBe(true);
  });
});
