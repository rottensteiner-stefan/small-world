import { AbstractWebGLRenderer } from './AbstractWebGLRenderer.js';
import { Scene } from '../core/Scene.js';
import { Vector3D } from '../math/Vector3D.js';
export declare class WebGL1Renderer extends AbstractWebGLRenderer {
    readonly type: "WEB_GL1";
    protected gl: WebGLRenderingContext;
    private prog;
    private locs;
    private skyProg;
    private skyLocs;
    private cache;
    private texCache;
    private texCubeCache;
    private pointLightLocs;
    private spotLightLocs;
    private areaLightLocs;
    initialize(canvas: HTMLCanvasElement): Promise<void>;
    private getWebGLTexture;
    private getWebGLCubeTexture;
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D): void;
}
