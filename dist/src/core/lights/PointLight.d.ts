import { AbstractLight, LightOptions } from './AbstractLight.js';
import { LightType } from '../../enums/index.js';
import { LightDataInterface } from '../../interfaces/index.js';
/**
 * Configuration options for point light.
 */
export interface PointLightOptions extends LightOptions {
    /** The maximum distance of the light. Defaults to 50.0. */
    distance?: number;
    /** The decay factor of the light. Defaults to 2.0. */
    decay?: number;
}
/**
 * Point light that emits light in all directions from a single point.
 */
export declare class PointLight extends AbstractLight {
    /** @inheritdoc */
    readonly type: LightType;
    /** The maximum distance of the light. */
    distance: number;
    /** The decay factor of the light. */
    decay: number;
    /**
     * Creates a new PointLight.
     * @param options The configuration options for the light.
     */
    constructor(options?: PointLightOptions);
    /** @inheritdoc */
    applyTo(data: LightDataInterface): void;
}
