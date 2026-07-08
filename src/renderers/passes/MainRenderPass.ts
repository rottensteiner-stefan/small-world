/// src/renderers/passes/MainRenderPass.ts
import { Scene } from "../../core/index.js";
import { MaterialType } from "../../enums/index.js";
import { WebGPURenderer } from "../WebGPU/index.js";
import { RenderPass } from "../index.js";
import { Vector3D } from "../../math/index.js";
import { Object3D } from "../../core/index.js";

/**
 * Standard render pass for opaque and skybox objects.
 */
export class MainRenderPass implements RenderPass {
  public name = "MainRenderPass";
  private _scratchTransparentMap: Map<string, Object3D[]> = new Map();

  public execute(
    renderer: WebGPURenderer,
    scene: Scene,
    ce: GPUCommandEncoder,
    targetView: GPUTextureView,
    vp: Float32Array,
    camPos: Vector3D,
    vMat?: Float32Array,
  ): void {
    const renderList = scene.getVisibleObjectsSorted(vp, camPos);

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
        view: renderer.activeDepthView,
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    // 1. Skybox first
    const skyboxShaderMap = renderList.opaque.get(MaterialType.SKYBOX);
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
      renderList.opaque.delete(MaterialType.SKYBOX);
    }

    // 2. All other opaque objects
    for (const [shaderId, topologyMap] of renderList.opaque.entries()) {
      for (const [topology, materialGroups] of topologyMap.entries()) {
        renderer._renderGroup(rp, shaderId, materialGroups, vMat, topology as GPUPrimitiveTopology);
      }
    }

    if (renderList.transparent.length > 0) {
      // End opaque pass
      rp.end();

      // Capture opaque texture for transparent materials (like glass)
      const targetTex = renderer.postProcessing.enabled
        ? renderer._hdrTexture!
        : renderer._context.getCurrentTexture();
      renderer.captureOpaqueTexture(ce, targetTex);

      // Start transparent pass
      const rpTransparent = ce.beginRenderPass({
        colorAttachments: [
          {
            view: targetView,
            loadOp: "load",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: renderer.activeDepthView,
          depthLoadOp: "load",
          depthStoreOp: "store",
        },
      });

      // 3. Transparent objects
      for (const obj of renderList.transparent) {
        const manifest = obj.material!.getRenderManifest();

        const shaderId = manifest.shaderId;
        const topology =
          manifest.state?.topology ||
          obj.geometry?.topology ||
          (obj.geometry?.indices?.length === 2 ? "line-list" : "triangle-list");

        this._scratchTransparentMap.clear();
        this._scratchTransparentMap.set(obj.material!.uuid, [obj]);
        renderer._renderGroup(
          rpTransparent,
          shaderId,
          this._scratchTransparentMap,
          vMat,
          topology as GPUPrimitiveTopology,
        );
      }
      rpTransparent.end();
    } else {
      rp.end();
    }
  }
}
