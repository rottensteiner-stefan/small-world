import { Object3D } from "../Object3D.js";
import { Matrix4 } from "../../math/Matrix4.js";

/**
 * Represents a single bone in a skeletal hierarchy.
 */
export class Bone extends Object3D {
  /** Inverse bind matrix used to transform vertices from mesh space to bone space. */
  public inverseBindMatrix: Matrix4 = new Matrix4();

  constructor(name?: string) {
    super(name);
  }

  /**
   * Updates local and world transformation matrices.
   * If a quaternion is provided, it is used for orientation instead of Euler angles.
   */
  public override updateMatrixWorld(): void {
    if (this.quaternion) {
      this.localMatrix.composeFromQuaternion(this.position, this.quaternion, this.scale);
    } else {
      this.localMatrix.compose(this.position, this.rotation, this.scale);
    }

    if (undefined === this.parent) {
      this.worldMatrix.data.set(this.localMatrix.data);
    } else {
      Matrix4.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix);
    }

    for (let i = 0; i < this.children.length; i++) {
      this.children[i]!.updateMatrixWorld();
    }
  }
}
