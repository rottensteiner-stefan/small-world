import { CameraStrategyType } from "../../../enums/CameraStrategyType.js";
export class SmoothStrategy {
    type = CameraStrategyType.SMOOTH;
    radius = 20;
    lerpFactor = 0.1;
    update(camera, targetPos, dx, dy) {
        if (dx !== 0 || dy !== 0) {
            camera.theta -= dx * 0.005;
            camera.phi += dy * 0.005;
            const limit = Math.PI / 2 - 0.01;
            if (camera.phi > limit)
                camera.phi = limit;
            if (camera.phi < -limit)
                camera.phi = -limit;
        }
        // LÖSUNG: Wir 'lerpen' das Ziel (den Fokuspunkt) anstatt der Kameraposition!
        camera.target.x += (targetPos.x - camera.target.x) * this.lerpFactor;
        camera.target.y += (targetPos.y - camera.target.y) * this.lerpFactor;
        camera.target.z += (targetPos.z - camera.target.z) * this.lerpFactor;
        // Die Kameraposition klebt nun immer exakt am Radius zum (weichen) Target
        camera.position.x = camera.target.x + this.radius * Math.sin(camera.theta) * Math.cos(camera.phi);
        camera.position.y = camera.target.y + this.radius * Math.sin(camera.phi);
        camera.position.z = camera.target.z + this.radius * Math.cos(camera.theta) * Math.cos(camera.phi);
    }
}
//# sourceMappingURL=SmoothStrategy.js.map