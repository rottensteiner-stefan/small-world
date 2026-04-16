/// examples/example1.ts

import {
    Color,
    Cube,
    DirectionalLight,
    Object3D,
    PerspectiveProjection,
    PhongMaterial,
    ProjectionType,
} from "../src/index.js";
import {AbstractExample} from "../src/core/example/AbstractExample.js";

class Example1 extends AbstractExample {
    private _myCube!: Object3D;

    protected override async setupScene(): Promise<void> {
        if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
            const aspect: number = window.innerWidth / window.innerHeight;
            this.camera.projection = new PerspectiveProjection({
                fov: (75 * Math.PI) / 180,
                aspect,
                near: 0.1,
                far: 1000,
            });
            this.camera.updateProjectionMatrix();
        }

        // 1. Light: A gentle sun
        const sun: DirectionalLight = new DirectionalLight({color: Color.WHITE, intensity: 0.8});
        sun.direction.set(-1, -1, -1);

        // 2. Object: A single cube with blue material
        this._myCube = new Object3D("RotatingCube").setPosition(0, 0, 0).setScale(1);

        this._myCube.geometry = new Cube({size: 2}).getGeometryData();
        this._myCube.material = new PhongMaterial({
            color: Color.DODGERBLUE,
            shininess: 60,
        });

        this.scene.add(sun, this._myCube);

        // 3. Position camera rigidly
        this.camera.position.set(0, 3, 6);
    }

    protected override update(deltaTime: number): void {
        // Rotate the cube around all axes every frame
        this._myCube.rotation.x += 1.0 * deltaTime;
        this._myCube.rotation.y += 1.5 * deltaTime;

        // We have completely removed the call to this.scene.update() here!
    }
}

// === START THE ENGINE ===
const app: Example1 = new Example1();
app
    .start()
    .then((): void => {
        console.log("Engine running");
    })
    .catch((err: Error): void => {
        console.error("Error while starting the engine: ", err);
    });
