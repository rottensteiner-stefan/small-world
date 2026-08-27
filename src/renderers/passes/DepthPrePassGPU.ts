import { Scene } from "../../core/index.js";
import { DepthMaterial } from "../../core/materials/index.js";
import { MaterialType, Topology } from "../../enums/index.js";
import { WebGPURenderer, VIEW_SLOT_MAIN_CAMERA } from "../WebGPU/WebGPURenderer.js";
import { RenderPass } from "../index.js";
import { InstancedMesh } from "../../core/InstancedMesh.js";
import { Object3D } from "../../core/Object3D.js";
import { Vector3D } from "../../math/index.js";

const _scratchInstanced: InstancedMesh[] = [];
const _scratchStandard: Object3D[] = [];

/**
 * Z-only pre-pass for opaque objects, using the shared DepthMaterial pipeline (same
 * one-pipeline-for-everyone approach CascadedShadowPassGPU/SpotShadowPassGPU already use for
 * shadow casters). Populates the main depth buffer BEFORE MainRenderPass's color pass runs, so
 * its unchanged depthCompare:"less-equal" test rejects occluded fragments via hardware early-Z
 * before their (often expensive, PBR + clustered-lighting) fragment shader ever runs -- no
 * change to depthWrite/depthCompare needed there, the win comes from the depth buffer already
 * holding the frontmost value by the time the color pass draws. MainRenderPass's opaque pass
 * switches depthLoadOp from "clear" to "load" to build on top of what this pass writes, instead
 * of erasing it -- this pass owns the once-per-frame clear now.
 */
export class DepthPrePassGPU implements RenderPass {
  public name = "DepthPrePassGPU";

  private _depthMaterial?: DepthMaterial;

  public execute(
    renderer: WebGPURenderer,
    scene: Scene,
    ce: GPUCommandEncoder,
    targetView: GPUTextureView,
    vp: Float32Array,
    camPos: Vector3D,
    vMat?: Float32Array,
  ): void {
    this._depthMaterial ??= new DepthMaterial();
    const depthManifest = this._depthMaterial.getRenderManifest();
    const renderList = scene.getVisibleObjectsSorted(vp, camPos);

    // No early return: the depth clear must happen every frame regardless of whether there's
    // anything to draw yet, since MainRenderPass's opaque pass now relies on it (depthLoadOp
    // "load") instead of clearing itself.
    const rp = ce.beginRenderPass({
      colorAttachments: [
        {
          // Reused as a throwaway target -- MainRenderPass clears (loadOp: "clear") this same
          // view again right after, so whatever this pass writes here is discarded either way.
          // Avoids needing our own canvas-sized dummy texture (unlike the shadow passes' fixed-
          // resolution dummy target, this would need resize tracking to stay valid).
          view: targetView,
          loadOp: "clear",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: "discard",
        },
      ],
      depthStencilAttachment: {
        view: renderer.activeDepthView,
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    // No dummy-bind-group snapshot dance needed here (unlike the shadow passes): the main depth
    // buffer this pass writes into is never itself bound as a texture in the global bind group.
    rp.setBindGroup(0, renderer.globalBindGroup);

    for (let batchIdx = 0; batchIdx < renderList.opaqueBatches.length; batchIdx++) {
      const batch = renderList.opaqueBatches[batchIdx];
      if (batch!.shaderId === MaterialType.SKYBOX || batch!.objects.length === 0) continue;

      let topology: GPUPrimitiveTopology = Topology.DEFAULT;
      if (batch!.topology === Topology.POINT_LIST) topology = Topology.POINT_LIST;
      else if (batch!.topology === Topology.LINE_LIST) topology = Topology.LINE_LIST;
      else if (batch!.topology === Topology.LINE_STRIP) topology = Topology.LINE_STRIP;

      const objects = batch!.objects;
      _scratchInstanced.length = 0;
      _scratchStandard.length = 0;
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i]!;
        if (obj instanceof InstancedMesh) {
          _scratchInstanced.push(obj);
        } else {
          _scratchStandard.push(obj);
        }
      }

      // Slot 0 (VIEW_SLOT_MAIN_CAMERA) is already correct this frame, written once by
      // _updateGlobalBuffers() -- its offset is always 0, no _setViewMatrix() call needed.
      if (_scratchStandard.length > 0) {
        renderer._renderSubgroup(
          rp,
          _scratchStandard,
          false,
          this._depthMaterial.uuid,
          depthManifest,
          VIEW_SLOT_MAIN_CAMERA,
          vMat,
          topology,
        );
      }

      if (_scratchInstanced.length > 0) {
        renderer._renderSubgroup(
          rp,
          _scratchInstanced,
          true,
          this._depthMaterial.uuid,
          depthManifest,
          VIEW_SLOT_MAIN_CAMERA,
          vMat,
          topology,
        );
      }
    }

    rp.end();
  }
}
