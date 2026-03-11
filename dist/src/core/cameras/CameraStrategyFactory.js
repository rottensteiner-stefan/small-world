import { CameraStrategyType } from "../../enums/CameraStrategyType.js";
import { FPSStrategy } from "./strategies/FPSStrategy.js";
import { SmoothStrategy } from "./strategies/SmoothStrategy.js";
import { StiffStrategy } from "./strategies/StiffStrategy.js";
import { FixedStrategy } from "./strategies/FixedStrategy.js";
export class CameraStrategyFactory {
    // Wir cachen die Instanzen, damit wir nicht bei jedem Wechsel ein neues 'new' Keyword bemühen müssen.
    static strategies = new Map([
        [CameraStrategyType.FPS, new FPSStrategy()],
        [CameraStrategyType.SMOOTH, new SmoothStrategy()],
        [CameraStrategyType.STIFF, new StiffStrategy()],
        [CameraStrategyType.FIXED, new FixedStrategy()],
    ]);
    static get(type) {
        return this.strategies.get(type) || this.strategies.get(CameraStrategyType.SMOOTH);
    }
}
//# sourceMappingURL=CameraStrategyFactory.js.map