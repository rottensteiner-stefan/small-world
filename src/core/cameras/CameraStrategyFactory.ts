/// src/core/cameras/CameraStrategyFactory.ts
import { CameraStrategyType } from "../../enums/CameraStrategyType.js";
import { FixedStrategy } from "./strategies/FixedStrategy.js";
import { FPSStrategy } from "./strategies/FPSStrategy.js";
import { CameraStrategyInterface } from "../../interfaces/CameraStrategyInterface.js";
import { SmoothStrategy } from "./strategies/SmoothStrategy.js";
import { StiffStrategy } from "./strategies/StiffStrategy.js";
export class CameraStrategyFactory {
  private static strategies = new Map<CameraStrategyType, CameraStrategyInterface>([
    [CameraStrategyType.FPS, new FPSStrategy()],
    [CameraStrategyType.SMOOTH, new SmoothStrategy()],
    [CameraStrategyType.STIFF, new StiffStrategy()],
    [CameraStrategyType.FIXED, new FixedStrategy()],
  ]);

  public static get(type: CameraStrategyType): CameraStrategyInterface {
    return this.strategies.get(type) || this.strategies.get(CameraStrategyType.SMOOTH)!;
  }
}
