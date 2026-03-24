/// src/interfaces/VectorInterface.ts
export interface VectorInterface {
  length(): number;
  lengthSq(): number;
  normalize(): VectorInterface;
  scale(s: number): VectorInterface;
}
