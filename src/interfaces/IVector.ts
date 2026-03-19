/// src/interfaces/IVector.ts
export interface IVector {
  length(): number;
  lengthSq(): number;
  normalize(): IVector;
  scale(s: number): IVector;
}
