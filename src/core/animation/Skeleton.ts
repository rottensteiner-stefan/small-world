import { Bone } from "./Bone.js";
import { Matrix4 } from "../../math/Matrix4.js";
import { MathPool } from "../../math/MathPool.js";

/**
 * Upper bound on bones per skeleton, matching `u_boneMatrices[64]` in
 * `base_vertex_header.vert.glsl`. Bones beyond this index are dropped from the GPU upload
 * (see `WebGL2Renderer`) rather than corrupting whatever uniform happens to follow the array.
 */
export const MAX_SKINNED_BONES = 64;

/**
 * Manages an array of bones, computing skinning matrices for the GPU.
 */
export class Skeleton {
  /** The ordered list of bones belonging to this skeleton. */
  public bones: Bone[];
  /** Flattened array containing the 16-element transform matrix for each bone. */
  public boneMatrices: Float32Array;
  /** Inverse bind matrices for each bone. */
  public boneInverses: Matrix4[];

  private _identityMatrix: Matrix4 = new Matrix4();

  constructor(bones: Bone[] = [], boneInverses?: Matrix4[]) {
    if (bones.length > MAX_SKINNED_BONES) {
      console.warn(
        `[Skeleton] ${bones.length} bones exceeds the ${MAX_SKINNED_BONES}-bone GPU skinning limit; ` +
          `bones from index ${MAX_SKINNED_BONES} onward will not deform this mesh.`,
      );
    }

    this.bones = [...bones];
    this.boneInverses = boneInverses ? [...boneInverses] : [];

    // Ensure we have inverse bind matrices for all bones
    if (this.boneInverses.length === 0) {
      for (let i = 0; i < this.bones.length; i++) {
        this.boneInverses.push(this.bones[i]?.inverseBindMatrix ?? new Matrix4());
      }
    }

    this.boneMatrices = new Float32Array(Math.max(1, this.bones.length) * 16);
  }

  /**
   * Computes the final bone transformation matrices relative to the skinned mesh's world matrix.
   * @param meshWorldMatrix The world matrix of the SkinnedMesh.
   */
  public update(meshWorldMatrix?: Matrix4): void {
    const invMeshWorld = MathPool.acquireMatrix();
    if (meshWorldMatrix) {
      invMeshWorld.data.set(meshWorldMatrix.data);
      invMeshWorld.invert();
    } else {
      invMeshWorld.data.set(this._identityMatrix.data);
    }

    const tempMat = MathPool.acquireMatrix();
    const finalMat = MathPool.acquireMatrix();

    for (let i = 0; i < this.bones.length; i++) {
      const bone = this.bones[i];
      if (!bone) continue;

      const invBind = this.boneInverses[i] ?? bone.inverseBindMatrix;

      // bone.worldMatrix * invBind
      Matrix4.multiply(bone.worldMatrix, invBind, tempMat);

      // invMeshWorld * (bone.worldMatrix * invBind)
      if (meshWorldMatrix) {
        Matrix4.multiply(invMeshWorld, tempMat, finalMat);
        this.boneMatrices.set(finalMat.data, i * 16);
      } else {
        this.boneMatrices.set(tempMat.data, i * 16);
      }
    }

    MathPool.releaseMatrix(tempMat);
    MathPool.releaseMatrix(finalMat);
    MathPool.releaseMatrix(invMeshWorld);
  }

  /**
   * Finds a bone by its name.
   */
  public getBoneByName(name: string): Bone | undefined {
    for (let i = 0; i < this.bones.length; i++) {
      if (this.bones[i]?.name === name) {
        return this.bones[i];
      }
    }
    return undefined;
  }
}
