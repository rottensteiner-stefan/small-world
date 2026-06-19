/// src/examples/example1.ts
import { CameraStrategyType, Color, Cube, DirectionalLight, Object3D, PerspectiveProjection, PhongMaterial, ProjectionType, AmbientLight, Plane, } from "../index.js";
import { AbstractExample } from "../core/index.js";
class Example1 extends AbstractExample {
    _myCube;
    async setupScene() {
        if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
            const aspect = window.innerWidth / window.innerHeight;
            this.camera.projection = new PerspectiveProjection({
                fov: (75 * Math.PI) / 180,
                aspect,
                near: 0.1,
                far: 1000,
            });
            this.camera.updateProjectionMatrix();
        }
        // 1. Light: A gentle sun
        const sun = new DirectionalLight({ color: Color.WHITE, intensity: 1.0 });
        sun.direction.set(-1, -1, -1);
        sun.castShadow = true;
        sun.shadowBias = 0.005;
        this.scene.add(sun);
        this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.2 }));
        // 2. Object: A single cube with blue material
        this._myCube = new Object3D("RotatingCube").setPosition(0, 0, 0).setScale(1);
        this._myCube.geometry = new Cube({ size: 2 }).getGeometryData();
        this._myCube.material = new PhongMaterial({
            color: Color.DODGERBLUE,
            shininess: 60,
        });
        this._myCube.castShadow = true;
        this._myCube.receiveShadow = true;
        this.scene.add(this._myCube);
        // Floor to receive shadows
        const floor = new Object3D("Floor").setPosition(0, -2, -1);
        floor.geometry = new Plane({ width: 10, depth: 6 }).getGeometryData();
        floor.material = new PhongMaterial({ color: Color.WHITE });
        floor.receiveShadow = true;
        this.scene.add(floor);
        // 3. Position camera rigidly
        this.camera.setStrategy(CameraStrategyType.FIXED);
        this.camera.position.set(0, 3, 6);
        this.camera.target.set(0, 0, 0);
        this.camera.updateViewMatrix();
    }
    update(deltaTime) {
        // Rotate the cube around all axes every frame
        this._myCube.rotation.x += deltaTime;
        this._myCube.rotation.y += 1.5 * deltaTime;
        this.scene.update();
    }
}
// === START THE ENGINE ===
const app = new Example1();
app
    .start()
    .then(() => {
    console.log("Engine running");
})
    .catch((err) => {
    console.error("Error while starting the engine: ", err);
});
//# sourceMappingURL=example1.js.map