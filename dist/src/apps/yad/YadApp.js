/// src/apps/yad/YadApp.ts
import { AbstractExample, AmbientLight, CameraStrategyType, Color, DirectionalLight, MathUtils, PerspectiveProjection, Texture, ZoomController, } from "../../index.js";
import { YadLevelBuilder } from "./YadLevelBuilder.js";
import { TextLoader } from "../../loaders/TextLoader.js";
import { YadController } from "./YadController.js";
import { BoundingBox } from "../../physix/index.js";
import { Vector3D } from "../../math/index.js";
/**
 * YAD (Yet Another Doom)
 * Building a grid-based level from a text file.
 */
export class YadApp extends AbstractExample {
    _time = 0;
    _lavaMaterials = [];
    _lavaLights = [];
    /** @inheritdoc */
    onCanvasRecreated() {
        // Mouse capture disabled for this example
    }
    /** @inheritdoc */
    async setupScene() {
        // 1. Camera Setup
        const aspect = window.innerWidth / window.innerHeight;
        this.camera.projection = new PerspectiveProjection({
            fov: MathUtils.degToRad(75),
            aspect,
            near: 0.1,
            far: 500,
        });
        this.camera.updateProjectionMatrix();
        this.camera.setStrategy(CameraStrategyType.FPS);
        this.camera.phi = 0; // Look straight ahead
        // 1.5 Global Lights
        this.scene.add(new AmbientLight({ color: Color.WHITE, intensity: 0.5 }));
        const sun = new DirectionalLight({ color: Color.WHITE, intensity: 0.6 });
        sun.direction.set(-1, -1, -1).normalize();
        this.scene.add(sun);
        // 2. Load Textures
        const wallTex = await Texture.fromUrl("/resources/examples/10/rock.png", {
            flipY: true,
        });
        const floorTex = await Texture.fromUrl("/resources/examples/10/sand.png", {
            flipY: true,
        });
        const lavaNoise = await Texture.fromUrl("/resources/examples/10/lava.png", {
            flipY: true,
        });
        const lavaNorm = await Texture.fromUrl("/resources/examples/10/lava_normal.png", {
            flipY: true,
        });
        const lavaDisp = await Texture.fromUrl("/resources/examples/10/lava_displacement.png", {
            flipY: true,
        });
        const lavaSpec = await Texture.fromUrl("/resources/examples/10/lava_specular.png", {
            flipY: true,
        });
        const lavaAmb = await Texture.fromUrl("/resources/examples/10/lava_ambient.png", {
            flipY: true,
        });
        const slimeNoise = await Texture.fromUrl("/resources/examples/10/slime.png", {
            flipY: true,
        });
        const slimeDisp = await Texture.fromUrl("/resources/examples/10/slime_displacement.png", {
            flipY: true,
        });
        const slimeNorm = await Texture.fromUrl("/resources/examples/10/slime_normal.png", {
            flipY: true,
        });
        const slimeSpec = await Texture.fromUrl("/resources/examples/10/slime_specular.png", {
            flipY: true,
        });
        const slimeAmb = await Texture.fromUrl("/resources/examples/10/slime_ambient.png", {
            flipY: true,
        });
        // Reuse some generic textures or placeholders
        const barrelTex = await Texture.fromUrl("/resources/examples/10/rock.png", {
            flipY: true,
        });
        const torchTex = await Texture.fromUrl("/resources/examples/10/lava.png", {
            flipY: true,
        });
        // 3. Load Level Data
        const loader = new TextLoader();
        const mapData = await loader.load("/resources/levels/level1.txt");
        // 4. Build Level
        const builder = new YadLevelBuilder();
        const { playerStart, lavaMaterials, lavaLights } = await builder.build(this.scene, mapData, {
            wallTexture: wallTex,
            floorTexture: floorTex,
            lavaNoiseMap: lavaNoise,
            lavaNormalMap: lavaNorm,
            lavaDisplacementMap: lavaDisp,
            lavaSpecularMap: lavaSpec,
            lavaAmbientMap: lavaAmb,
            slimeNoiseMap: slimeNoise,
            slimeDisplacementMap: slimeDisp,
            slimeNormalMap: slimeNorm,
            slimeSpecularMap: slimeSpec,
            slimeAmbientMap: slimeAmb,
            barrelTexture: barrelTex,
            torchTexture: torchTex,
        });
        this._lavaMaterials = lavaMaterials;
        this._lavaLights = lavaLights;
        this.camera.position.copyFrom(playerStart);
        // 5. Controllers
        this.camera.addBehavior(new YadController({ moveSpeed: 10.0, scene: this.scene }));
        this.camera.addBehavior(new ZoomController());
        // 6. Final Scene Prep
        this.scene.update(); // Update all world matrices first
        this.scene.initOctrees(new BoundingBox(new Vector3D(-200, -50, -200), new Vector3D(200, 100, 200)));
        console.log("[YadApp] Updating static octree...");
        this.scene.updateStaticOctree();
        this.debug = false; // Disable visual debugging for collisions by default
        console.log("YAD: Level 1 built.");
    }
    /** @inheritdoc */
    update(deltaTime) {
        this._time += deltaTime;
        for (const mat of this._lavaMaterials) {
            mat.time = this._time;
        }
        for (let l = 0; l < this._lavaLights.length; l++) {
            const light = this._lavaLights[l];
            const pulse = Math.sin(this._time * 2.1 + l) * 0.5 + 0.5;
            light.intensity = 3.0 + pulse * 2.0;
        }
    }
}
const app = new YadApp();
app.start();
//# sourceMappingURL=YadApp.js.map