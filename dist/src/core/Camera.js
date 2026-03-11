import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";
import { CameraStrategyType } from "../enums/CameraStrategyType.js";
import { CameraStrategyFactory } from "./cameras/CameraStrategyFactory.js";
export class Camera {
    projection;
    position = new Vector3D(0, 10, 20);
    target = new Vector3D(0, 0, 0);
    up = new Vector3D(0, 1, 0);
    // Geteilte Winkel für alle Strategien, damit der Blickwinkel erhalten bleibt
    theta = 0;
    phi = 0.6;
    strategy;
    constructor(projection) {
        this.projection = projection;
        this.setStrategy(CameraStrategyType.SMOOTH);
    }
    setStrategy(type) {
        this.strategy = CameraStrategyFactory.get(type);
    }
    get activeStrategyType() {
        return this.strategy.type;
    }
    update(targetPos, dx, dy) {
        this.strategy.update(this, targetPos, dx, dy);
    }
    getViewProjection(v, out) {
        Matrix4.multiply(this.projection.getMatrix(), v, out);
    }
}
//# sourceMappingURL=Camera.js.map