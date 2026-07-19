/// src/core/cameras/CameraStrategyFactory.ts
import { CameraStrategyType } from "../../enums/index.js";
import {
  FixedStrategy,
  ManualStrategy,
  HybridSyncStrategy,
  FPSStrategy,
  SmoothStrategy,
  StiffStrategy,
  IsometricStrategy,
} from "./strategies/index.js";
import { CameraStrategy } from "../../interfaces/index.js";

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
    const strategy = this._strategies.get(type);
    if (!strategy) {
      throw new Error(`Unknown camera strategy type: ${type}`);
    }
    return strategy;
  }
}
