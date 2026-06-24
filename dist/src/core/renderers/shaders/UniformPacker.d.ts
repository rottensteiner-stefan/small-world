import { ShaderLayout } from './ShaderDefinition.js';
/**
 * Utility to pack uniform data into a Float32Array based on a layout.
 */
export declare class UniformPacker {
    /**
     * Packs properties into a pre-allocated buffer.
     * @param layout The shader layout defining the sequence.
     * @param values The actual values to pack.
     * @param targetArray The Float32Array to write into.
     * @returns The same Float32Array for chaining.
     */
    static packInto(layout: ShaderLayout, values: Record<string, unknown>, data: Float32Array): Float32Array;
    private static _getTypeSize;
    private static _getTypeAlignment;
}
