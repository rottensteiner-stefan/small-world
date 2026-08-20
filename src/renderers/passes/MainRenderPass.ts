import { Scene } from "../../core/index.js";
import { MaterialType, Topology, PostProcessingEffectType } from "../../enums/index.js";
import { WebGPURenderer } from "../WebGPU/index.js";
import { RenderPass } from "../index.js";
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
    for (let i = 0; i < renderList.opaqueBatches.length; i++) {
      const batch = renderList.opaqueBatches[i];
      if (batch!.shaderId === MaterialType.SKYBOX && batch!.objects.length > 0) {
        renderer._renderBatch(rp, batch!, vMat);
      }
    }

    // 2. All other opaque objects
    for (let i = 0; i < renderList.opaqueBatches.length; i++) {
      const batch = renderList.opaqueBatches[i];
      if (batch!.shaderId !== MaterialType.SKYBOX && batch!.objects.length > 0) {
        renderer._renderBatch(rp, batch!, vMat);
      }
    }

    if (renderList.transparent.length > 0) {
      // End opaque pass
      rp.end();

      // Capture opaque texture for transparent materials (like glass)
      const targetTex = renderer.postProcessing.enabled
        ? renderer.hdrTexture!
        : renderer.gpuCanvasContext.getCurrentTexture();
      renderer.captureOpaqueTexture(ce, targetTex);
      renderer.captureOpaqueDepth(ce);

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
        // AbstractGeometry always sets .topology explicitly, so this only matters for
        // hand-built GeometryData that skips it -- default to triangles rather than
        // guessing from index count (a 2-index geometry isn't reliably a line).
        const topology = manifest.state?.topology || obj.geometry?.topology || Topology.DEFAULT;

        const tempBatch = {
          shaderId,
          topology: topology as Topology,
          matUuid: obj.material!.uuid,
          objects: [obj],
        };

        renderer._renderBatch(rpTransparent, tempBatch, vMat);
      }
      rpTransparent.end();
    } else {
      rp.end();

      // HBAO needs the opaque depth buffer every frame it's enabled, not just when there
      // happen to be transparent objects (the only other consumer of this capture).
      const hbaoNode = renderer.postProcessing.get<import("../post/index.js").HbaoElement>(
        PostProcessingEffectType.HBAO,
      );
      if (hbaoNode && hbaoNode.enabled) {
        renderer.captureOpaqueDepth(ce);
      }
    }
  }
}
