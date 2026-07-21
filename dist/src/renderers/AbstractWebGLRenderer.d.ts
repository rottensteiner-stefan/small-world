import { AbstractRenderer } from './AbstractRenderer.js';
import { Color } from '../core/colors/index.js';
import { Scene, Object3D } from '../core/index.js';
import { Vector3D } from '../math/index.js';
import { LightDataInterface } from '../interfaces/index.js';
import { WebGLRenderPass } from './WebGLRenderPass.js';
export declare abstract class AbstractWebGLRenderer extends AbstractRenderer {
    protected gl: WebGLRenderingContext | WebGL2RenderingContext;
    get webglContext(): WebGLRenderingContext | WebGL2RenderingContext;
    protected defaultTexture: WebGLTexture;
    protected defaultNormalMap: WebGLTexture;
    protected defaultSpecularMap: WebGLTexture;
    protected defaultCubeTexture: WebGLTexture;
    protected _passes: WebGLRenderPass[];
    addPass(pass: WebGLRenderPass): void;
    render(scene: Scene, vp: Float32Array, camPos?: Vector3D, vMat?: Float32Array): void;
    abstract resetStateCache(): void;
    abstract bindMainRenderTarget(): boolean;
    abstract bindPostProcessRenderTarget(): void;
    abstract copyToOpaqueTexture(): void;
    abstract flushPostProcess(): void;
    abstract renderGroup(shaderId: string, materialGroups: Map<string, Object3D[]>, vMat: Float32Array | undefined, topology: string, vp: Float32Array, camPos: Vector3D, lights: LightDataInterface, scene: Scene): void;
    destroy(): void;
    setSize(w: number, h: number): void;
    setClearColor(color: Color): void;
    protected createShaderProgram(vSrc: string, fSrc: string): WebGLProgram;
    protected initDefaultTextures(): void;
}
