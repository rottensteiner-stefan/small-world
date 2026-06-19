/// src/core/behaviors/ProximitySensorBehavior.ts
import { Behavior } from "./Behavior.js";
import { Object3D } from "../Object3D.js";
import { Vector3D } from "../../math/Vector3D.js";
/**
 * A behavior that acts as a proximity sensor.
 * It measures the distance between the object it is attached to and a target object,
 * and calls the `onUpdate` callback with a normalized factor between 0.0 (far away) and 1.0 (close).
 */
export class ProximitySensorBehavior extends Behavior {
    options;
    _myPosition = new Vector3D();
    _targetPosition = new Vector3D();
    /**
     * Creates a new ProximitySensorBehavior.
     * @param options Configuration options.
     */
    constructor(options) {
        super();
        this.options = {
            targetObj: options.targetObj,
            radius: options.radius,
            minDistance: Math.max(0, options.minDistance ?? 0.0),
            onUpdate: options.onUpdate,
        };
    }
    /**
     * Helper to safely extract the world position of an Object3D or Camera.
     */
    _getWorldPosition(obj, out) {
        if (obj instanceof Object3D) {
            out.set(obj.worldMatrix.data[12], obj.worldMatrix.data[13], obj.worldMatrix.data[14]);
        }
        else {
            out.copyFrom(obj.position);
        }
    }
    update(deltaTime) {
        if (!this.target || !this.options.targetObj)
            return;
        // Get the world position of the object this behavior is attached to
        this._getWorldPosition(this.target, this._myPosition);
        // Get the world position of the target we are sensing
        this._getWorldPosition(this.options.targetObj, this._targetPosition);
        // Calculate distance
        const distance = this._myPosition.distanceTo(this._targetPosition);
        let factor;
        // Calculate normalized factor based on distance
        if (distance <= this.options.minDistance) {
            factor = 1.0;
        }
        else if (distance >= this.options.radius) {
            factor = 0.0;
        }
        else {
            // Map distance between minDistance and radius to 1.0 -> 0.0
            const range = this.options.radius - this.options.minDistance;
            const current = distance - this.options.minDistance;
            factor = 1.0 - current / range;
        }
        // Pass the calculated values back to the user
        this.options.onUpdate(factor, distance, deltaTime);
    }
}
//# sourceMappingURL=ProximitySensorBehavior.js.map