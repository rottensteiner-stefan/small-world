import { AbstractRenderer } from './AbstractRenderer.js';
import { Color } from '../core/index.js';
export declare abstract class AbstractWebGLRenderer extends AbstractRenderer {
    protected gl: WebGLRenderingContext | WebGL2RenderingContext;
    protected defaultTexture: WebGLTexture;
    protected defaultNormalMap: WebGLTexture;
    protected defaultSpecularMap: WebGLTexture;
    protected defaultCubeTexture: WebGLTexture;
    destroy(): void;
    setSize(w: number, h: number): void;
    setClearColor(color: Color): void;
    protected createShaderProgram(vSrc: string, fSrc: string): WebGLProgram;
    protected initDefaultTextures(): void;
}
