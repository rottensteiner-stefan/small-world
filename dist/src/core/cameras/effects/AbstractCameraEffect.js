/// src/core/cameras/effects/AbstractCameraEffect.ts
import { Vector3D } from "../../../math/index.js";
/**
 * Base class for camera effects.
 */
export class AbstractCameraEffect {
    /** @inheritdoc */
    isFinished = false;
    /** @inheritdoc */
    offset = new Vector3D();
    /** @inheritdoc */
    targetOffset = new Vector3D();
}
//# sourceMappingURL=AbstractCameraEffect.js.map