import { LightOptions, AbstractLight } from './AbstractLight.js';
import { LightType } from '../../enums/index.js';
import { LightDataInterface } from '../../interfaces/index.js';
/**
 * Configuration options for area light.
 */
export interface AreaLightOptions extends LightOptions {
    /** The width of the light area. Defaults to 5.0. */
    width?: number;
    /** The height/length of the light area. Defaults to 5.0. */
    height?: number;
}
/**
 * Area light that emits light from a rectangular plane.
 */
export declare class AreaLight extends AbstractLight {
    /** @inheritdoc */
    readonly type: LightType;
    /** The width of the light area. */
    width: number;
    /** The height/length of the light area. */
    height: number;
    /**
     * Creates a new AreaLight.
     * @param options The configuration options for the light.
     */
    constructor(options?: AreaLightOptions);
    /** @inheritdoc */
    applyTo(data: LightDataInterface): void;
}
