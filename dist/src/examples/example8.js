/// src/examples/example8.ts
import { AmbientLight, CameraStrategyType, Color, Cube, DirectionalLight, FPSController, ZoomController, MathUtils, Object3D, PerspectiveProjection, PhongMaterial, Skydome, Texture, } from "../index.js";
import { AbstractExample } from "../core/index.js";
/**
 * Example 8: Clean rebuild with Skydome, Reference Cubes, WASD/QE movement.
 */
export class Example8 extends AbstractExample {
    _moveSpeed = 15.0;
    _eyeHeight = 2.0;
    _skydome = undefined;
    _time = 0;
    async setupScene() {
        this.onCanvasRecreated();
        // 1. Camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera.projection = new PerspectiveProjection({
            fov: MathUtils.degToRad(75),
            aspect,
            near: 0.1,
            far: 2000, // Make sure far plane is large enough for the skydome
        });
        this.camera.updateProjectionMatrix();
        this.camera.setStrategy(CameraStrategyType.FPS);
        this.camera.position.set(0, this._eyeHeight, 0);
        this.camera.addBehavior(new FPSController({
            moveSpeed: this._moveSpeed,
        }));
        this.camera.addBehavior(new ZoomController());
        // 2. Lighting
        this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.5 }));
        const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
        sun.direction.set(-1, -1, -1).normalize();
        this.scene.add(sun);
        // 3. Skydome
        const skyTexture = await Texture.fromUrl("/resources/examples/8/skydome-1.jpg");
        const skydome = new Skydome({
            texture: skyTexture,
            radius: 1000, // Large enough to cover the visible space without clipping
            widthSegments: 64,
            heightSegments: 64,
        });
        this.scene.add(skydome);
        this._skydome = skydome;
        // 5. Reference points (Illusion Breaker)
        const referenceCube = new Object3D("ReferenceCube");
        referenceCube.geometry = new Cube({ size: 2 }).getGeometryData();
        referenceCube.material = new PhongMaterial({ color: Color.BLUE, shininess: 50 });
        referenceCube.position.set(0, 1, -10); // Exactly in front of our starting position
        this.scene.add(referenceCube);
        const redCube = new Object3D("RedCube");
        redCube.geometry = new Cube({ size: 2 }).getGeometryData();
        redCube.material = new PhongMaterial({ color: Color.RED, shininess: 50 });
        redCube.position.set(10, 1, 0); // To our right
        this.scene.add(redCube);
    }
    update(deltaTime) {
        this._time += deltaTime;
        // The FPSController handles Mouse Look, WASD movement and Zoom.
        // 4. Collision / Floor Clamp
        this.camera.position.y = Math.max(this._eyeHeight, this.camera.position.y);
        // 5. Update Skydome & Floor Position
        // The skydome must always be exactly on the camera.
        if (undefined !== this._skydome) {
            this._skydome.position.copyFrom(this.camera.position);
        }
    }
}
const app = new Example8();
app
    .start()
    .then(() => {
    console.log("Example 8 running");
})
    .catch((err) => {
    console.error("Error starting engine:", err);
});
//# sourceMappingURL=example8.js.map