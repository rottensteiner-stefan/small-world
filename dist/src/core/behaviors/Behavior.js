/// src/core/behaviors/Behavior.ts
import { MathUtils } from "../../math/MathUtils.js";
/**
 * Base class for all behaviors attached to an Object3D.
 */
export class Behavior {
    static inspector;
    uuid = MathUtils.generateUUID();
    isActive = true;
    /** The object this behavior is attached to. Set automatically. */
    target = undefined;
    /**
     * Called when the behavior is attached to an object.
     */
    onAttach(target) {
        this.target = target;
    }
    /**
     * Called when the behavior is detached from an object.
     */
    onDetach() {
        this.target = undefined;
    }
}
//# sourceMappingURL=Behavior.js.map