import { Matrix4 } from '../math/index.js';
import { GeometryDataInterface, Geometry, BoundingVolume } from '../interfaces/index.js';
/**
 * Base class for all geometry types.
 * Manages vertex, index, normal, and UV data.
 * Designed to be extended by specific shapes.
 */
export declare abstract class AbstractGeometry implements Geometry {
    /** The vertices of the geometry (x, y, z). */
    protected _vertices: Float32Array;
    /** The indices of the geometry for indexed rendering. */
    protected _indices: Uint16Array | Uint32Array | undefined;
    /** The indices for wireframe rendering. */
    protected _wireframeIndices: Uint16Array | Uint32Array | undefined;
    /** The normals of the geometry (nx, ny, nz). */
    protected _normals: Float32Array;
    /** The tangents of the geometry (tx, ty, tz). */
    protected _tangents: Float32Array;
    /** The UV coordinates of the geometry (u, v). */
    protected _uvs: Float32Array;
    /** Whether the geometry is purely line-based. */
    protected _isLineGeometry: boolean;
    /** Cached bounding volume to prevent re-allocation */
    protected _cachedBoundingVolume: BoundingVolume | undefined;
    /**
     * Generates the raw geometry data. Must be implemented by subclasses.
     */
    protected abstract generateGeometryData(): void;
    /** @inheritdoc */
    getGeometryData(): GeometryDataInterface;
    /** @inheritdoc */
    getBoundingVolume(): BoundingVolume;
    /**
     * Computes the tangents of the geometry based on normals and UVs.
     * Required for normal mapping.
     */
    computeTangents(): void;
    /**
     * Computes the wireframe indices (line-segments) from the current triangle topology.
     */
    computeWireframeIndices(): void;
    /**
     * Helper method to create an appropriately sized index array.
     * Automatically chooses between 16-bit and 32-bit indices based on vertex count.
     * @param indexCount The number of indices needed.
     * @returns A Uint16Array or Uint32Array.
     */
    protected _createIndexArray(indexCount: number): Uint16Array | Uint32Array;
    /**
     * Computes the normals of the geometry using the current vertices and indices.
     * Averages normals for shared vertices.
     */
    computeNormals(): void;
    /**
     * Applies a Matrix4 transformation to all geometry vertices in-place.
     * @param matrix The transformation matrix.
     * @returns this
     */
    applyMatrix4(matrix: Matrix4): this;
    /**
     * Scales the geometry vertices in-place.
     * @param f The scale factor.
     * @returns this
     */
    scale(f: number): this;
    /**
     * Rotates the geometry vertices around the X-axis in-place.
     * @param a The rotation angle in radians.
     * @returns this
     */
    rotateX(a: number): this;
    /**
     * Rotates the geometry vertices around the Y-axis in-place.
     * @param a The rotation angle in radians.
     * @returns this
     */
    rotateY(a: number): this;
    /**
     * Rotates the geometry vertices around the Z-axis in-place.
     * @param a The rotation angle in radians.
     * @returns this
     */
    rotateZ(a: number): this;
}
