import { WebGLRenderPass } from "../WebGLRenderPass.js";
import { AbstractWebGLRenderer } from "../AbstractWebGLRenderer.js";
import { Scene } from "../../core/index.js";
import { Vector3D } from "../../math/index.js";
import { LightDataInterface } from "../../interfaces/index.js";
import { RenderList } from "../../core/Scene.js";

export class WebGLShadowPass implements WebGLRenderPass {
  public name = "WebGLShadowPass";

  public execute(
    renderer: AbstractWebGLRenderer,
    _scene: Scene,
    vp: Float32Array,
    camPos: Vector3D,
    _vMat: Float32Array | undefined,
    renderList: RenderList,
    extractedLights: LightDataInterface,
  ): void {
    const r = renderer as unknown as {
      renderShadowMaps?: (lights: LightDataInterface, opaque: typeof renderList.opaque) => void;
      updateGlobalUBO?: (vp: Float32Array, camPos: Vector3D, lights: LightDataInterface) => void;
    };

    if (r.renderShadowMaps) {
      r.renderShadowMaps(extractedLights, renderList.opaque);
    }

    if (r.updateGlobalUBO) {
      r.updateGlobalUBO(vp, camPos, extractedLights);
    }
  }
}
