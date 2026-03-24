import { Object3D } from './Object3D.js';
export declare class Scene {
    objects: Object3D[];
    add(obj: Object3D): void;
    remove(obj: Object3D): void;
    update(): void;
}
