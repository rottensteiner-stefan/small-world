import { Scene, Color } from "../../core/index.js";
import { DepthMaterial } from "../../core/materials/index.js";
import { MaterialType, Topology } from "../../enums/index.js";
import { WebGPURenderer } from "../WebGPU/WebGPURenderer.js";
import { RenderPass } from "../index.js";
import { InstancedMesh } from "../../core/InstancedMesh.js";
import { Object3D } from "../../core/Object3D.js";
import { Matrix4, MathPool, Vector3D } from "../../math/index.js";

const _scratchCasters: Object3D[] = [];
const _scratchInstanced: InstancedMesh[] = [];
const _scratchStandard: Object3D[] = [];

export class CascadedShadowPassGPU implements RenderPass {
  public name = "CascadedShadowPassGPU";

  private _dummyTargetView?: GPUTextureView;
  private _dirShadowTexView?: GPUTextureView;
  private _bindGroupNeedsShadowRebuild = true;
  private _depthMaterial?: DepthMaterial;
  /**
   * A snapshot of the global bind group taken BEFORE it ever gets rebuilt to
   * reference the real shadow map (see below). Used only while rendering shadow
   * casters: it still references the dummy fallback shadow textures, so binding
   * it doesn't create a read/write conflict on the shadow map texture we're
   * actively rendering into within the same render pass.
   */
  private _shadowCasterBindGroup?: GPUBindGroup;

  public execute(
    renderer: WebGPURenderer,
    scene: Scene,
    _ce: GPUCommandEncoder,
    _targetView: GPUTextureView,
    vp: Float32Array,
    camPos: Vector3D,
    _vMat?: Float32Array,
  ): void {
    const lights = renderer.extractLights(scene);
    const dLight = lights.dLight;
    if (!dLight || !dLight.castShadow || dLight.numCascades === 0) return;

    this._depthMaterial ??= new DepthMaterial();

    if (!this._dummyTargetView) {
      const tex = renderer._device!.createTexture({
        size: [dLight.shadowResolution, dLight.shadowResolution],
        format: renderer.postProcessing.enabled ? "rgba16float" : renderer._format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this._dummyTargetView = tex.createView();
    }

    let fbo = renderer._shadowMaps.get(dLight) as GPUTexture | undefined;
    if (!fbo) {
      // Snapshot the CURRENT global bind group before it ever gets rebuilt to
      // reference the real shadow map -- at this point it still references only
      // the dummy fallback shadow textures, safe to use as bind group 0 while we
      // render into the real shadow map texture below.
      this._shadowCasterBindGroup = renderer._globalBindGroup;

      fbo = renderer._device!.createTexture({
        size: [dLight.shadowResolution, dLight.shadowResolution, dLight.numCascades],
        format: "depth32float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      renderer._shadowMaps.set(dLight, fbo);
      // The underlying texture is reused (and re-rendered into) every frame, so the
      // view only needs to be created once, and the global bind group only needs to
      // be rebuilt once to pick it up (see below) -- not every frame.
      this._dirShadowTexView = fbo.createView({ dimension: "2d-array" });
      this._bindGroupNeedsShadowRebuild = true;
    }

    const renderList = scene.getVisibleObjectsSorted(vp, camPos);
    const depthManifest = this._depthMaterial.getRenderManifest();

    for (let i = 0; i < dLight.numCascades; i++) {
      const cascadeCam = dLight.cascadeCameras[i]!;

      // We must trick WebGPURenderer to update global UBO with cascadeCam's VP
      // (the real camera's VP/lights are restored further below, once all cascades
      // have been rendered).
      //
      // This MUST be submitted on its own, separate command encoder right after
      // this cascade's draws are recorded -- not batched into the shared `ce` that
      // MainRenderPass/PostProcessPass also record into. queue.writeBuffer() calls
      // apply in queue-call order, but a command encoder's recorded draws only
      // execute once *that encoder* is submitted; since `ce` is only submitted once,
      // at the very end of the frame, ALL writeBuffer calls made before that single
      // submit (including every subsequent cascade's and the final "restore real
      // camera" write) would already have applied by the time any of these draws
      // actually run on the GPU -- so every cascade (and even the main pass) would
      // end up reading whichever write happened last, not the one it was recorded
      // with. Submitting per cascade forces this cascade's global/per-object
      // uniform writes to actually be in effect when this cascade's draws execute.
      renderer._updateGlobalBuffers(
        cascadeCam.viewProjectionMatrix,
        cascadeCam.position,
        {
          pLights: [],
          sLights: [],
          aLights: [],
          aCol: new Color(0, 0, 0),
          aIntensity: 0,
          dCol: new Color(0, 0, 0),
          dDir: new Vector3D(),
          dIntensity: 0,
        },
        scene,
      );

      const shadowCe = renderer._device!.createCommandEncoder();
      const rp = shadowCe.beginRenderPass({
        colorAttachments: [
          {
            view: this._dummyTargetView,
            loadOp: "clear",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: fbo.createView({
            dimension: "2d",
            baseArrayLayer: i,
            arrayLayerCount: 1,
          }),
          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      });

      // _renderSubgroup only sets bind groups 1 (material) and 2 (object); unlike
      // _renderGroup, it does not set the global bind group 0 -- do that ourselves
      // once per cascade pass. Use the dummy-referencing snapshot, NOT
      // renderer._globalBindGroup: once rebuilt (below), that one references the
      // real shadow map we're actively rendering into here.
      rp.setBindGroup(0, this._shadowCasterBindGroup!);

      // Render all shadow-casting opaque objects into this cascade using a single,
      // shared DepthMaterial pipeline -- regardless of each object's own material --
      // mirroring WebGL2's "bind one depth program, source only the model matrix per
      // object" approach (WebGL2Renderer._renderShadowScene).
      for (let batchIdx = 0; batchIdx < renderList.opaqueBatches.length; batchIdx++) {
        const batch = renderList.opaqueBatches[batchIdx];
        if (batch!.shaderId === MaterialType.SKYBOX || batch!.objects.length === 0) continue;

        let topology: GPUPrimitiveTopology = Topology.DEFAULT;
        if (batch!.topology === Topology.POINT_LIST) topology = Topology.POINT_LIST;
        else if (batch!.topology === Topology.LINE_LIST) topology = Topology.LINE_LIST;
        else if (batch!.topology === Topology.LINE_STRIP) topology = Topology.LINE_STRIP;

        const objects = batch!.objects;

        _scratchCasters.length = 0;
        for (let i = 0; i < objects.length; i++) {
          if (objects[i]!.castShadow) _scratchCasters.push(objects[i]!);
        }
        if (_scratchCasters.length === 0) continue;

        _scratchInstanced.length = 0;
        _scratchStandard.length = 0;
        for (let i = 0; i < _scratchCasters.length; i++) {
          const obj = _scratchCasters[i]!;
          if (obj instanceof InstancedMesh) {
            _scratchInstanced.push(obj);
          } else {
            _scratchStandard.push(obj);
          }
        }

        if (_scratchStandard.length > 0) {
          renderer._renderSubgroup(
            rp,
            _scratchStandard,
            false,
            this._depthMaterial.uuid,
            depthManifest,
            cascadeCam.viewMatrix,
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
            cascadeCam.viewMatrix,
            topology,
          );
        }
      }

      rp.end();
      renderer._device!.queue.submit([shadowCe.finish()]);
    }

    // Restore the real scene camera (the per-cascade loop above repeatedly
    // overwrote the global uniform buffer with each cascade's light-space matrix,
    // and reset the shadow-info fields to their "no shadow" defaults as a side
    // effect of _updateGlobalBuffers), then re-apply the actual shadow parameters
    // so MainRenderPass -- which runs right after this pass -- sees correct data
    // for both.
    renderer._updateGlobalBuffers(vp, camPos, lights, scene);

    const gData = renderer._scratchGlobalBufferData;
    gData[196] = dLight.shadowBias;
    gData[197] = dLight.shadowNormalBias;
    gData[198] = 1.0; // castShadow on
    gData[199] = dLight.numCascades;

    const rawCascadeVp = MathPool.acquireMatrix();
    const correctedCascadeVp = MathPool.acquireMatrix();
    for (let i = 0; i < dLight.numCascades; i++) {
      const cascadeCam = dLight.cascadeCameras[i]!;
      gData[192 + i] = dLight.cascadeSplits[i]!;

      // WebGPU's [0, 1] depth range needs the same ZO correction _updateGlobalBuffers
      // applies to the main camera VP -- getShadowPCF reprojects using this matrix,
      // so it must match how the shadow map's depth values were actually written.
      rawCascadeVp.data.set(cascadeCam.viewProjectionMatrix);
      Matrix4.multiply(Matrix4.ZO_CORRECTION, rawCascadeVp, correctedCascadeVp);
      gData.set(correctedCascadeVp.data, 128 + i * 16);
    }
    MathPool.releaseMatrix(rawCascadeVp);
    MathPool.releaseMatrix(correctedCascadeVp);

    renderer._device!.queue.writeBuffer(renderer._globalUniformBuffer, 0, gData);

    // Bind the resulting texture array to the WebGPU Renderer's global bind group,
    // exactly once (the underlying GPUTexture is reused and just re-rendered into
    // on subsequent frames, so the bind group doesn't need to be rebuilt again).
    if (this._bindGroupNeedsShadowRebuild) {
      renderer._defaultDirShadowTexView = this._dirShadowTexView!;
      renderer._globalBindGroup = renderer._createGlobalBindGroup(scene);
      this._bindGroupNeedsShadowRebuild = false;
    }
  }
}
