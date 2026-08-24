import { Object3D } from "../Object3D.js";
import { Skeleton } from "./Skeleton.js";
import { Matrix4 } from "../../math/Matrix4.js";

/**
 * A mesh that is deformed by a skeletal hierarchy via GPU skinning.
 */
export class SkinnedMesh extends Object3D {
  /** The skeleton associated with this skinned mesh. */
  public skeleton?: Skeleton;
  /** The initial bind matrix of the mesh. */
  public bindMatrix: Matrix4 = new Matrix4();

  constructor(name?: string) {
    super(name);
  }

  /**
   * Binds a skeleton to this mesh.
   */
  public bind(skeleton: Skeleton, bindMatrix?: Matrix4): void {
    this.skeleton = skeleton;
    if (bindMatrix) {
      this.bindMatrix.data.set(bindMatrix.data);
    }
  }

  /**
   * Updates the world matrix and the skeleton's bone matrices.
   */
  public override updateMatrixWorld(): void {
    super.updateMatrixWorld();

    if (this.skeleton) {
      this.skeleton.update(this.worldMatrix);
    }
  }
}
