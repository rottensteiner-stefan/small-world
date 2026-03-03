import { Matrix4 } from '../math/Matrix4.js';
export class Camera {
    projection;
    position = [0, 8, 20];
    target = [0, 0, 0];
    up = [0, 1, 0];
    theta = 0;
    phi = 0.6;
    radius = 20;
    constructor(projection) {
        this.projection = projection;
    }
    updateOrbit(dx, dy) {
        this.theta -= dx * 0.01;
        this.phi += dy * 0.01;
        const limit = Math.PI / 2 - 0.01;
        if (this.phi > limit)
            this.phi = limit;
        if (this.phi < -limit)
            this.phi = -limit;
        this.position[0] = this.target[0] + this.radius * Math.sin(this.theta) * Math.cos(this.phi);
        this.position[1] = this.target[1] + this.radius * Math.sin(this.phi);
        this.position[2] = this.target[2] + this.radius * Math.cos(this.theta) * Math.cos(this.phi);
    }
    getViewProjection(v, out) { Matrix4.multiply(this.projection.getMatrix(), v, out); }
}
//# sourceMappingURL=Camera.js.map