import { Matrix4 } from "../math/Matrix4.js";
export var CameraStrategy;
(function (CameraStrategy) {
    CameraStrategy[CameraStrategy["FIXED"] = 0] = "FIXED";
    CameraStrategy[CameraStrategy["STIFF"] = 1] = "STIFF";
    CameraStrategy[CameraStrategy["SMOOTH"] = 2] = "SMOOTH";
})(CameraStrategy || (CameraStrategy = {}));
export class Camera {
    projection;
    position = [0, 10, 20];
    target = [0, 0, 0];
    up = [0, 1, 0];
    strategy = CameraStrategy.SMOOTH;
    theta = 0;
    phi = 0.6;
    radius = 20;
    lerpFactor = 0.1;
    constructor(projection) {
        this.projection = projection;
    }
    update(playerPos, dx, dy) {
        // Orbit-Input verarbeiten
        if (dx !== 0 || dy !== 0) {
            this.theta -= dx * 0.01;
            this.phi += dy * 0.01;
            const limit = Math.PI / 2 - 0.01;
            if (this.phi > limit)
                this.phi = limit;
            if (this.phi < -limit)
                this.phi = -limit;
        }
        // Target an Spieler binden (außer bei FIXED)
        if (this.strategy !== CameraStrategy.FIXED) {
            this.target[0] = playerPos[0];
            this.target[1] = playerPos[1];
            this.target[2] = playerPos[2];
        }
        // Gewünschte Ideal-Position berechnen
        const idealX = this.target[0] + this.radius * Math.sin(this.theta) * Math.cos(this.phi);
        const idealY = this.target[1] + this.radius * Math.sin(this.phi);
        const idealZ = this.target[2] + this.radius * Math.cos(this.theta) * Math.cos(this.phi);
        // Strategie anwenden
        if (this.strategy === CameraStrategy.STIFF) {
            this.position[0] = idealX;
            this.position[1] = idealY;
            this.position[2] = idealZ;
        }
        else if (this.strategy === CameraStrategy.SMOOTH) {
            this.position[0] += (idealX - this.position[0]) * this.lerpFactor;
            this.position[1] += (idealY - this.position[1]) * this.lerpFactor;
            this.position[2] += (idealZ - this.position[2]) * this.lerpFactor;
        }
    }
    getViewProjection(v, out) {
        Matrix4.multiply(this.projection.getMatrix(), v, out);
    }
}
//# sourceMappingURL=Camera.js.map