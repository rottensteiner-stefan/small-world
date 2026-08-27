import { describe, it, expect } from "vitest";
import { WeatherEmitter, Matrix4, Vector3D } from "../../src/index.js";

/** Decodes instance `i`'s position out of the mesh's raw instance matrix buffer. */
function readPosition(emitter: WeatherEmitter, i: number): Vector3D {
  const matrix = new Matrix4();
  matrix.data.set(emitter.mesh.instanceMatrices.subarray(i * 16, i * 16 + 16));
  const position = new Vector3D();
  const rotation = new Vector3D();
  const scale = new Vector3D();
  matrix.decompose(position, rotation, scale);
  return position;
}

describe("WeatherEmitter", () => {
  it("creates a fixed-size instanced pool matching `count`", () => {
    const emitter = new WeatherEmitter("Test", {
      count: 37,
      spawnArea: { width: 10, depth: 10, height: 10 },
    });
    expect(emitter.mesh.instanceCount).toBe(37);
  });

  it("defaults to a pool of 400 particles", () => {
    const emitter = new WeatherEmitter("Test", { spawnArea: { width: 5, depth: 5, height: 5 } });
    expect(emitter.mesh.instanceCount).toBe(400);
  });

  it("never leaves a particle below the spawn box's floor after many updates", () => {
    const center = new Vector3D(0, 10, 0);
    const emitter = new WeatherEmitter("Test", {
      count: 50,
      center,
      spawnArea: { width: 4, depth: 4, height: 6 },
      fallSpeed: [2, 3],
    });
    const floorY = center.y - 3; // height / 2

    for (let frame = 0; frame < 200; frame++) {
      emitter.update(0.1);
    }

    for (let i = 0; i < emitter.mesh.instanceCount; i++) {
      expect(readPosition(emitter, i).y).toBeGreaterThanOrEqual(floorY);
    }
  });

  it("treats the floor plane itself as still inside the box (no recycle exactly at the boundary)", () => {
    const center = new Vector3D(0, 0, 0);
    const emitter = new WeatherEmitter("Test", {
      count: 1,
      center,
      spawnArea: { width: 4, depth: 4, height: 6 },
      fallSpeed: [1, 1],
      windGustiness: 0,
    });
    const floorY = -3; // center.y - height / 2

    // Drive the single particle to land exactly on the floor plane via a deltaTime chosen from
    // its actual (randomized) starting height, then verify one more zero-length update leaves it
    // exactly there rather than recycling it back to the top.
    const before = readPosition(emitter, 0);
    const dtToFloor = (before.y - floorY) / 1; // fallSpeed is fixed to 1
    emitter.update(dtToFloor);
    const atFloor = readPosition(emitter, 0);
    expect(atFloor.y).toBeCloseTo(floorY, 5);

    emitter.update(0);
    const afterZeroStep = readPosition(emitter, 0);
    expect(afterZeroStep.y).toBeCloseTo(floorY, 5);
  });

  it("recycles a particle back to the top of the box once it falls past the floor", () => {
    const center = new Vector3D(0, 0, 0);
    const emitter = new WeatherEmitter("Test", {
      count: 1,
      center,
      spawnArea: { width: 4, depth: 4, height: 6 },
      fallSpeed: [1, 1],
    });
    const topY = 3; // center.y + height / 2
    const floorY = -3;

    const before = readPosition(emitter, 0);
    // Fall well past the floor in a single step.
    emitter.update(before.y - floorY + 1);

    const after = readPosition(emitter, 0);
    expect(after.y).toBeCloseTo(topY, 5);
  });

  it("drifts particles horizontally in the wind's direction", () => {
    const emitter = new WeatherEmitter("Test", {
      count: 1,
      center: new Vector3D(0, 100, 0),
      spawnArea: { width: 1000, depth: 1000, height: 1000 },
      fallSpeed: [0, 0],
      wind: new Vector3D(5, 0, 0),
      windGustiness: 0,
    });

    const before = readPosition(emitter, 0);
    emitter.update(1);
    const after = readPosition(emitter, 0);

    expect(after.x - before.x).toBeCloseTo(5, 5);
  });

  it("flags instanceMatrixNeedsUpdate after every update()", () => {
    const emitter = new WeatherEmitter("Test", {
      count: 5,
      spawnArea: { width: 4, depth: 4, height: 4 },
    });
    emitter.mesh.instanceMatrixNeedsUpdate = false;
    emitter.update(0.016);
    expect(emitter.mesh.instanceMatrixNeedsUpdate).toBe(true);
  });
});
