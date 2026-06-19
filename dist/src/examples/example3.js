/// src/examples/example3.ts
import { AmbientLight, CameraStrategyType, Color, DirectionalLight, Grid, Input, Keys, Object3D, ObjLoader, OrbitController, PerspectiveProjection, PhongMaterial, ProjectionType, WireframeMaterial, } from "../index.js";
import { AbstractExample } from "../core/index.js";
class Example3 extends AbstractExample {
    _carModel;
    async setupScene() {
        Input.init();
        this.canvas.addEventListener("click", () => {
            if (!Input.isPointerLocked) {
                Input.requestPointerLock(this.canvas);
            }
        });
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
        this.camera.setStrategy(CameraStrategyType.SMOOTH);
        this.camera.position.set(0, 5, 15);
        this.camera.addBehavior(new OrbitController());
        const ambientLight = new AmbientLight({ color: Color.WHITE, intensity: 0.3 });
        this.scene.add(ambientLight);
        const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
        sun.direction.set(-1, -1, -1);
        this.scene.add(sun);
        const gridObj = new Object3D("Floor");
        gridObj.geometry = new Grid({ size: 20, divisions: 20 }).getGeometryData();
        const gridMat = new WireframeMaterial();
        gridMat.color = Color.DARKSLATEGRAY;
        gridObj.material = gridMat;
        this.scene.add(gridObj);
        const loader = new ObjLoader();
        loader.setBasePath("/resources/models/");
        try {
            this._carModel = await loader.load("vehicle-racer.obj");
            const carScale = 5;
            this._carModel.scale.set(carScale, carScale, carScale);
            this._carModel.position.set(0, 0.0, 0);
            this.scene.add(this._carModel);
        }
        catch (error) {
            console.error("[Example 3] Error loading model:", error);
        }
    }
    _setCarColor(index) {
        if (!this._carModel)
            return;
        // Find the part of the car that uses the colormap material
        // The ObjLoader creates children named after the material groups
        this._carModel.children.forEach((child) => {
            if (child.material instanceof PhongMaterial && child.material.diffuseMap) {
                // Shifting the X offset picks a different color column in colormap.png
                // Usually, these textures have 8 or 16 columns. 0.125 is a good step for Kenney assets.
                child.material.diffuseMap.offset.x = index * 0.125;
            }
        });
    }
    update(_deltaTime) {
        // Handle Color Switching
        if (Input.isPressed(Keys.D1))
            this._setCarColor(0);
        if (Input.isPressed(Keys.D2))
            this._setCarColor(1);
        if (Input.isPressed(Keys.D3))
            this._setCarColor(2);
        if (Input.isPressed(Keys.D4))
            this._setCarColor(3);
        if (Input.isPressed(Keys.D5))
            this._setCarColor(4);
    }
}
const app = new Example3();
app.start();
//# sourceMappingURL=example3.js.map