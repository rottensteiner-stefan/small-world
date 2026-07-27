import { WebGLRenderPass } from "../WebGLRenderPass.js";
import { AbstractWebGLRenderer } from "../AbstractWebGLRenderer.js";
import { Scene, Object3D } from "../../core/index.js";
import { Vector3D } from "../../math/index.js";
import { LightDataInterface } from "../../interfaces/index.js";
import { RenderList } from "../../core/Scene.js";
import { Topology, MaterialType } from "../../enums/index.js";
import { Color } from "../../core/colors/index.js";

export class WebGLMainPass implements WebGLRenderPass {
  public name = "WebGLMainPass";

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

    // 5. Render Transparent
    if (renderList.transparent.length > 0) {
      renderer.copyToOpaqueTexture();
      renderer.copyToOpaqueDepthTexture();

      // We group transparent objects dynamically
      const transparentMap = new Map<string, Object3D[]>();

      for (const obj of renderList.transparent) {
        if (!obj.material) continue;
        const manifest = obj.material.getRenderManifest();
        const shaderId = manifest.shaderId;
        // AbstractGeometry always sets .topology explicitly, so this only matters for
        // hand-built GeometryData that skips it -- default to triangles rather than
        // guessing from index count (a 2-index geometry isn't reliably a line).
        const topology = manifest.state?.topology || obj.geometry?.topology || Topology.DEFAULT;

        transparentMap.clear();
        transparentMap.set(obj.material.uuid, [obj]);

        const batch = {
          shaderId,
          topology: topology as Topology,
          matUuid: obj.material.uuid,
          objects: [obj],
        };
        (renderer as AbstractWebGLRenderer).renderBatch(
          batch,
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
