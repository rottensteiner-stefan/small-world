import { Scene } from "../../core/index.js";
import { RenderBatch } from "../../core/Scene.js";
import { MaterialType, Topology, PostProcessingEffectType } from "../../enums/index.js";
import { WebGPURenderer } from "../WebGPU/index.js";
import { RenderPass } from "../index.js";
import { Vector3D } from "../../math/index.js";
import { Object3D } from "../../core/Object3D.js";
/**
 * Standard render pass for opaque and skybox objects.
 */
export class MainRenderPass implements RenderPass {
  public name = "MainRenderPass";

  // Reused across every transparent object in a frame instead of allocating a fresh batch (and
  // its single-element `objects` array) per object -- `_renderBatch` only reads this
  // synchronously within the call below, so overwriting it in place between calls is safe.
  private readonly _scratchTransparentObjects: Object3D[] = [];
  private readonly _scratchTransparentBatch: RenderBatch = {
    shaderId: "",
    topology: Topology.DEFAULT,
    matUuid: "",
    objects: this._scratchTransparentObjects,
  };

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

        // AbstractGeometry always sets .topology explicitly, so this only matters for
        // hand-built GeometryData that skips it -- default to triangles rather than
        // guessing from index count (a 2-index geometry isn't reliably a line).
        const topology = manifest.state?.topology || obj.geometry?.topology || Topology.DEFAULT;

        this._scratchTransparentBatch.shaderId = manifest.shaderId;
        this._scratchTransparentBatch.topology = topology as Topology;
        this._scratchTransparentBatch.matUuid = obj.material!.uuid;
        this._scratchTransparentObjects[0] = obj;

        renderer._renderBatch(rpTransparent, this._scratchTransparentBatch, vMat);
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
