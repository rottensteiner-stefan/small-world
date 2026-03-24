import { BoundingVolume } from '../interfaces/index.js';
export declare class Collision {
    static test(a: BoundingVolume, b: BoundingVolume): boolean;
    private static sphereSphere;
    private static boxBox;
    private static sphereBox;
}
