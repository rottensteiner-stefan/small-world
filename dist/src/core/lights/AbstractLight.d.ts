import { Color } from '../colors/Color.js';
import { LightType } from '../../enums/LightType.js';
import { Object3D } from '../Object3D.js';
import { LightDataInterface } from '../../interfaces/index.js';
/**
 * Configuration options for lights.
 */
export interface LightOptions {
    /** The color of the light. Defaults to white. */
    color?: Color;
    /** The intensity of the light. Defaults to 1.0. */
    intensity?: number;
    /** The name of the light object. Defaults to "Light". */
    name?: string;
    /** Whether the light casts shadows. Defaults to false. */
    castShadow?: boolean;
    /** The resolution of the shadow map for this light. Defaults to 512. */
    shadowResolution?: number;
}
/**
 * Base class for all light types.
 */
export declare abstract class AbstractLight extends Object3D {
    /** The type of the light. */
    abstract readonly type: LightType;
    /** The color of the light. */
    color: Color;
    /** The intensity of the light. */
    intensity: number;
    /** Whether the light casts shadows. */
    castShadow: boolean;
    /** The resolution of the shadow map for this light. */
    shadowResolution: number;
    /**
     * Applies the light's data to the collective light data structure.
     * @param data The structure to populate.
     */
    abstract applyTo(data: LightDataInterface): void;
    /**
     * Creates a new AbstractLight.
     * @param options The configuration options for the light.
     */
    protected constructor(options?: LightOptions);
}
