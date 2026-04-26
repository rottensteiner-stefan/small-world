import { ShaderLayout } from './ShaderDefinition.js';
/**
 * Utility to pack uniform data into a Float32Array based on a layout.
 */
export declare class UniformPacker {
    /**
     * Packs properties into a buffer.
     * @param layout The shader layout defining the sequence.
     * @param values The actual values to pack.
     * @param bufferSize Minimum size of the resulting buffer in bytes (default 256 for WebGPU alignment).
     * @returns A Float32Array ready for GPU upload.
     */
    static pack(layout: ShaderLayout, values: Record<string, any>, bufferSize?: number): Float32Array;
    private static getTypeSize;
    private static getTypeAlignment;
}
