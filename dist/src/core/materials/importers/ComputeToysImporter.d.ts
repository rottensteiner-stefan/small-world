import { ShaderImporter } from './ShaderImporter.js';
import { CustomShaderMaterialOptions } from '../CustomShaderMaterial.js';
/**
 * Importer for Compute.toys (WGSL).
 * Compute.toys uses WebGPU compute shaders. Since SmallWorld's CustomShaderMaterial
 * operates in the fragment pipeline, this importer uses heuristics to translate
 * `textureStore(screen, ...)` into fragment outputs, and provides the `custom` uniform struct.
 */
export declare class ComputeToysImporter implements ShaderImporter {
    parse(sourceCode: string): CustomShaderMaterialOptions;
}
