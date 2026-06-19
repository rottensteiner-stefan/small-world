/// src/examples/example7.ts
import { AmbientLight, CameraStrategyType, Color, Cube, CubeTexture, DirectionalLight, FPSController, ZoomController, Input, MathUtils, Object3D, PerspectiveProjection, PhongMaterial, SkyboxMaterial, } from "../index.js";
import { AbstractExample } from "../core/index.js";
/**
 * Example 7: Skybox & FPS Controls.
 * This example demonstrates a pure skybox environment without a physical floor.
 */
export class Example7 extends AbstractExample {
    _moveSpeed = 15.0;
    _eyeHeight = 2.0;
    onCanvasRecreated() {
        super.onCanvasRecreated();
        this.canvas.addEventListener("click", () => {
            if (!Input.isPointerLocked) {
                Input.requestPointerLock(this.canvas);
            }
        });
    }
    async setupScene() {
        this.onCanvasRecreated();
        // 1. Camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera.projection = new PerspectiveProjection({
            fov: MathUtils.degToRad(75),
            aspect,
            near: 0.1,
            far: 2000,
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
        // 3. Skybox (Contains the floor texture in the bottom part of the cube map)
        const skyTexture = new CubeTexture();
        await skyTexture.loadFrom("/resources/examples/13/skybox.png");
        const skybox = new Object3D("Skybox");
        skybox.geometry = new Cube({ size: 1000 }).getGeometryData();
        skybox.material = new SkyboxMaterial({ cubeMap: skyTexture });
        skybox.frustumCulled = false;
        this.scene.add(skybox);
        // 4. Orientierungspunkte (Illusion Breaker)
        const referenceCube = new Object3D("ReferenceCube");
        referenceCube.geometry = new Cube({ size: 2 }).getGeometryData();
        referenceCube.material = new PhongMaterial({ color: Color.BLUE, shininess: 50 });
        referenceCube.position.set(0, 1, -10);
        this.scene.add(referenceCube);
        const redCube = new Object3D("RedCube");
        redCube.geometry = new Cube({ size: 2 }).getGeometryData();
        redCube.material = new PhongMaterial({ color: Color.RED, shininess: 50 });
        redCube.position.set(10, 1, 0);
        this.scene.add(redCube);
    }
    update(_deltaTime) {
        // Keep camera above "virtual" floor
        this.camera.position.y = Math.max(this._eyeHeight, this.camera.position.y);
        // Skybox follows camera
        const skybox = this.scene.objects.find((o) => o.name === "Skybox");
        if (skybox) {
            skybox.position.copyFrom(this.camera.position);
        }
    }
}
const app = new Example7();
app.start();
//# sourceMappingURL=example7.js.map