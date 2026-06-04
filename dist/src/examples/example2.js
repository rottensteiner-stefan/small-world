/// src/examples/example2.ts
import { CameraStrategyType, Color, Cube, DirectionalLight, FPSController, ZoomController, Input, MathUtils, Object3D, PerspectiveProjection, PhongMaterial, Plane, ProjectionType, WireframeMaterial, AmbientLight, } from "../index.js";
import { AbstractExample } from "../core/index.js";
/**
 * Example 2: Interactive camera (FPS-style) and keyboard input.
 * Shows how to move the camera with mouse and keyboard.
 */
export class Example2 extends AbstractExample {
    _moveSpeed = 10.0;
    /** @inheritdoc */
    async setupScene() {
        // 1. Initialize input (Keyboard & Mouse)
        Input.init();
        Input.debug = true;
        // Attach event listener directly to the canvas to activate PointerLock (mouse capture)
        this.canvas.addEventListener("click", () => {
            if (!Input.isPointerLocked) {
                Input.requestPointerLock(this.canvas);
            }
        });
        // 2. Configure the camera (FPS mode)
        if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
            const aspect = window.innerWidth / window.innerHeight;
            this.camera.projection = new PerspectiveProjection({
                fov: MathUtils.degToRad(75),
                aspect,
                near: 0.1,
                far: 1000,
            });
            this.camera.updateProjectionMatrix();
        }
        // We switch to the First-Person strategy
        this.camera.setStrategy(CameraStrategyType.FPS);
        this.camera.position.set(0, 2, 0); // Start position
        this.controllers.push(new FPSController(this.camera, {
            moveSpeed: this._moveSpeed,
        }), new ZoomController(this.camera));
        // 3. Add light
        const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
        sun.direction.set(-1, -1, -1).normalize();
        this.scene.add(sun);
        this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.2 }));
        // 4. Create a large floor (Plane)
        const floor = new Object3D("Floor");
        floor.geometry = new Plane({
            width: 50,
            depth: 50,
            widthSegments: 10,
            depthSegments: 10,
        }).getGeometryData();
        // We use a wireframe material so that the movement is better perceived
        const floorMat = new WireframeMaterial();
        floorMat.color = Color.DARKSLATEGRAY;
        floor.material = floorMat;
        this.scene.add(floor);
        // 5. Distribute some obstacles (cubes) with random colors
        for (let i = 0; 20 > i; i++) {
            const box = new Object3D(`Box_${i}`);
            box.geometry = new Cube({ size: Math.random() * 2 + 1 }).getGeometryData();
            // Use the newly implemented HSL method to generate vibrant, random colors
            box.material = new PhongMaterial({
                color: Color.fromHSL(Math.random() * 360, 0.8, 0.5),
                shininess: 30,
            });
            // Random position on the floor
            const px = (Math.random() - 0.5) * 40;
            const pz = (Math.random() - 0.5) * 40;
            box.position.set(px, 1, pz);
            // Random rotation
            box.rotation.y = Math.random() * MathUtils.PI;
            this.scene.add(box);
        }
    }
    onCanvasRecreated() {
        // Since we recreated the canvas, we must reattach the click listener!
        this.canvas.addEventListener("click", () => {
            if (!Input.isPointerLocked) {
                Input.requestPointerLock(this.canvas);
            }
        });
    }
    /** @inheritdoc */
    update(_deltaTime) {
        // Movement and looking is now handled by the FPSController registered in setupScene.
    }
    /** @inheritdoc */
    getDebugInfo() {
        const base = super.getDebugInfo();
        return {
            ...base,
            Example: "02 - FPS Camera",
        };
    }
}
// === START THE ENGINE ===
const app = new Example2();
app
    .start()
    .then(() => {
    console.log("Engine running");
})
    .catch((err) => {
    console.error("Error while starting the engine: ", err);
});
//# sourceMappingURL=example2.js.map