import { WebGLRenderPass } from "../WebGLRenderPass.js";
import { AbstractWebGLRenderer } from "../AbstractWebGLRenderer.js";
import { Scene, Object3D } from "../../core/index.js";
import { Vector3D } from "../../math/index.js";
import { LightDataInterface } from "../../interfaces/index.js";
import { RenderList, RenderBatch } from "../../core/Scene.js";
import { Topology, MaterialType, PostProcessingEffectType } from "../../enums/index.js";
import { Color } from "../../core/colors/index.js";

export class WebGLMainPass implements WebGLRenderPass {
  public name = "WebGLMainPass";

  // Reused across all transparent objects in a frame instead of allocating a fresh batch (and
  // its single-element `objects` array) per object -- `renderBatch` only ever reads this
  // synchronously within the call below, so overwriting it in place between calls is safe.
  private readonly _scratchTransparentObjects: Object3D[] = [];
  private readonly _scratchTransparentBatch: RenderBatch = {
    shaderId: "",
    topology: Topology.DEFAULT,
    matUuid: "",
    objects: this._scratchTransparentObjects,
  };

  public execute(
    renderer: AbstractWebGLRenderer,
    scene: Scene,
    vp: Float32Array,
    camPos: Vector3D,
    vMat: Float32Array | undefined,
    renderList: RenderList,
    extractedLights: LightDataInterface,
    _near?: number,
    _far?: number,
  ): void {
    const gl = renderer.webglContext;

    // 1. Bind Main Render Target
    renderer.bindMainRenderTarget();

    // 2. Clear
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // 3. Render Skybox
    gl.depthMask(false);
    for (let i = 0; i < renderList.opaqueBatches.length; i++) {
      const batch = renderList.opaqueBatches[i];
      if (batch!.shaderId === MaterialType.SKYBOX && batch!.objects.length > 0) {
        (renderer as AbstractWebGLRenderer).renderBatch(
          batch!,
          vMat,
          vp,
          camPos,
          {
            aCol: Color.BLACK,
            aIntensity: 0,
            dCol: Color.BLACK,
            dIntensity: 0,
            dDir: Vector3D.ZERO,
            pLights: [],
            sLights: [],
            aLights: [],
          },
          scene,
        );
      }
    }
    gl.depthMask(true);

    // 4. Render Opaque
    for (let i = 0; i < renderList.opaqueBatches.length; i++) {
      const batch = renderList.opaqueBatches[i];
      if (batch!.shaderId !== MaterialType.SKYBOX && batch!.objects.length > 0) {
        (renderer as AbstractWebGLRenderer).renderBatch(
          batch!,
          vMat,
          vp,
          camPos,
          extractedLights,
          scene,
        );
      }
    }

    // HBAO needs the opaque depth buffer every frame it's enabled, not just when there happen
    // to be transparent objects (the only other consumer of this capture, for refraction).
    const hbaoNode = renderer.postProcessing.get<import("../post/index.js").HbaoElement>(
      PostProcessingEffectType.HBAO,
    );
    if (renderList.transparent.length === 0 && hbaoNode && hbaoNode.enabled) {
      renderer.copyToOpaqueDepthTexture();
    }

    // 5. Render Transparent
    if (renderList.transparent.length > 0) {
      renderer.copyToOpaqueTexture();
      renderer.copyToOpaqueDepthTexture();

      for (const obj of renderList.transparent) {
        if (!obj.material) continue;
        const manifest = obj.material.getRenderManifest();
        // AbstractGeometry always sets .topology explicitly, so this only matters for
        // hand-built GeometryData that skips it -- default to triangles rather than
        // guessing from index count (a 2-index geometry isn't reliably a line).
        const topology = manifest.state?.topology || obj.geometry?.topology || Topology.DEFAULT;

        this._scratchTransparentBatch.shaderId = manifest.shaderId;
        this._scratchTransparentBatch.topology = topology as Topology;
        this._scratchTransparentBatch.matUuid = obj.material.uuid;
        this._scratchTransparentObjects[0] = obj;
        (renderer as AbstractWebGLRenderer).renderBatch(
          this._scratchTransparentBatch,
          vMat,
          vp,
          camPos,
          extractedLights,
          scene,
        );
      }
    }
  }
}
