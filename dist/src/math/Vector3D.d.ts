import { VectorInterface } from '../interfaces/VectorInterface.js';
import { Matrix4 } from './Matrix4.js';
export declare class Vector3D implements VectorInterface {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    add(v: Vector3D): this;
    sub(v: Vector3D): this;
    scale(s: number): this;
    dot(v: Vector3D): number;
    lengthSq(): number;
    length(): number;
    distanceToSq(v: Vector3D): number;
    distanceTo(v: Vector3D): number;
    copyFrom(v: Vector3D): this;
    clone(): Vector3D;
    /**
     * Normalisiert den Vektor auf eine Länge von 1 (Einheitsvektor).
     * @returns this (für Method Chaining)
     */
    normalize(): this;
    /**
     * Transformiert die Richtung dieses Vektors mit einer Matrix.
     * Dies ignoriert die Translationskomponente der Matrix.
     * @param m Die Transformationsmatrix.
     * @returns this (für Method Chaining)
     */
    transformDirection(m: Matrix4): this;
}
