/// src/core/cameras/CameraStrategyFactory.ts
import { CameraStrategyType } from "../../enums/index.js";
import { FixedStrategy } from "./strategies/index.js";
import { ManualStrategy } from "./strategies/index.js";
import { HybridSyncStrategy } from "./strategies/index.js";
import { FPSStrategy } from "./strategies/index.js";
import { CameraStrategy } from "../../interfaces/index.js";
import { SmoothStrategy } from "./strategies/index.js";
import { StiffStrategy } from "./strategies/index.js";
import { IsometricStrategy } from "./strategies/index.js";

export class CameraStrategyFactory {
  private static _strategies = new Map<CameraStrategyType, CameraStrategy>([
    [CameraStrategyType.MANUAL, new ManualStrategy()],
    [CameraStrategyType.HYBRID_SYNC, new HybridSyncStrategy()],
    [CameraStrategyType.FPS, new FPSStrategy()],
    [CameraStrategyType.SMOOTH, new SmoothStrategy()],
    [CameraStrategyType.STIFF, new StiffStrategy()],
    [CameraStrategyType.FIXED, new FixedStrategy()],
    [CameraStrategyType.ISOMETRIC, new IsometricStrategy()],
  ]);

  public static get(type: CameraStrategyType): CameraStrategy {
    return this._strategies.get(type) || this._strategies.get(CameraStrategyType.MANUAL)!;
  }
}
