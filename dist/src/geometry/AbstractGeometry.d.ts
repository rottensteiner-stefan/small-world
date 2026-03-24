import { Geometry } from '../interfaces/GeometryInterface.js';
import { GeometryData } from '../interfaces/GeometryData.js';
import { Matrix4 } from '../math/Matrix4.js';
export declare abstract class AbstractGeometry implements Geometry {
    protected vertices: Float32Array;
    protected indices: Uint16Array | Uint32Array;
    protected normals: Float32Array;
    protected uvs: Float32Array;
    protected abstract generateGeometryData(): void;
    getGeometryData(): GeometryData;
    computeNormals(): void;
    applyMatrix4(matrix: Matrix4): this;
    scale(f: number): this;
    rotateX(a: number): this;
    rotateY(a: number): this;
    rotateZ(a: number): this;
}
