import { AbstractLight, LightOptions } from './AbstractLight.js';
import { LightType } from '../../enums/index.js';
import { LightDataInterface } from '../../interfaces/index.js';
/**
 * Ambient light that illuminates all objects in the scene equally.
 */
export declare class AmbientLight extends AbstractLight {
    /** @inheritdoc */
    readonly type: LightType;
    /**
     * Creates a new AmbientLight.
     * @param options The configuration options for the light.
     */
    constructor(options?: LightOptions);
    /** @inheritdoc */
    applyTo(data: LightDataInterface): void;
}
