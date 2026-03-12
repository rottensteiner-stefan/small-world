import { CameraStrategyType } from "../../../enums/CameraStrategyType.js";
export class FixedStrategy {
    type = CameraStrategyType.FIXED;
    update(camera, targetPos, dx, dy) {
        // Die Kamera bewegt sich nicht, sie schaut nur dem Spieler hinterher.
        camera.target.copyFrom(targetPos);
    }
}
//# sourceMappingURL=FixedStrategy.js.map