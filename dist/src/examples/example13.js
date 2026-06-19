/// src/examples/example13.ts
import { AmbientLight, CameraStrategyType, Color, DirectionalLight, FPSController, Object3D, PerspectiveProjection, ProjectionType, RendererType, PostProcessingEffectType, CubeTexture, } from "../index.js";
import { AbstractExample } from "../core/index.js";
import { Cube } from "../geometry/Cube.js";
import { SkyboxMaterial } from "../core/materials/SkyboxMaterial.js";
import { GltfLoader } from "../loaders/GltfLoader.js";
class GLTFExample extends AbstractExample {
    _helmet;
    async setupScene() {
        // Post-Processing is nice for PBR
        this.renderer.postProcessing.enabled = true;
        const bloom = this.renderer.postProcessing.get(PostProcessingEffectType.BLOOM);
        if (bloom) {
            bloom.enabled = true;
            bloom.intensity = 1.5;
            bloom.threshold = 0.5; // Lower threshold to ensure visor glows visibly
            bloom.radius = 1.0;
            bloom.color = new Color(1.2, 0.8, 1.6);
        }
        // Camera setup
        if (ProjectionType.PERSPECTIVE === this.camera.projection.type) {
            const aspect = window.innerWidth / window.innerHeight;
            this.camera.projection = new PerspectiveProjection({
                fov: (60 * Math.PI) / 180,
                aspect,
                near: 0.1,
                far: 1000,
            });
            this.camera.updateProjectionMatrix();
        }
        this.camera.setStrategy(CameraStrategyType.FPS);
        this.camera.position.set(0, 0, 3);
        const fpsController = new FPSController({
            moveSpeed: 5.0,
            enableCollision: false,
            scene: this.scene,
        });
        this.camera.addBehavior(fpsController);
        // Setup Lights to showcase PBR
        const ambientLight = new AmbientLight({
            color: new Color(1.0, 1.0, 1.0),
            intensity: 0.2, // Low ambient to let directional lights create contrast
        });
        this.scene.add(ambientLight);
        const mainLight = new DirectionalLight({
            color: new Color(1.0, 0.95, 0.9),
            intensity: 2.0, // Bright light for metallic reflections
        });
        mainLight.position.set(5, 5, 5);
        mainLight.direction.set(-1, -1, -1);
        this.scene.add(mainLight);
        const fillLight = new DirectionalLight({
            color: new Color(0.5, 0.6, 1.0), // Blueish fill light
            intensity: 0.8,
        });
        fillLight.position.set(-5, 0, 0);
        fillLight.direction.set(1, 0, 0);
        this.scene.add(fillLight);
        // Load an environment map for reflections
        const envTexture = new CubeTexture();
        try {
            await envTexture.loadFrom("/resources/examples/13/skybox.png");
            // Add skybox to the background
            const skybox = new Object3D("Skybox");
            skybox.geometry = new Cube({ size: 1000 }).getGeometryData();
            skybox.material = new SkyboxMaterial({ cubeMap: envTexture });
            skybox.frustumCulled = false;
            this.scene.add(skybox);
        }
        catch (e) {
            console.warn("Could not load envmap:", e);
        }
        // Load the GLTF Model
        try {
            const gltfLoader = new GltfLoader({ basePath: "/assets/models/" });
            const helmet = await gltfLoader.load("DamagedHelmet.glb");
            helmet.position.set(0, 0, 0);
            // Assign the environment map to all standard materials on the helmet
            if (envTexture) {
                const applyEnvMap = (node) => {
                    if (node.material && "envMap" in node.material) {
                        node.material.envMap = envTexture;
                    }
                    node.children.forEach(applyEnvMap);
                };
                applyEnvMap(helmet);
            }
            this._helmet = helmet;
            this.scene.add(helmet);
            // Inspector will pick it up automatically
        }
        catch (e) {
            console.error("Failed to load DamagedHelmet:", e);
        }
    }
    update(deltaTime) {
        super.update(deltaTime);
        // Slowly rotate the helmet to show off the PBR reflections and normal maps
        if (this._helmet) {
            this._helmet.rotation.y += deltaTime * 0.5;
            this._helmet.updateMatrixWorld();
        }
        const skybox = this.scene.objects.find((o) => o.name === "Skybox");
        if (skybox) {
            skybox.position.copyFrom(this.camera.position);
            skybox.updateMatrixWorld();
        }
    }
}
// ----------------------------------------------------------------------------
// Bootstrap the example
// ----------------------------------------------------------------------------
const app = new GLTFExample({
    rendererType: RendererType.WEB_GPU,
});
app
    .start()
    .then(() => console.log("Example 13 running"))
    .catch((error) => console.error("Example initialization failed:", error));
//# sourceMappingURL=example13.js.map