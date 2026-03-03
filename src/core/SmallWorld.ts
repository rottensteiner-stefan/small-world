import { RendererFactory } from "../renderers/RendererFactory.js";
import { Input } from "./Input.js";
export class SmallWorld {
  private _renderer: any;
  public async init(p: string) {
    const c = await (await fetch(p)).json();
    Input.debug = c.debug;
    RendererFactory.init();
    this._renderer = RendererFactory.create(c.rendererType);
    await this._renderer.initialize(document.getElementById(c.canvasId));
  }
  public get activeRenderer() {
    return this._renderer;
  }
}
