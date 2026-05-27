import { Scene } from "../../core/Scene.js";
import { MaterialType } from "../../enums/index.js";
import { WebGPURenderer } from "../WebGPURenderer.js";
import { RenderPass } from "../RenderPass.js";
import { Vector3D } from "../../math/index.js";

/**
 * Standard render pass for opaque and skybox objects.
 */
export class MainRenderPass implements RenderPass {
  public name = "MainRenderPass";

  public execute(
    renderer: WebGPURenderer,
    scene: Scene,
    ce: GPUCommandEncoder,
    targetView: GPUTextureView,
    _vp: Float32Array,
    _camPos: Vector3D,
    vMat?: Float32Array,
  ): void {
    const sortedGroups = scene.getVisibleObjectsSorted();

    const rp = ce.beginRenderPass({
      colorAttachments: [
        {
          view: targetView,
          clearValue: renderer.clearColor,
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: renderer._depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    // 1. Skybox first
    const skyboxShaderMap = sortedGroups.get(MaterialType.SKYBOX);
    if (skyboxShaderMap) {
      for (const [topology, materialGroups] of skyboxShaderMap.entries()) {
        renderer._renderGroup(
          rp,
          MaterialType.SKYBOX,
          materialGroups,
          vMat,
          topology as GPUPrimitiveTopology,
        );
      }
      sortedGroups.delete(MaterialType.SKYBOX);
    }

    // 2. All other materials
    for (const [shaderId, topologyMap] of sortedGroups.entries()) {
      for (const [topology, materialGroups] of topologyMap.entries()) {
        renderer._renderGroup(rp, shaderId, materialGroups, vMat, topology as GPUPrimitiveTopology);
      }
    }

    rp.end();
  }
}
