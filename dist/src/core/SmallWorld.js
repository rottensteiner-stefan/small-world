import { RendererFactory } from "../renderers/RendererFactory.js";
import { Input } from "./Input.js";
export class SmallWorld {
    _renderer;
    async init(p) {
        const c = await (await fetch(p)).json();
        Input.debug = c.debug;
        RendererFactory.init();
        this._renderer = RendererFactory.create(c.rendererType);
        await this._renderer.initialize(document.getElementById(c.canvasId));
    }
    get activeRenderer() {
        return this._renderer;
    }
}
//# sourceMappingURL=SmallWorld.js.map