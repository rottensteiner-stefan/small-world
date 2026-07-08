/// src/core/InstancedMesh.ts
import { Object3D } from "./Object3D.js";
import { Matrix4 } from "../math/index.js";
import { GeometryDataInterface } from "../interfaces/index.js";
import { AbstractMaterial } from "./materials/index.js";

/**
 * A class for rendering multiple instances of a mesh with different transforms.
 */
export class InstancedMesh extends Object3D {
  public readonly isInstancedMesh: boolean = true;
  public instanceCount: number;
  public instanceMatrices: Float32Array;
  public instanceMatrixNeedsUpdate: boolean = true;

  constructor(
    name: string,
    geometry: GeometryDataInterface,
    material: AbstractMaterial,
    count: number,
  ) {
    super(name);
    this.geometry = geometry;
    this.material = material;
    this.instanceCount = count;
    this.instanceMatrices = new Float32Array(count * 16);

    const identityMatrix = new Matrix4();
    for (let i = 0; i < count; i++) {
      this.setMatrixAt(i, identityMatrix);
    }
  }

  public setMatrixAt(index: number, matrix: Matrix4): void {
    const offset = index * 16;
    this.instanceMatrices.set(matrix.data, offset);
    this.instanceMatrixNeedsUpdate = true;
  }

  public getMatrixAt(index: number, out: Matrix4): void {
    const offset = index * 16;
    out.data.set(this.instanceMatrices.subarray(offset, offset + 16));
  }
}
