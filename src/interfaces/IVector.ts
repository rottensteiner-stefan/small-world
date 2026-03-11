export interface IVector {
  length(): number;
  lengthSq(): number;
  normalize(): IVector;
  scale(s: number): IVector;
}
