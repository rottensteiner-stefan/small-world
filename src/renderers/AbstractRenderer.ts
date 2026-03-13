/// src/renderers/AbstractRenderer.ts
import { AbstractLight } from "../core/lights/AbstractLight.js";
import { AreaLight } from "../core/lights/AreaLight.js";
import { Color } from "../core/colors/Color.js";
import { DirectionalLight } from "../core/lights/DirectionalLight.js";
import { IRenderer } from "../interfaces/IRenderer.js";
import { LightType } from "../enums/LightType.js";
import { Object3D } from "../core/Object3D.js";
import { PointLight } from "../core/lights/PointLight.js";
import { RendererType } from "../enums/RendererType.js";
import { Scene } from "../core/Scene.js";
import { SpotLight } from "../core/lights/SpotLight.js";
import { Vector3D } from "../math/Vector3D.js";

export abstract class AbstractRenderer implements IRenderer {
  public abstract readonly type: RendererType;
  protected clearColor: Color = new Color(0, 0, 0, 1);

  public abstract initialize(canvas: HTMLCanvasElement): Promise<void>;
  public abstract render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
  public abstract setSize(width: number, height: number): void;

  public setClearColor(color: Color): void {
    this.clearColor = color;
  }

  // Diese Methode ist in ALLEN Renderern (sogar WebGPU) exakt gleich!
  protected extractLights(scene: Scene) {
    let aCol = new Color(0, 0, 0);
    let dDir = new Vector3D(0, 1, 0);
    let dCol = new Color(0, 0, 0);
    const pLights: PointLight[] = [];
    const sLights: SpotLight[] = [];
    const aLights: any[] = []; // <-- NEU (Typisierung als 'any' oder AreaLight importieren)

    const traverse = (node: Object3D) => {
      // Duck-Typing: Wenn das Objekt ein 'type' Feld hat, behandeln wir es als Licht
      if ("type" in node) {
        const light = node as AbstractLight; // TypeScript beruhigen

        switch (light.type) {
          case LightType.AMBIENT:
            aCol = new Color(
              light.color.r * light.intensity,
              light.color.g * light.intensity,
              light.color.b * light.intensity,
            );
            break;
          case LightType.DIRECTIONAL:
            const dl = light as DirectionalLight;
            dDir = dl.direction.clone().scale(-1).normalize();
            dCol = new Color(
              light.color.r * light.intensity,
              light.color.g * light.intensity,
              light.color.b * light.intensity,
            );
            break;
          case LightType.POINT:
            if (pLights.length < 4) pLights.push(light as PointLight);
            break;
          case LightType.SPOT:
            if (sLights.length < 4) sLights.push(light as SpotLight);
            break;
          case LightType.AREA:
            if (aLights.length < 4) aLights.push(light as AreaLight);
            break;
        }
      }
      if (node.children) node.children.forEach(traverse);
    };

    for (const obj of scene.objects) traverse(obj);

    return { aCol, dDir, dCol, pLights, sLights, aLights };
  }
}
