import { Vector3D } from './Vector3D.js';
/**
 * A 4x4 matrix class for 3D transformations (Column-Major).
 */
export declare class Matrix4 {
    data: Float32Array;
    constructor();
    identity(): Matrix4;
    copy(m: Matrix4): this;
    multiply(m: Matrix4): this;
    invert(target?: Matrix4): boolean;
    transpose(): this;
    transformVector(v: Vector3D, result?: Vector3D): Vector3D;
    compose(pos: Vector3D, rot: Vector3D, scale: Vector3D): this;
    decompose(position: Vector3D, rotation: Vector3D, scale: Vector3D): this;
    determinant(): number;
    static multiply(a: Matrix4, b: Matrix4, result: Matrix4): void;
    static perspective(fov: number, aspect: number, near: number, far: number, target: Matrix4): void;
    static orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number, target: Matrix4): void;
    static lookAt(eye: Vector3D, target: Vector3D, up: Vector3D, result: Matrix4): void;
    static invert(src: Matrix4, target: Matrix4): boolean;
    static rotateX(angle: number, target: Matrix4): void;
    static rotateY(angle: number, target: Matrix4): void;
    static rotateZ(angle: number, target: Matrix4): void;
    static translate(x: number, y: number, z: number, target: Matrix4): void;
    static scale(x: number, y: number | Matrix4, z?: number, target?: Matrix4): void;
}
