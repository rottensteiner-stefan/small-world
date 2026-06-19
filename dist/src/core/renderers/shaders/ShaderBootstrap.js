/// src/core/renderers/shaders/ShaderBootstrap.ts
import { CoreShaderChunks } from "./CoreShaderChunks.js";
/**
 * Modern Bootstrapper for the ShaderRegistry.
 * Handles global chunk initialization. Core materials register themselves automatically.
 */
export class ShaderBootstrap {
    static _isInitialized = false;
    /**
     * Initializes the registry by loading standard chunks.
     */
    static async init() {
        if (this._isInitialized) {
            return;
        }
        // 1. Load global shader chunks (lights, math, structures)
        // This MUST be done first so that self-registering materials find their chunks.
        await CoreShaderChunks.init();
        this._isInitialized = true;
    }
}
//# sourceMappingURL=ShaderBootstrap.js.map