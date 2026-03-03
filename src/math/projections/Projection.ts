import { Matrix4 } from '../Matrix4.js';
export abstract class Projection { protected matrix = new Matrix4(); public abstract getMatrix(): Matrix4; public abstract update(): void; }
