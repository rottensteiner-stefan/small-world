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
    near?: number,
    far?: number,
  ): void {
    const r = renderer as unknown as {
      renderShadowMaps?: (
        lights: LightDataInterface,
        opaqueBatches: import("../../core/Scene.js").RenderBatch[],
      ) => void;
      updateGlobalUBO?: (
        vp: Float32Array,
        camPos: Vector3D,
        lights: LightDataInterface,
        near?: number,
        far?: number,
      ) => void;
    };

    if (r.renderShadowMaps) {
      r.renderShadowMaps(extractedLights, renderList.opaqueBatches);
    }

    if (r.updateGlobalUBO) {
      r.updateGlobalUBO(vp, camPos, extractedLights, near, far);
    }
  }
}
