export interface VectorInterface {
    length(): number;
    lengthSq(): number;
    normalize(): VectorInterface;
    scale(s: number): VectorInterface;
}
