import { ShaderImporter } from './ShaderImporter.js';
import { CustomShaderMaterialOptions } from '../CustomShaderMaterial.js';
/**
 * Importer for GLSLSandbox (GLSL).
 * Maps `uniform float time;` and `uniform vec2 resolution;` correctly.
 */
export declare class GLSLSandboxImporter implements ShaderImporter {
    parse(sourceCode: string): CustomShaderMaterialOptions;
}
