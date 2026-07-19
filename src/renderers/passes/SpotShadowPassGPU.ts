/// src/renderers/passes/SpotShadowPassGPU.ts
import { Scene, Color } from "../../core/index.js";
import { DepthMaterial } from "../../core/materials/index.js";
import { MaterialType } from "../../enums/index.js";
import { WebGPURenderer } from "../WebGPU/WebGPURenderer.js";
import { RenderPass } from "../index.js";
import { InstancedMesh } from "../../core/InstancedMesh.js";
import { Object3D } from "../../core/Object3D.js";
import { Matrix4, MathPool, Vector3D, Frustum } from "../../math/index.js";

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
    const casters = lights.sLights.filter((l) => l.castShadow);
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
        format: "depth24plus",
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

      for (const [shaderId, topologyMap] of renderList.opaque.entries()) {
        if (shaderId === MaterialType.SKYBOX) continue;
        for (const [topology, materialGroups] of topologyMap.entries()) {
          for (const objects of materialGroups.values()) {
            const objCasters = objects.filter((o: Object3D) => o.castShadow);
            if (objCasters.length === 0) continue;

            const culled = objCasters.filter(
              (o) => !o.bounds || this._frustum.intersectsVolume(o.bounds),
            );
            if (culled.length === 0) continue;

            const instancedObjects = culled.filter(
              (o: Object3D): o is InstancedMesh => o instanceof InstancedMesh,
            );
            const standardObjects = culled.filter((o: Object3D) => !(o instanceof InstancedMesh));

            if (standardObjects.length > 0) {
              renderer._renderSubgroup(
                rp,
                standardObjects,
                false,
                this._depthMaterial.uuid,
                depthManifest,
                shadowCam.viewMatrix,
                topology as GPUPrimitiveTopology,
              );
            }
            if (instancedObjects.length > 0) {
              renderer._renderSubgroup(
                rp,
                instancedObjects,
                true,
                this._depthMaterial.uuid,
                depthManifest,
                shadowCam.viewMatrix,
                topology as GPUPrimitiveTopology,
              );
            }
          }
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
