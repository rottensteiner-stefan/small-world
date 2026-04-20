import { AbstractLight, LightOptions } from './AbstractLight.js';
import { LightType } from '../../enums/LightType.js';
import { Vector3D } from '../../math/Vector3D.js';
import { LightDataInterface } from '../../interfaces/index.js';
/**
 * Configuration options for directional light.
 */
export interface DirectionalLightOptions extends LightOptions {
    /** The direction of the light. Defaults to (0, -1, 0). */
    direction?: Vector3D;
}
/**
 * Directional light that emits light in a specific direction.
 */
export declare class DirectionalLight extends AbstractLight {
    /** @inheritdoc */
    readonly type: LightType;
    /** The direction of the light. */
    direction: Vector3D;
    /**
     * Creates a new DirectionalLight.
     * @param options The configuration options for the light.
     */
    constructor(options?: DirectionalLightOptions);
    /** @inheritdoc */
    applyTo(data: LightDataInterface): void;
}
