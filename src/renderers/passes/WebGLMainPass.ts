import { WebGLRenderPass } from "../WebGLRenderPass.js";
import { AbstractWebGLRenderer } from "../AbstractWebGLRenderer.js";
import { Scene, Object3D } from "../../core/index.js";
import { Vector3D } from "../../math/index.js";
import { LightDataInterface } from "../../interfaces/index.js";
import { RenderList } from "../../core/Scene.js";
import { MaterialType } from "../../enums/index.js";
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
  ): void {
    const gl = renderer.webglContext;

    // 1. Bind Main Render Target
    renderer.bindMainRenderTarget();

    // 2. Clear
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // 3. Render Skybox
    const skyboxShaderMap = renderList.opaque.get(MaterialType.SKYBOX);
    if (skyboxShaderMap) {
      gl.depthMask(false);
      for (const [topology, materialGroups] of skyboxShaderMap.entries()) {
        renderer.renderGroup(
          MaterialType.SKYBOX,
          materialGroups,
          vMat,
          topology,
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
      gl.depthMask(true);
      renderList.opaque.delete(MaterialType.SKYBOX);
    }

    // 4. Render Opaque
    for (const [shaderId, topologyMap] of renderList.opaque.entries()) {
      for (const [topology, materialGroups] of topologyMap.entries()) {
        renderer.renderGroup(
          shaderId,
          materialGroups,
          vMat,
          topology,
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

      // We group transparent objects dynamically
      const transparentMap = new Map<string, Object3D[]>();

      for (const obj of renderList.transparent) {
        if (!obj.material) continue;
        const manifest = obj.material.getRenderManifest();
        const shaderId = manifest.shaderId;
        const topology =
          manifest.state?.topology ||
          obj.geometry?.topology ||
          (obj.geometry?.indices?.length === 2 ? "line-list" : "triangle-list");

        transparentMap.clear();
        transparentMap.set(obj.material.uuid, [obj]);

        renderer.renderGroup(
          shaderId,
          transparentMap,
          vMat,
          topology,
          vp,
          camPos,
          extractedLights,
          scene,
        );
      }
    }
  }
}
