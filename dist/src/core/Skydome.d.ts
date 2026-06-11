import { Object3D } from './Object3D.js';
import { BasicMaterial } from './materials/index.js';
import { Texture } from './textures/index.js';
/**
 * Configuration options for the Skydome.
 */
export interface SkydomeOptions {
    /** The name of the object. Defaults to "Skydome". */
    name?: string;
    /** The texture to use for the skydome. */
    texture: Texture;
    /** The radius of the skydome. Defaults to 100. */
    radius?: number;
    /** The number of width segments. Defaults to 32. */
    widthSegments?: number;
    /** The number of height segments. Defaults to 32. */
    heightSegments?: number;
}
/**
 * A skydome that surrounds the scene using a spherical geometry.
 */
export declare class Skydome extends Object3D {
    material: BasicMaterial;
    /**
     * Creates a new Skydome.
     * @param options The configuration options for the skydome.
     */
    constructor(options: SkydomeOptions);
}
