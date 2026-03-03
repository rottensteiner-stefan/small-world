import { RendererType } from "../interfaces/RendererTypes.js";
import { WebGL2Renderer } from "./WebGL2Renderer.js";
import { WebGPURenderer } from "./WebGPURenderer.js";
export class RendererFactory {
    static reg = new Map();
    static init() {
        this.reg.set(RendererType.WEBGL2, WebGL2Renderer);
        this.reg.set(RendererType.WEBGPU, WebGPURenderer);
    }
    static create(type) {
        const t = type === "BEST" ? ("gpu" in navigator ? RendererType.WEBGPU : RendererType.WEBGL2) : type;
        return new (this.reg.get(t))();
    }
}
//# sourceMappingURL=RendererFactory.js.map