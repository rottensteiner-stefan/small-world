export class StiffStrategy {
    type = "STIFF";
    radius = 20;
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
        camera.target.copyFrom(targetPos);
        camera.position.x =
            camera.target.x + this.radius * Math.sin(camera.theta) * Math.cos(camera.phi);
        camera.position.y = camera.target.y + this.radius * Math.sin(camera.phi);
        camera.position.z =
            camera.target.z + this.radius * Math.cos(camera.theta) * Math.cos(camera.phi);
    }
}
//# sourceMappingURL=StiffStrategy.js.map