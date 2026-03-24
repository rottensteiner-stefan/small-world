import { AbstractWebGLRenderer } from './AbstractWebGLRenderer.js';
import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/Vector3D.js';
export declare class WebGL2Renderer extends AbstractWebGLRenderer {
    readonly type: "WEB_GL2";
    protected gl: WebGL2RenderingContext;
    private _prog;
    private _locs;
    private _skyProg;
    private _skyLocs;
    private _cache;
    private _texCache;
    private _texCubeCache;
    private _pointLightLocs;
    private _spotLightLocs;
    private _areaLightLocs;
    initialize(canvas: HTMLCanvasElement): Promise<void>;
    private getWebGLTexture;
    private getWebGLCubeTexture;
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D): void;
}
