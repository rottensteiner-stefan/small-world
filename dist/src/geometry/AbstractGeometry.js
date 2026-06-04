/// src/geometry/AbstractGeometry.ts
import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";
import { BoundingBox } from "../physix/BoundingBox.js";
import { Topology } from "../enums/index.js";
/**
 * Base class for all geometry types.
 * Manages vertex, index, normal, and UV data.
 * Designed to be extended by specific shapes.
 */
export class AbstractGeometry {
    /** The vertices of the geometry (x, y, z). */
    _vertices = new Float32Array();
    /** The indices of the geometry for indexed rendering. */
    _indices = undefined;
    /** The indices for wireframe rendering. */
    _wireframeIndices = undefined;
    /** The normals of the geometry (nx, ny, nz). */
    _normals = new Float32Array();
    /** The tangents of the geometry (tx, ty, tz). */
    _tangents = new Float32Array();
    /** The UV coordinates of the geometry (u, v). */
    _uvs = new Float32Array();
    /** Whether the geometry is purely line-based. */
    _isLineGeometry = false;
    /** @inheritdoc */
    getGeometryData() {
        if (0 === this._normals.length && 0 < this._vertices.length) {
            this.computeNormals();
        }
        // Fallback for UVs if they are missing
        if (0 === this._uvs.length && 0 < this._vertices.length) {
            this._uvs = new Float32Array((this._vertices.length / 3) * 2);
        }
        if (0 === this._tangents.length && 0 < this._vertices.length && !this._isLineGeometry) {
            this.computeTangents();
        }
        if (undefined === this._wireframeIndices && 0 < this._vertices.length) {
            if (this._isLineGeometry && this._indices) {
                this._wireframeIndices = this._indices;
            }
            else {
                this.computeWireframeIndices();
            }
        }
        return {
            vertices: this._vertices,
            indices: this._indices,
            wireframeIndices: this._wireframeIndices,
            normals: this._normals,
            tangents: this._tangents,
            uvs: this._uvs,
            topology: this._isLineGeometry ? Topology.LINE_LIST : Topology.TRIANGLE_LIST,
            getBoundingVolume: () => this.getBoundingVolume(),
        };
    }
    /** @inheritdoc */
    getBoundingVolume() {
        return BoundingBox.fromVertices(this._vertices);
    }
    /**
     * Computes the tangents of the geometry based on normals and UVs.
     * Required for normal mapping.
     */
    computeTangents() {
        if (0 === this._vertices.length || 0 === this._uvs.length || this._isLineGeometry)
            return;
        this._tangents = new Float32Array(this._vertices.length);
        if (undefined === this._indices || 0 !== this._indices.length % 3) {
            return;
        }
        const tan1 = new Float32Array(this._vertices.length);
        const tan2 = new Float32Array(this._vertices.length);
        for (let i = 0; i < this._indices.length; i += 3) {
            const i1 = this._indices[i];
            const i2 = this._indices[i + 1];
            const i3 = this._indices[i + 2];
            const v1x = this._vertices[i1 * 3];
            const v1y = this._vertices[i1 * 3 + 1];
            const v1z = this._vertices[i1 * 3 + 2];
            const v2x = this._vertices[i2 * 3];
            const v2y = this._vertices[i2 * 3 + 1];
            const v2z = this._vertices[i2 * 3 + 2];
            const v3x = this._vertices[i3 * 3];
            const v3y = this._vertices[i3 * 3 + 1];
            const v3z = this._vertices[i3 * 3 + 2];
            const w1u = this._uvs[i1 * 2];
            const w1v = this._uvs[i1 * 2 + 1];
            const w2u = this._uvs[i2 * 2];
            const w2v = this._uvs[i2 * 2 + 1];
            const w3u = this._uvs[i3 * 2];
            const w3v = this._uvs[i3 * 2 + 1];
            const x1 = v2x - v1x;
            const x2 = v3x - v1x;
            const y1 = v2y - v1y;
            const y2 = v3y - v1y;
            const z1 = v2z - v1z;
            const z2 = v3z - v1z;
            const s1 = w2u - w1u;
            const s2 = w3u - w1u;
            const t1 = w2v - w1v;
            const t2 = w3v - w1v;
            const div = s1 * t2 - s2 * t1;
            const r = 0 === div ? 0 : 1.0 / div;
            const tx = (t2 * x1 - t1 * x2) * r;
            const ty = (t2 * y1 - t1 * y2) * r;
            const tz = (t2 * z1 - t1 * z2) * r;
            const bx = (s1 * x2 - s2 * x1) * r;
            const by = (s1 * y2 - s2 * y1) * r;
            const bz = (s1 * z2 - s2 * z1) * r;
            tan1[i1 * 3] += tx;
            tan1[i1 * 3 + 1] += ty;
            tan1[i1 * 3 + 2] += tz;
            tan1[i2 * 3] += tx;
            tan1[i2 * 3 + 1] += ty;
            tan1[i2 * 3 + 2] += tz;
            tan1[i3 * 3] += tx;
            tan1[i3 * 3 + 1] += ty;
            tan1[i3 * 3 + 2] += tz;
            tan2[i1 * 3] += bx;
            tan2[i1 * 3 + 1] += by;
            tan2[i1 * 3 + 2] += bz;
            tan2[i2 * 3] += bx;
            tan2[i2 * 3 + 1] += by;
            tan2[i2 * 3 + 2] += bz;
            tan2[i3 * 3] += bx;
            tan2[i3 * 3 + 1] += by;
            tan2[i3 * 3 + 2] += bz;
        }
        for (let i = 0; i < this._vertices.length / 3; i++) {
            const nx = this._normals[i * 3];
            const ny = this._normals[i * 3 + 1];
            const nz = this._normals[i * 3 + 2];
            const tx = tan1[i * 3];
            const ty = tan1[i * 3 + 1];
            const tz = tan1[i * 3 + 2];
            // Gram-Schmidt orthogonalize
            const dot = nx * tx + ny * ty + nz * tz;
            const otx = tx - nx * dot;
            const oty = ty - ny * dot;
            const otz = tz - nz * dot;
            const len = Math.sqrt(otx * otx + oty * oty + otz * otz);
            if (len > 0) {
                this._tangents[i * 3] = otx / len;
                this._tangents[i * 3 + 1] = oty / len;
                this._tangents[i * 3 + 2] = otz / len;
            }
        }
    }
    /**
     * Computes the wireframe indices (line-segments) from the current triangle topology.
     */
    computeWireframeIndices() {
        if (this._indices) {
            const triangleCount = Math.floor(this._indices.length / 3);
            const lineCount = triangleCount * 6;
            const lines = this._createIndexArray(lineCount);
            let ptr = 0;
            for (let i = 0; i < triangleCount * 3; i += 3) {
                const a = this._indices[i];
                const b = this._indices[i + 1];
                const c = this._indices[i + 2];
                lines[ptr++] = a;
                lines[ptr++] = b;
                lines[ptr++] = b;
                lines[ptr++] = c;
                lines[ptr++] = c;
                lines[ptr++] = a;
            }
            this._wireframeIndices = lines;
        }
        else {
            const vertexCount = this._vertices.length / 3;
            const triangleCount = Math.floor(vertexCount / 3);
            const lineCount = triangleCount * 6;
            const lines = this._createIndexArray(lineCount);
            let ptr = 0;
            for (let i = 0; i < triangleCount * 3; i += 3) {
                lines[ptr++] = i;
                lines[ptr++] = i + 1;
                lines[ptr++] = i + 1;
                lines[ptr++] = i + 2;
                lines[ptr++] = i + 2;
                lines[ptr++] = i;
            }
            this._wireframeIndices = lines;
        }
    }
    /**
     * Helper method to create an appropriately sized index array.
     * Automatically chooses between 16-bit and 32-bit indices based on vertex count.
     * @param indexCount The number of indices needed.
     * @returns A Uint16Array or Uint32Array.
     */
    _createIndexArray(indexCount) {
        const vertexCount = this._vertices.length / 3;
        if (vertexCount > 65535) {
            return new Uint32Array(indexCount);
        }
        return new Uint16Array(indexCount);
    }
    /**
     * Computes the normals of the geometry using the current vertices and indices.
     * Averages normals for shared vertices.
     */
    computeNormals() {
        if (0 === this._vertices.length)
            return;
        this._normals = new Float32Array(this._vertices.length);
        // If no indices, we can't easily compute averaged normals for shared vertices
        if (!this._indices || 0 !== this._indices.length % 3) {
            // Default to up-normals if calculation is impossible
            for (let i = 0; i < this._normals.length; i += 3) {
                this._normals[i] = 0;
                this._normals[i + 1] = 1;
                this._normals[i + 2] = 0;
            }
            return;
        }
        for (let i = 0; i < this._indices.length; i += 3) {
            const iA = (this._indices[i] ?? 0) * 3;
            const iB = (this._indices[i + 1] ?? 0) * 3;
            const iC = (this._indices[i + 2] ?? 0) * 3;
            const ax = this._vertices[iA] ?? 0;
            const ay = this._vertices[iA + 1] ?? 0;
            const az = this._vertices[iA + 2] ?? 0;
            const bx = this._vertices[iB] ?? 0;
            const by = this._vertices[iB + 1] ?? 0;
            const bz = this._vertices[iB + 2] ?? 0;
            const cx = this._vertices[iC] ?? 0;
            const cy = this._vertices[iC + 1] ?? 0;
            const cz = this._vertices[iC + 2] ?? 0;
            const ux = bx - ax;
            const uy = by - ay;
            const uz = bz - az;
            const vx = cx - ax;
            const vy = cy - ay;
            const vz = cz - az;
            const nx = uy * vz - uz * vy;
            const ny = uz * vx - ux * vz;
            const nz = ux * vy - uy * vx;
            this._normals[iA] = (this._normals[iA] ?? 0) + nx;
            this._normals[iA + 1] = (this._normals[iA + 1] ?? 0) + ny;
            this._normals[iA + 2] = (this._normals[iA + 2] ?? 0) + nz;
            this._normals[iB] = (this._normals[iB] ?? 0) + nx;
            this._normals[iB + 1] = (this._normals[iB + 1] ?? 0) + ny;
            this._normals[iB + 2] = (this._normals[iB + 2] ?? 0) + nz;
            this._normals[iC] = (this._normals[iC] ?? 0) + nx;
            this._normals[iC + 1] = (this._normals[iC + 1] ?? 0) + ny;
            this._normals[iC + 2] = (this._normals[iC + 2] ?? 0) + nz;
        }
        for (let i = 0; i < this._normals.length; i += 3) {
            const nx = this._normals[i] ?? 0;
            const ny = this._normals[i + 1] ?? 0;
            const nz = this._normals[i + 2] ?? 0;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (0 < len) {
                this._normals[i] = nx / len;
                this._normals[i + 1] = ny / len;
                this._normals[i + 2] = nz / len;
            }
        }
    }
    /**
     * Applies a Matrix4 transformation to all geometry vertices in-place.
     * @param matrix The transformation matrix.
     * @returns this
     */
    applyMatrix4(matrix) {
        const v = new Vector3D();
        for (let i = 0; i < this._vertices.length; i += 3) {
            v.x = this._vertices[i] ?? 0;
            v.y = this._vertices[i + 1] ?? 0;
            v.z = this._vertices[i + 2] ?? 0;
            matrix.transformVector(v);
            this._vertices[i] = v.x;
            this._vertices[i + 1] = v.y;
            this._vertices[i + 2] = v.z;
        }
        this.computeNormals();
        return this;
    }
    /**
     * Scales the geometry vertices in-place.
     * @param f The scale factor.
     * @returns this
     */
    scale(f) {
        const m = new Matrix4();
        Matrix4.scale(f, m);
        return this.applyMatrix4(m);
    }
    /**
     * Rotates the geometry vertices around the X-axis in-place.
     * @param a The rotation angle in radians.
     * @returns this
     */
    rotateX(a) {
        const m = new Matrix4();
        Matrix4.rotateX(a, m);
        return this.applyMatrix4(m);
    }
    /**
     * Rotates the geometry vertices around the Y-axis in-place.
     * @param a The rotation angle in radians.
     * @returns this
     */
    rotateY(a) {
        const m = new Matrix4();
        Matrix4.rotateY(a, m);
        return this.applyMatrix4(m);
    }
    /**
     * Rotates the geometry vertices around the Z-axis in-place.
     * @param a The rotation angle in radians.
     * @returns this
     */
    rotateZ(a) {
        const m = new Matrix4();
        Matrix4.rotateZ(a, m);
        return this.applyMatrix4(m);
    }
}
//# sourceMappingURL=AbstractGeometry.js.map