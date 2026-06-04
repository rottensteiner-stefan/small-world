/**
 * Wrapper for WebGL vertex and index buffers.
 * Handles both indexed and non-indexed geometry.
 */
export class Mesh {
    /** The vertex buffer object. */
    vbo;
    /** The element buffer object (indices). */
    ebo;
    /** The wireframe element buffer object. */
    webo;
    /** The normal buffer object. */
    nbo = undefined;
    /** The tangent buffer object. */
    tanbo = undefined;
    /** The texture coordinate buffer object. */
    tbo = undefined;
    /** The number of elements (indices or vertices) to draw. */
    count;
    /** The number of wireframe elements. */
    wireframeCount = 0;
    /** Whether this mesh uses indices for drawing. */
    isIndexed = false;
    /** The GL data type of the indices (e.g., UNSIGNED_SHORT or UNSIGNED_INT). */
    indexType = 0;
    /** The GL data type of the wireframe indices. */
    wireframeIndexType = 0;
    _gl;
    /**
     * Creates a new Mesh and uploads the geometry data to the GPU.
     * @param gl The WebGL context.
     * @param data The geometry data to upload.
     */
    constructor(gl, data) {
        this._gl = gl;
        // 1. Position Buffer
        this.vbo = gl.createBuffer() ?? undefined;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo ?? null);
        gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);
        // 2. Normals Buffer
        if (data.normals && 0 < data.normals.length) {
            this.nbo = gl.createBuffer() ?? undefined;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo ?? null);
            gl.bufferData(gl.ARRAY_BUFFER, data.normals, gl.STATIC_DRAW);
        }
        // 3. Tangents Buffer
        if (data.tangents && 0 < data.tangents.length) {
            this.tanbo = gl.createBuffer() ?? undefined;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.tanbo ?? null);
            gl.bufferData(gl.ARRAY_BUFFER, data.tangents, gl.STATIC_DRAW);
        }
        // 4. UVs Buffer
        if (data.uvs && 0 < data.uvs.length) {
            this.tbo = gl.createBuffer() ?? undefined;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.tbo ?? null);
            gl.bufferData(gl.ARRAY_BUFFER, data.uvs, gl.STATIC_DRAW);
        }
        // 5. Indices Buffer (Optional)
        if (data.indices && 0 < data.indices.length) {
            this.isIndexed = true;
            this.ebo = gl.createBuffer() ?? undefined;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo ?? null);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
            this.count = data.indices.length;
            this.indexType = data.indices.BYTES_PER_ELEMENT === 4 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
        }
        else {
            this.isIndexed = false;
            this.count = data.vertices.length / 3;
        }
        // 6. Wireframe Indices Buffer (Optional)
        if (data.wireframeIndices && 0 < data.wireframeIndices.length) {
            this.webo = gl.createBuffer() ?? undefined;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.webo ?? null);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.wireframeIndices, gl.STATIC_DRAW);
            this.wireframeCount = data.wireframeIndices.length;
            this.wireframeIndexType =
                data.wireframeIndices.BYTES_PER_ELEMENT === 4 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
        }
    }
    /**
     * Binds the buffers and sets the vertex attributes.
     * @param posLoc The location of the position attribute.
     * @param normLoc The location of the normal attribute.
     * @param uvLoc The location of the UV attribute.
     * @param tanLoc The location of the tangent attribute.
     */
    bind(posLoc, normLoc = -1, uvLoc = -1, tanLoc = -1) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.vbo ?? null);
        this._gl.vertexAttribPointer(posLoc, 3, this._gl.FLOAT, false, 0, 0);
        this._gl.enableVertexAttribArray(posLoc);
        if (0 <= normLoc) {
            if (this.nbo) {
                this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.nbo);
                this._gl.vertexAttribPointer(normLoc, 3, this._gl.FLOAT, false, 0, 0);
                this._gl.enableVertexAttribArray(normLoc);
            }
            else {
                this._gl.disableVertexAttribArray(normLoc);
            }
        }
        if (0 <= uvLoc) {
            if (this.tbo) {
                this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.tbo);
                this._gl.vertexAttribPointer(uvLoc, 2, this._gl.FLOAT, false, 0, 0);
                this._gl.enableVertexAttribArray(uvLoc);
            }
            else {
                this._gl.disableVertexAttribArray(uvLoc);
            }
        }
        if (0 <= tanLoc) {
            if (this.tanbo) {
                this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.tanbo);
                this._gl.vertexAttribPointer(tanLoc, 3, this._gl.FLOAT, false, 0, 0);
                this._gl.enableVertexAttribArray(tanLoc);
            }
            else {
                this._gl.disableVertexAttribArray(tanLoc);
            }
        }
    }
    /**
     * Draws the mesh using the appropriate GL call.
     * @param mode The draw mode (e.g. TRIANGLES, LINES).
     */
    draw(mode) {
        if (mode === this._gl.LINES && this.webo) {
            this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this.webo);
            this._gl.drawElements(mode, this.wireframeCount, this.wireframeIndexType, 0);
        }
        else if (this.isIndexed) {
            this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this.ebo ?? null);
            this._gl.drawElements(mode, this.count, this.indexType, 0);
        }
        else {
            this._gl.drawArrays(mode, 0, this.count);
        }
    }
    /**
     * Updates the GPU buffers with new geometry data.
     * Currently updates vertices, normals and tangents.
     * @param data The new geometry data.
     */
    update(data) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.vbo ?? null);
        this._gl.bufferData(this._gl.ARRAY_BUFFER, data.vertices, this._gl.STATIC_DRAW);
        if (this.nbo && data.normals) {
            this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.nbo);
            this._gl.bufferData(this._gl.ARRAY_BUFFER, data.normals, this._gl.STATIC_DRAW);
        }
        if (this.tanbo && data.tangents) {
            this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this.tanbo);
            this._gl.bufferData(this._gl.ARRAY_BUFFER, data.tangents, this._gl.STATIC_DRAW);
        }
    }
}
//# sourceMappingURL=Mesh.js.map