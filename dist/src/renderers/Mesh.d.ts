import { GeometryDataInterface } from '../interfaces/index.js';
/**
 * Wrapper for WebGL vertex and index buffers.
 * Handles both indexed and non-indexed geometry.
 */
export declare class Mesh {
    /** The vertex buffer object. */
    vbo: WebGLBuffer | undefined;
    /** The element buffer object (indices). */
    ebo: WebGLBuffer | undefined;
    /** The wireframe element buffer object. */
    webo: WebGLBuffer | undefined;
    /** The normal buffer object. */
    nbo: WebGLBuffer | undefined;
    /** The tangent buffer object. */
    tanbo: WebGLBuffer | undefined;
    /** The texture coordinate buffer object. */
    tbo: WebGLBuffer | undefined;
    /** The number of elements (indices or vertices) to draw. */
    count: number;
    /** The number of wireframe elements. */
    wireframeCount: number;
    /** Whether this mesh uses indices for drawing. */
    isIndexed: boolean;
    /** The GL data type of the indices (e.g., UNSIGNED_SHORT or UNSIGNED_INT). */
    indexType: number;
    /** The GL data type of the wireframe indices. */
    wireframeIndexType: number;
    private _gl;
    /**
     * Creates a new Mesh and uploads the geometry data to the GPU.
     * @param gl The WebGL context.
     * @param data The geometry data to upload.
     */
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, data: GeometryDataInterface);
    /**
     * Binds the buffers and sets the vertex attributes.
     * @param posLoc The location of the position attribute.
     * @param normLoc The location of the normal attribute.
     * @param uvLoc The location of the UV attribute.
     * @param tanLoc The location of the tangent attribute.
     */
    bind(posLoc: number, normLoc?: number, uvLoc?: number, tanLoc?: number): void;
    /**
     * Draws the mesh using the appropriate GL call.
     * @param mode The draw mode (e.g. TRIANGLES, LINES).
     */
    draw(mode: number): void;
}
