/// src/core/cameras/CameraStrategyFactory.ts
import { CameraStrategyType } from "../../enums/index.js";
import { FixedStrategy } from "./strategies/FixedStrategy.js";
import { FPSStrategy } from "./strategies/FPSStrategy.js";
import { CameraStrategy } from "../../interfaces/index.js";
import { SmoothStrategy } from "./strategies/SmoothStrategy.js";
import { StiffStrategy } from "./strategies/StiffStrategy.js";
import { IsometricStrategy } from "./strategies/IsometricStrategy.js";
export class CameraStrategyFactory {
  private static _strategies = new Map<CameraStrategyType, CameraStrategy>([
    [CameraStrategyType.FPS, new FPSStrategy()],
    [CameraStrategyType.SMOOTH, new SmoothStrategy()],
    [CameraStrategyType.STIFF, new StiffStrategy()],
    [CameraStrategyType.FIXED, new FixedStrategy()],
    [CameraStrategyType.ISOMETRIC, new IsometricStrategy()],
  ]);

  public static get(type: CameraStrategyType): CameraStrategy {
    return this._strategies.get(type) || this._strategies.get(CameraStrategyType.SMOOTH)!;
  }
}
