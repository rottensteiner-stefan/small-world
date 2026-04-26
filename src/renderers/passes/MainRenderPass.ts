import { Scene } from "../../core/Scene.js";
import { MaterialType } from "../../enums/index.js";
import { WebGPURenderer } from "../WebGPURenderer.js";
import { RenderPass } from "../RenderPass.js";

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
    _camPos: any,
    vMat?: Float32Array
  ): void {
    const sortedGroups = scene.getVisibleObjectsSorted();
    
    // Fluid is handled by its own pass, so we remove it here if it exists
    sortedGroups.delete(MaterialType.FLUID);

    const rp = ce.beginRenderPass({
      colorAttachments: [{ 
          view: targetView, 
          clearValue: renderer.clearColor, 
          loadOp: "clear", 
          storeOp: "store" 
      }],
      depthStencilAttachment: { 
          view: renderer._depthTexture.createView(), 
          depthClearValue: 1.0, 
          depthLoadOp: "clear", 
          depthStoreOp: "store" 
      },
    });

    // 1. Skybox first
    const skyboxGroup = sortedGroups.get(MaterialType.SKYBOX);
    if (skyboxGroup) {
      (renderer as any)._renderGroup(rp, MaterialType.SKYBOX, skyboxGroup, vMat);
      sortedGroups.delete(MaterialType.SKYBOX);
    }

    // 2. All other materials
    for (const [shaderId, materialGroups] of sortedGroups.entries()) {
      (renderer as any)._renderGroup(rp, shaderId, materialGroups, vMat);
    }

    rp.end();
  }
}
