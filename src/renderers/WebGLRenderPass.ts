import { AbstractWebGLRenderer } from "./AbstractWebGLRenderer.js";
import { Scene } from "../core/index.js";
import { Vector3D } from "../math/index.js";
import { LightDataInterface } from "../interfaces/index.js";
import { RenderList } from "../core/Scene.js";

/**
 * Ein einheitliches Interface für WebGL-Passes (WebGL1 und WebGL2).
 * Jeder Pass sollte seine benötigten RenderTargets und State-Einstellungen selbst verwalten.
 */
export interface WebGLRenderPass {
  /** Name des Passes */
  name: string;

  /**
   * Führt diesen Pass aus.
   * @param renderer Der ausführende WebGL-Renderer (WebGL1 oder WebGL2).
   * @param scene Die Szene.
   * @param vp View-Projection Matrix.
   * @param camPos Kamera-Position.
   * @param vMat View Matrix (optional).
   * @param renderList Die sortierte Liste der zu rendernden Objekte.
   * @param extractedLights Die extrahierten Lichter der Szene.
   * @param near Kamera-Near-Plane.
   * @param far Kamera-Far-Plane.
   */
  execute(
    renderer: AbstractWebGLRenderer,
    scene: Scene,
    vp: Float32Array,
    camPos: Vector3D,
    vMat: Float32Array | undefined,
    renderList: RenderList,
    extractedLights: LightDataInterface,
    near?: number,
    far?: number,
  ): void;
}
