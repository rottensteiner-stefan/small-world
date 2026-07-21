import { Object3D } from '../index.js';
import { CameraInterfaceData } from '../../interfaces/index.js';
/**
 * Definition of a single configurable field inside the Gadget Inspector.
 */
export interface InspectorField {
    type: "number" | "boolean" | "string" | "choice";
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    options?: string[] | Record<string, string | number>;
    path?: string;
}
/**
 * Base class for all behaviors attached to an Object3D.
 */
export declare abstract class Behavior {
    static readonly inspector?: Record<string, InspectorField>;
    readonly uuid: string;
    isActive: boolean;
    /** The object this behavior is attached to. Set automatically. */
    target: Object3D | CameraInterfaceData | undefined;
    /**
     * Called when the behavior is attached to an object.
     */
    onAttach(target: Object3D | CameraInterfaceData): void;
    /**
     * Called when the behavior is detached from an object.
     */
    onDetach(): void;
    /**
     * Called every frame to update the behavior logic.
     * @param deltaTime The time elapsed since the last frame in seconds.
     */
    abstract update(deltaTime: number): void;
}
/**
 * Attaches a behavior to a host (Object3D or Camera) and appends it to its
 * behaviors list. Shared by every host so they don't each reimplement the
 * same attach-then-push logic.
 */
export declare function attachBehavior(behaviors: Behavior[], behavior: Behavior, target: Object3D | CameraInterfaceData): void;
/**
 * Detaches a behavior from a host's behaviors list, if present.
 */
export declare function detachBehavior(behaviors: Behavior[], behavior: Behavior): void;
