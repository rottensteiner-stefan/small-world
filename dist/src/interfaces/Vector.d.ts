export interface Vector {
    length(): number;
    lengthSq(): number;
    normalize(): Vector;
    scale(s: number): Vector;
}
