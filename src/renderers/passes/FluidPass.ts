import { Scene } from "../../core/Scene.js";
import { MaterialType } from "../../enums/index.js";
import { WebGPURenderer } from "../WebGPURenderer.js";
import { RenderPass } from "../RenderPass.js";

/**
 * Specialized pass for fluid rendering.
 */
export class FluidPass implements RenderPass {
  public name = "FluidPass";

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
    const fluidGroup = sortedGroups.get(MaterialType.FLUID);
    
    if (fluidGroup) {
      // 1. Render Depth and Thickness
      const depthPass = ce.beginRenderPass({ 
          colorAttachments: [], 
          depthStencilAttachment: { 
              view: (renderer as any)._fluidDepthView, 
              depthClearValue: 1.0, 
              depthLoadOp: "clear", 
              depthStoreOp: "store" 
          } 
      });
      renderer._renderGroup(depthPass, MaterialType.FLUID, fluidGroup, vMat);
      depthPass.end();

      const thicknessPass = ce.beginRenderPass({ 
          colorAttachments: [{ 
              view: renderer._fluidThicknessView, 
              clearValue: { r: 0, g: 0, b: 0, a: 0 }, 
              loadOp: "clear", 
              storeOp: "store" 
          }] 
      });
      renderer._renderGroup(thicknessPass, MaterialType.FLUID, fluidGroup, vMat);
      thicknessPass.end();


      // 2. Composite onto target
      renderer._renderFluidComposite(ce, fluidGroup, targetView);
    }
  }
}
