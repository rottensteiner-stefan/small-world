import { Matrix4 } from '../math/Matrix4.js';
export class Camera {
    public position: [number, number, number] = [0, 8, 20];
    public target: [number, number, number] = [0, 0, 0];
    public up: [number, number, number] = [0, 1, 0];
    public theta = 0; public phi = 0.6; public radius = 20;
    constructor(public projection: any) {}
    public updateOrbit(dx: number, dy: number) {
        this.theta -= dx * 0.01; this.phi += dy * 0.01;
        const limit = Math.PI/2 - 0.01; if(this.phi > limit) this.phi = limit; if(this.phi < -limit) this.phi = -limit;
        this.position[0] = this.target[0] + this.radius * Math.sin(this.theta) * Math.cos(this.phi);
        this.position[1] = this.target[1] + this.radius * Math.sin(this.phi);
        this.position[2] = this.target[2] + this.radius * Math.cos(this.theta) * Math.cos(this.phi);
    }
    public getViewProjection(v: Matrix4, out: Matrix4) { Matrix4.multiply(this.projection.getMatrix(), v, out); }
}
