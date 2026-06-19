/// src/renderers/AbstractRenderer.ts
import { AbstractLight, Color } from "../core/index.js";
import { Vector3D } from "../math/index.js";
import { ToneMapping } from "../interfaces/index.js";
import { PostProcessingGroup } from "./post/index.js";
/**
 * Base class for all renderer implementations.
 *
 * Backends are expected to implement defensive rendering strategies to prevent "silent failures":
 * 1. Validate that all uniforms defined in a material's layout are actually present in the compiled shader.
 * 2. Log warnings or errors if expected data structures (e.g., WebGPU uniform blocks) are missing or misaligned.
 * 3. Provide fallback values or behaviors if specific features (like rounded rects) are not supported by the hardware.
 */
export class AbstractRenderer {
    /** The clear color of the renderer. */
    _clearColor = new Color(0, 0, 0, 1);
    /** Global quality settings. */
    _quality = {
        mipmapping: true,
        maxAnisotropy: 4,
        msaa: 4,
        maxShadowResolution: 1024,
        hdr: false,
        toneMapping: ToneMapping.NONE,
        gamma: 2.2,
        exposure: 1.0,
    };
    /** The global post processing volume/group. */
    postProcessing = new PostProcessingGroup();
    /** Cached light data to avoid GC pressure. */
    _lightData = {
        aCol: new Color(0, 0, 0),
        aIntensity: 0,
        dDir: new Vector3D(0, 1, 0),
        dCol: new Color(0, 0, 0),
        dIntensity: 0,
        pLights: [],
        sLights: [],
        aLights: [],
    };
    destroy() {
        // Base implementation does nothing
    }
    /** @inheritdoc */
    setClearColor(color) {
        this._clearColor = color;
    }
    /** @inheritdoc */
    get clearColor() {
        return this._clearColor;
    }
    /**
     * Extracts all lights from the scene for rendering.
     * @param scene The scene to extract lights from.
     * @returns An object containing all extracted light data.
     */
    extractLights(scene) {
        this._lightData.pLights.length = 0;
        this._lightData.sLights.length = 0;
        this._lightData.aLights.length = 0;
        this._lightData.aCol.set(0, 0, 0);
        this._lightData.aIntensity = 0;
        this._lightData.dCol.set(0, 0, 0);
        this._lightData.dIntensity = 0;
        this._lightData.dDir.set(0, 1, 0);
        for (const obj of scene.objects) {
            this._traverseLights(obj);
        }
        return this._lightData;
    }
    /**
     * Recursively traverses the scene to find lights.
     * @param node The current node to traverse.
     * @private
     */
    _traverseLights(node) {
        if (node instanceof AbstractLight) {
            node.applyTo(this._lightData);
        }
        if (undefined !== node.children) {
            for (const child of node.children) {
                this._traverseLights(child);
            }
        }
    }
}
//# sourceMappingURL=AbstractRenderer.js.map