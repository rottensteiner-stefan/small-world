/// src/examples/example4.ts
import { AmbientLight, BoundingBox, CameraStrategyType, Color, DirectionalLight, Input, ObjLoader, PerspectiveProjection, ProjectionType, TerrainManager, TerrainMaterial, Texture, TextureGenerator, Vector3D, WASDController, } from "../index.js";
import { AbstractExample } from "../core/index.js";
const CAR_SPEED = 10.0; // The car's speed
export class Example4 extends AbstractExample {
    _targetPos = new Vector3D();
    _car = undefined; // The car object
    _terrainManager = undefined;
    async setupScene() {
        Input.init();
        Input.debug = true;
        this.canvas.addEventListener("click", () => {
            if (!Input.isPointerLocked) {
                Input.requestPointerLock(this.canvas);
            }
        });
        // Initialize Octrees for the scene
        // For this example, we define a large world area
        this.scene.initOctrees(new BoundingBox(new Vector3D(-500, -100, -500), new Vector3D(500, 100, 500)));
        if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
            const aspect = window.innerWidth / window.innerHeight;
            // Correction: Convert 75 degrees to radians
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
        const ambientLight = new AmbientLight({ color: Color.WHITE, intensity: 0.3 });
        this.scene.add(ambientLight);
        const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.8 });
        sun.direction.set(-1, -1, -1);
        this.scene.add(sun);
        // Prepare terrain material
        const terrainMat = new TerrainMaterial({
            sandMap: Texture.fromImage(await TextureGenerator.createSand()),
            grassMap: Texture.fromImage(await TextureGenerator.createGrass()),
            rockMap: Texture.fromImage(await TextureGenerator.createRock()),
            snowMap: Texture.fromImage(await TextureGenerator.createSnow()),
        });
        // Configuration for Infinite Terrain
        this._terrainManager = new TerrainManager(this.scene, {
            chunkSize: 80,
            meshSegments: 64,
            heightmapDetail: 7, // 128x128
            heightmapRoughness: 0.55,
            maxHeight: 6.0,
            gridSize: 3, // 3x3 active chunks
            material: terrainMat,
            onRebuild: () => {
                // Rebuild the static octree whenever terrain chunks change
                this.scene.updateStaticOctree();
            },
        });
        await this._terrainManager.init();
        const loader = new ObjLoader();
        loader.setBasePath("/resources/models/");
        try {
            const model = await loader.load("vehicle-racer.obj");
            const carScale = 5;
            model.scale.set(carScale, carScale, carScale);
            // Position slightly above 0, as terrain fluctuates around 0
            model.position.set(0, 2.0, 0);
            this.scene.add(model);
            this._car = model; // Store car object, isStatic = false (default)
            // Setup WASD Controller for the car
            this._car.addBehavior(new WASDController({
                moveSpeed: CAR_SPEED,
            }));
        }
        catch (error) {
            console.error("[Example 4] Error during loading:", error);
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
    update(deltaTime) {
        const dx = Input.isPointerLocked ? Input.mouse.dx : 0;
        const dy = Input.isPointerLocked ? Input.mouse.dy : 0;
        this.camera.update(this._targetPos, dx, dy, deltaTime);
        // --- WASD Control is now handled by WASDController ---
        if (this._car) {
            // Terrain update based on car position
            if (this._terrainManager) {
                this._terrainManager.update(this._car.position);
            }
            // Camera follows the car
            // Simple tracking: We set the camera target to the car
            this._targetPos.copyFrom(this._car.position);
        }
    }
}
// === START THE ENGINE ===
const app = new Example4();
app
    .start()
    .then(() => {
    console.log("Engine running");
})
    .catch((err) => {
    console.error("Error while starting the engine: ", err);
});
//# sourceMappingURL=example4.js.map