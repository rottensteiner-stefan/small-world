import { AbstractMaterial } from './materials/index.js';
import { BoundingVolume, GeometryDataInterface } from '../interfaces/index.js';
import { Matrix4, Vector3D } from '../math/index.js';
/**
 * Base class for all 3D objects in the scene.
 */
export declare class Object3D {
    /** The unique identifier of the object. */
    readonly uuid: string;
    /** The name of the object. */
    name: string;
    /** The geometry data of the object. */
    geometry: GeometryDataInterface | undefined;
    /** The material of the object. */
    material: AbstractMaterial | undefined;
    /** The bounding volume for collision detection and frustum culling. */
    bounds: BoundingVolume | undefined;
    /** The position of the object in local space. */
    position: Vector3D;
    /** The rotation of the object in local space (Euler angles). */
    rotation: Vector3D;
    /** The scale of the object in local space. */
    scale: Vector3D;
    /** The local transformation matrix. */
    localMatrix: Matrix4;
    /** The world transformation matrix. */
    worldMatrix: Matrix4;
    /** The parent object in the scene graph. */
    parent: Object3D | undefined;
    /** The list of child objects. */
    children: Object3D[];
    /** Whether the object is visible. */
    isVisible: boolean;
    /** Whether frustum culling is enabled for this object. */
    frustumCulled: boolean;
    /** Whether the object is static (not moving). Static objects are optimized in the spatial partitioning system. */
    isStatic: boolean;
    /** Whether the object is currently within the camera frustum (calculated during culling). */
    inFrustum: boolean;
    /**
     * Creates a new Object3D.
     * @param name The name of the object. Defaults to a random UUID.
     */
    constructor(name?: string);
    /**
     * Adds child objects.
     * @param children The child objects to add.
     */
    add(...children: Object3D[]): void;
    /**
     * Removes child objects.
     * @param children The child objects to remove.
     */
    remove(...children: Object3D[]): void;
    /**
     * Translates the object by a vector.
     * @param v The translation vector.
     * @returns this
     */
    translate(v: Vector3D): this;
    /**
     * Sets the position of the object.
     * @param x The x coordinate.
     * @param y The y coordinate.
     * @param z The z coordinate.
     * @returns this
     */
    setPosition(x: number, y: number, z: number): this;
    /**
     * Sets the rotation of the object.
     * @param x The x rotation in radians.
     * @param y The y rotation in radians.
     * @param z The z rotation in radians.
     * @returns this
     */
    setRotation(x: number, y: number, z: number): this;
    /**
     * Sets the scale of the object.
     * @param x The x scale.
     * @param y The y scale.
     * @param z The z scale.
     * @returns this
     */
    setScale(x: number, y?: number, z?: number): this;
    /**
     * Rotates the object to look at a target position.
     * @param target The target position.
     * @param up The up vector.
     * @returns this
     */
    lookAt(target: Vector3D, up?: Vector3D): this;
    updateMatrixWorld(force?: boolean): void;
}
