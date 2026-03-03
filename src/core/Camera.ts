import { Matrix4 } from '../math/Matrix4.js';

export enum CameraStrategy {
    FIXED = 0,
    STIFF = 1,
    SMOOTH = 2
}

export class Camera {
    public position: [number, number, number] = [0, 10, 20];
    public target: [number, number, number] = [0, 0, 0];
    public up: [number, number, number] = [0, 1, 0];
    public strategy: CameraStrategy = CameraStrategy.SMOOTH;

    public theta = 0;
    public phi = 0.6;
    public radius = 20;
    public lerpFactor = 0.1;

    constructor(public projection: any) {}

    public update(playerPos: [number, number, number], dx: number, dy: number) {
        // Orbit-Input verarbeiten
        if (dx !== 0 || dy !== 0) {
            this.theta -= dx * 0.01;
            this.phi += dy * 0.01;
            const limit = Math.PI/2 - 0.01;
            if(this.phi > limit) this.phi = limit;
            if(this.phi < -limit) this.phi = -limit;
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
        } else if (this.strategy === CameraStrategy.SMOOTH) {
            this.position[0] += (idealX - this.position[0]) * this.lerpFactor;
            this.position[1] += (idealY - this.position[1]) * this.lerpFactor;
            this.position[2] += (idealZ - this.position[2]) * this.lerpFactor;
        }
    }

    public getViewProjection(v: Matrix4, out: Matrix4) {
        Matrix4.multiply(this.projection.getMatrix(), v, out);
    }
}
