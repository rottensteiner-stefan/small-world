import { Matrix4 } from '../math/Matrix4.js';
import { GeometryDataInterface, Geometry } from '../interfaces/index.js';
/**
 * Base class for all geometry types.
 * Manages vertex, index, normal, and UV data.
 */
export declare abstract class AbstractGeometry implements Geometry {
    /** The vertices of the geometry. */
    protected _vertices: Float32Array;
    /** The indices of the geometry. */
    protected _indices: Uint16Array | Uint32Array | undefined;
    /** The indices for wireframe rendering. */
    protected _wireframeIndices: Uint16Array | Uint32Array | undefined;
    /** The normals of the geometry. */
    protected _normals: Float32Array;
    /** The tangents of the geometry. */
    protected _tangents: Float32Array;
    /** The UV coordinates of the geometry. */
    protected _uvs: Float32Array;
    /** Whether the geometry is line-based. */
    protected _isLineGeometry: boolean;
    /**
     * Generates the geometry data. Must be implemented by subclasses.
     */
    protected abstract generateGeometryData(): void;
    /** @inheritdoc */
    getGeometryData(): GeometryDataInterface;
    /**
     * Computes the tangents of the geometry.
     */
    computeTangents(): void;
    /**
     * Computes the wireframe indices from the current indices or vertices.
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
     */
    computeNormals(): void;
    /**
     * Applies a Matrix4 transformation to the geometry vertices.
     * @param matrix The transformation matrix.
     * @returns this
     */
    applyMatrix4(matrix: Matrix4): this;
    /**
     * Scales the geometry.
     * @param f The scale factor.
     * @returns this
     */
    scale(f: number): this;
    /**
     * Rotates the geometry around the X-axis.
     * @param a The rotation angle in radians.
     * @returns this
     */
    rotateX(a: number): this;
    /**
     * Rotates the geometry around the Y-axis.
     * @param a The rotation angle in radians.
     * @returns this
     */
    rotateY(a: number): this;
    /**
     * Rotates the geometry around the Z-axis.
     * @param a The rotation angle in radians.
     * @returns this
     */
    rotateZ(a: number): this;
}
