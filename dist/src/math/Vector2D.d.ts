import { VectorInterface } from '../interfaces/VectorInterface.js';
export declare class Vector2D implements VectorInterface {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
    add(v: Vector2D): this;
    sub(v: Vector2D): this;
    scale(s: number): this;
    dot(v: Vector2D): number;
    lengthSq(): number;
    length(): number;
    distanceToSq(v: Vector2D): number;
    distanceTo(v: Vector2D): number;
    clone(): Vector2D;
    /**
     * Normalisiert den Vektor auf eine Länge von 1 (Einheitsvektor).
     * @returns this (für Method Chaining)
     */
    normalize(): this;
}
