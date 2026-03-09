export class Mesh {
    gl;
    vbo;
    ebo;
    nbo;
    count;
    constructor(gl, data) {
        this.gl = gl;
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);
        if (data.normals) {
            this.nbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo);
            gl.bufferData(gl.ARRAY_BUFFER, data.normals, gl.STATIC_DRAW);
        }
        this.ebo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
        this.count = data.indices.length;
    }
    bind(posLoc, normLoc = -1) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
        this.gl.vertexAttribPointer(posLoc, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(posLoc);
        if (normLoc >= 0 && this.nbo) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nbo);
            this.gl.vertexAttribPointer(normLoc, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(normLoc);
        }
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ebo);
    }
}
//# sourceMappingURL=Mesh.js.map