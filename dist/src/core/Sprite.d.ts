import { Object3D } from './Object3D.js';
import { SpriteMaterial } from './materials/index.js';
/**
 * A Sprite is a 2D plane that typically always faces the camera.
 */
export declare class Sprite extends Object3D {
    /**
     * Creates a new Sprite.
     * @param material The material for the sprite.
     * @param name The name of the sprite.
     */
    constructor(material?: SpriteMaterial, name?: string);
}
