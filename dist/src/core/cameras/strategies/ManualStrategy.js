/// src/core/cameras/strategies/ManualStrategy.ts
import { CameraStrategyType } from "../../../enums/index.js";
/**
 * A camera strategy where the developer has full manual control.
 * The engine performs no automatic position or target updates.
 */
export class ManualStrategy {
    /** @inheritdoc */
    type = CameraStrategyType.MANUAL;
    /** @inheritdoc */
    constraints;
    /** @inheritdoc */
    update(_camera, _targetPos, _dx, _dy) {
        // Does nothing - Authority is with the developer
    }
}
//# sourceMappingURL=ManualStrategy.js.map