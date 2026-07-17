import { ShaderImporter } from './ShaderImporter.js';
import { CustomShaderMaterialOptions } from '../CustomShaderMaterial.js';
/**
 * Importer for Shadertoy (GLSL).
 * Wraps the `void mainImage(...)` function into a standard WebGL2 format.
 */
export declare class ShadertoyImporter implements ShaderImporter {
    parse(sourceCode: string): CustomShaderMaterialOptions;
}
