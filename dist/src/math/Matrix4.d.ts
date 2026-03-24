import { Vector3D } from './Vector3D.js';
export declare class Matrix4 {
    data: Float32Array<ArrayBuffer>;
    constructor();
    identity(): Matrix4;
    compose(pos: Vector3D, rot: Vector3D, scale: Vector3D): this;
    static translate(v: Vector3D, out: Matrix4): void;
    static scale(s: number, out: Matrix4): void;
    static rotateX(r: number, out: Matrix4): void;
    static rotateY(r: number, out: Matrix4): void;
    static rotateZ(r: number, out: Matrix4): void;
    static multiply(a: Matrix4, b: Matrix4, out: Matrix4): void;
    static perspective(fov: number, aspect: number, near: number, far: number, out: Matrix4): void;
    static orthographic(l: number, r: number, b: number, t: number, n: number, f: number, out: Matrix4): void;
    static lookAt(eye: Vector3D, target: Vector3D, up: Vector3D, out: Matrix4): void;
    transformVector(v: Vector3D): Vector3D;
}
