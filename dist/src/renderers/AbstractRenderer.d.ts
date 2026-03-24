import { AreaLight, Color, PointLight, SpotLight } from '../core/index.js';
import { RendererInterface } from '../interfaces/index.js';
import { RendererType } from '../enums/index.js';
import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/Vector3D.js';
export declare abstract class AbstractRenderer implements RendererInterface {
    abstract readonly type: RendererType;
    protected _clearColor: Color;
    abstract initialize(canvas: HTMLCanvasElement): Promise<void>;
    abstract render(scene: Scene, vpMatrix: Float32Array, camPos?: Vector3D): void;
    abstract setSize(width: number, height: number): void;
    setClearColor(color: Color): void;
    protected extractLights(scene: Scene): {
        aCol: Color;
        dDir: Vector3D;
        dCol: Color;
        pLights: PointLight[];
        sLights: SpotLight[];
        aLights: AreaLight[];
    };
}
