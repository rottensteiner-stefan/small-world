import { Scene, Color } from "../../core/index.js";
import { DepthMaterial } from "../../core/materials/index.js";
import { MaterialType } from "../../enums/MaterialType.js";
import { Topology } from "../../enums/Topology.js";
import { WebGPURenderer } from "../WebGPU/WebGPURenderer.js";
import { RenderPass } from "../index.js";
import { InstancedMesh } from "../../core/InstancedMesh.js";
import { Object3D } from "../../core/Object3D.js";
import { SpotLight } from "../../core/lights/SpotLight.js";
import { Matrix4, MathPool, Vector3D, Frustum } from "../../math/index.js";

const _scratchLightCasters: SpotLight[] = [];
const _scratchCasters: Object3D[] = [];
const _scratchInstanced: InstancedMesh[] = [];
const _scratchStandard: Object3D[] = [];

export class SpotShadowPassGPU implements RenderPass {
  public name = "SpotShadowPassGPU";

  private _dummyTargetView?: GPUTextureView;
  private _bindGroupNeedsShadowRebuild = true;
  private _depthMaterial?: DepthMaterial;
  private _shadowCasterBindGroup?: GPUBindGroup;
  private _spotShadowTexView?: GPUTextureView;
  private _fbo?: GPUTexture;
  private _frustum: Frustum = new Frustum();

  public execute(
    renderer: WebGPURenderer,
    scene: Scene,
    _ce: GPUCommandEncoder,
    _targetView: GPUTextureView,
    vp: Float32Array,
    camPos: Vector3D,
  ): void {
    const lights = renderer.extractLights(scene);
    _scratchLightCasters.length = 0;
    for (let i = 0; i < lights.sLights.length; i++) {
      if (lights.sLights[i]!.castShadow) _scratchLightCasters.push(lights.sLights[i]!);
    }
    const casters = _scratchLightCasters;
    if (casters.length === 0) return;

    this._depthMaterial ??= new DepthMaterial();

    const shadowRes = casters[0]?.shadowResolution || 1024;

    if (!this._dummyTargetView) {
      const tex = renderer._device!.createTexture({
        size: [shadowRes, shadowRes],
        format: renderer.postProcessing.enabled ? "rgba16float" : renderer._format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this._dummyTargetView = tex.createView();
    }

    if (!this._fbo) {
      this._shadowCasterBindGroup = renderer._globalBindGroup;

      // Always create 4 layers because maximum spotlights is 4.
      this._fbo = renderer._device!.createTexture({
        size: [shadowRes, shadowRes, 4],
        format: "depth32float",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      });
      this._spotShadowTexView = this._fbo.createView({ dimension: "2d-array" });
      this._bindGroupNeedsShadowRebuild = true;
    }

    const renderList = scene.getVisibleObjectsSorted(vp, camPos);
    const depthManifest = this._depthMaterial.getRenderManifest();

    for (let j = 0; j < lights.sLights.length; j++) {
      const sLight = lights.sLights[j]!;
      if (!sLight.castShadow || !sLight.shadowCamera) continue;

      sLight.updateShadowCamera();
      const shadowCam = sLight.shadowCamera;

      const tempMat = MathPool.acquireMatrix();
      tempMat.data.set(shadowCam.viewProjectionMatrix);
      this._frustum.setFromMatrix(tempMat);
      MathPool.releaseMatrix(tempMat);

      renderer._updateGlobalBuffers(
        shadowCam.viewProjectionMatrix,
        shadowCam.position,
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
          view: this._fbo.createView({
            dimension: "2d",
            baseArrayLayer: j,
            arrayLayerCount: 1,
          }),
          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      });

      rp.setBindGroup(0, this._shadowCasterBindGroup!);

      for (let batchIdx = 0; batchIdx < renderList.opaqueBatches.length; batchIdx++) {
        const batch = renderList.opaqueBatches[batchIdx];
        if (batch!.shaderId === MaterialType.SKYBOX || batch!.objects.length === 0) continue;
        const objects = batch!.objects;
        let topologyStr: GPUPrimitiveTopology = Topology.DEFAULT;
        if (batch!.topology === Topology.POINT_LIST) topologyStr = Topology.POINT_LIST;
        else if (batch!.topology === Topology.LINE_LIST) topologyStr = Topology.LINE_LIST;
        else if (batch!.topology === Topology.LINE_STRIP) topologyStr = Topology.LINE_STRIP;
        else if (typeof batch!.topology === "string")
          topologyStr = batch!.topology as GPUPrimitiveTopology;
        const topology: GPUPrimitiveTopology = topologyStr;

        _scratchCasters.length = 0;
        _scratchInstanced.length = 0;
        _scratchStandard.length = 0;

        for (let i = 0; i < objects.length; i++) {
          const o = objects[i]!;
          if (o.castShadow && (!o.bounds || this._frustum.intersectsVolume(o.bounds))) {
            _scratchCasters.push(o);
            if (o instanceof InstancedMesh) {
              _scratchInstanced.push(o);
            } else {
              _scratchStandard.push(o);
            }
          }
        }

        if (_scratchCasters.length === 0) continue;

        if (_scratchStandard.length > 0) {
          renderer._renderSubgroup(
            rp,
            _scratchStandard,
            false,
            this._depthMaterial.uuid,
            depthManifest,
            shadowCam.viewMatrix,
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
            shadowCam.viewMatrix,
            topology,
          );
        }
      }

      rp.end();
      renderer._device!.queue.submit([shadowCe.finish()]);
    }

    // Restore real scene camera
    renderer._updateGlobalBuffers(vp, camPos, lights, scene);

    const gData = renderer._scratchGlobalBufferData;
    const rawVp = MathPool.acquireMatrix();
    const correctedVp = MathPool.acquireMatrix();

    for (let j = 0; j < lights.sLights.length; j++) {
      const sLight = lights.sLights[j]!;
      if (sLight.castShadow && sLight.shadowCamera) {
        gData[112 + j * 4] = sLight.shadowBias;
        gData[112 + j * 4 + 1] = sLight.shadowNormalBias;
        gData[112 + j * 4 + 2] = 1.0;
        gData[112 + j * 4 + 3] = j;

        rawVp.data.set(sLight.shadowCamera.viewProjectionMatrix);
        Matrix4.multiply(Matrix4.ZO_CORRECTION, rawVp, correctedVp);
        gData.set(correctedVp.data, 48 + j * 16);
      }
    }

    MathPool.releaseMatrix(rawVp);
    MathPool.releaseMatrix(correctedVp);

    renderer._device!.queue.writeBuffer(renderer._globalUniformBuffer, 0, gData);

    if (this._bindGroupNeedsShadowRebuild) {
      renderer._defaultSpotShadowTexView = this._spotShadowTexView!;
      renderer._globalBindGroup = renderer._createGlobalBindGroup(scene);
      this._bindGroupNeedsShadowRebuild = false;
    }
  }
}
