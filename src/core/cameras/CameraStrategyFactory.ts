import { ICameraStrategy } from "../../interfaces/ICameraStrategy.js";
import { CameraStrategyType } from "../../enums/CameraStrategyType.js";
import { FPSStrategy } from "./strategies/FPSStrategy.js";
import { SmoothStrategy } from "./strategies/SmoothStrategy.js";
import { StiffStrategy } from "./strategies/StiffStrategy.js";
import { FixedStrategy } from "./strategies/FixedStrategy.js";

export class CameraStrategyFactory {
  // Wir cachen die Instanzen, damit wir nicht bei jedem Wechsel ein neues 'new' Keyword bemühen müssen.
  private static strategies = new Map<CameraStrategyType, ICameraStrategy>([
    [CameraStrategyType.FPS, new FPSStrategy()],
    [CameraStrategyType.SMOOTH, new SmoothStrategy()],
    [CameraStrategyType.STIFF, new StiffStrategy()],
    [CameraStrategyType.FIXED, new FixedStrategy()],
  ]);

  public static get(type: CameraStrategyType): ICameraStrategy {
    return this.strategies.get(type) || this.strategies.get(CameraStrategyType.SMOOTH)!;
  }
}
